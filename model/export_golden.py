"""
export_golden.py
================
Bangkitkan "golden fixture": output fixsalad_core.py (sumber kebenaran) untuk
sekumpulan input acak + ekstrem. Test TypeScript (src/lib/__tests__/parity.test.ts)
membandingkan hasil planner/solver/features/ranker TS dengan file ini.

Jalankan ulang setiap kali ingredients.csv, menu_templates.csv, fixsalad_core.py,
atau model_weights.json berubah:

    cd model
    python export_golden.py
"""

from __future__ import annotations

import json
import math
import os
import random

from fixsalad_core import (
    BodyData,
    build_features,
    hitung_target,
    load_data,
    menu_ingredient_ids,
    solve_portions,
)

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "data")
OUT = os.path.join(HERE, "..", "src", "lib", "__tests__", "fixtures", "python_golden.json")

TUJUAN = ["defisit_kalori", "bulking", "high_protein", "rendah_garam"]
RASA = ["pedas", "gurih", "segar"]
BENTUK = ["bowl", "wrap"]
AKTIVITAS = ["sedentary", "ringan", "sedang", "aktif", "sangat_aktif"]


def score_all(rows: list[list[float]], w: dict) -> list[float]:
    """Inference yang sama dengan SPEC.md §4.7: center -> standardize -> dot -> sigmoid."""
    n, d = len(rows), len(w["feature_names"])
    mean = [sum(r[i] for r in rows) / n for i in range(d)]
    out = []
    for r in rows:
        z = w["intercept"]
        for i in range(d):
            z += ((r[i] - mean[i]) - w["scaler_mean"][i]) / w["scaler_scale"][i] * w["coefficients"][i]
        # minProteinG = 0 -> protein_surplus ~1e7 (EPS) -> |z| besar; math.exp bisa overflow
        out.append(1.0 if z > 700 else 0.0 if z < -700 else 1 / (1 + math.exp(-z)))
    return out


def main() -> None:
    ing, menus = load_data(DATA_DIR)
    with open(os.path.join(DATA_DIR, "model_weights.json"), encoding="utf-8") as f:
        weights = json.load(f)

    rng = random.Random(20261021)

    planner_cases = []
    for _ in range(100):
        b = BodyData(
            berat_kg=rng.randint(30, 200),
            tinggi_cm=rng.randint(120, 220),
            usia=rng.randint(15, 80),
            gender=rng.choice(["pria", "wanita"]),
            aktivitas=rng.choice(AKTIVITAS),
            makan_per_hari=rng.randint(2, 5),
        )
        tujuan = rng.choice(TUJUAN)
        t = hitung_target(b, tujuan)
        planner_cases.append({
            "body": {"beratKg": b.berat_kg, "tinggiCm": b.tinggi_cm, "usia": b.usia, "gender": b.gender,
                     "aktivitas": b.aktivitas, "makanPerHari": b.makan_per_hari},
            "tujuan": tujuan,
            "targetKcal": t.target_kcal, "minProteinG": t.min_protein_g,
            "batasNatriumMg": t.batas_natrium_mg, "bmr": float(t.bmr), "tdee": float(t.tdee),
        })

    scenarios = []
    for _ in range(150):
        scenarios.append({
            "targetKcal": rng.choice(range(250, 1210, 10)),
            "minProteinG": rng.randint(10, 70),
            "budget": rng.choice(range(15000, 80500, 500)),
            "tujuan": rng.choice(TUJUAN),
            "rasa": rng.choice(RASA),
            "bentuk": rng.choice(BENTUK),
        })
    # input ekstrem
    for kcal, prot, budget in [(100, 30, 40000), (2000, 30, 40000), (500, 30, 10000),
                               (500, 0, 40000), (500, 200, 40000), (500, 30, 0)]:
        scenarios.append({"targetKcal": kcal, "minProteinG": prot, "budget": budget,
                          "tujuan": "high_protein", "rasa": "segar", "bentuk": "bowl"})

    solver_cases = []
    for s in scenarios:
        batas = 500 if s["tujuan"] == "rendah_garam" else 800
        menus_out = []
        for mid, menu in menus.iterrows():
            sol = solve_portions(menu_ingredient_ids(menu), ing, s["targetKcal"], s["minProteinG"],
                                 s["budget"], batas)
            feats = build_features(sol, menu, s["targetKcal"], s["minProteinG"], s["budget"],
                                   s["tujuan"], s["rasa"], s["bentuk"])
            menus_out.append({
                "menuId": mid,
                "gram": {k: float(v) for k, v in sol.gram.items()},
                "kcal": float(sol.kcal), "protein": float(sol.protein), "natrium": float(sol.natrium),
                "modal": float(sol.modal), "hargaJual": float(sol.harga_jual),
                "kaloriOk": bool(sol.kalori_ok), "proteinOk": bool(sol.protein_ok),
                "budgetOk": bool(sol.budget_ok), "natriumOk": bool(sol.natrium_ok),
                "features": [float(x) for x in feats],
            })
        scores = score_all([m["features"] for m in menus_out], weights)
        for m, sc in zip(menus_out, scores):
            m["score"] = sc
        solver_cases.append({"input": {**s, "batasNatriumMg": batas}, "menus": menus_out})

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"planner": planner_cases, "solver": solver_cases}, f)
    print(f"{len(planner_cases)} planner + {len(solver_cases)} solver cases -> {OUT}")


if __name__ == "__main__":
    main()
