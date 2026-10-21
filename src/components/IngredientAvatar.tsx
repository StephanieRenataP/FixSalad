import type { Kategori } from '@/lib/types';

// Lingkaran berwarna + inisial. Fallback <IngredientThumb> saat bahan tidak punya foto
// atau foto gagal dimuat (SPEC.md §6.5) — jangan dihapus.
const KATEGORI_STYLE: Record<Kategori, string> = {
  base: 'bg-green-100 text-green-700',
  protein: 'bg-rust-100 text-rust-600',
  topping: 'bg-lime-300 text-green-900',
  dressing: 'bg-[#FFF3D6] text-[#8A5A00]',
};

export function IngredientAvatar({ nama, kategori, size = 48 }: { nama: string; kategori: Kategori; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${KATEGORI_STYLE[kategori]}`}
    >
      {nama.charAt(0).toUpperCase()}
    </span>
  );
}
