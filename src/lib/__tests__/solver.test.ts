import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID, MENUS, MENU_BY_ID, menuIngredientIds } from '../data';
import { buildFeatures } from '../features';
import { recommend } from '../recommend';
import { scoreAllMenus } from '../ranker';
import { solvePortions } from '../solver';
import type { Tujuan } from '../types';
import { allNumbers, makeRng } from './helpers';

const TUJUAN: Tujuan[] = ['defisit_kalori', 'bulking', 'high_protein', 'rendah_garam'];

function randomInput(rng: ReturnType<typeof makeRng>) {
  return {
    targetKcal: rng.int(100, 2000),
    minProteinG: rng.int(0, 200),
    budget: rng.int(0, 100) * 1000,
    batas: rng.pick([500, 800]),
  };
}

describe('solvePortions — angka selalu valid (NaN / Infinity)', () => {
  const ekstrem = [
    { name: 'targetKcal 100', targetKcal: 100, minProteinG: 30, budget: 40000 },
    { name: 'targetKcal 2000', targetKcal: 2000, minProteinG: 30, budget: 40000 },
    { name: 'budget 10000', targetKcal: 500, minProteinG: 30, budget: 10000 },
    { name: 'budget 0', targetKcal: 500, minProteinG: 30, budget: 0 },
    { name: 'minProteinG 0', targetKcal: 500, minProteinG: 0, budget: 40000 },
    { name: 'minProteinG 200', targetKcal: 500, minProteinG: 200, budget: 40000 },
    { name: 'semua ekstrem sekaligus', targetKcal: 100, minProteinG: 200, budget: 0 },
  ];

  for (const c of ekstrem) {
    it(`${c.name}: solver, fitur, dan skor semuanya finite untuk 5 menu`, () => {
      const rows: number[][] = [];
      for (const menu of MENUS) {
        const sol = solvePortions(menuIngredientIds(menu), INGREDIENT_BY_ID, c.targetKcal, c.minProteinG, c.budget);
        for (const v of allNumbers(sol)) expect(Number.isFinite(v)).toBe(true);

        const f = buildFeatures(sol, menu, {
          targetKcal: c.targetKcal,
          minProteinG: c.minProteinG,
          budget: c.budget,
          tujuan: 'high_protein',
          rasa: 'segar',
          bentuk: 'bowl',
        });
        expect(f).toHaveLength(9);
        for (const v of f) expect(Number.isFinite(v)).toBe(true);
        rows.push(f);
      }
      const scores = scoreAllMenus(rows);
      for (const s of scores) expect(Number.isFinite(s)).toBe(true);
    });

    it(`${c.name}: recommend() mengembalikan angka finite`, () => {
      for (const tujuan of TUJUAN) {
        const out = recommend({ ...c, tujuan, tidakSuka: [], rasa: 'pedas', bentuk: 'wrap' });
        expect(out.length).toBeGreaterThan(0);
        for (const v of allNumbers(out)) expect(Number.isFinite(v)).toBe(true);
      }
    });
  }
});

describe('solvePortions — batasan porsi', () => {
  const rng = makeRng(42);
  const inputs = Array.from({ length: 200 }, () => randomInput(rng));

  it('tiap gram dalam [minGram, maxGram] untuk 200 input acak × 5 menu', () => {
    let checked = 0;
    for (const inp of inputs) {
      for (const menu of MENUS) {
        const sol = solvePortions(menuIngredientIds(menu), INGREDIENT_BY_ID, inp.targetKcal, inp.minProteinG, inp.budget, inp.batas);
        for (const id of menuIngredientIds(menu)) {
          const ing = INGREDIENT_BY_ID[id];
          expect(sol.gram[id]).toBeGreaterThanOrEqual(ing.minGram);
          expect(sol.gram[id]).toBeLessThanOrEqual(ing.maxGram);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(200 * 5 * 5);
  });

  it('tiap gram kelipatan 5', () => {
    for (const inp of inputs) {
      for (const menu of MENUS) {
        const sol = solvePortions(menuIngredientIds(menu), INGREDIENT_BY_ID, inp.targetKcal, inp.minProteinG, inp.budget, inp.batas);
        for (const g of Object.values(sol.gram)) expect(g % 5).toBe(0);
      }
    }
  });

  it('hasil memuat semua bahan menu, tidak lebih', () => {
    for (const menu of MENUS) {
      const sol = solvePortions(menuIngredientIds(menu), INGREDIENT_BY_ID, 500, 30, 40000);
      expect(Object.keys(sol.gram).sort()).toEqual([...menuIngredientIds(menu)].sort());
    }
  });

  it('harga jual = modal × 2 dibulatkan ke Rp 500', () => {
    for (const menu of MENUS) {
      const sol = solvePortions(menuIngredientIds(menu), INGREDIENT_BY_ID, 500, 30, 40000);
      expect(sol.hargaJual % 500).toBe(0);
      expect(Math.abs(sol.hargaJual - sol.totals.modal * 2)).toBeLessThanOrEqual(250);
    }
  });

  it('M02 (biaya didominasi protein) bisa masuk budget — regresi bug SPEC.md §3.3', () => {
    // Versi yang hanya memotong topping tidak pernah bisa membawa M02 ke budget ini.
    const ids = menuIngredientIds(MENU_BY_ID.M02);
    const sol = solvePortions(ids, INGREDIENT_BY_ID, 450, 25, 35000);
    expect(sol.constraints.budgetOk).toBe(true);
    expect(sol.constraints.proteinOk).toBe(true);
  });
});

describe('hard filter pantangan', () => {
  const tags = Array.from(
    new Set(Object.values(INGREDIENT_BY_ID).map((i) => i.exclusionTag).filter((t): t is string => !!t)),
  );

  it('ada exclusionTag di data (kalau kosong test ini tidak menguji apa-apa)', () => {
    expect(tags.length).toBeGreaterThan(0);
  });

  it('tidak pernah menyertakan bahan dengan exclusionTag yang dilarang', () => {
    const rng = makeRng(7);
    const subsets: string[][] = [...tags.map((t) => [t])];
    for (let i = 0; i < 50; i++) subsets.push(tags.filter(() => rng.next() < 0.4));

    for (const tidakSuka of subsets) {
      for (const bentuk of ['bowl', 'wrap'] as const) {
        const out = recommend({ targetKcal: 500, minProteinG: 30, budget: 40000, tujuan: 'high_protein', tidakSuka, rasa: null, bentuk });
        for (const r of out) {
          for (const id of Object.keys(r.solve.gram)) {
            const tag = INGREDIENT_BY_ID[id].exclusionTag;
            expect(tag === null || !tidakSuka.includes(tag)).toBe(true);
          }
        }
      }
    }
  });
});
