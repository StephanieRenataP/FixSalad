import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID, MENUS } from '../data';
import { calculateTargets } from '../planner';
import { filterKandidat, menuPunyaPantangan, recommend, type RecommendInput } from '../recommend';

const BASE: RecommendInput = {
  targetKcal: 500,
  minProteinG: 30,
  budget: 40000,
  tujuan: 'high_protein',
  tidakSuka: [],
  rasa: null,
  bentuk: 'bowl',
};

describe('recommend', () => {
  it('maksimal 3 menu, terurut skor, rank 1..n', () => {
    const out = recommend({ ...BASE, bentuk: null });
    expect(out).toHaveLength(3);
    out.forEach((r, i) => expect(r.rank).toBe(i + 1));
    for (let i = 1; i < out.length; i++) expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
  });

  it('filter bentuk dipakai bila ada menu yang cocok', () => {
    for (const bentuk of ['bowl', 'wrap'] as const) {
      for (const r of recommend({ ...BASE, bentuk })) expect(r.menu.bentuk).toBe(bentuk);
    }
  });

  it('filter bentuk dilewati bila menyisakan nol menu', () => {
    // katalog tanpa wrap sama sekali, user minta wrap → tetap dapat bowl
    const kandidat = filterKandidat({ ...BASE, bentuk: 'wrap' }, MENUS.filter((m) => m.bentuk === 'bowl'));
    expect(kandidat.length).toBeGreaterThan(0);
    for (const m of kandidat) expect(m.bentuk).toBe('bowl');
  });

  it('tidak ada menu lolos → array kosong (bukan error) — /rekomendasi menampilkan empty state', () => {
    const semuaTag = Array.from(
      new Set(Object.values(INGREDIENT_BY_ID).map((i) => i.exclusionTag).filter((t): t is string => !!t)),
    );
    const bertag = MENUS.filter((m) => menuPunyaPantangan(m, semuaTag));
    expect(bertag.length).toBeGreaterThan(0);
    expect(recommend({ ...BASE, tidakSuka: semuaTag }, undefined, bertag)).toEqual([]);
  });

  it('data saat ini: M02 tidak punya bahan ber-exclusionTag, jadi selalu lolos filter pantangan', () => {
    // Catatan untuk demo: dengan katalog sekarang, empty state TIDAK bisa dipicu dari UI
    // hanya lewat pantangan. Kalau test ini gagal, katalog berubah — perbarui catatannya.
    const semuaTag = Array.from(
      new Set(Object.values(INGREDIENT_BY_ID).map((i) => i.exclusionTag).filter((t): t is string => !!t)),
    );
    const out = recommend({ ...BASE, bentuk: null, tidakSuka: semuaTag });
    expect(out.map((r) => r.menu.id)).toEqual(['M02']);
    expect(out[0].solve.constraints).toBeDefined();
  });

  it('tidak suka bawang → M05 Classic Chicken Caesar Wrap tidak muncul', () => {
    const out = recommend({ ...BASE, bentuk: 'wrap', tidakSuka: ['bawang'] });
    expect(out.map((r) => r.menu.id)).not.toContain('M05');
  });

  it('rendah garam → M02 Smoked Beef turun peringkat', () => {
    const input = { ...BASE, bentuk: 'bowl' as const, rasa: 'segar' as const, tujuan: 'defisit_kalori' as const };
    const rankOf = (r: ReturnType<typeof recommend>) => r.findIndex((x) => x.menu.id === 'M02');
    const normal = recommend(input);
    const garam = recommend({ ...input, tujuan: 'rendah_garam' });
    const iNormal = rankOf(normal);
    const iGaram = rankOf(garam);
    expect(iNormal).toBeGreaterThanOrEqual(0);
    expect(iGaram === -1 || iGaram > iNormal).toBe(true);
  });

  it('skenario laporan: wanita 21, 52 kg/157 cm, ringan, defisit, 3×, Rp 40.000, segar, bowl', () => {
    const t = calculateTargets(
      { beratKg: 52, tinggiCm: 157, usia: 21, gender: 'wanita', aktivitas: 'ringan', makanPerHari: 3 },
      'defisit_kalori',
    );
    expect(t.targetKcal).toBeGreaterThanOrEqual(430);
    expect(t.targetKcal).toBeLessThanOrEqual(470);
    expect(t.minProteinG).toBe(35);

    const out = recommend({
      targetKcal: t.targetKcal,
      minProteinG: t.minProteinG,
      budget: 40000,
      tujuan: 'defisit_kalori',
      tidakSuka: [],
      rasa: 'segar',
      bentuk: 'bowl',
    });
    expect(out.map((r) => r.menu.id)).toEqual(['M04', 'M02', 'M01']); // sama dengan Python (lihat parity.test.ts)

    // M01 memenuhi 4/4 kriteria …
    const m01 = out.find((r) => r.menu.id === 'M01')!;
    expect(m01.solve.kriteriaTerpenuhi).toBe(4);
    // … tapi model menaruhnya di posisi 3: rasa (pedas ≠ segar) dan tujuan (bukan defisit)
    // tidak cocok, dan dua koefisien itu yang terbesar di model_weights.json.
    // Peringkat 1 (M04) hanya 2/4: protein 34,1 < 35 g dan harga Rp 42.000 > budget.
    expect(out[0].solve.kriteriaTerpenuhi).toBe(2);
  });
});
