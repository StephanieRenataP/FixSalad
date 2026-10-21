'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Counter } from '@/components/Counter';
import { FlowHeader } from '@/components/FlowHeader';
import { IconAlert, IconArrowRight, IconInfo, IconWand } from '@/components/icons';
import { IngredientThumb } from '@/components/IngredientThumb';
import { PageShell } from '@/components/PageShell';
import { useOrder } from '@/context/OrderContext';
import { INGREDIENTS, INGREDIENT_BY_ID } from '@/lib/data';
import { formatNumber, formatRupiah } from '@/lib/format';
import { MAX_EXTRA_UNITS, UNIT_GRAM, applyToppings, minUnits } from '@/lib/order';

const KCAL_TOLERANCE = 0.08; // sama dengan kriteria kalori di solver (SPEC.md §3.5)

export default function UbahPage() {
  const router = useRouter();
  const { state, dispatch } = useOrder();
  const [showExtra, setShowExtra] = useState(false);
  const scored = state.menuTerpilih;

  if (!scored) {
    return (
      <>
        <FlowHeader title="Ubah" step={3} backHref="/rekomendasi" />
        <PageShell className="pt-8">
          <section className="card mx-auto text-center md:max-w-[560px]">
            <p className="text-[15px] text-gray-600">Belum ada menu yang dipilih.</p>
            <Link href="/preferensi" className="btn-dark mx-auto mt-4">
              Mulai dari Preferensi
            </Link>
          </section>
        </PageShell>
      </>
    );
  }

  const { menu, solve } = scored;
  // Protein & topping milik menu dulu, lalu topping lain yang bisa ditambahkan.
  const ownIds = [...menu.proteinIds, ...menu.toppingIds];
  const extraIds = INGREDIENTS.filter((i) => i.kategori === 'topping' && !ownIds.includes(i.id)).map((i) => i.id);
  // Topping lain disembunyikan dulu, kecuali yang sudah diubah user.
  const listIds = showExtra
    ? [...ownIds, ...extraIds]
    : [...ownIds, ...extraIds.filter((id) => (state.toppingTambahan[id] ?? 0) !== 0)];
  const hiddenCount = ownIds.length + extraIds.length - listIds.length;

  const applied = applyToppings(scored, state.toppingTambahan);
  const t = applied.totals;
  const target = state.targetKcal ?? 0;
  const budget = state.budget ?? 0;
  const lewatKalori = target > 0 && t.kcal > target * (1 + KCAL_TOLERANCE);
  const lewatBudget = budget > 0 && applied.harga > budget;
  const kurangProtein = state.minProteinG !== null && t.protein < state.minProteinG;

  function kembaliKeAI() {
    dispatch({ type: 'RESET_TOPPING' });
    router.push('/rekomendasi');
  }

  return (
    <>
      <FlowHeader title="Ubah" step={3} backHref="/rekomendasi" />

      <PageShell
        aside={
          <>
            <section className="card" aria-live="polite">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[22px] font-bold text-green-900">Ringkasan baru</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-lime-300 px-2.5 py-1 text-[12px] font-bold text-green-900">
                  <IconWand size={14} />
                  Live AI
                </span>
              </div>

              <dl className="mt-3 space-y-2.5 text-[16px]">
                <Row label="Kalori">
                  <span className={lewatKalori ? 'text-rust-600' : ''}>{formatNumber(t.kcal)} kcal</span>
                  <span className="font-normal text-gray-600"> / {target ? formatNumber(target) : '—'}</span>
                </Row>
                <Row label="Protein">
                  <span className={kurangProtein ? 'text-rust-600' : ''}>{formatNumber(t.protein)} g</span>
                  <span className="font-normal text-gray-600"> / min {state.minProteinG ?? '—'}</span>
                </Row>
                <Row label="Serat">{formatNumber(t.serat)} g</Row>
                <Row label="Karbo">{formatNumber(t.karbo)} g</Row>
                <Row label="Lemak">{formatNumber(t.lemak)} g</Row>
                <Row label="Harga">
                  <span className={lewatBudget ? 'text-rust-600' : ''}>{formatRupiah(applied.harga)}</span>
                  <span className="font-normal text-gray-600"> / {budget ? formatNumber(budget) : '—'}</span>
                </Row>
              </dl>

              {(lewatKalori || lewatBudget) && (
                <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-rust-100 px-3 py-2.5 text-[13px] font-medium text-rust-600">
                  <IconInfo size={18} className="shrink-0" />
                  Peringatan: tambahan ini melewati{' '}
                  {lewatKalori && lewatBudget ? 'target kalori dan budget' : lewatKalori ? 'target kalori' : 'budget'}.
                </p>
              )}

              <div className="mt-5 space-y-3">
                <Link href="/checkout" className="btn bg-green-700 text-white shadow-card hover:bg-green-900">
                  Simpan &amp; Lanjut <IconArrowRight size={20} />
                </Link>
                <button type="button" onClick={kembaliKeAI} className="btn-ghost">
                  Kembali ke rekomendasi AI
                </button>
              </div>
            </section>
          </>
        }
      >
        <section className="card">
          <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-green-900 lg:text-[36px]">Ubah topping</h2>
          <p className="mt-1 text-[15px] text-gray-600">Tambah atau kurangi, kami hitung ulang langsung.</p>
          <p className="mt-1 text-[13px] text-gray-600">1 unit = {UNIT_GRAM} g</p>

          <ul className="mt-4 divide-y divide-gray-200">
            {listIds.map((id) => {
              const ing = INGREDIENT_BY_ID[id];
              if (!ing) return null;
              const baseGram = solve.gram[id] ?? 0;
              const units = state.toppingTambahan[id] ?? 0;
              const gramNow = Math.max(0, baseGram + units * UNIT_GRAM);
              const f = UNIT_GRAM / 100;
              const dilarang = ing.exclusionTag !== null && state.tidakSuka.includes(ing.exclusionTag);
              return (
                <li key={id} className="flex items-center gap-2.5 py-3">
                  <IngredientThumb ingredient={ing} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold leading-snug text-green-900">{ing.nama}</div>
                    <div className="text-[12px] leading-snug text-gray-600">
                      {formatNumber(ing.kcal * f)} kkal · {formatNumber(ing.protein * f)}g protein
                    </div>
                    <div className="text-[12px] leading-snug text-gray-600">Porsi: {gramNow} g</div>
                    {dilarang && (
                      <div className="mt-0.5 flex items-start gap-1 text-[12px] font-medium leading-snug text-rust-600">
                        <IconAlert size={14} className="mt-px shrink-0" />
                        Mengandung {ing.exclusionTag}, tidak disarankan
                      </div>
                    )}
                  </div>
                  <Counter
                    label={ing.nama}
                    value={units}
                    min={minUnits(baseGram, id)}
                    max={MAX_EXTRA_UNITS}
                    onChange={(v) => dispatch({ type: 'SET_TOPPING', ingredientId: id, units: v })}
                  />
                </li>
              );
            })}
          </ul>
          {!showExtra && hiddenCount > 0 && (
            <button type="button" onClick={() => setShowExtra(true)} className="btn-soft mt-2 h-12 text-[15px]">
              Lihat topping lain ({hiddenCount})
            </button>
          )}
        </section>
      </PageShell>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-gray-600">{label}</dt>
      <dd className="text-right font-bold text-green-900">{children}</dd>
    </div>
  );
}
