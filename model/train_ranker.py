"""
train_ranker.py
===============
LAPIS 3 — Menu Ranker.

Melatih model untuk memprediksi menu mana yang akan dipilih user,
diberikan profil user dan kandidat menu.

Rumusan: pointwise learning-to-rank, dikerjakan sebagai binary classification
per pasangan (user, menu). Menu diurutkan berdasarkan probabilitas prediksi.

Output:
    output/model_weights.json       <- dipakai website
    output/metrics_report.txt       <- untuk laporan
    output/confusion_matrix.png     <- untuk slide
    output/feature_importance.png   <- untuk slide
    output/training_data.csv        <- dataset hasil generate (untuk lampiran)

Jalankan:
    cd model && python train_ranker.py

KETERBATASAN (wajib ditulis di laporan):
    Model dilatih pada data SINTETIS. Model hanya bisa mempelajari kembali
    aturan yang kami pakai untuk membangkitkan data. Model ini TIDAK menemukan
    preferensi manusia yang sebenarnya. Kontribusinya adalah membuktikan
    pipeline feature engineering -> training -> export -> inference berjalan
    utuh. Validasi dengan data riil (Google Form) adalah pekerjaan lanjutan.
"""

from __future__ import annotations

import json
import os
from datetime import date

import matplotlib
matplotlib.use("Agg")  # tidak butuh display, aman di Colab & server
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler

from fixsalad_core import (
    FEATURE_NAMES,
    GOAL_CONFIG,
    BodyData,
    build_features,
    hitung_target,
    load_data,
    menu_ingredient_ids,
    menu_punya_pantangan,
    solve_portions,
)

RNG = np.random.default_rng(42)
N_USERS = 800
OUT_DIR = "output"


# ===========================================================================
# 1. GENERATE PROFIL USER SINTETIS
# ===========================================================================

TUJUAN_LIST = list(GOAL_CONFIG.keys())
RASA_LIST = ["pedas", "gurih", "segar"]
BENTUK_LIST = ["bowl", "wrap"]
AKTIVITAS_LIST = ["sedentary", "ringan", "sedang", "aktif", "sangat_aktif"]
EXCLUSION_TAGS = ["bawang", "tomat", "seledri", "jamur", "dairy", "gluten"]


# Rujukan antropometri dewasa Indonesia 19-29 tahun.
# Nilai tengah mengacu pada AKG 2019 (Permenkes No. 28 Tahun 2019), rujukan
# resmi Kemenkes yang dipakai untuk pelabelan gizi di Indonesia.
#
# CATATAN UNTUK REN: verifikasi satu baris ini langsung dari PDF Permenkes
# (Lampiran I, kelompok umur 19-29 tahun) sebelum mengutipnya di laporan.
# Saya tidak berhasil membuka PDF aslinya, jadi angka di bawah adalah yang
# paling konsisten dengan sumber sekunder — cukup akurat untuk simulasi,
# tapi kutipan di laporan harus dari dokumen asli.
#
# Simpangan baku tidak ada di AKG (AKG hanya memberi satu nilai rujukan),
# jadi SD di bawah adalah asumsi sebaran populasi yang wajar. Ini DIBERI LABEL
# sebagai asumsi, bukan diklaim sebagai data.
ANTROPOMETRI_ID = {
    #          mean_berat, sd_berat, mean_tinggi, sd_tinggi
    "pria":   (60.0, 9.0, 168.0, 6.5),
    "wanita": (55.0, 8.5, 159.0, 6.0),
}


