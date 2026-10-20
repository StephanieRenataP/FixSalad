'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FlowHeader } from '@/components/FlowHeader';
import {
  IconArrowRight,
  IconBadgeCheck,
  IconBag,
  IconBank,
  IconClock,
  IconInfo,
  IconLeaf,
  IconLock,
  IconQr,
  IconScooter,
  IconStore,
  IconWallet,
} from '@/components/icons';
import { MenuImage } from '@/components/MenuImage';
import { PageShell } from '@/components/PageShell';
import { useOrder } from '@/context/OrderContext';
import { formatNumber, formatRupiah } from '@/lib/format';
import { applyToppings } from '@/lib/order';

const WAKTU_AMBIL = ['Secepatnya (~15–20 mnt)', '30 menit lagi', '1 jam lagi'];

const PEMBAYARAN = [
  { key: 'qris', label: 'QRIS', Icon: IconQr, enabled: true },
  { key: 'ewallet', label: 'E-wallet', Icon: IconWallet, enabled: false },
  { key: 'transfer', label: 'Transfer', Icon: IconBank, enabled: false },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { state, dispatch } = useOrder();
  const scored = state.menuTerpilih;

  if (!scored) {
    return (
      <>
        <FlowHeader title="Bayar" step={4} backHref="/rekomendasi" />
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

  const applied = applyToppings(scored, state.toppingTambahan);
  const total = applied.harga; // biaya kemasan Rp 0 (promo)
  const ringkasan = [
    `${formatNumber(applied.totals.kcal)} kcal`,
    `${formatNumber(applied.totals.protein)}g protein`,
    ...(state.tidakSuka.length ? [`tanpa ${state.tidakSuka.join(', ')}`] : []),
  ].join(' · ');

  function bayar() {
    // TODO(sesi 2): kode pesanan final dibuat di sini — "FS-" + 4 digit acak.
    const kode = `FS-${Math.floor(1000 + Math.random() * 9000)}`;
    dispatch({ type: 'SET_KODE_PESANAN', kode });
    router.push('/sukses');
  }

  return (
    <>
      <FlowHeader title="Bayar" step={4} backHref="/ubah" />

      <PageShell
        aside={
          <>
            <section className="card">
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-bold text-green-900">Pesananmu</h2>
                <span className="rounded-full bg-lime-300 px-2.5 py-1 text-[12px] font-bold text-green-900">1 Menu</span>
              </div>

              <div className="mt-3 flex gap-3 rounded-2xl bg-cream-50 p-3">
                <MenuImage src={scored.menu.foto} alt={scored.menu.nama} sizes="80px" compact className="h-20 w-20 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[15px] font-bold leading-snug text-green-900">{scored.menu.nama}</div>
                    <div className="shrink-0 text-[14px] font-bold text-green-900">{formatRupiah(applied.harga)}</div>
                  </div>
                  <div className="mt-0.5 text-[13px] leading-snug text-gray-600">Ringkasan: {ringkasan}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-green-700">
                    <IconBadgeCheck size={14} />
                    Tersuai Preferensi
                  </div>
                </div>
              </div>

              <dl className="mt-4 space-y-2 text-[15px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Subtotal menu</dt>
                  <dd className="font-bold text-green-900">{formatRupiah(applied.harga)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">Biaya kemasan ramah lingkungan</dt>
                  <dd className="shrink-0 font-bold text-green-900">Rp 0 (Promo)</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-green-900">
                    <IconLeaf size={16} />
                    Daur Ulang Kemasan
                  </dt>
                  <dd className="rounded-md bg-green-100 px-2 py-0.5 text-[13px] font-bold text-green-700">+10 Poin</dd>
                </div>
              </dl>

              <div className="my-4 h-px bg-gray-200" />

              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[18px] font-bold text-green-900">Total</div>
                  <div className="text-[12px] text-gray-600">Sudah termasuk pajak restoran</div>
                </div>
                <div className="text-[30px] font-extrabold leading-none text-green-900">{formatRupiah(total)}</div>
              </div>

              <button type="button" onClick={bayar} className="btn-primary mt-5 text-[18px]">
                Bayar Sekarang <IconArrowRight size={20} />
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-gray-600">
                <IconLock size={15} />
                Pembayaran aman terenkripsi 256-bit
              </p>
            </section>

            <section className="flex gap-3 rounded-card bg-green-100 p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-300 text-green-900">
                <IconInfo size={18} />
              </span>
              <div>
                <div className="text-[15px] font-bold text-green-900">Jaminan Kesegaran 100%</div>
                <p className="mt-0.5 text-[14px] text-gray-600">
                  Sayuran hidroponik dipanen dalam waktu kurang dari 24 jam untuk menjaga kerenyahan dan nutrisi optimal.
                </p>
              </div>
            </section>
          </>
        }
      >
        <section className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-green-900 lg:text-[36px]">Checkout</h2>
              <p className="mt-1 text-[15px] text-gray-600">Lengkapi detail untuk menyelesaikan pesananmu</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream-50 text-green-900">
              <IconBag size={22} />
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-2.5 text-[14px] font-semibold text-white">
              <IconStore size={18} />
              Ambil di tempat
            </span>
            <span
              aria-disabled="true"
              className="inline-flex items-center gap-2 rounded-full bg-cream-50 px-4 py-2.5 text-[14px] font-semibold text-gray-600"
            >
              <IconScooter size={18} />
              Antar
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px]">Segera hadir</span>
            </span>
          </div>

          <label className="mt-5 block">
            <span className="label">Waktu ambil</span>
            <div className="field text-[16px] font-medium">
              <select value={state.waktuAmbil} onChange={(e) => dispatch({ type: 'SET_WAKTU_AMBIL', value: e.target.value })}>
                {WAKTU_AMBIL.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <IconClock size={20} className="shrink-0 text-gray-600" />
            </div>
          </label>

          <fieldset className="mt-5">
            <legend className="label">Metode Pembayaran</legend>
            <div className="flex flex-wrap gap-2">
              {PEMBAYARAN.map(({ key, label, Icon, enabled }) => (
                <button
                  key={key}
                  type="button"
                  disabled={!enabled}
                  aria-pressed={enabled}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-semibold ${
                    enabled ? 'bg-green-700 text-white' : 'cursor-not-allowed bg-cream-50 text-gray-600'
                  }`}
                >
                  <Icon size={17} />
                  {label}
                  {!enabled && <span className="text-[11px] font-medium opacity-80">· Segera hadir</span>}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      </PageShell>
    </>
  );
}
