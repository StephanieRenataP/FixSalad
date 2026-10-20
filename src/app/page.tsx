import Link from 'next/link';
import { IconArrowRight, IconBadgeCheck, IconBolt, IconCart, IconSparkle } from '@/components/icons';
import { Logo } from '@/components/Logo';
import { MenuImage } from '@/components/MenuImage';
import { CONTAINER } from '@/components/PageShell';
import { StatBox } from '@/components/StatBox';
import { MENU_BY_ID } from '@/lib/data';

// Card "Rekomendasi untukmu" di landing STATIS — contoh, user belum input apa pun (SPEC.md §7.1).
const CONTOH = {
  nama: 'Super Lean Protein Bowl',
  foto: MENU_BY_ID.M01?.foto,
  kalori: '420 kkal',
  protein: '34g',
  harga: '48.000',
};

const LANGKAH = [
  { judul: 'Isi kebutuhan', teks: 'Target kalori, protein, rasa, dan bahan yang tidak disuka.' },
  { judul: 'AI meracik', teks: 'Kombinasi bahan dipilih agar paling dekat dengan targetmu.' },
  { judul: 'Pesan', teks: 'Ubah topping bila perlu, lalu bayar dan ambil.' },
];

export default function LandingPage() {
  return (
    <>
      {/* Header mobile: logo saja. >=768px header diambil alih <SiteNav>. */}
      <header className="sticky top-0 z-20 flex min-h-[68px] items-center bg-cream-50/95 px-4 py-3 shadow-card backdrop-blur md:hidden">
        <Logo />
      </header>

      <main className={`px-4 pb-32 pt-5 md:pb-16 md:pt-10 ${CONTAINER}`}>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-12">
        {/* Hero */}
        <section>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-300 px-3 py-1.5 text-[13px] font-semibold text-green-900">
            <IconSparkle size={16} />
            Personalisasi dengan AI
          </span>
          <h1 className="mt-4 text-[36px] font-extrabold leading-[1.1] tracking-[-0.02em] text-green-900 lg:text-[44px]">
            Salad yang sudah pas buat kamu, tanpa mikir.
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed text-gray-600 md:max-w-[60ch]">
            Ceritakan target dan seleranya. AI kami meracik salad atau wrap yang paling sesuai, lalu langsung bisa
            dipesan.
          </p>
          <div className="mt-6 space-y-3 lg:flex lg:gap-3 lg:space-y-0">
            <Link href="/preferensi" className="btn-primary">
              Mulai Personalisasi <IconArrowRight size={20} />
            </Link>
            <a href="#cara-kerja" className="btn-ghost">
              Lihat cara kerja
            </a>
          </div>
        </section>

        {/* Rekomendasi untukmu (statis) */}
        <section className="card mt-8 lg:mt-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[17px] font-bold text-green-900">
              <span className="h-2.5 w-2.5 rounded-full bg-rust-600" aria-hidden="true" />
              Rekomendasi untukmu
            </h2>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lime-300 px-2.5 py-1 text-[12px] font-bold text-green-900">
              <IconBadgeCheck size={14} />
              Cocok 100%
            </span>
          </div>
          <div className="relative">
            <MenuImage
              src={CONTOH.foto}
              alt={CONTOH.nama}
              sizes="(max-width: 480px) 100vw, 440px"
              priority
              className="aspect-[16/10] w-full rounded-2xl"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-lime-300">Paling relevan</div>
              <div className="text-[19px] font-bold text-white">{CONTOH.nama}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatBox label="Kalori" value={CONTOH.kalori} />
            <StatBox label="Protein" value={CONTOH.protein} />
            <StatBox label="Harga" value={`Rp ${CONTOH.harga}`} tone="price" />
          </div>
          <Link href="/preferensi" className="btn-dark mt-3 h-12">
            <IconCart size={20} />
            Ambil Menu Ini
          </Link>
        </section>
        </div>

        {/* Tiga langkah */}
        <section id="cara-kerja" className="mt-10 scroll-mt-24 lg:mt-16">
          <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-gray-600">
            <span className="h-1 w-7 rounded-full bg-rust-600" aria-hidden="true" />
            Alur praktis
          </div>
          <h2 className="mt-2 text-[26px] font-bold tracking-tight text-green-900">Tiga langkah gampang</h2>
          <ol className="mt-4 space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="card flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-900 text-[16px] font-bold text-lime-300">
                  {i + 1}
                </span>
                <div>
                  <h3 className="pt-1 text-[17px] font-bold text-green-900">{l.judul}</h3>
                  <p className="mt-1 text-[15px] text-gray-600">{l.teks}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Banner */}
        <Link
          href="/preferensi"
          className="mt-6 flex items-center justify-between gap-4 rounded-card bg-green-900 p-5 shadow-card"
        >
          <div>
            <div className="text-[17px] font-bold text-white">Siap makan sehat hari ini?</div>
            <div className="mt-1 text-[14px] text-white/70">Hanya butuh 45 detik racik resepmu.</div>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lime-300 text-green-900">
            <IconBolt size={22} />
          </span>
        </Link>
      </main>
    </>
  );
}
