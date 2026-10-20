import type { ReactNode } from 'react';

/** Lebar container per breakpoint: <768 penuh (maks 480 dari layout), md 680, lg 1200. */
export const CONTAINER = 'md:mx-auto md:max-w-[680px] md:px-6 lg:max-w-[1200px] lg:px-8';

type Props = {
  children: ReactNode;
  /** Panel kanan pada lg (`1fr 380px`, sticky). Di bawah lg tampil setelah konten utama. */
  aside?: ReactNode;
  /**
   * true: aside hanya dirender di lg. Halaman yang urutan mobile-nya menaruh isi aside
   * di tengah konten (mis. /rekomendasi) merender salinan `lg:hidden` di posisinya sendiri.
   */
  asideOnlyDesktop?: boolean;
  className?: string; // padding vertikal per halaman
};

/**
 * Container + grid dua kolom untuk semua halaman.
 * Mobile: identik dengan layout satu kolom sebelumnya (px-4, jarak antar card 16px).
 */
export function PageShell({ children, aside, asideOnlyDesktop = false, className = 'pb-10 pt-4' }: Props) {
  return (
    <main
      className={`space-y-4 px-4 md:pt-6 ${CONTAINER} ${
        aside ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:space-y-0' : ''
      } ${className}`}
    >
      <div className="min-w-0 space-y-4 lg:space-y-6">{children}</div>
      {aside && (
        <aside className={`space-y-4 lg:sticky lg:top-[88px] ${asideOnlyDesktop ? 'hidden lg:block' : ''}`}>{aside}</aside>
      )}
    </main>
  );
}
