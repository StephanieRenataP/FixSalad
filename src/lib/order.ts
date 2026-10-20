// Hitungan pesanan setelah user mengubah topping (screen /ubah, /checkout).
// Ini hanya penjumlahan gizi — bukan solver. Solver ada di solver.ts (Lapis 2).
import { INGREDIENT_BY_ID } from './data';
import { hargaJual } from './solver';
import type { NutritionTotals, ScoredMenu } from './types';

export const UNIT_GRAM = 25; // 1 unit topping = 25 g
export const MAX_EXTRA_UNITS = 4;

export function sumNutrition(gram: Record<string, number>): NutritionTotals {
  const t: NutritionTotals = { kcal: 0, protein: 0, karbo: 0, lemak: 0, serat: 0, natrium: 0, modal: 0 };
  for (const [id, g] of Object.entries(gram)) {
    const ing = INGREDIENT_BY_ID[id];
    if (!ing) continue;
    const f = g / 100;
    t.kcal += ing.kcal * f;
    t.protein += ing.protein * f;
    t.karbo += ing.karbo * f;
    t.lemak += ing.lemak * f;
    t.serat += ing.serat * f;
    t.natrium += ing.natrium * f;
    t.modal += ing.harga * f;
  }
  return t;
}

/** Batas bawah counter: tidak boleh memotong porsi di bawah minGram. */
export function minUnits(baseGram: number, ingredientId: string): number {
  const ing = INGREDIENT_BY_ID[ingredientId];
  if (!ing) return 0;
  return -Math.floor(Math.max(0, baseGram - ing.minGram) / UNIT_GRAM);
}

export type AppliedOrder = {
  gram: Record<string, number>;
  totals: NutritionTotals;
  harga: number;
};

export function applyToppings(scored: ScoredMenu, extra: Record<string, number>): AppliedOrder {
  const gram = { ...scored.solve.gram };
  for (const [id, units] of Object.entries(extra)) {
    if (!units) continue;
    gram[id] = Math.max(0, (gram[id] ?? 0) + units * UNIT_GRAM);
  }
  const totals = sumNutrition(gram);
  return { gram, totals, harga: hargaJual(totals.modal) };
}
