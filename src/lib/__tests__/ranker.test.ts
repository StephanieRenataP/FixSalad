import { describe, expect, it } from 'vitest';
import weightsJson from '../../../data/model_weights.json';
import { MODEL_WEIGHTS, parseWeights, ruleBasedScore, scoreAllMenus } from '../ranker';

// Urutan: calorie_gap, protein_surplus, price_ratio, flavor_match, goal_match,
//         form_match, sodium_ratio, fiber_density, protein_density
const BAGUS = [0.02, 0.3, 0.8, 1, 1, 1, 0.5, 1.0, 7.0]; // kalori pas, rasa/tujuan/bentuk cocok, natrium rendah
const SEDANG = [0.1, 0.1, 0.95, 0, 1, 1, 0.8, 1.0, 6.0];
const JELEK = [0.35, -0.2, 1.3, 0, 0, 0, 1.1, 0.8, 5.0]; // kalori meleset, kurang protein, lewat budget

describe('scoreAllMenus', () => {
  it('bobot model valid dan termuat', () => {
    expect(MODEL_WEIGHTS).not.toBeNull();
  });

  it('skor dalam (0, 1) dan menu yang lebih cocok di atas', () => {
    const [a, b, c] = scoreAllMenus([BAGUS, SEDANG, JELEK]);
    for (const s of [a, b, c]) {
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(1);
    }
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it('urutan input tidak memengaruhi skor tiap menu', () => {
    const [a1, , c1] = scoreAllMenus([BAGUS, SEDANG, JELEK]);
    const [c2, , a2] = scoreAllMenus([JELEK, SEDANG, BAGUS]);
    expect(a2).toBeCloseTo(a1, 12);
    expect(c2).toBeCloseTo(c1, 12);
  });

  it('centering: menggeser semua kandidat dengan konstanta yang sama tidak mengubah skor', () => {
    // Inilah inti within-group centering (SPEC.md §4.8): yang dinilai adalah
    // selisih terhadap alternatif, bukan nilai absolutnya.
    const shift = (r: number[]) => r.map((v, i) => (i === 6 ? v + 0.5 : v)); // natrium semua menu +400 mg
    const before = scoreAllMenus([BAGUS, SEDANG, JELEK]);
    const after = scoreAllMenus([BAGUS, SEDANG, JELEK].map(shift));
    after.forEach((s, i) => expect(s).toBeCloseTo(before[i], 12));
  });

  it('kalori lebih meleset → skor lebih rendah (koefisien calorie_gap negatif setelah centering)', () => {
    const lebihMeleset = BAGUS.map((v, i) => (i === 0 ? 0.3 : v));
    const [pas, meleset] = scoreAllMenus([BAGUS, lebihMeleset]);
    expect(pas).toBeGreaterThan(meleset);
  });

  it('satu kandidat: semua fitur ter-center jadi 0 → skor = sigmoid(intercept)', () => {
    const w = MODEL_WEIGHTS!;
    const [s] = scoreAllMenus([JELEK]);
    expect(s).toBeCloseTo(1 / (1 + Math.exp(-w.intercept)), 12);
    // dan sama untuk menu apa pun — makanya badge skor disembunyikan saat n === 1
    expect(scoreAllMenus([BAGUS])[0]).toBeCloseTo(s, 12);
  });

  it('daftar kosong → array kosong', () => {
    expect(scoreAllMenus([])).toEqual([]);
  });
});

describe('fallback rule-based (SPEC.md §4.9)', () => {
  it('bobot null → pakai rule-based, tidak melempar error', () => {
    const scores = scoreAllMenus([BAGUS, SEDANG, JELEK], null);
    expect(scores).toEqual([BAGUS, SEDANG, JELEK].map(ruleBasedScore));
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
  });

  it('rumus sesuai spec', () => {
    // 0.35(1−0.02) + 0.25·0.3 + 0.15·1 + 0.15·1 + 0.10(1−0.8)
    expect(ruleBasedScore(BAGUS)).toBeCloseTo(0.343 + 0.075 + 0.15 + 0.15 + 0.02, 12);
  });

  it('parseWeights menolak JSON rusak, field hilang, atau urutan fitur berbeda', () => {
    expect(parseWeights('{ rusak')).toBeNull();
    expect(parseWeights(null)).toBeNull();
    expect(parseWeights({})).toBeNull();
    const w = JSON.parse(JSON.stringify(weightsJson));
    expect(parseWeights(w)).not.toBeNull();
    expect(parseWeights({ ...w, coefficients: w.coefficients.slice(0, 8) })).toBeNull();
    expect(parseWeights({ ...w, feature_names: [...w.feature_names].reverse() })).toBeNull();
    expect(parseWeights({ ...w, intercept: 'x' })).toBeNull();
    expect(parseWeights(JSON.stringify(w))).not.toBeNull();
  });
});