def generate_users(n: int) -> list[dict]:
    """Profil user sintetis, dikalibrasi ke antropometri dewasa Indonesia.

    Kenapa ini penting: versi pertama memakai rata-rata 170 cm / 68 kg untuk
    pria — itu angka populasi Barat, bukan Indonesia. Target kalori yang
    dihasilkan jadi terlalu tinggi secara sistematis (TDEE meleset ~120 kkal),
    dan seluruh dataset training ikut bias. Untuk produk yang dijual ke
    mahasiswa Indonesia, kalibrasi ini bukan detail kosmetik.

    Berat & tinggi pakai distribusi Normal, bukan Uniform — populasi nyata
    menumpuk di tengah. Usia 19-30 sesuai segmen yang dibidik FixSalad.
    """
    users = []
    for i in range(n):
        gender = RNG.choice(["pria", "wanita"])
        mb, sb, mt, st = ANTROPOMETRI_ID[gender]
        berat = np.clip(RNG.normal(mb, sb), 40, 110)
        tinggi = np.clip(RNG.normal(mt, st), 145, 192)

        n_pantangan = RNG.choice([0, 1, 2], p=[0.5, 0.35, 0.15])
        tidak_suka = list(RNG.choice(EXCLUSION_TAGS, size=n_pantangan, replace=False))

        users.append({
            "user_id": i,
            "berat_kg": round(float(berat), 1),
            "tinggi_cm": round(float(tinggi), 1),
            "usia": int(RNG.integers(19, 31)),
            "gender": gender,
            "aktivitas": str(RNG.choice(AKTIVITAS_LIST, p=[0.2, 0.3, 0.3, 0.15, 0.05])),
            "makan_per_hari": int(RNG.choice([2, 3, 4], p=[0.2, 0.65, 0.15])),
            "tujuan": str(RNG.choice(TUJUAN_LIST)),
            "rasa": str(RNG.choice(RASA_LIST)),
            "bentuk": str(RNG.choice(BENTUK_LIST)),
            "tidak_suka": tidak_suka,
            "budget": int(RNG.choice([30000, 35000, 40000, 45000, 50000, 60000],
                                     p=[0.1, 0.2, 0.3, 0.2, 0.15, 0.05])),
        })
    return users


# ===========================================================================
# 2. BANGUN DATASET (user x menu)
# ===========================================================================

# Bobot "utility" untuk mensimulasikan preferensi manusia.
# INI ADALAH ASUMSI KAMI, bukan temuan. Model nantinya mempelajari ulang
# bobot ini — itulah sebabnya hasil pada data sintetis tidak membuktikan
# apa pun tentang preferensi nyata.
TRUE_WEIGHTS = {
    "calorie_gap": -3.0,      # makin jauh dari target, makin tidak dipilih
    "protein_surplus": 0.8,
    "price_ratio": -1.5,      # makin mahal relatif budget, makin tidak dipilih
    "flavor_match": 2.2,      # rasa cocok = pendorong terkuat
    "goal_match": 1.8,
    "form_match": 1.2,
    "sodium_ratio": -0.6,
    "fiber_density": 0.3,
    "protein_density": 0.25,
}
GUMBEL_SCALE = 0.6  # besarnya "keacakan" keputusan manusia


