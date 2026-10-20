'use client';

import Image from 'next/image';
import { useState } from 'react';

type Props = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string; // diterapkan ke wadah (wadah harus punya ukuran)
  compact?: boolean; // placeholder kecil: tanpa teks nama
};

/**
 * next/image + fallback wajib (SPEC.md §6.5). Jika URL gagal dimuat (CDN
 * diblokir WiFi kampus, URL berubah), tampilkan gradient hijau berisi nama menu.
 */
export function MenuImage({ src, alt, sizes, priority, className = '', compact = false }: Props) {
  const [failed, setFailed] = useState(!src);

  return (
    <div className={`relative overflow-hidden bg-green-100 ${className}`}>
      {failed ? (
        <div
          role="img"
          aria-label={alt}
          className="absolute inset-0 flex items-end bg-gradient-to-br from-green-700 via-green-900 to-[#0c2a1a] p-4"
        >
          <svg
            className="absolute right-3 top-3 opacity-25"
            width={compact ? 28 : 56}
            height={compact ? 28 : 56}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--lime-300)"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
          {!compact && <span className="relative text-[17px] font-bold leading-tight text-lime-300">{alt}</span>}
        </div>
      ) : (
        <Image
          src={src as string}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
