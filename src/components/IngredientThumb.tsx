'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Ingredient } from '@/lib/types';
import { IngredientAvatar } from './IngredientAvatar';

/**
 * Foto bahan, kotak bulat 40 px (SPEC.md §6.5). Base & dressing tidak punya foto,
 * dan CDN bisa diblokir WiFi kampus — dua-duanya jatuh ke <IngredientAvatar>.
 */
export function IngredientThumb({ ingredient, size = 40 }: { ingredient: Pick<Ingredient, 'nama' | 'kategori' | 'foto'>; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!ingredient.foto || failed) {
    return <IngredientAvatar nama={ingredient.nama} kategori={ingredient.kategori} size={size} />;
  }

  return (
    <Image
      src={ingredient.foto}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-xl bg-green-100 object-cover"
      onError={() => setFailed(true)}
    />
  );
}
