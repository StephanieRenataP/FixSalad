// Orkestrasi: hard filter → solver → fitur → ranker → top 3. SPEC.md §1 (alur data).
import { INGREDIENT_BY_ID, MENUS, menuIngredientIds } from './data';
import { buildFeatures } from './features';
import { batasNatrium } from './planner';
import { MODEL_WEIGHTS, scoreAllMenus } from './ranker';
import { solvePortions } from './solver';
import type { Bentuk, Ingredient, MenuTemplate, ModelWeights, Rasa, ScoredMenu, Tujuan } from './types';

export const TOP_N = 3;

export type RecommendInput = {
  targetKcal: number;
  minProteinG: number;
  budget: number;
  tujuan: Tujuan;
  tidakSuka: string[];
  rasa: Rasa | null;
  bentuk: Bentuk | null;
};

export function menuPunyaPantangan(
  menu: MenuTemplate,
  tidakSuka: string[],
  ingredients: Record<string, Ingredient> = INGREDIENT_BY_ID,
): boolean {
  if (tidakSuka.length === 0) return false;
  return menuIngredientIds(menu).some((id) => {
    const tag = ingredients[id]?.exclusionTag;
    return !!tag && tidakSuka.includes(tag);
  });
}

/** Hard filter. Kalau filter bentuk menyisakan nol menu, filter bentuk dilewati —
 *  menawarkan bentuk lain lebih baik daripada tidak menawarkan apa pun. */
export function filterKandidat(input: RecommendInput, menus: MenuTemplate[] = MENUS): MenuTemplate[] {
  const tanpaPantangan = menus.filter((m) => !menuPunyaPantangan(m, input.tidakSuka));
  const bentukCocok = input.bentuk ? tanpaPantangan.filter((m) => m.bentuk === input.bentuk) : tanpaPantangan;
  return bentukCocok.length > 0 ? bentukCocok : tanpaPantangan;
}

/** Terurut skor tertinggi dulu. Array kosong = tidak ada menu yang lolos pantangan. */
export function recommend(
  input: RecommendInput,
  weights: ModelWeights | null = MODEL_WEIGHTS,
  menus: MenuTemplate[] = MENUS,
): ScoredMenu[] {
  const kandidat = filterKandidat(input, menus);
  if (kandidat.length === 0) return [];

  const natrium = batasNatrium(input.tujuan);
  const solved = kandidat.map((menu) => {
    const solve = solvePortions(
      menuIngredientIds(menu),
      INGREDIENT_BY_ID,
      input.targetKcal,
      input.minProteinG,
      input.budget,
      natrium,
    );
    return { menu, solve, features: buildFeatures(solve, menu, input) };
  });

  const scores = scoreAllMenus(
    solved.map((s) => s.features),
    weights,
  );

  return solved
    .map((s, i) => ({ ...s, score: scores[i], rank: 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}
