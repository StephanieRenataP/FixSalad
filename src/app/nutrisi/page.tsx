import { IconInfo } from '@/components/icons';
import { Logo } from '@/components/Logo';
import { MenuImage } from '@/components/MenuImage';
import { PageShell } from '@/components/PageShell';
import { INGREDIENTS, INGREDIENT_BY_ID, MENUS, menuIngredientIds } from '@/lib/data';
import { BENTUK_LABEL, RASA_LABEL, TUJUAN_LABEL, AKTIVITAS_LABEL, formatNumber, formatRupiah } from '@/lib/format';
import { ACTIVITY_FACTOR, GOAL_CONFIG } from '@/lib/planner';
import { solvePortions } from '@/lib/solver';
import type { Aktivitas, Kategori, Tujuan } from '@/lib/types';

const KATEGORI: { key: Kategori; label: string }[] = [
  { key: 'base', label: 'Base' },
  { key: 'protein', label: 'Protein' },
  { key: 'topping', label: 'Topping' },
  { key: 'dressing', label: 'Dressing' },
];

// SPEC.md §2.3–2.4 — angka diambil langsung dari planner, jadi tabel tidak bisa beda dengan hitungan.
const AKTIVITAS_FAKTOR = ACTIVITY_FACTOR;
const TUJUAN_CONFIG = (Object.keys(GOAL_CONFIG) as Tujuan[]).map((tujuan) => ({
  tujuan,
  kalori: GOAL_CONFIG[tujuan].kalori,
  protein: GOAL_CONFIG[tujuan].proteinPerKg,
  natrium: GOAL_CONFIG[tujuan].natriumMg,
}));

// Porsi referensi untuk kartu menu (bagian b).
const REF_KCAL = 500;
const REF_PROTEIN = 30;
const REF_BUDGET = 50000;
const MENU_REFERENSI = MENUS.map((menu) => ({
  menu,
  solve: solvePortions(menuIngredientIds(menu), INGREDIENT_BY_ID, REF_KCAL, REF_PROTEIN, REF_BUDGET),
}));

const num = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const th = 'px-3 py-2.5 text-right font-semibold first:text-left';
const td = 'px-3 py-2.5 text-right tabular-nums first:text-left';

