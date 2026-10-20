// TypeScript vs Python (sumber kebenaran). Fixture dibuat oleh model/export_golden.py
// dari model/fixsalad_core.py. Kalau test ini gagal, yang salah TypeScript-nya.
import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID, MENU_BY_ID, menuIngredientIds } from '../data';
import { buildFeatures } from '../features';
import { calculateTargets } from '../planner';
import { scoreAllMenus } from '../ranker';
import { solvePortions } from '../solver';
import type { BodyData, Bentuk, Rasa, Tujuan } from '../types';
import golden from './fixtures/python_golden.json';

type GoldenMenu = (typeof golden.solver)[number]['menus'][number];

describe('paritas dengan model/fixsalad_core.py', () => {
  it(`planner: ${golden.planner.length} kasus identik`, () => {
    for (const c of golden.planner) {
      const t = calculateTargets(c.body as BodyData, c.tujuan as Tujuan);
      expect(t.targetKcal).toBe(c.targetKcal);
      expect(t.minProteinG).toBe(c.minProteinG);
      expect(t.batasNatriumMg).toBe(c.batasNatriumMg);
      expect(t.bmr).toBeCloseTo(c.bmr, 9);
      expect(t.tdee).toBeCloseTo(c.tdee, 9);
    }
  });

  it(`solver + fitur + ranker: ${golden.solver.length} skenario × 5 menu identik`, () => {
    let menus = 0;
    for (const c of golden.solver) {
      const inp = c.input;
      const rows: number[][] = [];
      for (const g of c.menus as GoldenMenu[]) {
        const menu = MENU_BY_ID[g.menuId];
        const sol = solvePortions(menuIngredientIds(menu), INGREDIENT_BY_ID, inp.targetKcal, inp.minProteinG, inp.budget, inp.batasNatriumMg);

        // gram harus SAMA PERSIS (kelipatan 5 — tidak ada ruang untuk toleransi)
        expect(sol.gram, `${g.menuId} ${JSON.stringify(inp)}`).toEqual(g.gram);
        expect(sol.hargaJual).toBe(g.hargaJual);
        expect(sol.totals.kcal).toBeCloseTo(g.kcal, 9);
        expect(sol.totals.protein).toBeCloseTo(g.protein, 9);
        expect(sol.totals.natrium).toBeCloseTo(g.natrium, 9);
        expect(sol.totals.modal).toBeCloseTo(g.modal, 9);
        expect(sol.constraints).toEqual({
          kaloriOk: g.kaloriOk,
          proteinOk: g.proteinOk,
          budgetOk: g.budgetOk,
          natriumOk: g.natriumOk,
        });

        const f = buildFeatures(sol, menu, {
          targetKcal: inp.targetKcal,
          minProteinG: inp.minProteinG,
          budget: inp.budget,
          tujuan: inp.tujuan as Tujuan,
          rasa: inp.rasa as Rasa,
          bentuk: inp.bentuk as Bentuk,
        });
        f.forEach((v, i) => expect(v).toBeCloseTo(g.features[i], 6));
        rows.push(f);
        menus++;
      }
      const scores = scoreAllMenus(rows);
      scores.forEach((s, i) => expect(s).toBeCloseTo(c.menus[i].score, 9));
    }
    expect(menus).toBe(golden.solver.length * 5);
  });
});
