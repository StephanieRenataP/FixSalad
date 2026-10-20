'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Chip } from '@/components/Chip';
import { FlowHeader } from '@/components/FlowHeader';
import {
  IconBrain,
  IconCheckCircle,
  IconClipboard,
  IconFlame,
  IconInfo,
  IconLeaf,
  IconPlus,
  IconSparkle,
} from '@/components/icons';
import { useOrder } from '@/context/OrderContext';
import {
  AKTIVITAS_LABEL,
  BENTUK_LABEL,
  RASA_LABEL,
  TUJUAN_LABEL,
  capitalize,
  formatNumber,
  parseNumber,
} from '@/lib/format';
import type { Aktivitas, Bentuk, Gender, Mode, Rasa, Tujuan } from '@/lib/types';

const TUJUAN_OPTIONS = Object.keys(TUJUAN_LABEL) as Tujuan[];
const RASA_OPTIONS = Object.keys(RASA_LABEL) as Rasa[];
const AKTIVITAS_OPTIONS = Object.keys(AKTIVITAS_LABEL) as Aktivitas[];
const PANTANGAN_UMUM = ['bawang', 'tomat', 'seledri', 'jamur'];
const MAKAN_OPTIONS = [2, 3, 4, 5];

const TABS: { mode: Mode; label: string }[] = [
  { mode: 'hitung', label: 'Hitungkan untuk saya' },
  { mode: 'manual', label: 'Saya tahu targetnya' },
];

/** Draft form data diri. Disimpan sebagai string agar input bisa kosong. */
type BodyDraft = {
  beratKg: string;
  tinggiCm: string;
  usia: string;
  gender: Gender | null;
  aktivitas: Aktivitas;
  makanPerHari: number;
};

