'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconArrowRight, IconClock, IconReceipt } from '@/components/icons';
import { Logo } from '@/components/Logo';
import { MenuImage } from '@/components/MenuImage';
import { PageShell } from '@/components/PageShell';
import { formatNumber, formatRupiah } from '@/lib/format';
import { readOrders, type SavedOrder } from '@/lib/orderHistory';

const tanggal = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

function formatTanggal(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : tanggal.format(d);
}

export default function PesananPage() {
  // null = belum dibaca. localStorage dibaca HANYA di effect (SPEC.md §8.2) —
  // render pertama di server & client sama-sama kosong, jadi tidak ada hydration mismatch.
  const [orders, setOrders] = useState<SavedOrder[] | null>(null);

  useEffect(() => {
    setOrders(readOrders());
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-[68px] items-center bg-cream-50/95 px-4 py-3 shadow-card backdrop-blur md:hidden">
        <Logo />
      </header>

      <PageShell className="pb-32 pt-5 md:pb-16">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-green-900 lg:text-[36px]">
            Pesanan saya
          </h1>
          <p className="mt-1 text-[15px] text-gray-600 md:max-w-[60ch]">
            Riwayat pesanan di browser ini. Tidak perlu akun — tersimpan di perangkatmu saja.
          </p>
        </div>

        {orders === null ? (
          <div className="h-40" aria-busy="true" />
        ) : orders.length === 0 ? (
          <section className="card mx-auto text-center md:max-w-[560px]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-900">
              <IconReceipt size={30} />
            </div>
            <p className="mt-4 text-[17px] font-bold text-green-900">Belum ada pesanan.</p>
            <p className="mt-1 text-[15px] text-gray-600">Racik menu pertamamu dulu.</p>
            <Link href="/preferensi" className="btn-primary mx-auto mt-6">
              Mulai Personalisasi <IconArrowRight size={20} />
            </Link>
          </section>
        ) : (
          <ul className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {orders.map((o) => (
              <li key={o.kode} className="card flex gap-4">
                <MenuImage
                  src={o.menuFoto}
                  alt={o.menuNama}
                  sizes="80px"
                  compact
                  className="h-20 w-20 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-lime-300 px-2 py-0.5 text-[13px] font-bold tracking-wide text-green-900">
                      {o.kode}
                    </span>
                    <span className="shrink-0 text-[16px] font-bold text-rust-600">{formatRupiah(o.total)}</span>
                  </div>
                  <div className="mt-1.5 text-[16px] font-bold leading-snug text-green-900">{o.menuNama}</div>
                  <div className="text-[13px] text-gray-600">
                    {formatNumber(o.kcal)} kkal · {formatNumber(o.protein)} g protein
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-600">
                    <span className="flex items-center gap-1">
                      <IconClock size={13} />
                      {o.waktuAmbil}
                    </span>
                    <span>{formatTanggal(o.createdAt)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    </>
  );
}