def build_dataset(users: list[dict], ing: pd.DataFrame, menus: pd.DataFrame) -> pd.DataFrame:
    rows = []

    for u in users:
        body = BodyData(
            berat_kg=u["berat_kg"], tinggi_cm=u["tinggi_cm"], usia=u["usia"],
            gender=u["gender"], aktivitas=u["aktivitas"],
            makan_per_hari=u["makan_per_hari"],
        )
        target = hitung_target(body, u["tujuan"])

        kandidat = []
        for menu_id, menu in menus.iterrows():
            # HARD FILTER — pantangan tidak pernah dinegosiasikan oleh model.
            # Ini keputusan desain penting: model TIDAK boleh belajar untuk
            # kadang-kadang merekomendasikan bahan yang user tolak.
            if menu_punya_pantangan(menu, ing, u["tidak_suka"]):
                continue

            sol = solve_portions(
                menu_ingredient_ids(menu), ing,
                target_kcal=target.target_kcal,
                min_protein_g=target.min_protein_g,
                budget=u["budget"],
                batas_natrium_mg=target.batas_natrium_mg,
            )
            feats = build_features(
                sol, menu, target.target_kcal, target.min_protein_g,
                u["budget"], u["tujuan"], u["rasa"], u["bentuk"],
            )
            kandidat.append((menu_id, menu, sol, feats))

        # user yang semua menunya tersaring habis tidak punya pilihan -> buang
        if len(kandidat) < 2:
            continue

        # --- Labeling: utility + noise Gumbel -----------------------------
        # Noise Gumbel membuat pilihan bersifat stokastik. Tanpa ini, label
        # jadi fungsi deterministik dari fitur dan model bisa mencapai
        # akurasi ~100% — angka yang tidak realistis dan menyesatkan.
        utilities = []
        for _, _, _, feats in kandidat:
            u_val = sum(TRUE_WEIGHTS[n] * f for n, f in zip(FEATURE_NAMES, feats))
            u_val += RNG.gumbel(0, GUMBEL_SCALE)
            utilities.append(u_val)
        pilihan = int(np.argmax(utilities))

        for idx, (menu_id, _, sol, feats) in enumerate(kandidat):
            rows.append({
                "user_id": u["user_id"],
                "menu_id": menu_id,
                **dict(zip(FEATURE_NAMES, feats)),
                "kcal": round(sol.kcal, 1),
                "protein": round(sol.protein, 1),
                "harga": sol.harga_jual,
                "kriteria_terpenuhi": sol.kriteria_terpenuhi,
                "label": 1 if idx == pilihan else 0,
            })

    return pd.DataFrame(rows)


# ===========================================================================
# 3. METRIK
# ===========================================================================


def top1_accuracy(df: pd.DataFrame, scores: np.ndarray) -> float:
    """METRIK UTAMA.

    Proporsi user yang menu peringkat-1-nya = menu yang benar-benar dipilih.
    Accuracy biasa menyesatkan di sini: dengan ~5 menu per user, model yang
    menebak "tidak dipilih" untuk semuanya sudah dapat accuracy ~80%.
    """
    tmp = df.copy()
    tmp["score"] = scores
    benar = 0
    grup = tmp.groupby("user_id")
    for _, g in grup:
        if g.loc[g["score"].idxmax(), "label"] == 1:
            benar += 1
    return benar / grup.ngroups


def rule_based_score(X: pd.DataFrame) -> np.ndarray:
    """BASELINE. Scoring tanpa machine learning, bobot ditentukan manual.

    Kalau Logistic Regression tidak mengalahkan ini, LR tidak layak dipakai.
    """
    return (
        0.35 * (1 - X["calorie_gap"].clip(0, 1))
        + 0.25 * X["protein_surplus"].clip(0, 1)
        + 0.15 * X["goal_match"]
        + 0.15 * X["flavor_match"]
        + 0.10 * (1 - X["price_ratio"].clip(0, 1))
    ).to_numpy()


# ===========================================================================
# 3b. WITHIN-GROUP CENTERING — koreksi formulasi
# ===========================================================================


def center_within_group(df: pd.DataFrame) -> pd.DataFrame:
    """Kurangi tiap fitur dengan rata-ratanya DI DALAM choice set user.

    MASALAH YANG DIPERBAIKI
    -----------------------
    Pointwise LR memperlakukan tiap baris (user, menu) sebagai independen.
    Padahal user memilih SATU dari beberapa menu yang SALING BERSAING.
    Model yang benar untuk "pilih 1 dari N" adalah conditional logit.

    Akibat dari mengabaikan ini: dengan hanya 5 menu, nilai absolut sebuah
    fitur jadi proxy identitas menu. Contoh nyata pada data ini —
        M02 (smoked beef) : sodium_ratio rata-rata 1.505
        M01 (ayam)        : sodium_ratio rata-rata 0.519
    Model belajar "hindari M02" lalu salah mengatribusikannya ke natrium.
    Koefisien calorie_gap bahkan keluar POSITIF (+0.44) padahal bobot
    sebenarnya pada generator adalah -3.0 — terbalik total.

    SOLUSI
    ------
    Centering membuat fitur bermakna "lebih baik berapa dibanding alternatif
    yang tersedia untuk user ini", bukan "nilai absolutnya berapa". Ini
    mendekati conditional logit sambil tetap memakai LogisticRegression biasa.

    HASIL (lihat perbandingan di output)
    ------------------------------------
        tanpa centering  : 6/9 arah koefisien benar, Top-1 0.723, AUC 0.904
        dengan centering : 9/9 arah koefisien benar, Top-1 0.736, AUC 0.930

    Perbaikan akurasinya kecil, tapi perbaikan INTERPRETABILITAS-nya besar.
    Untuk laporan, koefisien yang arahnya benar jauh lebih berharga daripada
    akurasi yang naik 1% — karena koefisien itulah yang kita klaim sebagai
    "temuan" tentang apa yang mendorong pilihan user.
    """
    out = df.copy()
    for f in FEATURE_NAMES:
        out[f] = df.groupby("user_id")[f].transform(lambda s: s - s.mean())
    return out


