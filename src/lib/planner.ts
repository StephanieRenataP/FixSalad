// Lapis 1 — Nutrition Planner. Port langsung dari hitung_bmr / hitung_target
// di model/fixsalad_core.py. Lihat SPEC.md §2.
import { pyRound } from './num';
import type { Aktivitas, BodyData, NutritionTarget, Tujuan } from './types';

export const ACTIVITY_FACTOR: Record<Aktivitas, number> = {
  sedentary: 1.2,
  ringan: 1.375,
  sedang: 1.55,
  aktif: 1.725,
  sangat_aktif: 1.9,
};

/** tujuan → pengali kalori, protein g/kg berat badan, batas natrium per meal (mg). */
export const GOAL_CONFIG: Record<Tujuan, { kalori: number; proteinPerKg: number; natriumMg: number }> = {
  defisit_kalori: { kalori: 0.8, proteinPerKg: 2.0, natriumMg: 800 },
  bulking: { kalori: 1.15, proteinPerKg: 1.8, natriumMg: 800 },
  high_protein: { kalori: 1.0, proteinPerKg: 2.2, natriumMg: 800 },
  rendah_garam: { kalori: 1.0, proteinPerKg: 1.6, natriumMg: 500 },
};

/** Mifflin-St Jeor. */
export function hitungBmr(b: BodyData): number {
  const base = 10 * b.beratKg + 6.25 * b.tinggiCm - 5 * b.usia;
  return b.gender === 'pria' ? base + 5 : base - 161;
}

export function batasNatrium(tujuan: Tujuan): number {
  return GOAL_CONFIG[tujuan].natriumMg;
}

/** Data tubuh + tujuan → target kalori & protein PER MEAL. */
export function calculateTargets(b: BodyData, tujuan: Tujuan): NutritionTarget {
  const bmr = hitungBmr(b);
  const tdee = bmr * ACTIVITY_FACTOR[b.aktivitas];
  const g = GOAL_CONFIG[tujuan];

  const kcalHarian = tdee * g.kalori;
  const targetKcal = pyRound(kcalHarian / b.makanPerHari / 10) * 10;

  const proteinHarian = b.beratKg * g.proteinPerKg;
  const minProteinG = pyRound(proteinHarian / b.makanPerHari);

  return { targetKcal, minProteinG, batasNatriumMg: g.natriumMg, bmr, tdee };
}
