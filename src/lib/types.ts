// Semua tipe data FixSalad. Lihat SPEC.md §5 (data) dan §8 (state).

// ---------------------------------------------------------------------------
// Enum dasar
// ---------------------------------------------------------------------------

export type Tujuan = 'bulking' | 'high_protein' | 'defisit_kalori' | 'rendah_garam';
export type Rasa = 'pedas' | 'gurih' | 'segar';
export type Bentuk = 'bowl' | 'wrap';
export type Gender = 'pria' | 'wanita';
export type Aktivitas = 'sedentary' | 'ringan' | 'sedang' | 'aktif' | 'sangat_aktif';
export type Kategori = 'base' | 'protein' | 'topping' | 'dressing';
export type Mode = 'hitung' | 'manual';

// ---------------------------------------------------------------------------
// §5 — Struktur data katalog
// ---------------------------------------------------------------------------

export type Ingredient = {
  id: string; // "P01"
  nama: string;
  kategori: Kategori;
  kcal: number; // per 100 g
  protein: number;
  karbo: number;
  lemak: number;
  serat: number;
  natrium: number; // mg
  harga: number; // Rupiah per 100 g (modal)
  minGram: number;
  maxGram: number;
  tagRasa: Rasa | null;
  exclusionTag: string | null; // 'bawang' | 'tomat' | 'seledri' | 'jamur' | 'dairy' | 'gluten'
  foto: string | null; // URL Unsplash untuk protein & topping; null untuk base & dressing (§6.5)
};

export type MenuTemplate = {
  id: string; // "M01"
  nama: string;
  bentuk: Bentuk;
  baseIds: string[];
  proteinIds: string[];
  toppingIds: string[];
  dressingId: string;
  tagRasa: Rasa;
  cocokUntuk: Tujuan[];
  deskripsi: string;
  foto: string; // URL Unsplash lengkap — lihat §6.5
};

// ---------------------------------------------------------------------------
// Lapis 1 — Nutrition Planner (§2)
// ---------------------------------------------------------------------------

export type BodyData = {
  beratKg: number;
  tinggiCm: number;
  usia: number;
  gender: Gender;
  aktivitas: Aktivitas;
  makanPerHari: number;
};

export type NutritionTarget = {
  targetKcal: number;
  minProteinG: number;
  batasNatriumMg: number;
  bmr: number;
  tdee: number;
};

// ---------------------------------------------------------------------------
// Lapis 2 — Portion Solver (§3)
// ---------------------------------------------------------------------------

export type NutritionTotals = {
  kcal: number;
  protein: number;
  karbo: number;
  lemak: number;
  serat: number;
  natrium: number;
  modal: number;
};

/** 4 kriteria dari solver (SPEC.md §3.5). Pantangan tidak dihitung di sini —
 *  menu yang melanggar pantangan sudah dibuang oleh hard filter. */
export type ConstraintStatus = {
  kaloriOk: boolean;
  proteinOk: boolean;
  budgetOk: boolean;
  natriumOk: boolean;
};

export type SolveResult = {
  gram: Record<string, number>; // ingredientId → gram
  totals: NutritionTotals;
  hargaJual: number;
  constraints: ConstraintStatus;
  kriteriaTerpenuhi: number; // 0–4
};

// ---------------------------------------------------------------------------
// Lapis 3 — Menu Ranker (§4)
// ---------------------------------------------------------------------------

export type ModelWeights = {
  model_type: string;
  feature_names: string[];
  scaler_mean: number[];
  scaler_scale: number[];
  coefficients: number[];
  intercept: number;
  metrics?: Record<string, number | string>;
  trained_at?: string;
  data_source?: string;
};

export type ScoredMenu = {
  menu: MenuTemplate;
  solve: SolveResult;
  features: number[];
  score: number; // probabilitas 0–1
  rank: number; // 1 = terbaik
};

// ---------------------------------------------------------------------------
// §8 — State management
// ---------------------------------------------------------------------------

export type OrderState = {
  // Lapis 1 — data diri (opsional)
  mode: Mode;
  bodyData: BodyData | null;

  // Input preferensi
  tujuan: Tujuan | null;
  targetKcal: number | null;
  minProteinG: number | null;
  tidakSuka: string[];
  preferensiRasa: Rasa | null;
  budget: number | null;
  bentuk: Bentuk | null;

  // Hasil
  rekomendasi: ScoredMenu[] | null; // sudah terurut
  menuTerpilih: ScoredMenu | null;
  toppingTambahan: Record<string, number>; // ingredientId → jumlah unit (1 unit = 25 g)

  // Checkout — selalu ambil di tempat, tanpa login (§7.5)
  namaPengambil: string;
  noWhatsApp: string;
  waktuAmbil: string;
  kodePesanan: string | null;
};

export type OrderAction =
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_BODY_DATA'; bodyData: BodyData | null }
  | { type: 'SET_TUJUAN'; tujuan: Tujuan }
  | { type: 'SET_TARGET_KCAL'; value: number | null }
  | { type: 'SET_MIN_PROTEIN'; value: number | null }
  | { type: 'TOGGLE_TIDAK_SUKA'; tag: string }
  | { type: 'SET_RASA'; rasa: Rasa | null }
  | { type: 'SET_BUDGET'; value: number | null }
  | { type: 'SET_BENTUK'; bentuk: Bentuk }
  | { type: 'SET_REKOMENDASI'; rekomendasi: ScoredMenu[] }
  | { type: 'PILIH_MENU'; menu: ScoredMenu }
  | { type: 'SET_TOPPING'; ingredientId: string; units: number }
  | { type: 'RESET_TOPPING' }
  | { type: 'SET_NAMA_PENGAMBIL'; value: string }
  | { type: 'SET_NO_WHATSAPP'; value: string }
  | { type: 'SET_WAKTU_AMBIL'; value: string }
  | { type: 'SET_KODE_PESANAN'; kode: string }
  | { type: 'RESET' };
