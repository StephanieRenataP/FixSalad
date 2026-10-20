// Lapis 3 — Menu Ranker (inference). Bobot dari data/model_weights.json
// (hasil model/train_ranker.py — jangan di-generate ulang di sini).
// Lihat SPEC.md §4.7–4.9.
import weightsJson from '../../data/model_weights.json';
import { FEATURE_NAMES } from './features';
import { clamp } from './num';
import type { ModelWeights } from './types';

function isNumArray(x: unknown, n: number): x is number[] {
  return Array.isArray(x) && x.length === n && x.every((v) => typeof v === 'number' && Number.isFinite(v));
}

/**
 * Validasi bobot. null = tidak bisa dipakai → ranker jatuh ke rule-based.
 * Urutan feature_names wajib sama persis dengan FEATURE_NAMES.
 */
export function parseWeights(raw: unknown): ModelWeights | null {
  try {
    const w = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown> | null;
    if (!w || typeof w !== 'object') return null;
    const d = FEATURE_NAMES.length;
    const names = w.feature_names;
    if (!Array.isArray(names) || names.length !== d || names.some((n, i) => n !== FEATURE_NAMES[i])) return null;
    if (!isNumArray(w.scaler_mean, d) || !isNumArray(w.scaler_scale, d) || !isNumArray(w.coefficients, d)) return null;
    if (typeof w.intercept !== 'number' || !Number.isFinite(w.intercept)) return null;
    return w as unknown as ModelWeights;
  } catch {
    return null;
  }
}

export const MODEL_WEIGHTS: ModelWeights | null = parseWeights(weightsJson);

/** Rule-based fallback, SPEC.md §4.9. Dipakai bila bobot tidak ada / rusak. */
export function ruleBasedScore(f: number[]): number {
  const [calorieGap, proteinSurplus, priceRatio, flavorMatch, goalMatch] = f;
  return (
    0.35 * (1 - calorieGap) +
    0.25 * clamp(proteinSurplus, 0, 1) +
    0.15 * goalMatch +
    0.15 * flavorMatch +
    0.1 * (1 - clamp(priceRatio, 0, 1))
  );
}

/**
 * Skor SEMUA menu kandidat sekaligus — tidak bisa satu per satu, karena
 * centering butuh seluruh choice set.
 *
 * 1. centering: kurangi rata-rata fitur di antara kandidat (SPEC.md §4.8 —
 *    tanpa ini koefisien terpenting arahnya terbalik)
 * 2. standardisasi pakai scaler_mean / scaler_scale dari training
 * 3. dot dengan koefisien + intercept, lalu sigmoid
 */
export function scoreAllMenus(featureRows: number[][], weights: ModelWeights | null = MODEL_WEIGHTS): number[] {
  const n = featureRows.length;
  if (n === 0) return [];
  if (!weights) return featureRows.map(ruleBasedScore);

  const d = weights.feature_names.length;
  const mean = new Array<number>(d).fill(0);
  for (const row of featureRows) for (let i = 0; i < d; i++) mean[i] += row[i] / n;

  return featureRows.map((row) => {
    let z = weights.intercept;
    for (let i = 0; i < d; i++) {
      const centered = row[i] - mean[i];
      const scale = weights.scaler_scale[i] > 0 ? weights.scaler_scale[i] : 1; // konvensi StandardScaler
      z += ((centered - weights.scaler_mean[i]) / scale) * weights.coefficients[i];
    }
    const p = 1 / (1 + Math.exp(-z));
    return Number.isFinite(p) ? p : 0;
  });
}
