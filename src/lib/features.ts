// 9 fitur untuk ranker — HARUS identik dengan build_features di
// model/fixsalad_core.py. Urutannya = feature_names di data/model_weights.json.
// Lihat SPEC.md §4.2.
import { EPS } from './num';
import type { Bentuk, MenuTemplate, Rasa, SolveResult, Tujuan } from './types';

export const FEATURE_NAMES = [
  'calorie_gap',
  'protein_surplus',
  'price_ratio',
  'flavor_match',
  'goal_match',
  'form_match',
  'sodium_ratio',
  'fiber_density',
  'protein_density',
] as const;

export type FeatureContext = {
  targetKcal: number;
  minProteinG: number;
  budget: number;
  tujuan: Tujuan;
  rasa: Rasa | null;
  bentuk: Bentuk | null;
};

/** EPS di tiap pembagian: budget = 0 tanpa EPS → Infinity, ranking rusak diam-diam. */
export function buildFeatures(sol: SolveResult, menu: MenuTemplate, ctx: FeatureContext): number[] {
  const t = sol.totals;
  const kcalPer100 = Math.max(t.kcal / 100, EPS);

  return [
    Math.abs(t.kcal - ctx.targetKcal) / Math.max(ctx.targetKcal, EPS),
    (t.protein - ctx.minProteinG) / Math.max(ctx.minProteinG, EPS),
    sol.hargaJual / Math.max(ctx.budget, EPS),
    menu.tagRasa === ctx.rasa ? 1 : 0,
    menu.cocokUntuk.includes(ctx.tujuan) ? 1 : 0,
    menu.bentuk === ctx.bentuk ? 1 : 0,
    t.natrium / 800,
    t.serat / kcalPer100,
    t.protein / kcalPer100,
  ];
}