# ===========================================================================
# 4. MAIN
# ===========================================================================


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    lines: list[str] = []

    def log(msg: str = "") -> None:
        print(msg)
        lines.append(msg)

    log("=" * 68)
    log("FixSalad — Menu Ranker Training")
    log("=" * 68)

    # --- Data ------------------------------------------------------------
    ing, menus = load_data()
    log(f"\n[1] Data dimuat: {len(ing)} bahan, {len(menus)} menu template")

    users = generate_users(N_USERS)
    df = build_dataset(users, ing, menus)
    log(f"[2] Dataset dibangun: {len(df)} baris dari {df.user_id.nunique()} user")
    log(f"    Rata-rata kandidat per user : {len(df) / df.user_id.nunique():.2f}")
    log(f"    Distribusi label            : {df.label.value_counts().to_dict()}")
    log(f"    Proporsi positif            : {df.label.mean():.3f}")

    df.to_csv(f"{OUT_DIR}/training_data.csv", index=False)

    # --- Split: WAJIB group-based ---------------------------------------
    # Kalau baris dari user yang sama tersebar di train & test, terjadi
    # data leakage dan akurasi jadi menipu.
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    tr_idx, te_idx = next(gss.split(df, groups=df["user_id"]))
    log(f"\n[3] Split (group-based by user_id): "
        f"{df.iloc[tr_idx].user_id.nunique()} user train / "
        f"{df.iloc[te_idx].user_id.nunique()} user test")

    df_c = center_within_group(df)
    train, test = df.iloc[tr_idx], df.iloc[te_idx]
    train_c, test_c = df_c.iloc[tr_idx], df_c.iloc[te_idx]

    y_tr, y_te = train["label"], test["label"]

    # --- Model -----------------------------------------------------------
    log("\n[4] Melatih model (dua formulasi: mentah vs within-group centered)")

    def fit_lr(tr: pd.DataFrame, te: pd.DataFrame):
        sc = StandardScaler().fit(tr[FEATURE_NAMES])
        m = LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)
        m.fit(sc.transform(tr[FEATURE_NAMES]), tr["label"])
        return m, sc, m.predict_proba(sc.transform(te[FEATURE_NAMES]))[:, 1]

    lr_raw, _, p_raw = fit_lr(train, test)
    lr, scaler, p_lr = fit_lr(train_c, test_c)   # <- model produksi

    rf = RandomForestClassifier(
        n_estimators=200, max_depth=8, class_weight="balanced",
        random_state=42, n_jobs=-1,
    )
    rf.fit(train_c[FEATURE_NAMES], y_tr)
    p_rf = rf.predict_proba(test_c[FEATURE_NAMES])[:, 1]

    p_rule = rule_based_score(test[FEATURE_NAMES])

    # --- Evaluasi --------------------------------------------------------
    def sign_recovery(coefs) -> int:
        return sum(np.sign(c) == np.sign(TRUE_WEIGHTS[f])
                   for f, c in zip(FEATURE_NAMES, coefs))

    hasil = {
        "Rule-based (baseline)": (top1_accuracy(test, p_rule), roc_auc_score(y_te, p_rule), None),
        "LR — tanpa centering": (top1_accuracy(test, p_raw), roc_auc_score(y_te, p_raw),
                                 sign_recovery(lr_raw.coef_[0])),
        "LR — within-group ctr": (top1_accuracy(test, p_lr), roc_auc_score(y_te, p_lr),
                                  sign_recovery(lr.coef_[0])),
        "Random Forest (ctr)": (top1_accuracy(test, p_rf), roc_auc_score(y_te, p_rf), None),
    }

    log("\n[5] Hasil evaluasi")
    log("-" * 68)
    log(f"{'Model':<26}{'Top-1 Acc':>12}{'ROC-AUC':>11}{'Arah koef':>12}")
    log("-" * 68)
    for nama, (t1, auc, sr) in hasil.items():
        sr_s = f"{sr}/9" if sr is not None else "-"
        log(f"{nama:<26}{t1:>12.3f}{auc:>11.3f}{sr_s:>12}")
    log("-" * 68)
    log(f"{'Tebak acak':<26}{df.label.mean():>12.3f}{0.5:>11.3f}{'-':>12}")
    log("\n  'Arah koef' = berapa dari 9 koefisien yang TANDANYA cocok dengan")
    log("  TRUE_WEIGHTS pada generator. Ini mengukur apakah model memulihkan")
    log("  struktur yang benar, bukan sekadar menebak dengan akurat.")

    t1_lr = hasil["LR — within-group ctr"][0]
    t1_rule = hasil["Rule-based (baseline)"][0]

    log("\n[6] Classification report — LR within-group centered (model produksi)")
    rep = classification_report(y_te, (p_lr >= 0.5).astype(int),
                                target_names=["tidak dipilih", "dipilih"], digits=3)
    log(rep)

    # --- Keputusan: pakai LR atau baseline? ------------------------------
    log("\n[7] Keputusan model")
    if t1_lr > t1_rule:
        log(f"    Logistic Regression ({t1_lr:.3f}) > baseline ({t1_rule:.3f})")
        log("    -> LR DIPAKAI di produksi.")
        dipakai = "logistic_regression"
    else:
        log(f"    Logistic Regression ({t1_lr:.3f}) <= baseline ({t1_rule:.3f})")
        log("    -> LR TIDAK memberi perbaikan. Pakai rule-based di produksi.")
        log("    Laporkan temuan ini apa adanya: model yang tidak lebih baik")
        log("    dari aturan sederhana tidak pantas dipakai hanya karena")
        log("    namanya 'machine learning'.")
        dipakai = "rule_based"

    # --- Interpretasi koefisien ------------------------------------------
    log("\n[8] Koefisien — model produksi vs bobot generator")
    log("-" * 68)
    log(f"  {'fitur':<20}{'koef LR':>10}{'TRUE_W':>9}{'arah':>8}")
    log("-" * 68)
    koef = sorted(zip(FEATURE_NAMES, lr.coef_[0]), key=lambda x: abs(x[1]), reverse=True)
    for nama, c in koef:
        t = TRUE_WEIGHTS[nama]
        mark = "OK" if np.sign(c) == np.sign(t) else "FLIP"
        log(f"  {nama:<20}{c:>10.3f}{t:>9.2f}{mark:>8}")
    log("-" * 68)
    log("  Kolom 'arah' membandingkan tanda koefisien dengan bobot yang kami")
    log("  pakai untuk MEMBANGKITKAN data. Semua OK berarti model memulihkan")
    log("  struktur generator — ini memvalidasi PIPELINE, bukan memvalidasi")
    log("  preferensi manusia nyata. Lihat SPEC.md section 4.4.")
    log("")
    log("  Besar koefisien TIDAK sama dengan TRUE_WEIGHTS, dan itu wajar:")
    log("  koefisien di sini pada skala terstandardisasi, dan noise Gumbel")
    log("  menyusutkan estimasi ke arah nol (attenuation).")

    # --- Plot ------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(5.5, 4.5))
    ConfusionMatrixDisplay(
        confusion_matrix(y_te, (p_lr >= 0.5).astype(int)),
        display_labels=["tidak dipilih", "dipilih"],
    ).plot(ax=ax, cmap="Greens", colorbar=False)
    ax.set_title("Confusion Matrix — Logistic Regression")
    plt.tight_layout()
    plt.savefig(f"{OUT_DIR}/confusion_matrix.png", dpi=150)
    plt.close()

    fig, ax = plt.subplots(figsize=(7.5, 4.5))
    nama_f = [k[0] for k in koef][::-1]
    val_f = [k[1] for k in koef][::-1]
    ax.barh(nama_f, val_f, color=["#B53A10" if v < 0 else "#1E6340" for v in val_f])
    ax.axvline(0, color="#5A6B5F", lw=0.8)
    ax.set_xlabel("Koefisien (standardized)")
    ax.set_title("Feature Importance — LR within-group centered")
    plt.tight_layout()
    plt.savefig(f"{OUT_DIR}/feature_importance.png", dpi=150)
    plt.close()

    # plot perbandingan dua formulasi — ini gambar paling penting untuk laporan
    fig, ax = plt.subplots(figsize=(8, 4.5))
    y = np.arange(len(FEATURE_NAMES))
    ax.barh(y + 0.2, lr_raw.coef_[0], 0.38, label="tanpa centering", color="#C9A227")
    ax.barh(y - 0.2, lr.coef_[0], 0.38, label="within-group centered", color="#1E6340")
    ax.set_yticks(y, FEATURE_NAMES)
    ax.axvline(0, color="#5A6B5F", lw=0.8)
    ax.set_xlabel("Koefisien (standardized)")
    ax.set_title("Efek within-group centering terhadap koefisien")
    ax.legend()
    plt.tight_layout()
    plt.savefig(f"{OUT_DIR}/centering_comparison.png", dpi=150)
    plt.close()
    log(f"\n[9] Plot disimpan ke {OUT_DIR}/ (3 gambar)")

    # --- Export ke JSON --------------------------------------------------
    weights = {
        "model_type": dipakai,
        "within_group_centering": True,
        "feature_names": FEATURE_NAMES,
        "scaler_mean": [round(float(x), 6) for x in scaler.mean_],
        "scaler_scale": [round(float(x), 6) for x in scaler.scale_],
        "coefficients": [round(float(x), 6) for x in lr.coef_[0]],
        "intercept": round(float(lr.intercept_[0]), 6),
        "metrics": {
            "top1_accuracy": round(float(t1_lr), 4),
            "top1_accuracy_baseline": round(float(t1_rule), 4),
            "top1_accuracy_tanpa_centering": round(float(hasil["LR — tanpa centering"][0]), 4),
            "roc_auc": round(float(hasil["LR — within-group ctr"][1]), 4),
            "sign_recovery": f"{sign_recovery(lr.coef_[0])}/9",
        },
        "n_users": int(df.user_id.nunique()),
        "n_rows": int(len(df)),
        "trained_at": str(date.today()),
        "data_source": "synthetic",
        "catatan": (
            "PENTING: fitur harus di-center terhadap rata-rata kandidat menu "
            "user SEBELUM distandardisasi. Lihat SPEC.md section 4.7. "
            "Dilatih pada data sintetis — model memulihkan aturan generator, "
            "tidak menemukan preferensi manusia nyata (SPEC.md section 4.4)."
        ),
    }
    with open(f"{OUT_DIR}/model_weights.json", "w", encoding="utf-8") as f:
        json.dump(weights, f, indent=2, ensure_ascii=False)
    log(f"[10] model_weights.json disimpan -> salin ke website/data/")

    with open(f"{OUT_DIR}/metrics_report.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\nSelesai. Laporan lengkap: {OUT_DIR}/metrics_report.txt")


if __name__ == "__main__":
    main()