export default function NutrisiPage() {
  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-[68px] items-center bg-cream-50/95 px-4 py-3 shadow-card backdrop-blur md:hidden">
        <Logo />
      </header>

      <PageShell className="pb-32 pt-5 md:pb-16">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-green-900 lg:text-[36px]">
            Nutrisi bahan
          </h1>
          <p className="mt-1 text-[15px] text-gray-600 md:max-w-[60ch]">
            Semua {INGREDIENTS.length} bahan yang kami pakai, nilai gizi per 100 g.
          </p>
        </div>

        {/* (a) Tabel bahan */}
        <section className="card space-y-6">
          {KATEGORI.map(({ key, label }) => {
            const rows = INGREDIENTS.filter((i) => i.kategori === key);
            return (
              <div key={key}>
                <h2 className="text-[18px] font-bold text-green-900">
                  {label} <span className="text-[13px] font-medium text-gray-600">({rows.length} bahan)</span>
                </h2>
                {/* Mobile: geser horizontal, jangan dikecilkan sampai tak terbaca. */}
                <div className="-mx-5 mt-2 overflow-x-auto px-5 lg:-mx-7 lg:px-7">
                  <table className="w-full min-w-[640px] text-[14px] text-green-900">
                    <thead className="border-b border-gray-200 text-[12px] text-gray-600">
                      <tr>
                        <th scope="col" className={th}>Bahan</th>
                        <th scope="col" className={th}>Kalori (kkal)</th>
                        <th scope="col" className={th}>Protein (g)</th>
                        <th scope="col" className={th}>Karbo (g)</th>
                        <th scope="col" className={th}>Lemak (g)</th>
                        <th scope="col" className={th}>Serat (g)</th>
                        <th scope="col" className={th}>Natrium (mg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rows.map((i) => (
                        <tr key={i.id}>
                          <th scope="row" className={`${td} font-semibold`}>
                            <span className="flex flex-wrap items-center gap-1.5">
                              {i.nama}
                              {i.exclusionTag && (
                                <span className="rounded-full bg-rust-100 px-2 py-0.5 text-[11px] font-semibold text-rust-600">
                                  mengandung {i.exclusionTag}
                                </span>
                              )}
                            </span>
                          </th>
                          <td className={td}>{num.format(i.kcal)}</td>
                          <td className={td}>{num.format(i.protein)}</td>
                          <td className={td}>{num.format(i.karbo)}</td>
                          <td className={td}>{num.format(i.lemak)}</td>
                          <td className={td}>{num.format(i.serat)}</td>
                          <td className={td}>{num.format(i.natrium)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>

        {/* (b) Gizi per menu pada porsi referensi 500 kkal. Label wajib — tanpa itu
            angkanya menyesatkan, karena porsi aktual memang berbeda per user. */}
        <section>
          <h2 className="text-[22px] font-bold text-green-900">Gizi per menu</h2>
          <p className="mt-1 flex gap-2 rounded-xl bg-green-100 px-3 py-2.5 text-[13px] font-medium text-green-900 md:max-w-[60ch]">
            <IconInfo size={16} className="mt-0.5 shrink-0" />
            Nilai gizi di bawah dihitung pada porsi referensi 500 kkal. Porsi aktual menyesuaikan target kalori dan
            proteinmu.
          </p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MENU_REFERENSI.map(({ menu, solve }) => {
              const t = solve.totals;
              const stats = [
                { label: 'Kalori', value: `${formatNumber(t.kcal)} kkal` },
                { label: 'Protein', value: `${num.format(t.protein)} g` },
                { label: 'Karbo', value: `${num.format(t.karbo)} g` },
                { label: 'Lemak', value: `${num.format(t.lemak)} g` },
                { label: 'Serat', value: `${num.format(t.serat)} g` },
                { label: 'Natrium', value: `${formatNumber(t.natrium)} mg` },
              ];
              return (
                <li key={menu.id} className="overflow-hidden rounded-card bg-white shadow-card">
                  <MenuImage src={menu.foto} alt={menu.nama} sizes="(max-width: 768px) 100vw, 400px" className="aspect-[16/9] w-full" />
                  <div className="p-5">
                    <h3 className="text-[17px] font-bold leading-snug text-green-900">{menu.nama}</h3>
                    <p className="mt-0.5 text-[13px] text-gray-600">
                      {BENTUK_LABEL[menu.bentuk]} · {RASA_LABEL[menu.tagRasa]} · {formatRupiah(solve.hargaJual)}
                    </p>
                    <dl className="mt-3 grid grid-cols-3 gap-2">
                      {stats.map((s) => (
                        <div key={s.label} className="rounded-xl bg-cream-50 px-2 py-2 text-center">
                          <dt className="text-[11px] font-medium text-gray-600">{s.label}</dt>
                          <dd className="text-[14px] font-bold tabular-nums text-green-900">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* (c) Cara kami menghitung */}
        <section className="card">
          <h2 className="text-[22px] font-bold text-green-900">Cara kami menghitung</h2>
          <div className="mt-3 space-y-3 text-[15px] text-gray-600 md:max-w-[60ch]">
            <p>
              Kebutuhan energi istirahatmu (BMR) dihitung dengan rumus <strong className="text-green-900">Mifflin-St Jeor</strong>{' '}
              dari berat, tinggi, usia, dan gender. Rumus ini dipilih karena paling akurat untuk orang dewasa yang
              tidak berolahraga berat.
            </p>
            <p>
              BMR lalu dikali faktor aktivitas untuk mendapat kebutuhan harian (TDEE):{' '}
              {(Object.keys(AKTIVITAS_FAKTOR) as Aktivitas[]).map((a, idx, arr) => (
                <span key={a}>
                  {AKTIVITAS_LABEL[a].toLowerCase()} ×{num.format(AKTIVITAS_FAKTOR[a])}
                  {idx < arr.length - 1 ? ', ' : '.'}
                </span>
              ))}
            </p>
            <p>
              Terakhir, kalori disesuaikan dengan tujuanmu dan dibagi jumlah makan per hari. Kebutuhan protein dihitung
              dari berat badan:
            </p>
          </div>

          <div className="-mx-5 mt-4 overflow-x-auto px-5 lg:-mx-7 lg:px-7">
            <table className="w-full min-w-[420px] text-[14px] text-green-900 md:max-w-[560px]">
              <thead className="border-b border-gray-200 text-[12px] text-gray-600">
                <tr>
                  <th scope="col" className={th}>Tujuan</th>
                  <th scope="col" className={th}>Pengali kalori</th>
                  <th scope="col" className={th}>Protein (g/kg)</th>
                  <th scope="col" className={th}>Batas natrium/meal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {TUJUAN_CONFIG.map((t) => (
                  <tr key={t.tujuan}>
                    <th scope="row" className={`${td} font-semibold`}>{TUJUAN_LABEL[t.tujuan]}</th>
                    <td className={td}>×{num.format(t.kalori)}</td>
                    <td className={td}>{num.format(t.protein)}</td>
                    <td className={td}>{num.format(t.natrium)} mg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 flex gap-2 rounded-xl bg-green-100 px-3 py-2.5 text-[13px] text-green-900 md:max-w-[60ch]">
            <IconInfo size={16} className="mt-0.5 shrink-0" />
            Estimasi berdasarkan rumus standar. Angka aktual bisa berbeda ±15%. Bukan pengganti saran ahli gizi.
          </p>
        </section>
      </PageShell>
    </>
  );
}
