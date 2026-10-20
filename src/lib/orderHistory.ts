// Riwayat pesanan di browser ini. SATU-SATUNYA data yang boleh masuk localStorage —
// input form, preferensi, dan menu terpilih tetap di React state.
//
// Aturan:
// - Semua akses dibungkus try/catch: localStorage bisa melempar error (private mode,
//   storage diblokir, kuota penuh). Gagal baca = riwayat kosong, gagal tulis = diam.
// - Baca HANYA dari useEffect, jangan saat render — server tidak punya localStorage,
//   jadi baca saat render bikin hydration mismatch (halaman putih kosong).

export const ORDERS_KEY = 'fixsalad_orders';
export const MAX_ORDERS = 20;

export type SavedOrder = {
  kode: string; // "FS-4821"
  menuId: string;
  menuNama: string;
  menuFoto: string;
  kcal: number;
  protein: number;
  total: number; // Rupiah
  waktuAmbil: string;
  createdAt: string; // ISO timestamp
};

function isSavedOrder(x: unknown): x is SavedOrder {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.kode === 'string' &&
    typeof o.menuNama === 'string' &&
    typeof o.total === 'number' &&
    typeof o.createdAt === 'string'
  );
}

/** Terbaru dulu. Selalu mengembalikan array — tidak pernah melempar. */
export function readOrders(): SavedOrder[] {
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedOrder) : [];
  } catch {
    return [];
  }
}

/** Simpan di depan, buang duplikat kode (StrictMode memanggil effect dua kali), maks 20. */
export function saveOrder(order: SavedOrder): void {
  try {
    const next = [order, ...readOrders().filter((o) => o.kode !== order.kode)].slice(0, MAX_ORDERS);
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  } catch {
    // private mode / kuota penuh — riwayat memang opsional, jangan ganggu alur pesanan
  }
}
