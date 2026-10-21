'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { CopyButton } from '@/components/CopyButton';
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
  IconStore,
  IconWallet,
} from '@/components/icons';
import { MenuImage } from '@/components/MenuImage';
import { PageShell } from '@/components/PageShell';
import { QrisMock } from '@/components/QrisMock';
import { useOrder } from '@/context/OrderContext';
import { formatNumber, formatRupiah } from '@/lib/format';
import { applyToppings } from '@/lib/order';
import { namaValid, whatsAppValid } from '@/lib/pengambil';

const WAKTU_AMBIL = ['Secepatnya (~15–20 mnt)', '30 menit lagi', '1 jam lagi'];

type Metode = 'qris' | 'ewallet' | 'transfer';

const PEMBAYARAN: { key: Metode; label: string; Icon: typeof IconQr }[] = [
  { key: 'qris', label: 'QRIS', Icon: IconQr },
  { key: 'ewallet', label: 'E-wallet', Icon: IconWallet },
  { key: 'transfer', label: 'Transfer', Icon: IconBank },
];

// Nomor fiktif untuk demo (SPEC.md §7.5) — jangan diganti nomor sungguhan.
const EWALLET = { tampil: '0812-3456-7890', salin: '081234567890', ket: 'OVO / GoPay — a.n. FixSalad Kitchen' };
const REKENING = { bank: 'BCA', nomor: '1234567890', ket: 'a.n. FixSalad Kitchen' };

export default function CheckoutPage() {
  const router = useRouter();
  const { state, dispatch } = useOrder();
  const [metode, setMetode] = useState<Metode>('qris');
  // Error tampil setelah field ditinggalkan dan sudah diisi. Field kosong cukup dijelaskan
  // hint di bawah "Bayar Sekarang" — kalau error muncul saat blur, layout bergeser di tengah
  // klik dan klik pertama ke elemen di bawahnya hilang.
  const [touched, setTouched] = useState({ nama: false, wa: false });
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

  const namaOk = namaValid(state.namaPengambil);
  const waOk = whatsAppValid(state.noWhatsApp);
  const bisaBayar = namaOk && waOk;
  const namaError = touched.nama && state.namaPengambil !== '' && !namaOk;
  const waError = touched.wa && state.noWhatsApp !== '' && !waOk;

  function bayar() {
    if (!bisaBayar) return;
    // Kode pesanan: "FS-" + 4 digit acak. Riwayat ditulis saat /sukses tampil.
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

              <button type="button" onClick={bayar} disabled={!bisaBayar} className="btn-primary mt-5 text-[18px]">
                Bayar Sekarang <IconArrowRight size={20} />
              </button>
              {!bisaBayar && (
                <p className="mt-2 text-center text-[13px] text-gray-600">Isi nama dan nomor WhatsApp pengambil dulu.</p>
              )}
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

          <fieldset className="mt-5 space-y-4">
            <legend className="mb-1 flex items-center gap-2 text-[17px] font-bold text-green-900">
              <IconStore size={20} />
              Data pengambil
            </legend>
            <p className="text-[13px] text-gray-600">
              Semua pesanan diambil di tempat. Kasir akan memanggil namamu saat pesanan siap.
            </p>

            <TextField label="Nama Lengkap" error={namaError ? 'Nama minimal 2 karakter.' : null}>
              <input
                type="text"
                autoComplete="name"
                value={state.namaPengambil}
                onChange={(e) => dispatch({ type: 'SET_NAMA_PENGAMBIL', value: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, nama: true }))}
                placeholder="Nama untuk dipanggil kasir"
                aria-invalid={namaError}
              />
            </TextField>

            <TextField
              label="No. WhatsApp"
              error={waError ? 'Gunakan format 08… atau +628…, 9–15 digit.' : null}
            >
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={state.noWhatsApp}
                onChange={(e) => dispatch({ type: 'SET_NO_WHATSAPP', value: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, wa: true }))}
                placeholder="0812xxxxxxxx"
                aria-invalid={waError}
              />
            </TextField>

            <label className="block">
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
          </fieldset>

          <div className="mt-6 h-px bg-gray-200" />

          <fieldset className="mt-5">
            <legend className="label">Metode Pembayaran</legend>
            <div className="grid grid-cols-3 gap-2">
              {PEMBAYARAN.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={metode === key}
                  onClick={() => setMetode(key)}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-[14px] font-semibold transition-colors ${
                    metode === key ? 'bg-green-700 text-white' : 'bg-cream-50 text-green-900 hover:bg-green-100'
                  }`}
                >
                  <Icon size={17} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-cream-50 p-4">
              {metode === 'qris' && (
                <div className="text-center">
                  <div className="mx-auto w-fit rounded-2xl border border-gray-200 bg-white p-3">
                    <QrisMock seed="FixSalad Kitchen" />
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-green-900">Tunjukkan kode ini ke kasir</p>
                </div>
              )}
              {metode === 'ewallet' && (
                <NomorBayar judul="Nomor e-wallet" nomor={EWALLET.tampil} salin={EWALLET.salin} ket={EWALLET.ket} />
              )}
              {metode === 'transfer' && (
                <NomorBayar
                  judul={`Rekening ${REKENING.bank}`}
                  nomor={REKENING.nomor}
                  salin={REKENING.nomor}
                  ket={REKENING.ket}
                />
              )}
            </div>
          </fieldset>
        </section>
      </PageShell>
    </>
  );
}

function TextField({ label, error, children }: { label: string; error: string | null; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className={`field text-[16px] font-medium ${error ? 'ring-rust-600 focus-within:ring-rust-600' : ''}`}>{children}</div>
      {error && <span className="mt-1.5 block text-[13px] font-medium text-rust-600">{error}</span>}
    </label>
  );
}

/** Nomor tujuan bayar + tombol Salin. `select-all`: sekali tap memblok seluruh nomor,
 *  jadi tetap mudah disalin manual kalau clipboard API tidak tersedia. */
function NomorBayar({ judul, nomor, salin, ket }: { judul: string; nomor: string; salin: string; ket: string }) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-gray-600">{judul}</div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <span className="select-all text-[24px] font-extrabold tracking-wide text-green-900">{nomor}</span>
        <CopyButton text={salin} label={judul} />
      </div>
      <div className="mt-1 text-[14px] text-green-900">{ket}</div>
    </div>
  );
}