export default function PreferensiPage() {
  const router = useRouter();
  const { state, dispatch } = useOrder();

  // Draft data diri hidup di level halaman (di atas blok yang disembunyikan),
  // jadi berpindah tab tidak menghapus isian. SPEC.md §7.2.
  const [body, setBody] = useState<BodyDraft>(() => ({
    beratKg: state.bodyData ? String(state.bodyData.beratKg) : '',
    tinggiCm: state.bodyData ? String(state.bodyData.tinggiCm) : '',
    usia: state.bodyData ? String(state.bodyData.usia) : '',
    gender: state.bodyData?.gender ?? null,
    aktivitas: state.bodyData?.aktivitas ?? 'ringan',
    makanPerHari: state.bodyData?.makanPerHari ?? 3,
  }));
  const [estimasi, setEstimasi] = useState<{ kcal: number; protein: number } | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [lainnyaOpen, setLainnyaOpen] = useState(false);
  const [lainnyaText, setLainnyaText] = useState('');

  const customTags = state.tidakSuka.filter((t) => !PANTANGAN_UMUM.includes(t));

  const canSubmit =
    state.tujuan !== null &&
    state.targetKcal !== null &&
    state.targetKcal > 0 &&
    state.minProteinG !== null &&
    state.minProteinG > 0 &&
    state.budget !== null &&
    state.budget > 0 &&
    state.bentuk !== null;

  function hitungKebutuhan() {
    const berat = Number(body.beratKg);
    const tinggi = Number(body.tinggiCm);
    const usia = Number(body.usia);
    if (!(berat >= 30 && berat <= 200)) return setBodyError('Berat harus 30–200 kg.');
    if (!(tinggi >= 120 && tinggi <= 220)) return setBodyError('Tinggi harus 120–220 cm.');
    if (!(usia >= 15 && usia <= 80)) return setBodyError('Usia harus 15–80 tahun.');
    if (!body.gender) return setBodyError('Pilih gender.');
    if (!state.tujuan) return setBodyError('Pilih tujuan dulu di bawah.');
    setBodyError(null);

    dispatch({
      type: 'SET_BODY_DATA',
      bodyData: { beratKg: berat, tinggiCm: tinggi, usia, gender: body.gender, aktivitas: body.aktivitas, makanPerHari: body.makanPerHari },
    });

    // TODO(sesi 2): ganti dengan calculateTargets() dari lib/planner.ts.
    const dummy = { kcal: 520, protein: 38 };
    setEstimasi(dummy);
    dispatch({ type: 'SET_TARGET_KCAL', value: dummy.kcal });
    dispatch({ type: 'SET_MIN_PROTEIN', value: dummy.protein });
  }

  function tambahLainnya() {
    const tag = lainnyaText.trim().toLowerCase();
    if (tag && !state.tidakSuka.includes(tag)) dispatch({ type: 'TOGGLE_TIDAK_SUKA', tag });
    setLainnyaText('');
    setLainnyaOpen(false);
  }

  function racik() {
    if (!canSubmit) return;
    // TODO(sesi 2): panggil recommend() lalu dispatch SET_REKOMENDASI.
    router.push('/rekomendasi');
  }

  const ringkasanAtas = [
    state.tujuan ? TUJUAN_LABEL[state.tujuan] : 'Tujuan —',
    state.targetKcal ? `${formatNumber(state.targetKcal)} kcal` : '— kcal',
    state.minProteinG ? `min. ${state.minProteinG} g protein` : 'min. — g protein',
  ].join(' · ');
  const ringkasanBawah = [
    state.tidakSuka.length ? `Tanpa ${state.tidakSuka.join(', ')}` : 'Tanpa pantangan',
    state.preferensiRasa ? RASA_LABEL[state.preferensiRasa] : 'Rasa bebas',
    state.budget ? `Maks. Rp${formatNumber(state.budget)}` : 'Budget —',
    state.bentuk ? BENTUK_LABEL[state.bentuk] : 'Bentuk —',
  ].join(' · ');

  return (
    <>
      <FlowHeader title="Preferensi" step={1} backHref="/" />

      <main className="space-y-4 px-4 pb-10 pt-4">
        <section className="card">
          <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-green-900">Ceritakan kebutuhanmu</h2>
          <p className="mt-1 text-[15px] text-gray-600">Sesuaikan porsi, pantangan, dan cita rasa favoritmu.</p>

          {/* Pill tab — bukan screen baru, tidak mengubah URL. SPEC.md §7.2 */}
          <div role="tablist" aria-label="Cara menentukan target" className="mt-5 grid grid-cols-2 gap-2">
            {TABS.map((t) => {
              const selected = state.mode === t.mode;
              return (
                <button
                  key={t.mode}
                  type="button"
                  role="tab"
                  id={`tab-${t.mode}`}
                  aria-selected={selected}
                  aria-controls="panel-data-diri"
                  onClick={() => dispatch({ type: 'SET_MODE', mode: t.mode })}
                  className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-center text-[14px] font-semibold leading-tight transition-colors ${
                    selected ? 'bg-green-900 text-white' : 'bg-green-100 text-green-900 hover:brightness-95'
                  }`}
                >
                  {t.label}
                  {selected && <IconCheckCircle size={16} className="shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Blok data diri — hanya tab "Hitungkan". Disembunyikan (bukan di-unmount). */}
          <div
            id="panel-data-diri"
            role="tabpanel"
            aria-labelledby="tab-hitung"
            hidden={state.mode !== 'hitung'}
            className="mt-5 space-y-4 border-b border-gray-200 pb-5"
          >
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Berat (kg)" suffix="kg" value={body.beratKg} onChange={(v) => setBody({ ...body, beratKg: v })} placeholder="60" />
              <NumberField label="Tinggi (cm)" suffix="cm" value={body.tinggiCm} onChange={(v) => setBody({ ...body, tinggiCm: v })} placeholder="165" />
              <NumberField label="Usia" suffix="th" value={body.usia} onChange={(v) => setBody({ ...body, usia: v })} placeholder="21" />
              <div>
                <span className="label">Gender</span>
                <div className="grid h-14 grid-cols-2 gap-2">
                  {(['pria', 'wanita'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={body.gender === g}
                      aria-label={capitalize(g)}
                      onClick={() => setBody({ ...body, gender: g })}
                      className={`rounded-btn text-[15px] font-semibold ${
                        body.gender === g ? 'bg-green-900 text-white' : 'bg-cream-50 text-green-900'
                      }`}
                    >
                      {g === 'pria' ? 'P' : 'W'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="block">
              <span className="label">Level aktivitas</span>
              <div className="field text-[15px] font-semibold">
                <select
                  value={body.aktivitas}
                  onChange={(e) => setBody({ ...body, aktivitas: e.target.value as Aktivitas })}
                >
                  {AKTIVITAS_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {AKTIVITAS_LABEL[a]}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div>
              <span className="label">Makan per hari</span>
              <div className="flex flex-wrap gap-2">
                {MAKAN_OPTIONS.map((n) => (
                  <Chip key={n} active={body.makanPerHari === n} onClick={() => setBody({ ...body, makanPerHari: n })}>
                    {n}×
                  </Chip>
                ))}
              </div>
            </div>

            {bodyError && (
              <p role="alert" className="rounded-xl bg-rust-100 px-3 py-2 text-[13px] font-medium text-rust-600">
                {bodyError}
              </p>
            )}

            <button type="button" onClick={hitungKebutuhan} className="btn-dark">
              Hitung Kebutuhanku
            </button>

            {estimasi && (
              <div className="rounded-2xl border border-green-700/20 bg-green-100 p-4">
                <div className="text-[13px] font-semibold text-green-700">Estimasi kebutuhanmu</div>
                <div className="mt-1 text-[20px] font-bold text-green-900">
                  {formatNumber(estimasi.kcal)} kkal/meal · min {estimasi.protein} g protein
                </div>
                <p className="mt-2 flex gap-1.5 text-[12px] leading-snug text-gray-600">
                  <IconInfo size={14} className="mt-px shrink-0" />
                  Estimasi berdasarkan rumus Mifflin-St Jeor. Angka aktual bisa berbeda ±15%. Bukan pengganti saran ahli
                  gizi.
                </p>
              </div>
            )}
          </div>

          {/* Selalu tampil di kedua mode */}
          <div className="mt-5 space-y-5">
            <fieldset>
              <legend className="label">Tujuan</legend>
              <div className="flex flex-wrap gap-2">
                {TUJUAN_OPTIONS.map((t) => (
                  <Chip key={t} active={state.tujuan === t} onClick={() => dispatch({ type: 'SET_TUJUAN', tujuan: t })}>
                    {TUJUAN_LABEL[t]}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Target kalori (kcal)"
                suffix="kcal"
                value={state.targetKcal?.toString() ?? ''}
                onChange={(v) => dispatch({ type: 'SET_TARGET_KCAL', value: parseNumber(v) })}
                placeholder="500"
              />
              <NumberField
                label="Protein minimal (g)"
                suffix="gram"
                value={state.minProteinG?.toString() ?? ''}
                onChange={(v) => dispatch({ type: 'SET_MIN_PROTEIN', value: parseNumber(v) })}
                placeholder="30"
              />
            </div>

            <fieldset>
              <legend className="label">Tidak suka</legend>
              <div className="flex flex-wrap gap-2">
                {[...PANTANGAN_UMUM, ...customTags].map((tag) => (
                  <Chip
                    key={tag}
                    active={state.tidakSuka.includes(tag)}
                    onClick={() => dispatch({ type: 'TOGGLE_TIDAK_SUKA', tag })}
                  >
                    {capitalize(tag)}
                  </Chip>
                ))}
                {!lainnyaOpen && (
                  <Chip onClick={() => setLainnyaOpen(true)} className="!bg-gray-200">
                    <IconPlus size={16} />
                    Lainnya
                  </Chip>
                )}
              </div>
              {lainnyaOpen && (
                <div className="mt-2 flex gap-2">
                  <div className="field h-12 flex-1 text-[15px] font-semibold">
                    <input
                      autoFocus
                      value={lainnyaText}
                      onChange={(e) => setLainnyaText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && tambahLainnya()}
                      placeholder="mis. dairy, gluten"
                      aria-label="Bahan lain yang tidak disuka"
                    />
                  </div>
                  <button type="button" onClick={tambahLainnya} className="h-12 rounded-btn bg-green-900 px-4 text-[14px] font-bold text-white">
                    Tambah
                  </button>
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend className="label">Preferensi rasa</legend>
              <div className="flex flex-wrap gap-2">
                {RASA_OPTIONS.map((r) => (
                  <Chip
                    key={r}
                    active={state.preferensiRasa === r}
                    onClick={() => dispatch({ type: 'SET_RASA', rasa: state.preferensiRasa === r ? null : r })}
                  >
                    {RASA_LABEL[r]}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className="label">Budget (Rp)</span>
                <div className="field">
                  <span className="text-[13px] font-medium text-gray-600">Rp</span>
                  <input
                    inputMode="numeric"
                    value={state.budget ? formatNumber(state.budget) : ''}
                    onChange={(e) => dispatch({ type: 'SET_BUDGET', value: parseNumber(e.target.value) })}
                    placeholder="40.000"
                  />
                </div>
              </label>
              <fieldset className="min-w-0">
                <legend className="label">Bentuk</legend>
                <div className="grid h-14 grid-cols-2 gap-2">
                  {(['wrap', 'bowl'] as Bentuk[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={state.bentuk === b}
                      onClick={() => dispatch({ type: 'SET_BENTUK', bentuk: b })}
                      className={`rounded-btn text-[15px] font-semibold ${
                        state.bentuk === b ? 'bg-green-900 text-white' : 'bg-cream-50 text-green-900'
                      }`}
                    >
                      {BENTUK_LABEL[b]}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <button type="button" onClick={racik} disabled={!canSubmit} className="btn-primary text-[18px]">
              Racik Menu Saya <IconSparkle size={20} />
            </button>
            {!canSubmit && (
              <p className="-mt-2 text-center text-[13px] text-gray-600">
                Lengkapi tujuan, target kalori, protein, budget, dan bentuk.
              </p>
            )}
          </div>
        </section>

        {/* Ringkasan live */}
        <section className="rounded-card bg-green-700 p-5 text-white shadow-card" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[18px] font-bold">
              <IconClipboard size={20} className="text-lime-300" />
              Ringkasan inputmu
            </h2>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${
                canSubmit ? 'bg-lime-300 text-green-900' : 'bg-white/15 text-white/80'
              }`}
            >
              {canSubmit ? 'AI Ready' : 'Belum lengkap'}
            </span>
          </div>
          <p className="mt-3 text-[17px] font-bold leading-snug">{ringkasanAtas}</p>
          <p className="mt-1 text-[15px] leading-snug text-white/65">{ringkasanBawah}</p>
          <p className="mt-3 flex gap-2 text-[13px] leading-snug text-white/65">
            <IconBrain size={18} className="shrink-0 text-lime-300" />
            AI memilih bahan sendiri. Kamu tidak perlu menyusun satu per satu.
          </p>
        </section>

        <div className="flex items-center justify-between gap-2 px-1 pt-1 text-[12px] font-medium text-gray-600">
          <span className="flex items-center gap-1.5">
            <IconCheckCircle size={18} className="text-lime-300" /> 100% Organik
          </span>
          <span className="h-1 w-1 rounded-full bg-gray-600/50" aria-hidden="true" />
          <span className="flex items-center gap-1.5">
            <IconFlame size={18} className="text-rust-600" /> Kalori Terhitung
          </span>
          <span className="h-1 w-1 rounded-full bg-gray-600/50" aria-hidden="true" />
          <span className="flex items-center gap-1.5">
            <IconLeaf size={18} className="text-green-700" /> Eco-Packaging
          </span>
        </div>
      </main>
    </>
  );
}

function NumberField(props: {
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="label">{props.label}</span>
      <div className="field">
        <input
          inputMode="numeric"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value.replace(/[^\d]/g, ''))}
          placeholder={props.placeholder}
        />
        <span className="shrink-0 text-[13px] font-medium text-gray-600">{props.suffix}</span>
      </div>
    </label>
  );
}
