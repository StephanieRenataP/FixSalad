import { describe, expect, it } from 'vitest';
import { calculateTargets, hitungBmr } from '../planner';
import type { BodyData } from '../types';

describe('calculateTargets', () => {
  // SPEC.md §10: pria 70 kg 175 cm 22 th, ringan, defisit, 3× makan
  const pria: BodyData = { beratKg: 70, tinggiCm: 175, usia: 22, gender: 'pria', aktivitas: 'ringan', makanPerHari: 3 };

  it('cocok dengan contoh manual Mifflin-St Jeor', () => {
    expect(hitungBmr(pria)).toBe(1688.75); // 700 + 1093.75 − 110 + 5

    const t = calculateTargets(pria, 'defisit_kalori');
    expect(t.bmr).toBe(1688.75);
    expect(t.tdee).toBeCloseTo(2322.03, 2); // × 1.375
    expect(t.tdee * 0.8).toBeCloseTo(1857.6, 1); // kkal/hari
    expect((t.tdee * 0.8) / 3).toBeCloseTo(619.2, 1); // kkal/meal sebelum dibulatkan
    expect(t.targetKcal).toBe(620); // dibulatkan ke 10 terdekat (SPEC.md §2.5)
    expect(t.minProteinG).toBe(47); // 70 × 2.0 / 3 = 46.67 → 47
    expect(t.batasNatriumMg).toBe(800);
  });

  it('wanita memakai −161', () => {
    const w = { ...pria, gender: 'wanita' as const };
    expect(hitungBmr(pria) - hitungBmr(w)).toBe(166);
  });

  it('rendah garam menurunkan batas natrium ke 500 mg', () => {
    expect(calculateTargets(pria, 'rendah_garam').batasNatriumMg).toBe(500);
  });

  it('kalori kelipatan 10, protein bilangan bulat', () => {
    for (const tujuan of ['defisit_kalori', 'bulking', 'high_protein', 'rendah_garam'] as const) {
      for (const makanPerHari of [2, 3, 4, 5]) {
        const t = calculateTargets({ ...pria, makanPerHari }, tujuan);
        expect(t.targetKcal % 10).toBe(0);
        expect(Number.isInteger(t.minProteinG)).toBe(true);
      }
    }
  });
});
