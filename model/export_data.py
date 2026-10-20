"""
export_data.py
==============
Konversi CSV -> JSON untuk dikonsumsi website.

Jalankan setelah mengubah ingredients.csv atau menu_templates.csv:
    cd model && python export_data.py

Output:
    ../data/ingredients.json
    ../data/menus.json
"""

from __future__ import annotations

import json

from fixsalad_core import load_data, menu_ingredient_ids


def main() -> None:
    ing, menus = load_data()

    ingredients = [
        {
            "id": iid,
            "nama": r.nama,
            "kategori": r.kategori,
            "kcal": float(r.kcal_per_100g),
            "protein": float(r.protein_g),
            "karbo": float(r.karbo_g),
            "lemak": float(r.lemak_g),
            "serat": float(r.serat_g),
            "natrium": float(r.natrium_mg),
            "harga": int(r.harga_per_100g),
            "minGram": int(r.min_gram),
            "maxGram": int(r.max_gram),
            "tagRasa": r.tag_rasa or None,
            "exclusionTag": r.exclusion_tag or None,
        }
        for iid, r in ing.iterrows()
    ]

    menu_list = []
    for mid, m in menus.iterrows():
        def split(col: str) -> list[str]:
            v = m[col]
            return v.split("|") if isinstance(v, str) and v.strip() else []

        menu_list.append({
            "id": mid,
            "nama": m.nama_menu,
            "bentuk": m.bentuk,
            "baseIds": split("base_ids"),
            "proteinIds": split("protein_ids"),
            "toppingIds": split("topping_ids"),
            "dressingId": m.dressing_id,
            "tagRasa": m.tag_rasa,
            "cocokUntuk": split("cocok_untuk"),
            "deskripsi": m.deskripsi,
            # Unsplash CDN. Browser user & build Vercel punya internet normal,
            # jadi ini aman di produksi. Tetap WAJIB ada onError fallback ke
            # placeholder gradient di komponen gambar — lihat SPEC.md §6.5.
            "foto": f"{m.foto_url}?w=800&q=80&auto=format&fit=crop",
        })

    with open("../data/ingredients.json", "w", encoding="utf-8") as f:
        json.dump(ingredients, f, indent=2, ensure_ascii=False)
    with open("../data/menus.json", "w", encoding="utf-8") as f:
        json.dump(menu_list, f, indent=2, ensure_ascii=False)

    print(f"ingredients.json : {len(ingredients)} bahan")
    print(f"menus.json       : {len(menu_list)} menu")

    # --- Sanity check: tiap menu harus punya bahan yang valid ------------
    masalah = 0
    for m_dict, (_, m) in zip(menu_list, menus.iterrows()):
        for iid in menu_ingredient_ids(m):
            if iid not in ing.index:
                print(f"  ERROR {m_dict['id']}: ingredient_id '{iid}' tidak ada di ingredients.csv")
                masalah += 1
        if not m_dict["baseIds"]:
            print(f"  WARNING {m_dict['id']}: tidak punya base")
        if not m_dict["proteinIds"]:
            print(f"  WARNING {m_dict['id']}: tidak punya protein")

    print("Semua referensi bahan valid." if masalah == 0 else f"{masalah} referensi rusak.")


if __name__ == "__main__":
    main()
