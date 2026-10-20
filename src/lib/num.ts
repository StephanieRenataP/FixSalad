// Helper angka yang dipakai bersama planner/solver/features/ranker.

/** Penjaga pembagian nol — sama dengan EPS di model/fixsalad_core.py. */
export const EPS = 1e-6;

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Sama persis dengan `round()` Python 3: setengah dibulatkan ke genap
 * (round(2.5) = 2, round(3.5) = 4). Math.round selalu ke atas (2.5 → 3), dan
 * itu bikin gram/harga berbeda dari Python pada kasus .5 — yang sering terjadi
 * karena gram dibagi 5 sebelum dibulatkan.
 */
export function pyRound(x: number): number {
  if (Math.abs(x % 1) === 0.5) return 2 * Math.round(x / 2);
  return Math.round(x);
}
