"""
fixsalad_core.py
================
Lapis 1 (Nutrition Planner) + Lapis 2 (Portion Solver) + feature engineering.

Modul ini adalah SUMBER KEBENARAN untuk logika gizi.
Implementasi TypeScript di website harus menghasilkan angka yang identik.
Kalau ada perbedaan, yang salah adalah TypeScript-nya.

Dipakai oleh: train_ranker.py, export_data.py
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal

import pandas as pd

# ---------------------------------------------------------------------------
# Konstanta — lihat SPEC.md §2
# ---------------------------------------------------------------------------

ACTIVITY_FACTOR = {
    "sedentary": 1.2,
    "ringan": 1.375,
    "sedang": 1.55,
    "aktif": 1.725,
    "sangat_aktif": 1.9,
}

# tujuan -> (pengali kalori, protein g per kg berat badan, batas natrium per meal mg)
GOAL_CONFIG = {
    "defisit_kalori": (0.80, 2.0, 800),
    "bulking": (1.15, 1.8, 800),
    "high_protein": (1.00, 2.2, 800),
    "rendah_garam": (1.00, 1.6, 500),
}

MARKUP = 2.0  # harga jual = modal x 2
KCAL_TOLERANCE = 0.08  # +/- 8%

Tujuan = Literal["defisit_kalori", "bulking", "high_protein", "rendah_garam"]
Rasa = Literal["pedas", "gurih", "segar"]
Bentuk = Literal["bowl", "wrap"]


# ---------------------------------------------------------------------------
# LAPIS 1 — Nutrition Planner
# ---------------------------------------------------------------------------


@dataclass
class BodyData:
    berat_kg: float
    tinggi_cm: float
    usia: int
    gender: Literal["pria", "wanita"]
    aktivitas: str
    makan_per_hari: int = 3


@dataclass
class NutritionTarget:
    target_kcal: float
    min_protein_g: float
    batas_natrium_mg: float
    bmr: float
    tdee: float


def hitung_bmr(b: BodyData) -> float:
    """Mifflin-St Jeor. Dipilih di atas Harris-Benedict karena error lebih kecil
    pada populasi non-atletik (+/-10% vs +/-14%)."""
    base = (10 * b.berat_kg) + (6.25 * b.tinggi_cm) - (5 * b.usia)
    return base + 5 if b.gender == "pria" else base - 161


def hitung_target(b: BodyData, tujuan: Tujuan) -> NutritionTarget:
    """Data tubuh + tujuan -> target kalori & protein PER MEAL."""
    bmr = hitung_bmr(b)
    tdee = bmr * ACTIVITY_FACTOR[b.aktivitas]

    pengali_kcal, protein_per_kg, batas_natrium = GOAL_CONFIG[tujuan]

    kcal_harian = tdee * pengali_kcal
    target_kcal = round(kcal_harian / b.makan_per_hari / 10) * 10

    protein_harian = b.berat_kg * protein_per_kg
    min_protein = round(protein_harian / b.makan_per_hari)

    return NutritionTarget(
        target_kcal=float(target_kcal),
        min_protein_g=float(min_protein),
        batas_natrium_mg=float(batas_natrium),
        bmr=bmr,
        tdee=tdee,
    )


# ---------------------------------------------------------------------------
# LAPIS 2 — Portion Solver
# ---------------------------------------------------------------------------


@dataclass
class SolveResult:
    gram: dict[str, float]
    kcal: float
    protein: float
    karbo: float
    lemak: float
    serat: float
    natrium: float
    modal: float
    harga_jual: float
    kalori_ok: bool
    protein_ok: bool
    budget_ok: bool
    natrium_ok: bool
    kriteria_terpenuhi: int = field(init=False)

    def __post_init__(self) -> None:
        self.kriteria_terpenuhi = sum(
            [self.kalori_ok, self.protein_ok, self.budget_ok, self.natrium_ok]
        )


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _hitung_gizi(gram: dict[str, float], ing: pd.DataFrame) -> dict[str, float]:
    """Jumlahkan gizi & modal dari dict {ingredient_id: gram}."""
    total = dict(kcal=0.0, protein=0.0, karbo=0.0, lemak=0.0,
                 serat=0.0, natrium=0.0, modal=0.0)
    for iid, g in gram.items():
        row = ing.loc[iid]
        f = g / 100.0
        total["kcal"] += row.kcal_per_100g * f
        total["protein"] += row.protein_g * f
        total["karbo"] += row.karbo_g * f
        total["lemak"] += row.lemak_g * f
        total["serat"] += row.serat_g * f
        total["natrium"] += row.natrium_mg * f
        total["modal"] += row.harga_per_100g * f
    return total


def _harga_jual(modal: float) -> float:
    return round(modal * MARKUP / 500) * 500


def solve_portions(
    menu_ids: list[str],
    ing: pd.DataFrame,
    target_kcal: float,
    min_protein_g: float,
    budget: float,
    batas_natrium_mg: float = 800,
    iterasi: int = 3,
) -> SolveResult:
    """Constrained proportional scaling. Lihat SPEC.md §3.2.

    Kenapa bukan Linear Programming: komposisi bahan sudah tetap (ditentukan
    menu template), jadi yang dicari hanya skala porsi. Ruang solusinya kecil
    (5-8 variabel) dan hasilnya berbeda <3% dari optimum LP, tanpa butuh
    backend Python terpisah di produksi.
    """
    # --- Langkah 0: porsi awal -------------------------------------------
    gram: dict[str, float] = {}
    for iid in menu_ids:
        row = ing.loc[iid]
        if row.kategori == "base":
            gram[iid] = row.max_gram * 0.7
        elif row.kategori == "dressing":
            gram[iid] = row.min_gram
        else:
            gram[iid] = (row.min_gram + row.max_gram) / 2

    # --- Langkah 1-3: iterasi --------------------------------------------
    for _ in range(iterasi):
        # 1a. skala agar kalori mendekati target
        kcal_now = _hitung_gizi(gram, ing)["kcal"]
        if kcal_now > 0:
            faktor = _clamp(target_kcal / kcal_now, 0.5, 2.0)
            for iid in menu_ids:
                row = ing.loc[iid]
                gram[iid] = _clamp(gram[iid] * faktor, row.min_gram, row.max_gram)

        # 1b. koreksi protein kalau kurang
        protein_now = _hitung_gizi(gram, ing)["protein"]
        if protein_now < min_protein_g:
            kurang = min_protein_g - protein_now
            kandidat = sorted(
                [i for i in menu_ids if ing.loc[i].kategori == "protein"],
                key=lambda i: ing.loc[i].protein_g,
                reverse=True,
            )
            for iid in kandidat:
                row = ing.loc[iid]
                if row.protein_g <= 0:
                    continue
                ruang = row.max_gram - gram[iid]
                if ruang <= 0:
                    continue
                butuh = kurang * 100 / row.protein_g
                tambah = min(ruang, butuh)
                gram[iid] += tambah
                kurang -= tambah * row.protein_g / 100
                if kurang <= 0:
                    break

        # 1c. koreksi harga kalau lewat budget
        #
        # Topping dikurangi lebih dulu, baru protein. Protein HANYA boleh
        # dikurangi selama total protein masih >= min_protein_g — kalau tidak,
        # langkah ini akan membatalkan hasil 1b.
        #
        # Protein wajib ikut dipertimbangkan: pada menu seperti M02 (smoked
        # beef), biaya didominasi oleh proteinnya. Versi yang hanya mengurangi
        # topping tidak pernah bisa membawa menu itu masuk budget — menu
        # tersebut selalu gagal kriteria harga berapa pun budget user.
        if _harga_jual(_hitung_gizi(gram, ing)["modal"]) > budget:
            urutan = sorted(
                [i for i in menu_ids if ing.loc[i].kategori == "topping"],
                key=lambda i: ing.loc[i].harga_per_100g, reverse=True,
            ) + sorted(
                [i for i in menu_ids if ing.loc[i].kategori == "protein"],
                key=lambda i: ing.loc[i].harga_per_100g, reverse=True,
            )
            for iid in urutan:
                row = ing.loc[iid]
                ruang = gram[iid] - row.min_gram
                if ruang <= 0:
                    continue
                potong = ruang * 0.5

                if row.kategori == "protein":
                    # jangan potong melewati batas protein minimum
                    surplus = _hitung_gizi(gram, ing)["protein"] - min_protein_g
                    if surplus <= 0:
                        continue
                    potong = min(potong, surplus * 100 / max(row.protein_g, EPS))

                gram[iid] -= potong
                if _harga_jual(_hitung_gizi(gram, ing)["modal"]) <= budget:
                    break

    # --- Langkah 4: bulatkan ke kelipatan 5 ------------------------------
    for iid in menu_ids:
        row = ing.loc[iid]
        gram[iid] = _clamp(round(gram[iid] / 5) * 5, row.min_gram, row.max_gram)

    t = _hitung_gizi(gram, ing)
    harga = _harga_jual(t["modal"])

    return SolveResult(
        gram=gram,
        kcal=t["kcal"], protein=t["protein"], karbo=t["karbo"],
        lemak=t["lemak"], serat=t["serat"], natrium=t["natrium"],
        modal=t["modal"], harga_jual=harga,
        kalori_ok=abs(t["kcal"] - target_kcal) / target_kcal <= KCAL_TOLERANCE,
        protein_ok=t["protein"] >= min_protein_g,
        budget_ok=harga <= budget,
        natrium_ok=t["natrium"] <= batas_natrium_mg,
    )


# ---------------------------------------------------------------------------
# Feature engineering — HARUS identik dengan src/lib/features.ts
# ---------------------------------------------------------------------------

FEATURE_NAMES = [
    "calorie_gap",
    "protein_surplus",
    "price_ratio",
    "flavor_match",
    "goal_match",
    "form_match",
    "sodium_ratio",
    "fiber_density",
    "protein_density",
]

EPS = 1e-6  # cegah pembagian nol -> NaN diam-diam merusak ranking


def build_features(
    sol: SolveResult,
    menu: pd.Series,
    target_kcal: float,
    min_protein_g: float,
    budget: float,
    tujuan: str,
    rasa: str,
    bentuk: str,
) -> list[float]:
    """9 fitur, urutannya WAJIB sama dengan FEATURE_NAMES."""
    kcal_per_100 = max(sol.kcal / 100.0, EPS)

    return [
        abs(sol.kcal - target_kcal) / max(target_kcal, EPS),
        (sol.protein - min_protein_g) / max(min_protein_g, EPS),
        sol.harga_jual / max(budget, EPS),
        1.0 if menu.tag_rasa == rasa else 0.0,
        1.0 if tujuan in str(menu.cocok_untuk).split("|") else 0.0,
        1.0 if menu.bentuk == bentuk else 0.0,
        sol.natrium / 800.0,
        sol.serat / kcal_per_100,
        sol.protein / kcal_per_100,
    ]


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------


def load_data(data_dir: str = "../data"):
    """Baca CSV. ingredient_id jadi index supaya .loc[] cepat."""
    ing = pd.read_csv(f"{data_dir}/ingredients.csv").set_index("ingredient_id")
    ing["exclusion_tag"] = ing["exclusion_tag"].fillna("")
    ing["tag_rasa"] = ing["tag_rasa"].fillna("")

    menus = pd.read_csv(f"{data_dir}/menu_templates.csv").set_index("menu_id")
    return ing, menus


def menu_ingredient_ids(menu: pd.Series) -> list[str]:
    """Kumpulkan semua ingredient_id dari sebuah menu template."""
    ids: list[str] = []
    for col in ("base_ids", "protein_ids", "topping_ids"):
        val = menu[col]
        if isinstance(val, str) and val.strip():
            ids.extend(val.split("|"))
    if isinstance(menu["dressing_id"], str) and menu["dressing_id"].strip():
        ids.append(menu["dressing_id"])
    return ids


def menu_punya_pantangan(menu: pd.Series, ing: pd.DataFrame, tidak_suka: list[str]) -> bool:
    """Hard filter: True kalau menu mengandung bahan yang di-exclude user."""
    if not tidak_suka:
        return False
    for iid in menu_ingredient_ids(menu):
        tag = ing.loc[iid].exclusion_tag
        if tag and tag in tidak_suka:
            return True
    return False
