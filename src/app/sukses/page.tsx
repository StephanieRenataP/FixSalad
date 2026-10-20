'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { IconCheck } from '@/components/icons';
import { Logo } from '@/components/Logo';
import { PageShell } from '@/components/PageShell';
import { QrisMock } from '@/components/QrisMock';
import { useOrder } from '@/context/OrderContext';
import { formatRupiah } from '@/lib/format';
import { applyToppings } from '@/lib/order';
import { saveOrder } from '@/lib/orderHistory';

export default function SuksesPage() {
  const router = useRouter();
  const { state, dispatch } = useOrder();
  const scored = state.menuTerpilih;
  const kode = state.kodePesanan;
  const applied = scored ? applyToppings(scored, state.toppingTambahan) : null;

  // Simpan ke riwayat saat halaman ini tampil (bukan saat klik "Bayar") — pesanan
  // hanya tercatat kalau user benar-benar sampai di layar sukses. SPEC.md §8.2.
  useEffect(() => {
    if (!kode || !scored || !applied) return;
    saveOrder({
      kode,
      menuId: scored.menu.id,
      menuNama: scored.menu.nama,
      menuFoto: scored.menu.foto,
      kcal: Math.round(applied.totals.kcal),
      protein: Math.round(applied.totals.protein),
      total: applied.harga,
      waktuAmbil: state.waktuAmbil,
      createdAt: new Date().toISOString(),
    });
    // hanya sekali per kode pesanan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kode]);

  function pesanLagi() {
    dispatch({ type: 'RESET' });
    router.push('/');
  }

  return (
    <>
      <header className="flex items-center justify-center px-4 pb-2 pt-5 md:hidden">
        <Logo />
      </header>

      {!kode ? (
        <PageShell>
          <section className="card mx-auto text-center md:max-w-[560px]">
            <h1 className="text-[22px] font-bold text-green-900">Belum ada pesanan aktif</h1>
            <p className="mt-2 text-[15px] text-gray-600">Riwayat pesananmu tersimpan di halaman Pesanan.</p>
            <Link href="/pesanan" className="btn-dark mx-auto mt-5">
              Lihat pesanan saya
            </Link>
          </section>
        </PageShell>
      ) : (
        <PageShell
          aside={
            <>
              <section className="card">
                <h2 className="text-[18px] font-bold text-green-900">Ringkasan</h2>
                <dl className="mt-3 space-y-2 text-[15px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-600">Menu</dt>
                    <dd className="text-right font-bold text-green-900">{scored?.menu.nama ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-600">Total</dt>
                    <dd className="font-bold text-rust-600">{applied ? formatRupiah(applied.harga) : '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-600">Waktu ambil</dt>
                    <dd className="text-right font-bold text-green-900">{state.waktuAmbil}</dd>
                  </div>
                </dl>
              </section>

              <button type="button" onClick={pesanLagi} className="btn-dark">
                Pesan lagi
              </button>
              <Link href="/pesanan" className="btn-ghost">
                Lihat pesanan saya
              </Link>
            </>
          }
        >
          <section className="card text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-lime-300 text-green-900">
              <IconCheck size={44} strokeWidth={3} />
            </div>
            <h1 className="mt-4 text-[28px] font-bold tracking-[-0.02em] text-green-900 lg:text-[36px]">
              Pesanan diterima!
            </h1>
            <p className="mt-1 text-[15px] text-gray-600">Kode pesananmu</p>
            <div className="mt-1 text-[44px] font-extrabold tracking-wider text-rust-600" aria-live="polite">
              {kode}
            </div>

            <div className="mx-auto mt-4 w-fit rounded-2xl border border-gray-200 bg-white p-3">
              <QrisMock seed={kode} />
            </div>
            <p className="mt-3 text-[14px] font-semibold text-green-900">Tunjukkan kode ini ke kasir</p>
          </section>
        </PageShell>
      )}
    </>
  );
}
