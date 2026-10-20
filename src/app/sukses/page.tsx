'use client';

import { useRouter } from 'next/navigation';
import { IconCheck } from '@/components/icons';
import { Logo } from '@/components/Logo';
import { QrisMock } from '@/components/QrisMock';
import { useOrder } from '@/context/OrderContext';
import { formatRupiah } from '@/lib/format';
import { applyToppings } from '@/lib/order';

export default function SuksesPage() {
  const router = useRouter();
  const { state, dispatch } = useOrder();
  const scored = state.menuTerpilih;
  const kode = state.kodePesanan ?? 'FS-0000';
  const total = scored ? applyToppings(scored, state.toppingTambahan).harga : null;

  function pesanLagi() {
    dispatch({ type: 'RESET' });
    router.push('/');
  }

  return (
    <>
      <header className="flex items-center justify-center px-4 pb-2 pt-5">
        <Logo />
      </header>

      <main className="space-y-4 px-4 pb-10 pt-4">
        <section className="card text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-lime-300 text-green-900">
            <IconCheck size={44} strokeWidth={3} />
          </div>
          <h1 className="mt-4 text-[28px] font-bold tracking-[-0.02em] text-green-900">Pesanan diterima!</h1>
          <p className="mt-1 text-[15px] text-gray-600">Kode pesananmu</p>
          <div className="mt-1 text-[44px] font-extrabold tracking-wider text-rust-600" aria-live="polite">
            {kode}
          </div>

          <div className="mx-auto mt-4 w-fit rounded-2xl border border-gray-200 bg-white p-3">
            <QrisMock seed={kode} />
          </div>
          <p className="mt-3 text-[14px] font-semibold text-green-900">Tunjukkan kode ini ke kasir</p>
        </section>

        <section className="card">
          <h2 className="text-[18px] font-bold text-green-900">Ringkasan</h2>
          <dl className="mt-3 space-y-2 text-[15px]">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600">Menu</dt>
              <dd className="text-right font-bold text-green-900">{scored?.menu.nama ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600">Total</dt>
              <dd className="font-bold text-rust-600">{total !== null ? formatRupiah(total) : '—'}</dd>
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
      </main>
    </>
  );
}
