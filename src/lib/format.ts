const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function formatNumber(n: number): string {
  return nf.format(Math.round(n));
}

export function formatRupiah(n: number): string {
  return `Rp ${formatNumber(n)}`;
}

/** "40.000" → 40000; string kosong → null. */
export function parseNumber(s: string): number | null {
  const digits = s.replace(/[^\d]/g, '');
  return digits === '' ? null : Number(digits);
}

export const TUJUAN_LABEL = {
  bulking: 'Bulking',
  high_protein: 'High protein',
  defisit_kalori: 'Defisit kalori',
  rendah_garam: 'Rendah garam',
} as const;

export const RASA_LABEL = { pedas: 'Pedas', gurih: 'Gurih', segar: 'Segar' } as const;

export const BENTUK_LABEL = { wrap: 'Wrap', bowl: 'Bowl' } as const;

export const AKTIVITAS_LABEL = {
  sedentary: 'Jarang olahraga',
  ringan: 'Olahraga 1–3×/minggu',
  sedang: 'Olahraga 3–5×/minggu',
  aktif: 'Olahraga 6–7×/minggu',
  sangat_aktif: 'Atlet / kerja fisik berat',
} as const;

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
