'use client';

import Link from 'next/link';
import { CriteriaBadge } from '@/components/CriteriaBadge';
import { FlowHeader } from '@/components/FlowHeader';
import {
  IconBadgeCheck,
  IconBag,
  IconCheckCircle,
  IconCherry,
  IconDroplet,
  IconFlame,
  IconMeat,
  IconShuffle,
  IconSliders,
  IconSprout,
} from '@/components/icons';
import { MenuImage } from '@/components/MenuImage';
import { StatBox } from '@/components/StatBox';
import { useOrder } from '@/context/OrderContext';
import { INGREDIENT_BY_ID } from '@/lib/data';
import { RASA_LABEL, formatNumber, formatRupiah } from '@/lib/format';
import type { ScoredMenu } from '@/lib/types';

export default function RekomendasiPage() {
  const { state, dispatch } = useOrder();
  const { rekomendasi, menuTerpilih } = state;

  if (!rekomendasi || rekomendasi.length === 0 || !menuTerpilih) {
    return (
      <>
        <FlowHeader title="Rekomendasi" step={2} backHref="/preferensi" />
        <EmptyState />
      </>
    );
  }

  const { menu, solve } = menuTerpilih;
  const t = solve.totals;
  const c = solve.constraints;
  const alternatif = rekomendasi.filter((r) => r.menu.id !== menu.id).slice(0, 2);
  const showScore = rekomendasi.length > 1; // n === 1 → centering bikin skor konstan, sembunyikan (SPEC.md §4.7)

  const kriteria = [
    {
      ok: c.kaloriOk,
      text: c.kaloriOk
        ? 'Kalori ± target'
        : state.targetKcal && t.kcal < state.targetKcal
          ? 'Kalori belum tercapai'
          : 'Kalori melewati target',
    },
    { ok: c.proteinOk, text: `Protein ${c.proteinOk ? '≥' : '<'} ${state.minProteinG ?? '—'} g` },
    {
      ok: c.pantanganOk,
      text: state.tidakSuka.length ? `Tanpa ${state.tidakSuka.join(', ')}` : 'Tanpa pantangan',
    },
    { ok: c.budgetOk, text: c.budgetOk ? 'Dalam budget' : 'Melebihi budget' },
    { ok: c.natriumOk, text: c.natriumOk ? 'Natrium aman' : 'Natrium tinggi' },
  ];
  const terpenuhi = kriteria.filter((k) => k.ok).length;

  const groups: { label: string; Icon: typeof IconSprout; ids: string[] }[] = [
    { label: 'Base', Icon: IconSprout, ids: menu.baseIds },
    { label: 'Protein', Icon: IconMeat, ids: menu.proteinIds },
    { label: 'Topping', Icon: IconCherry, ids: menu.toppingIds },
    { label: 'Dressing', Icon: IconDroplet, ids: [menu.dressingId] },
  ];
  const dressing = INGREDIENT_BY_ID[menu.dressingId];

  return (
    <>
      <FlowHeader title="Rekomendasi" step={2} backHref="/preferensi" />

      <main className="space-y-4 px-4 pb-10 pt-4">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-green-900">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lime-300 text-[12px]">2</span>
            Rekomendasi AI terpilih
          </div>
          <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.02em] text-green-900">
            Ini racikan paling pas buat kamu
          </h2>
        </div>

        {/* Menu utama */}
        <section className="overflow-hidden rounded-card bg-white shadow-card">
          <div className="relative">
            <MenuImage src={menu.foto} alt={menu.nama} sizes="(max-width: 480px) 100vw, 480px" priority className="aspect-[4/3] w-full" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-green-900 shadow-card">
              <IconFlame size={15} className="text-rust-600" />
              {formatNumber(t.kcal)} kkal
            </span>
          </div>

          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="min-w-0 flex-1 text-[22px] font-bold leading-tight text-green-900">{menu.nama}</h3>
              {showScore && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lime-300 px-3 py-1.5 text-[13px] font-bold text-green-900">
                  <IconBadgeCheck size={15} />
                  Skor cocok {Math.round(menuTerpilih.score * 100)}%
                </span>
              )}
            </div>
            <p className="mt-1 text-[14px] text-gray-600">{menu.deskripsi}</p>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <StatBox label="Protein" value={`${formatNumber(t.protein)}g`} />
              <StatBox label="Serat" value={`${formatNumber(t.serat)}g`} />
              <StatBox label="Karbo" value={`${formatNumber(t.karbo)}g`} />
              <StatBox label="Lemak" value={`${formatNumber(t.lemak)}g`} />
            </div>

            <ul className="mt-4 space-y-2">
              {groups.map(({ label, Icon, ids }) => (
                <li key={label} className="flex items-start gap-3 rounded-2xl bg-cream-50 px-4 py-3">
                  <span className="flex w-[88px] shrink-0 items-center gap-2 pt-0.5 text-[14px] text-gray-600">
                    <Icon size={18} className={label === 'Dressing' ? 'text-rust-600' : 'text-green-900'} />
                    {label}
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5 text-right">
                    {ids.map((id) => {
                      const ing = INGREDIENT_BY_ID[id];
                      return (
                        <span key={id} className="block text-[15px] font-bold leading-snug text-green-900">
                          {ing?.nama ?? id}{' '}
                          <span className="whitespace-nowrap font-semibold text-gray-600">{solve.gram[id] ?? 0} g</span>
                        </span>
                      );
                    })}
                    {label === 'Dressing' && dressing?.tagRasa && (
                      <span className="mt-1 inline-block rounded-md bg-rust-100 px-2 py-0.5 text-[12px] font-bold text-rust-600">
                        {RASA_LABEL[dressing.tagRasa]}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Kriteria + total */}
        <section className="card">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[18px] font-bold text-green-900">
              <IconCheckCircle size={20} />
              Sesuai targetmu
            </h3>
            <span className="text-[13px] font-medium text-gray-600">
              {terpenuhi}/{kriteria.length} Kriteria terpenuhi
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {kriteria.map((k) => (
              <CriteriaBadge key={k.text} ok={k.ok}>
                {k.text}
              </CriteriaBadge>
            ))}
          </div>

          <div className="mt-6 flex items-end justify-between gap-3">
            <div>
              <div className="text-[15px] text-green-900">Total Pembayaran</div>
              <div className="text-[12px] text-gray-600">Sudah termasuk pajak &amp; dressing</div>
            </div>
            <div className="text-right text-[32px] font-extrabold leading-none text-green-900">
              {formatRupiah(solve.hargaJual)}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <Link href="/checkout" className="btn-primary">
              <IconBag size={20} />
              Pesan Sekarang
            </Link>
            <Link href="/ubah" className="btn bg-gray-200 text-green-900 hover:brightness-95">
              <IconSliders size={20} />
              Ubah Topping
            </Link>
          </div>
        </section>

        {/* Alternatif */}
        {alternatif.length > 0 && (
          <section className="card">
            <h3 className="flex items-center gap-2 text-[18px] font-bold text-green-900">
              <IconShuffle size={20} />
              Alternatif lain
            </h3>
            <ul className="mt-3 space-y-3">
              {alternatif.map((alt) => (
                <li key={alt.menu.id}>
                  <AlternatifCard
                    alt={alt}
                    showScore={showScore}
                    onPick={() => {
                      dispatch({ type: 'PILIH_MENU', menu: alt });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

function AlternatifCard({ alt, showScore, onPick }: { alt: ScoredMenu; showScore: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3 rounded-2xl bg-cream-50 p-3 text-left transition-colors hover:bg-green-100"
      aria-label={`Pilih ${alt.menu.nama}`}
    >
      <MenuImage src={alt.menu.foto} alt={alt.menu.nama} sizes="72px" compact className="h-[72px] w-[72px] shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-bold leading-snug text-green-900">{alt.menu.nama}</div>
        <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-gray-600">{alt.menu.deskripsi}</div>
        {showScore && (
          <div className="mt-1 text-[12px] font-semibold text-green-700">Skor cocok {Math.round(alt.score * 100)}%</div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[16px] font-bold text-green-900">{formatNumber(alt.solve.totals.kcal)} kcal</div>
        <div className="text-[13px] font-medium text-gray-600">{formatRupiah(alt.solve.hargaJual)}</div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <main className="px-4 pb-10 pt-8">
      <section className="card text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rust-100 text-rust-600">
          <IconSprout size={30} />
        </div>
        <h2 className="mt-4 text-[22px] font-bold text-green-900">Belum ada menu yang cocok</h2>
        <p className="mt-2 text-[15px] text-gray-600">
          Belum ada menu yang cocok dengan pantanganmu. Coba longgarkan satu pantangan atau naikkan budget.
        </p>
        <Link href="/preferensi" className="btn-dark mt-6">
          Kembali ke Preferensi
        </Link>
      </section>
    </main>
  );
}
