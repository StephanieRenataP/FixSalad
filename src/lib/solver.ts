// Lapis 2 — Portion Solver. Port langsung dari solve_portions di
// model/fixsalad_core.py — urutan langkah dan urutan penjumlahan WAJIB sama,
// supaya angka yang keluar identik dengan Python. Lihat SPEC.md §3.
import { EPS, clamp, pyRound } from './num';
import type { Ingredient, NutritionTotals, SolveResult } from './types';

export const MARKUP = 2.0; // harga jual = modal × 2
export const KCAL_TOLERANCE = 0.08; // ±8%
const ITERASI = 3;

/** Jumlahkan gizi & modal dari {ingredientId: gram}, urut sesuai `ids`. */
export function hitungGizi(
  ids: string[],
  gram: Record<string, number>,
  ingredients: Record<string, Ingredient>,
): NutritionTotals {
  const t: NutritionTotals = { kcal: 0, protein: 0, karbo: 0, lemak: 0, serat: 0, natrium: 0, modal: 0 };
  for (const id of ids) {
    const row = ingredients[id];
    if (!row) continue;
    const f = gram[id] / 100;
    t.kcal += row.kcal * f;
    t.protein += row.protein * f;
    t.karbo += row.karbo * f;
    t.lemak += row.lemak * f;
    t.serat += row.serat * f;
    t.natrium += row.natrium * f;
    t.modal += row.harga * f;
  }
  return t;
}

/** Dibulatkan ke Rp 500 terdekat. SPEC.md §3.4. */
export function hargaJual(modal: number): number {
  return pyRound((modal * MARKUP) / 500) * 500;
}

function urutDesc(ids: string[], key: (i: Ingredient) => number, ing: Record<string, Ingredient>): string[] {
  // Array.prototype.sort stabil, sama seperti sorted() Python.
  return [...ids].sort((a, b) => key(ing[b]) - key(ing[a]));
}

export function solvePortions(
  menuIds: string[],
  ingredients: Record<string, Ingredient>,
  targetKcal: number,
  minProteinG: number,
  budget: number,
  batasNatriumMg = 800,
): SolveResult {
  const ids = menuIds.filter((id) => ingredients[id]);
  const ing = ingredients;
  const harga = (g: Record<string, number>) => hargaJual(hitungGizi(ids, g, ing).modal);

  // --- Langkah 0: porsi awal ---------------------------------------------
  const gram: Record<string, number> = {};
  for (const id of ids) {
    const row = ing[id];
    if (row.kategori === 'base') gram[id] = row.maxGram * 0.7;
    else if (row.kategori === 'dressing') gram[id] = row.minGram;
    else gram[id] = (row.minGram + row.maxGram) / 2;
  }

  // --- Langkah 1-3: iterasi ----------------------------------------------
  for (let it = 0; it < ITERASI; it++) {
    // 1a. skala agar kalori mendekati target
    const kcalNow = hitungGizi(ids, gram, ing).kcal;
    if (kcalNow > 0) {
      const faktor = clamp(targetKcal / kcalNow, 0.5, 2.0);
      for (const id of ids) gram[id] = clamp(gram[id] * faktor, ing[id].minGram, ing[id].maxGram);
    }

    // 1b. koreksi protein kalau kurang
    const proteinNow = hitungGizi(ids, gram, ing).protein;
    if (proteinNow < minProteinG) {
      let kurang = minProteinG - proteinNow;
      const kandidat = urutDesc(
        ids.filter((id) => ing[id].kategori === 'protein'),
        (i) => i.protein,
        ing,
      );
      for (const id of kandidat) {
        const row = ing[id];
        if (row.protein <= 0) continue;
        const ruang = row.maxGram - gram[id];
        if (ruang <= 0) continue;
        const butuh = (kurang * 100) / row.protein;
        const tambah = Math.min(ruang, butuh);
        gram[id] += tambah;
        kurang -= (tambah * row.protein) / 100;
        if (kurang <= 0) break;
      }
    }

    // 1c. koreksi harga kalau lewat budget — topping dulu, BARU protein.
    // Protein hanya dipotong selama total protein masih >= minProteinG.
    // Tanpa protein di sini, menu yang biayanya didominasi protein (M02,
    // smoked beef) tidak pernah bisa masuk budget. SPEC.md §3.3.
    if (harga(gram) > budget) {
      const urutan = [
        ...urutDesc(ids.filter((id) => ing[id].kategori === 'topping'), (i) => i.harga, ing),
        ...urutDesc(ids.filter((id) => ing[id].kategori === 'protein'), (i) => i.harga, ing),
      ];
      for (const id of urutan) {
        const row = ing[id];
        const ruang = gram[id] - row.minGram;
        if (ruang <= 0) continue;
        let potong = ruang * 0.5;

        if (row.kategori === 'protein') {
          const surplus = hitungGizi(ids, gram, ing).protein - minProteinG;
          if (surplus <= 0) continue;
          potong = Math.min(potong, (surplus * 100) / Math.max(row.protein, EPS));
        }

        gram[id] -= potong;
        if (harga(gram) <= budget) break;
      }
    }
  }

  // --- Langkah 4: bulatkan ke kelipatan 5, lalu clamp lagi ----------------
  for (const id of ids) gram[id] = clamp(pyRound(gram[id] / 5) * 5, ing[id].minGram, ing[id].maxGram);

  const totals = hitungGizi(ids, gram, ing);
  const hj = hargaJual(totals.modal);
  const constraints = {
    // max(·, EPS): target 0 di Python melempar ZeroDivisionError; di sini cukup jadi false.
    kaloriOk: Math.abs(totals.kcal - targetKcal) / Math.max(targetKcal, EPS) <= KCAL_TOLERANCE,
    proteinOk: totals.protein >= minProteinG,
    budgetOk: hj <= budget,
    natriumOk: totals.natrium <= batasNatriumMg,
  };

  return {
    gram,
    totals,
    hargaJual: hj,
    constraints,
    kriteriaTerpenuhi: Object.values(constraints).filter(Boolean).length,
  };
}
