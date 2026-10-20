// DATA DUMMY — hanya untuk sesi 1 (UI). Sesi 2 mengganti ini dengan hasil
// planner → solver → ranker yang sebenarnya.
import { MENU_BY_ID } from './data';
import { hargaJual, sumNutrition } from './order';
import type { ScoredMenu } from './types';

export const DUMMY_TARGET = { targetKcal: 500, minProteinG: 30, budget: 40000 };

const DUMMY_PORTIONS: { menuId: string; score: number; gram: Record<string, number> }[] = [
  {
    menuId: 'M01',
    score: 0.92,
    gram: { B01: 80, P01: 110, P02: 50, T05: 40, T06: 40, T01: 40, D03: 15 },
  },
  {
    menuId: 'M02',
    score: 0.71,
    gram: { B02: 80, P03: 45, P02: 60, T10: 40, T04: 40, T01: 40, D04: 15 },
  },
  {
    menuId: 'M03',
    score: 0.58,
    gram: { B05: 70, B03: 50, P05: 80, P06: 60, T03: 30, T01: 30, D02: 15 },
  },
];

export const DUMMY_REKOMENDASI: ScoredMenu[] = DUMMY_PORTIONS.map((p, idx) => {
  const totals = sumNutrition(p.gram);
  const harga = hargaJual(totals.modal);
  const { targetKcal, minProteinG, budget } = DUMMY_TARGET;
  return {
    menu: MENU_BY_ID[p.menuId],
    solve: {
      gram: p.gram,
      totals,
      hargaJual: harga,
      constraints: {
        kaloriOk: Math.abs(totals.kcal - targetKcal) / targetKcal <= 0.08,
        proteinOk: totals.protein >= minProteinG,
        budgetOk: harga <= budget,
        pantanganOk: true,
        natriumOk: true,
      },
    },
    features: [],
    score: p.score,
    rank: idx + 1,
  };
});
