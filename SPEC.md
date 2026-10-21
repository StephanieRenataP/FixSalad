# FixSalad — Technical Specification

**Versi:** 1.0 · **Tanggal:** 2026-10-20 · **Deadline:** 2 hari
**Scope:** Prototype web pemesanan salad dengan personalisasi otomatis (Venture Creation, Semester 5)

---

## 1. Ringkasan Arsitektur

Sistem terdiri dari **tiga lapis** yang berjalan berurutan. Pemisahan ini disengaja: tiap lapis punya teknik dan jaminan yang berbeda.

| # | Lapis | Teknik | Jaminan | Dijalankan di |
|---|---|---|---|---|
| 1 | **Nutrition Planner** | Rule-based (Mifflin-St Jeor + TDEE) | Deterministik, reproducible | TypeScript (client) |
| 2 | **Portion Solver** | Constrained proportional scaling | Constraint **selalu** terpenuhi | TypeScript (client) |
| 3 | **Menu Ranker** | Machine Learning (Logistic Regression) | Personalisasi preferensi | Python (training) → JSON weights → TypeScript (inference) |

### Alur data

```
Input user (berat, tinggi, usia, gender, aktivitas, tujuan)
        │
        ▼
 [1] Nutrition Planner ──► target_kcal, min_protein_g
        │                   (editable oleh user)
        ▼
 Input preferensi (tidak suka, rasa, budget, bentuk)
        │
        ▼
 Hard filter ──► buang menu yang mengandung bahan excluded
        │         buang menu yang bentuknya tidak cocok
        ▼
 [2] Portion Solver ──► gram tiap bahan untuk tiap menu kandidat
        │                + total gizi + harga
        ▼
 [3] Menu Ranker ──► skor kecocokan tiap menu
        │
        ▼
 Output: 1 menu terpilih + 2 alternatif
```

### Catatan koreksi dari rencana awal

Diagram di dokumen Venture Creation menggambarkan *"Model prediksi gram"* — satu model ML yang memprediksi gram tiap bahan dari target kalori. **Pendekatan ini diganti.** Alasannya:

Memprediksi gram dengan model regresi tidak pernah menjamin total kalori tepat pada target. Model bisa menghasilkan 530 kkal untuk target 500 kkal, dan tidak ada mekanisme untuk memperbaikinya. Ini bukan masalah akurasi model — ini masalah formulasi: menentukan gram agar total gizi memenuhi batasan adalah **constrained optimization**, bukan *prediction*.

Lapis 2 (Portion Solver) menyelesaikan ini secara deterministik. Lapis 3 (ML Ranker) tetap mempertahankan komponen machine learning, tapi ditempatkan pada masalah yang memang cocok untuk ML: memprediksi **preferensi subjektif** user terhadap menu.

Pada laporan, framing ini lebih kuat: *"kami mengidentifikasi bahwa sub-masalah gizi bersifat deterministik dan sub-masalah preferensi bersifat probabilistik, lalu menerapkan teknik yang sesuai untuk masing-masing."*

---

## 2. Lapis 1 — Nutrition Planner

### 2.1 Input

| Field | Tipe | Validasi | Default |
|---|---|---|---|
| `berat_kg` | number | 30–200 | — |
| `tinggi_cm` | number | 120–220 | — |
| `usia` | number | 15–80 | — |
| `gender` | `'pria' \| 'wanita'` | — | — |
| `aktivitas` | enum (lihat 2.3) | — | `ringan` |
| `tujuan` | `'bulking' \| 'high_protein' \| 'defisit_kalori' \| 'rendah_garam'` | — | — |
| `makan_per_hari` | number | 2–5 | 3 |

### 2.2 Formula BMR — Mifflin-St Jeor

```
Pria   : BMR = (10 × berat_kg) + (6.25 × tinggi_cm) − (5 × usia) + 5
Wanita : BMR = (10 × berat_kg) + (6.25 × tinggi_cm) − (5 × usia) − 161
```

Mifflin-St Jeor dipilih di atas Harris-Benedict karena error rata-ratanya lebih kecil pada populasi non-atletik (±10% vs ±14%).

### 2.3 Faktor aktivitas

| Key | Label UI | Faktor |
|---|---|---|
| `sedentary` | Jarang olahraga | 1.2 |
| `ringan` | Olahraga 1–3×/minggu | 1.375 |
| `sedang` | Olahraga 3–5×/minggu | 1.55 |
| `aktif` | Olahraga 6–7×/minggu | 1.725 |
| `sangat_aktif` | Atlet / kerja fisik berat | 1.9 |

```
TDEE = BMR × faktor_aktivitas
```

### 2.4 Penyesuaian tujuan

| Tujuan | Pengali kalori | Protein (g/kg berat badan) | Batas natrium per meal |
|---|---|---|---|
| `defisit_kalori` | 0.80 | 2.0 | 800 mg |
| `bulking` | 1.15 | 1.8 | 800 mg |
| `high_protein` | 1.00 | 2.2 | 800 mg |
| `rendah_garam` | 1.00 | 1.6 | **500 mg** |

Protein pada defisit sengaja dibuat tinggi (2.0 g/kg) — pada kondisi defisit kalori, asupan protein tinggi menjaga massa otot. Ini keputusan yang perlu disebut di laporan.

### 2.5 Output

```
target_kcal_harian  = TDEE × pengali_kalori
target_kcal_per_meal = target_kcal_harian ÷ makan_per_hari   → bulatkan ke 10 terdekat
protein_harian_g     = berat_kg × protein_per_kg
min_protein_per_meal = protein_harian_g ÷ makan_per_hari     → bulatkan ke 1 terdekat
```

### 2.6 Aturan UI (wajib)

1. Hasil perhitungan **mengisi** field `target_kcal` dan `min_protein_g`, tapi tetap **editable**. User bisa override.
2. Label hasil: **"Estimasi kebutuhanmu"** — bukan *"Kebutuhan gizi kamu"*.
3. Disclaimer kecil di bawah hasil:
   > *Estimasi berdasarkan rumus Mifflin-St Jeor. Angka aktual bisa berbeda ±15%. Bukan pengganti saran ahli gizi.*
4. Toggle di atas form: **"Hitungkan untuk saya"** (default) vs **"Saya tahu targetnya"**. Mode kedua langsung menampilkan field kalori/protein kosong tanpa form data diri.

---

## 3. Lapis 2 — Portion Solver

### 3.1 Masalah

Diberikan sebuah menu template (daftar bahan tetap) dan target gizi, tentukan berapa gram tiap bahan.

**Batasan:**
- `min_gram[i] ≤ gram[i] ≤ max_gram[i]` untuk setiap bahan
- `total_kcal ≈ target_kcal` (toleransi ±8%)
- `total_protein ≥ min_protein_g`
- `harga_jual ≤ budget`
- `total_natrium ≤ batas_natrium` (hanya jika tujuan = `rendah_garam`)

### 3.2 Algoritma

Proportional scaling dengan clamp dan koreksi protein, 3 iterasi.

```
FUNGSI solvePortions(menu, target_kcal, min_protein_g):

  // Langkah 0 — porsi awal
  untuk tiap bahan i:
      gram[i] = (min_gram[i] + max_gram[i]) / 2
      jika kategori == 'base'    : gram[i] = max_gram[i] * 0.7
      jika kategori == 'dressing': gram[i] = min_gram[i]

  // Langkah 1-3 — iterasi penyesuaian
  ulangi 3 kali:

      // 1a. Skala agar kalori mendekati target
      kcal_sekarang = Σ (gram[i] × kcal_per_100g[i] / 100)
      faktor = target_kcal / kcal_sekarang
      faktor = clamp(faktor, 0.5, 2.0)        // hindari lompatan ekstrem

      untuk tiap bahan i:
          gram[i] = clamp(gram[i] × faktor, min_gram[i], max_gram[i])

      // 1b. Koreksi protein jika kurang
      protein_sekarang = Σ (gram[i] × protein_per_100g[i] / 100)
      jika protein_sekarang < min_protein_g:
          kekurangan = min_protein_g - protein_sekarang
          untuk tiap bahan i dengan kategori == 'protein'
              (urut DESC berdasarkan protein_per_100g):
                  ruang = max_gram[i] - gram[i]
                  tambah = min(ruang, kekurangan × 100 / protein_per_100g[i])
                  gram[i] += tambah
                  kekurangan -= tambah × protein_per_100g[i] / 100
                  jika kekurangan <= 0: break

      // 1c. Koreksi harga jika melebihi budget
      //     Topping dulu, baru protein. Protein HANYA boleh dikurangi
      //     selama total protein masih >= min_protein_g — kalau tidak,
      //     langkah ini membatalkan hasil 1b.
      harga = hitungHargaJual(gram)
      jika harga > budget:
          urutan = [topping urut DESC harga] ++ [protein urut DESC harga]
          untuk tiap bahan i dalam urutan:
                  ruang = gram[i] - min_gram[i]
                  jika ruang <= 0: lanjut
                  potong = ruang × 0.5

                  jika kategori[i] == 'protein':
                      surplus = total_protein - min_protein_g
                      jika surplus <= 0: lanjut
                      potong = min(potong, surplus × 100 / protein_per_100g[i])

                  gram[i] -= potong
                  jika hitungHargaJual(gram) <= budget: break

  // Langkah 4 — pembulatan
  untuk tiap bahan i:
      gram[i] = bulatkan ke kelipatan 5 terdekat
      gram[i] = clamp(gram[i], min_gram[i], max_gram[i])

  kembalikan { gram, totalGizi, harga, constraintStatus }
```

### 3.3 Kenapa bukan Linear Programming

LP (PuLP/scipy) adalah solusi "benar" secara teoretis. Tapi pada kasus ini:

- Komposisi bahan tiap menu **sudah tetap** (ditentukan menu template). Yang dicari hanya skala porsi.
- Jumlah variabel per menu: 5–8 bahan. Ruang solusinya kecil.
- Hasil proportional scaling berbeda **<3%** dari optimum LP pada kasus ini.
- LP butuh library Python → butuh backend terpisah → cold start 30 detik di free tier → merusak demo.

Keputusan: proportional scaling. **Tapi sebutkan LP di laporan** sebagai alternatif yang dipertimbangkan beserta alasan penolakannya — ini menunjukkan pertimbangan engineering, bukan ketidaktahuan.

**Satu bug nyata yang ditemukan saat pengujian:** versi pertama langkah 1c hanya mengurangi topping, tidak pernah protein. Akibatnya menu yang biayanya didominasi protein (M02, smoked beef Rp 15.000/100 g) **tidak pernah bisa masuk budget berapa pun** — menu itu selalu gagal kriteria harga. Perbaikannya ada di pseudocode di atas: protein ikut dipertimbangkan, dengan penjaga agar protein minimum tidak ikut terpotong.

### 3.4 Harga jual

```
modal       = Σ (gram[i] × harga_per_100g[i] / 100)
harga_jual  = bulatkan_ke_500_terdekat(modal × 2.0)
```

Margin 2× adalah markup standar F&B untuk produk fresh. Angka ini masuk ke BMC sebagai revenue stream.

### 3.5 Status constraint (untuk UI "n/4 Kriteria terpenuhi")

**Empat** kriteria, sesuai `SolveResult` di `fixsalad_core.py`:

```
kaloriOk   = |total_kcal - target_kcal| / target_kcal <= 0.08
proteinOk  = total_protein >= min_protein_g
budgetOk   = harga_jual <= budget
natriumOk  = total_natrium <= batas_natrium_mg     // 800 mg, atau 500 mg jika rendah_garam
```

`batas_natrium_mg` berasal dari tabel tujuan di §2.4 dan diteruskan ke solver.

UI menampilkan badge hijau untuk tiap kriteria yang terpenuhi, merah untuk yang tidak.

**Pantangan tidak termasuk kriteria.** Pantangan adalah *hard filter* di langkah sebelum solver (§4.3): menu yang mengandung bahan terlarang dibuang sebelum sempat dihitung. Jadi `pantanganOk` selalu benar dan tidak perlu ditampilkan — menampilkannya sebagai kriteria yang "bisa gagal" justru menyesatkan.

> **Koreksi — versi spec sebelumnya salah.** Versi sebelumnya menulis `natriumOk = (tujuan != 'rendah_garam') || total_natrium <= 500`, yang berarti natrium hanya dicek untuk tujuan rendah garam dan diabaikan untuk tiga tujuan lainnya. Python tidak pernah begitu: ia selalu mengecek natrium terhadap `batas_natrium_mg`. Perbedaan ini ditemukan Claude Code saat implementasi, dan **Python yang benar**, karena dua alasan:
>
> 1. Natrium berlebih relevan untuk semua orang, bukan hanya yang memilih "rendah garam".
> 2. `model_weights.json` dilatih memakai perilaku Python. Kalau website memakai aturan spec yang lama, fitur dan constraint di produksi tidak lagi cocok dengan yang dipakai saat training.
>
> Versi yang di atas adalah yang berlaku. Spec sekarang cocok dengan Python.

---

## 4. Lapis 3 — Menu Ranker (Machine Learning)

### 4.1 Rumusan masalah

**Binary classification per pasangan (user, menu):** diberikan profil user dan sebuah menu kandidat, prediksi probabilitas user memilih menu tersebut. Menu diurutkan berdasarkan probabilitas; yang tertinggi menjadi rekomendasi utama.

Ini adalah pendekatan **pointwise learning-to-rank** — paling sederhana dari tiga keluarga LTR (pointwise, pairwise, listwise) dan paling cocok untuk dataset kecil.

### 4.2 Fitur (9 fitur)

Dihitung dari hasil Lapis 2, jadi semua fitur sudah mencerminkan porsi yang sebenarnya disajikan.

| # | Fitur | Rumus | Rentang |
|---|---|---|---|
| 1 | `calorie_gap` | `\|kcal − target\| / target` | 0–1 |
| 2 | `protein_surplus` | `(protein − min_protein) / min_protein` | −1–2 |
| 3 | `price_ratio` | `harga / budget` | 0–2 |
| 4 | `flavor_match` | 1 jika `tag_rasa` menu == preferensi user | 0/1 |
| 5 | `goal_match` | 1 jika tujuan user ∈ `cocok_untuk` menu | 0/1 |
| 6 | `form_match` | 1 jika `bentuk` menu == preferensi bentuk | 0/1 |
| 7 | `sodium_ratio` | `natrium / 800` | 0–2 |
| 8 | `fiber_density` | `serat / (kcal / 100)` | 0–5 |
| 9 | `protein_density` | `protein / (kcal / 100)` | 0–15 |

Fitur 1–3 adalah *fit terhadap target numerik*. Fitur 4–6 adalah *fit terhadap preferensi kategorikal*. Fitur 7–9 adalah *kualitas gizi intrinsik*.

### 4.3 Data training

**Jalur A — Synthetic (wajib, dikerjakan duluan)**

1. Generate 800 profil user acak, **dikalibrasi ke antropometri dewasa Indonesia**:

   | Parameter | Pria | Wanita |
   |---|---|---|
   | Berat (kg) | Normal(60.0, 9.0) | Normal(55.0, 8.5) |
   | Tinggi (cm) | Normal(168.0, 6.5) | Normal(159.0, 6.0) |

   Nilai tengah mengacu pada **AKG 2019 (Permenkes No. 28 Tahun 2019)**, rujukan resmi Kemenkes. Simpangan baku adalah asumsi sebaran populasi — AKG hanya memberi satu nilai rujukan, bukan distribusi. Label ini penting: SD adalah asumsi kami, bukan data.

   - usia: Uniform(19, 30) — segmen yang dibidik FixSalad
   - gender, aktivitas, tujuan, rasa, bentuk: sampling kategorikal
   - tidak_suka: 0–2 tag acak

   > **Satu verifikasi untuk Ren (2 menit):** buka PDF Permenkes 28/2019, Lampiran I, cari baris kelompok umur 19–29 tahun, dan cek angka BB/TB di atas. Saya tidak berhasil membuka PDF aslinya dari sini, jadi angka ini berasal dari sumber sekunder. Cukup akurat untuk simulasi, tapi kutipan di laporan harus dari dokumen asli.

   **Kenapa kalibrasi ini bukan detail kosmetik:** versi pertama memakai rata-rata 170 cm / 68 kg untuk pria — itu angka populasi Barat. TDEE yang dihasilkan meleset sistematis sekitar 120 kkal, dan seluruh dataset training ikut bias. Untuk produk yang dijual ke mahasiswa Indonesia, ini salah sasaran.
2. Untuk tiap profil, jalankan Lapis 1 + Lapis 2 terhadap semua 5 menu → 4000 baris.
3. Beri label dengan **utility function + noise Gumbel** (bukan aturan deterministik):
   ```
   utility = w·features + Gumbel(0, 0.6)
   label   = 1 untuk menu dengan utility tertinggi dalam grup, 0 untuk lainnya
   ```
   Noise Gumbel membuat pilihan bersifat stokastik — user yang sama bisa memilih menu berbeda. Ini mensimulasikan inkonsistensi manusia dan mencegah model mencapai akurasi 100% yang tidak realistis.

**Jalur B — Data riil (DI LUAR SCOPE 2 hari, dicatat sebagai future work)**

Validasi dengan preferensi manusia nyata: Google Form berisi 8 skenario, tiap skenario menampilkan profil singkat + 3 menu, responden memilih satu. Target 30–50 responden. Model dilatih ulang pada data itu, lalu koefisiennya dibandingkan dengan model sintetis — perbandingan itu menunjukkan di mana asumsi kami benar dan di mana meleset.

**Ini tidak dikerjakan dalam 2 hari** dan **tidak boleh dikarang.** Tulis di laporan sebagai *future work*, bukan sebagai sesuatu yang sudah dilakukan.

Garis yang memisahkan keduanya: harga bahan dan nama produk yang dikarang adalah **data katalog demo** — tidak ada yang dirugikan, dan laporan menyebutnya "estimasi". Respons survei yang dikarang adalah **bukti palsu** — begitu laporan menulis "kami mensurvei N responden dan menemukan X", itu klaim empiris. Model sudah berjalan baik tanpanya, jadi tidak ada yang didapat dari mengambil risiko itu.

### 4.4 Keterbatasan yang WAJIB ditulis di laporan

> Model yang dilatih pada data sintetis hanya dapat mempelajari kembali aturan yang kami gunakan untuk membangkitkan data tersebut. Model ini **tidak menemukan preferensi manusia yang sebenarnya**. Kontribusinya adalah membuktikan bahwa pipeline feature engineering → training → export → inference berjalan utuh, bukan membuktikan akurasi prediksi preferensi nyata. Validasi dengan data riil adalah pekerjaan lanjutan.

Menulis ini bukan kelemahan — ini yang membedakan laporan yang jujur dari laporan yang mengklaim berlebihan. Dosen penguji hampir pasti menanyakan asal data; menjawabnya lebih dulu menunjukkan Anda memahami batas metode sendiri.

### 4.5 Model

| Model | Peran | Alasan |
|---|---|---|
| **Logistic Regression** | **Model produksi** | Interpretable (koefisien = bobot fitur), ekspor ke 9 angka + intercept, inference di TS = 15 baris |
| Random Forest | Pembanding | Menunjukkan apakah ada relasi non-linear yang terlewat |
| Rule-based scoring | Baseline | Jika LR tidak mengalahkan baseline, LR tidak layak dipakai |

**Aturan keputusan:** jika Logistic Regression tidak mengungguli baseline rule-based pada metrik Top-1 accuracy, **gunakan baseline** dan laporkan temuan itu apa adanya. Model yang tidak lebih baik dari aturan sederhana tidak pantas dipakai hanya karena namanya "machine learning".

### 4.6 Evaluasi

| Metrik | Kenapa diukur |
|---|---|
| **Top-1 accuracy** | **Metrik utama.** Apakah menu peringkat 1 = menu yang dipilih user. Ini yang user rasakan. |
| ROC-AUC | Kualitas ranking secara keseluruhan |
| Precision / Recall / F1 | Standar untuk classification, untuk tabel laporan |
| Confusion matrix | Visualisasi untuk slide |
| Koefisien LR | Interpretasi: fitur mana yang paling menentukan |

Split: `GroupShuffleSplit` berdasarkan `user_id`, 80/20. **Wajib group-based** — jika baris dari user yang sama tersebar di train dan test, terjadi data leakage dan akurasi jadi menipu.

### 4.7 Export

`model_weights.json`:

```json
{
  "model_type": "logistic_regression",
  "feature_names": ["calorie_gap", "protein_surplus", "price_ratio",
                    "flavor_match", "goal_match", "form_match",
                    "sodium_ratio", "fiber_density", "protein_density"],
  "scaler_mean":  [...9 angka...],
  "scaler_scale": [...9 angka...],
  "coefficients": [...9 angka...],
  "intercept": 0.0,
  "metrics": { "top1_accuracy": 0.0, "roc_auc": 0.0, "f1": 0.0 },
  "trained_at": "2026-10-21",
  "data_source": "synthetic"
}
```

Inference di TypeScript. **Perhatikan langkah centering — ini wajib**, dan tidak bisa dilewati tanpa merusak hasil (lihat §4.9):

```typescript
/** Skor SEMUA menu kandidat sekaligus. Tidak bisa satu per satu —
 *  centering butuh seluruh choice set. */
function scoreAllMenus(featureRows: number[][], w: ModelWeights): number[] {
  const n = featureRows.length;
  const d = w.feature_names.length;

  // 1. Centering: kurangi rata-rata kandidat (approx. conditional logit)
  const mean = Array(d).fill(0);
  for (const row of featureRows)
    for (let i = 0; i < d; i++) mean[i] += row[i] / n;

  return featureRows.map((row) => {
    let z = w.intercept;
    for (let i = 0; i < d; i++) {
      const centered = row[i] - mean[i];
      // 2. Standardisasi pakai scaler dari training
      const std = (centered - w.scaler_mean[i]) / w.scaler_scale[i];
      z += std * w.coefficients[i];
    }
    return 1 / (1 + Math.exp(-z));   // 3. sigmoid → probabilitas
  });
}
```

Tampilan UI: `Skor cocok {Math.round(prob * 100)}%`.

**Edge case:** jika hanya tersisa 1 menu kandidat, centering membuat semua fitur = 0 dan skornya jadi konstan. Itu tidak masalah — dengan satu kandidat tidak ada yang perlu diurutkan. Tapi jangan tampilkan "Skor cocok 50%" yang membingungkan; sembunyikan badge skor jika `n === 1`.

### 4.8 Temuan: kenapa within-group centering diperlukan

Ini temuan metodologis dari proses training, dan **layak masuk laporan sebagai hasil**, bukan sekadar catatan teknis.

**Masalah.** Pointwise LR memperlakukan tiap baris `(user, menu)` sebagai pengamatan independen. Padahal user memilih satu dari beberapa menu yang *saling bersaing*. Model yang secara teoretis benar untuk "pilih 1 dari N" adalah **conditional logit**.

**Akibatnya pada data ini.** Dengan hanya 5 menu, nilai absolut sebuah fitur menjadi proxy identitas menu — tiap menu punya "tanda tangan" natrium sendiri:

| Menu | `sodium_ratio` rata-rata |
|---|---|
| M01 Spicy Chicken | 0.483 |
| M04 Tuna Garden | 0.627 |
| M02 Smoked Beef | 0.875 |
| M03 Tofu Tempeh | 0.891 |
| **M05 Chicken Caesar** | **1.079** |

Model belajar *"hindari menu X"* lalu salah mengatribusikannya ke natrium. Pada versi awal, koefisien `calorie_gap` bahkan keluar **positif** padahal bobot pada generator adalah **−3.0** — terbalik total. Model dengan ROC-AUC 0.89 ternyata memberikan interpretasi yang salah arah untuk fitur terpenting.

**Solusi.** Kurangi tiap fitur dengan rata-ratanya di dalam choice set user. Fitur jadi bermakna *"lebih baik berapa dibanding alternatif yang tersedia"*, bukan *"nilai absolutnya berapa"*.

**Hasil.**

| Formulasi | Top-1 Acc | ROC-AUC | Arah koefisien benar |
|---|---|---|---|
| Tebak acak | 0.231 | 0.500 | — |
| Rule-based (baseline) | 0.654 | 0.812 | — |
| LR tanpa centering | 0.704 | 0.891 | **7 / 9** |
| **LR within-group centered** | **0.723** | **0.913** | **8 / 9** |
| Random Forest (centered) | 0.717 | 0.923 | — |

Satu koefisien masih meleset arahnya: `fiber_density` (−0.125). Perhatikan bahwa itu juga koefisien yang **paling dekat ke nol** — artinya model memang punya bukti paling lemah untuk fitur itu, dan tandanya pada dasarnya derau. Laporkan apa adanya; jangan dibulatkan jadi "9/9".

Ini poin yang kuat untuk presentasi: *metrik akurasi saja tidak cukup untuk menilai model yang kesimpulannya akan dijadikan temuan.* Model tanpa centering punya AUC tinggi tapi interpretasinya salah arah — dan interpretasi itulah yang kami klaim sebagai kontribusi.

**Random Forest tidak dipakai** meski AUC-nya tertinggi (0.923). Pada Top-1 — metrik yang benar-benar dirasakan user — LR justru sedikit unggul (0.723 vs 0.717). Ditambah RF tidak bisa diekspor ke sembilan angka untuk dijalankan di browser dan tidak memberi koefisien yang bisa diinterpretasi. Sebutkan ini di laporan sebagai trade-off yang disadari.

**Catatan reproducibility:** angka di atas berasal dari `ingredients.csv` versi final. Mengubah harga atau nilai gizi akan menggeser semua angka ini ±0.03. Kalau tabel di laporan harus sama persis dengan output, jalankan `train_ranker.py` **setelah** data final dan salin angkanya dari `output/metrics_report.txt`, jangan dari dokumen ini.

### 4.9 Fallback (wajib diimplementasikan)

Jika `model_weights.json` tidak ada atau gagal di-parse, sistem **harus** jatuh ke scoring rule-based tanpa error:

```typescript
score = 0.35 × (1 - calorie_gap)
      + 0.25 × clamp(protein_surplus, 0, 1)
      + 0.15 × goal_match
      + 0.15 × flavor_match
      + 0.10 × (1 - clamp(price_ratio, 0, 1))
```

Ini membuat website tetap jalan meskipun modeling belum selesai — dan artinya pekerjaan frontend tidak terblokir oleh pekerjaan modeling.

---

## 5. Struktur Data

### 5.1 `data/ingredients.json`

```typescript
type Ingredient = {
  id: string;              // "P01"
  nama: string;
  kategori: 'base' | 'protein' | 'topping' | 'dressing';
  kcal: number;            // per 100 g
  protein: number;
  karbo: number;
  lemak: number;
  serat: number;
  natrium: number;         // mg
  harga: number;           // Rupiah per 100 g (modal)
  minGram: number;
  maxGram: number;
  tagRasa: 'pedas' | 'gurih' | 'segar' | null;
  exclusionTag: string | null;   // 'bawang' | 'tomat' | 'seledri' | 'jamur' | 'dairy' | 'gluten'
};
```

### 5.2 `data/menus.json`

```typescript
type MenuTemplate = {
  id: string;              // "M01"
  nama: string;
  bentuk: 'bowl' | 'wrap';
  baseIds: string[];
  proteinIds: string[];
  toppingIds: string[];
  dressingId: string;
  tagRasa: 'pedas' | 'gurih' | 'segar';
  cocokUntuk: string[];    // ['high_protein', 'bulking']
  deskripsi: string;
  foto: string;            // URL Unsplash lengkap — lihat §6.5
};
```

Sumber: `data/ingredients.csv` dan `data/menu_templates.csv` (27 bahan, 5 menu). Script konversi CSV→JSON ada di `model/export_data.py`. **Jangan edit file JSON secara langsung** — CSV adalah sumbernya, JSON hasil generate. Setelah mengubah CSV, jalankan ulang `python export_data.py`.

### 5.3 Catatan komposisi menu

Dua menu diperbaiki setelah pengujian solver menemukan keduanya mustahil memenuhi constraint:

| Menu | Masalah | Perbaikan |
|---|---|---|
| M02 Smoked Beef | Smoked beef sendirian mentok di ~29 g protein — tidak pernah mencapai protein minimum user mana pun | Tambah telur rebus; porsi smoked beef dibatasi 50 g (porsi salad wajar, sekaligus menekan natrium) |
| M04 Tuna Garden | Semua bahannya rendah kalori, mentok di 368 kkal — selalu gagal target di atas 400 kkal | Tambah nasi merah sebagai base kedua |

Ini jenis bug yang tidak terlihat dari kode — hanya muncul saat solver dijalankan terhadap skenario user yang realistis. Sebutkan di laporan sebagai bagian dari proses validasi.

**Keterbatasan produk yang diketahui:** target bulking di atas ~900 kkal per meal tidak bisa dicapai menu mana pun. Salad memang punya plafon kalori. Sistem menanganinya dengan jujur — badge kriteria menampilkan "kalori belum tercapai" dan user diarahkan ke screen Ubah Topping untuk menambah porsi. Jangan sembunyikan ini; ini batas produk yang nyata, bukan bug.

---

## 6. Desain & Design Tokens

Token warna & tipografi diambil dari `FixSalad_Mobile_Prototype.pdf`. **Layout-nya tidak** — lihat §6.3b. Prototype adalah acuan visual (warna, bentuk, hierarki), bukan acuan lebar halaman.

### 6.1 Warna

```css
:root {
  --green-900: #14432A;   /* headline, tombol gelap, nav aktif */
  --green-700: #1E6340;
  --green-100: #E8F3EA;   /* background chip tidak aktif */
  --lime-300:  #C5EF6B;   /* badge "Cocok 100%", "AI Ready" */
  --rust-600:  #B53A10;   /* CTA utama, angka harga, warning */
  --rust-100:  #FDEBE4;   /* background warning box */
  --cream-50:  #F7F7F2;   /* background halaman */
  --white:     #FFFFFF;   /* background card */
  --gray-600:  #5A6B5F;   /* teks sekunder */
  --gray-200:  #E5E7E3;   /* border, divider */
}
```

### 6.2 Tipografi

- Font: **Plus Jakarta Sans** (Google Fonts, gratis, buatan desainer Indonesia — poin kecil untuk laporan)
- Headline: 32px / 700 / line-height 1.15 / letter-spacing −0.02em
- Judul section: 22px / 700
- Body: 15px / 400 / line-height 1.5
- Label: 13px / 500
- Angka besar (kalori, harga): 28px / 700

### 6.3 Bentuk & spacing

- Card: `border-radius: 20px`, `padding: 20px` (mobile) / `28px` (desktop), `background: white`
- Chip / pill: `border-radius: 999px`, `padding: 10px 18px`
- Tombol: `border-radius: 14px`, `height: 56px`, `font-weight: 700`
- Jarak antar card: `16px` (mobile) / `24px` (desktop)
- Padding halaman: `16px` (mobile) / `32px` (desktop)
- Shadow card: `0 1px 3px rgba(20,67,42,0.06)`

### 6.3b Breakpoint & grid

**Ini adalah website, bukan aplikasi mobile.** Prototype PDF dibuat di viewport mobile hanya untuk mengkomunikasikan konsep desain — bukan instruksi untuk mengunci lebar halaman. Di desktop, layout harus memakai lebar layar, bukan menampilkan kolom 480 px di tengah layar kosong.

| Breakpoint | Lebar | Layout | Navigasi |
|---|---|---|---|
| `sm` | < 768 px | Satu kolom, padding 16 px | Bottom nav (fixed) |
| `md` | 768–1023 px | Satu kolom, `max-width: 680px`, terpusat | Top nav |
| `lg` | ≥ 1024 px | **Dua kolom**, `max-width: 1200px`, terpusat | Top nav |

Aturan:
- Container konten: `max-width: 1200px; margin-inline: auto;` — **bukan** 480 px.
- Section hero boleh full-bleed (background selebar layar), isinya tetap dibatasi 1200 px.
- **Lebar tombol — dua aturan berbeda, jangan dicampur:**

  | Jenis tombol | Lebar | Contoh |
  |---|---|---|
  | **Submit di dalam card/form** | `w-full` — penuh selebar card, **tanpa** `max-width` | Hitung Kebutuhanku, Racik Menu Saya, Pesan Sekarang, Simpan & Lanjut, Bayar Sekarang |
  | **CTA berdiri sendiri di hero** | `max-width: 360px` saat `lg` | Mulai Personalisasi, Lihat cara kerja |

  Pill tab (Hitungkan untuk saya / Saya tahu targetnya) juga **mengisi penuh**: `grid-cols-2` dengan tiap pill `w-full`, bukan selebar teksnya.

  > **Koreksi — aturan lama salah.** Versi sebelumnya menulis "tombol CTA dibatasi 360px saat lg" tanpa membedakan jenisnya. Akibatnya tombol submit di dalam card ikut terpotong 360px sementara card-nya jauh lebih lebar, dan terlihat mengambang — paling jelas saat browser di-zoom 80%, karena viewport CSS jadi lebih lebar dan breakpoint `lg` aktif lebih awal. Tombol submit adalah aksi utama dari form di sekitarnya, jadi lebarnya harus mengikuti form itu.
- Teks panjang jangan melebihi ~70 karakter per baris. Paragraf di desktop dibatasi `max-width: 60ch`.
- Grid dua kolom standar: `grid-template-columns: 1fr 380px; gap: 24px;` — konten utama kiri, panel ringkasan kanan.
- Panel kanan `position: sticky; top: 88px;` supaya ringkasan tetap terlihat saat scroll.
- Ukuran font headline naik di desktop: 32 px → 44 px untuk `lg`.

### 6.4 Komponen berulang

| Komponen | Dipakai di |
|---|---|
| `<Stepper>` — 4 langkah, aktif/selesai/belum | Semua screen order flow |
| `<Chip>` — pill selectable, state aktif = bg green-900 + teks putih | Preferensi |
| `<StatBox>` — label kecil di atas, angka besar di bawah | Rekomendasi, Landing |
| `<CriteriaBadge>` — ✓ + teks, bg lime-300 (ok) / rust-100 (gagal) | Rekomendasi |
| `<Counter>` — − angka + | Ubah Topping |
| `<SiteNav>` — 4 tujuan: Menu, Rakit, Pesanan, Nutrisi. **Satu komponen, dua tampilan** | Semua screen |

**`<SiteNav>`** menggantikan `<BottomNav>`. Satu sumber data rute, dua rendering:

| Viewport | Tampilan |
|---|---|
| < 768 px | Bar tetap di bawah layar, 4 ikon + label, seperti prototype |
| ≥ 768 px | Header atas: logo kiri, 4 link teks kanan. Bottom bar disembunyikan |

Rute (semuanya **harus berfungsi** — tidak ada yang dekoratif):

| Item | Rute | Catatan |
|---|---|---|
| Menu | `/` | Landing |
| Rakit | `/preferensi` | Masuk ke order flow |
| Pesanan | `/pesanan` | Riwayat pesanan sesi ini (§7.7) |
| Nutrisi | `/nutrisi` | Info gizi menu & bahan (§7.8) |

Item aktif ditandai: ikon + label `--green-900` dan bold; sisanya `--gray-600`. Tentukan dari `usePathname()`.

**Ikon profil di kanan atas: dihapus.** Tidak ada login atau signup di produk ini, jadi ikon itu tidak menuju ke mana-mana. Ikon yang tidak bisa diklik mengundang penguji mengkliknya dan menemukan tombol mati. Header mobile cukup berisi logo saja; header desktop berisi logo + nav.

### 6.5 Gambar

**Foto menu** diambil dari Unsplash, URL-nya ada di kolom `foto_url` pada `menu_templates.csv` dan ikut terekspor ke `menus.json`. Kelimanya diverifikasi lewat Unsplash API (bukan hasil tebak URL), dan download-nya sudah tercatat sesuai API Guidelines.

| Menu | Foto | ID | Fotografer |
|---|---|---|---|
| M01 Spicy Chicken Protein Bowl | mangkuk putih, selada + ayam | `x-YS_Z_YPns` | [Orkun Orcan](https://unsplash.com/@orkunorcan) |
| M02 Smoked Beef Avocado Bowl | daging + irisan sayur, mangkuk putih | `OzBLe_Eg1mg` | [Hermes Rivera](https://unsplash.com/@hermez777) |
| M03 Tofu Tempeh Fiber Wrap | wrap vegetarian di piring | `Ztwy9M_vDZg` | [Vije Vijendranath](https://unsplash.com/@vijev) |
| M04 Tuna Garden Fresh Bowl | salad tuna, mangkuk abu | `8kkTIumkHxU` | [Grooveland Designs](https://unsplash.com/@groovelanddesigns) |
| M05 Classic Chicken Caesar Wrap | chicken wrap di piring hitam | `MdkUEKFfkTM` | [Advocator SY](https://unsplash.com/@advocator_sy) |

Lisensi Unsplash bebas dipakai komersial. Atribusi tidak diwajibkan lisensinya, **tapi diwajibkan API Guidelines** karena foto ini diambil lewat API — dan untuk laporan akademik mencantumkan sumber gambar memang praktik yang benar. Taruh daftar di atas pada lampiran laporan. Di website sendiri atribusi tidak perlu ditampilkan.

Setup Next.js:

```ts
// next.config.ts
images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }] }
```

**Fallback wajib.** Buat komponen `<MenuImage>` yang membungkus `next/image` dengan handler `onError` yang mengganti gambar dengan placeholder gradient hijau berisi nama menu. Ini bukan opsional: URL eksternal bisa berubah atau diblokir jaringan kampus, dan gambar rusak saat demo jauh lebih buruk daripada placeholder yang rapi.

**Thumbnail bahan** di screen Ubah Topping: pakai **foto**, sesuai prototype halaman 4. URL ada di kolom `foto_url` pada `ingredients.csv` dan terekspor sebagai field `foto` di `ingredients.json`.

- 18 bahan punya foto: semua protein (P01–P06) dan semua topping (T01–T12).
- 9 bahan tidak punya foto: base (B01–B05) dan dressing (D01–D04) — keduanya tidak pernah muncul di daftar Ubah Topping. Field `foto` bernilai `null`.
- Komponen thumbnail **wajib** menangani `foto === null` dan error muat dengan jatuh ke `<IngredientAvatar>` (lingkaran inisial yang sudah ada). Jangan hapus komponen itu — ia tetap jadi fallback.

> Versi spec sebelumnya melarang foto bahan dengan alasan 18 URL eksternal menambah titik gagal untuk thumbnail 40 px. Keputusan itu dibatalkan atas permintaan Ren, dan prototype memang menampilkan foto. Risikonya tetap nyata, jadi fallback avatar di atas bukan opsional.

**Logo** FixSalad: pakai file `FixSalad_Logo.png` yang ada di root folder website. Pindahkan ke `public/FixSalad_Logo.png` dan muat lewat `next/image`. Logo SVG inline yang dibuat sebelumnya diganti.

---

## 7. Screen

Stepper tetap **4 langkah** seperti prototype. Data Diri **bukan** screen terpisah — ia adalah mode di dalam screen Preferensi. Ini menjaga desain yang sudah dibuat dan mengurangi pekerjaan.

### 7.0 Layout desktop per screen

Di `lg` (≥1024 px) tiap screen memakai grid `1fr 380px`. Yang berubah hanya susunannya — **tidak ada komponen baru, tidak ada warna baru**. Mobile tetap satu kolom persis seperti prototype.

| Screen | Kolom kiri | Kolom kanan (sticky) |
|---|---|---|
| `/` Landing | Hero (headline + CTA) | Card "Rekomendasi untukmu" |
| `/preferensi` | Form preferensi | Card "Ringkasan inputmu" |
| `/rekomendasi` | Foto + breakdown bahan | "Sesuai targetmu" + total + CTA |
| `/ubah` | Daftar topping | "Ringkasan baru" + CTA |
| `/checkout` | Form pickup & pembayaran | Card "Pesananmu" + total |
| `/sukses` | — kolom tunggal, `max-width: 560px`, terpusat | — |
| `/pesanan` | Daftar pesanan, grid 2 kolom | — |
| `/nutrisi` | Tabel lebar penuh | — |

Section "Tiga langkah gampang" di landing: 1 kolom di mobile → **3 kolom sejajar** di `lg`.
Section "Alternatif lain" di `/rekomendasi`: tumpuk di mobile → **2 kolom** di `lg`.

### 7.1 Landing — `/`

Sesuai halaman 1 prototype.
- Header: logo + ikon profil
- Badge "✦ Personalisasi dengan AI"
- Headline: *"Salad yang sudah pas buat kamu, tanpa mikir."*
- CTA utama "Mulai Personalisasi →" → `/preferensi`
- CTA sekunder "Lihat cara kerja" → scroll ke section "Tiga langkah gampang"
- Card "Rekomendasi untukmu" — **statis**, hardcoded sebagai contoh (user belum input apa pun)
- Section "Tiga langkah gampang" — 3 card bernomor
- Banner hijau "Siap makan sehat hari ini?"
- Bottom nav (visual saja, tidak perlu berfungsi untuk prototype)

### 7.2 Preferensi — `/preferensi` (stepper 1)

Sesuai halaman 2 prototype, **dengan tambahan pill tab di atas**.

**KEPUTUSAN FINAL — satu halaman, dua pill tab.** Tidak ada screen Data Diri terpisah dan tidak ada langkah tambahan di stepper (tetap 4). Dua pill button di bagian atas kartu bertindak sebagai tab: menekan salah satu menukar blok input yang tampil di bawahnya, **tanpa navigasi dan tanpa perubahan URL**. Keduanya mengisi field target yang sama.

```
┌─────────────────────────────────────┐
│  ╭──────────────╮ ╭───────────────╮ │  ← PILL TAB (bukan screen baru)
│  │ Hitungkan    │ │ Saya tahu     │ │    aktif  : bg green-900, teks putih
│  │ untuk saya   │ │ targetnya     │ │    nonaktif: bg green-100, teks green-900
│  ╰──────────────╯ ╰───────────────╯ │
└─────────────────────────────────────┘
```

Perilaku tab:

| Tab aktif | Yang tampil | Yang disembunyikan |
|---|---|---|
| **Hitungkan untuk saya** (default) | Blok data diri + tombol "Hitung Kebutuhanku" + kartu hasil estimasi | — |
| **Saya tahu targetnya** | — | Seluruh blok data diri dan kartu estimasi |

Aturan implementasi:
- Satu state `mode: 'hitung' \| 'manual'`. Tab hanya mengubah state ini; tidak memanggil router.
- Blok di bawah tab (Tujuan, Target kalori, Protein, Tidak suka, Rasa, Budget, Bentuk) **selalu tampil di kedua mode**. Tab hanya mengatur blok data diri.
- Berpindah tab **tidak menghapus** nilai yang sudah diisi. User bisa bolak-balik tanpa kehilangan input.
- Transisi: cukup tampil/sembunyi. Jangan pasang animasi height — mahal untuk dibuat benar dan tidak ada di prototype.
- Aksesibilitas: `role="tablist"` pada wadah, `role="tab"` + `aria-selected` pada tiap pill.

```
┌─────────────────────────────────────┐
│ Ceritakan kebutuhanmu               │
│                                     │
│ ╭───────────────╮ ╭───────────────╮ │  ← PILL TAB
│ │ Hitungkan     │ │ Saya tahu     │ │
│ │ untuk saya ✓  │ │ targetnya     │ │
│ ╰───────────────╯ ╰───────────────╯ │
│                                     │
│ ── hanya pada tab "Hitungkan" ──    │
│ Berat (kg)      Tinggi (cm)         │
│ Usia            Gender [P][W]       │
│ Level aktivitas  [dropdown]         │
│ Makan per hari   [2][3][4]          │
│ [ Hitung Kebutuhanku ]              │
│                                     │
│ ┌─ Estimasi kebutuhanmu ──────────┐ │
│ │ 520 kkal/meal · min 38 g protein│ │
│ │ ⓘ Estimasi rumus Mifflin-St     │ │
│ │   Jeor, ±15%. Bukan saran medis.│ │
│ └─────────────────────────────────┘ │
│ ── selalu tampil ──                 │
│ Tujuan        [4 chip]              │
│ Target kalori [520] Protein [38]    │  ← terisi otomatis, editable
│ Tidak suka    [4 chip + Lainnya]    │
│ Preferensi rasa [3 chip]            │
│ Budget (Rp)   Bentuk [Wrap][Bowl]   │
│                                     │
│ [ Racik Menu Saya ✦ ]               │
└─────────────────────────────────────┘
│ Card "Ringkasan inputmu" (hijau)    │
```

- Tab "Saya tahu targetnya" menyembunyikan blok data diri; field kalori & protein tetap bisa diisi manual.
- Chip "+ Lainnya" membuka input teks bebas → ditambahkan ke daftar `tidakSuka` sebagai string.
- Card "Ringkasan inputmu" update **live** mengikuti pilihan.
- Tombol "Racik Menu Saya" disabled sampai `tujuan`, `target_kcal`, `min_protein`, `budget`, `bentuk` terisi.

### 7.3 Rekomendasi — `/rekomendasi` (stepper 2)

Sesuai halaman 3 prototype. **Hapus teks "Contoh data. Angka akan datang dari model rekomendasi"** — sekarang angkanya nyata.

- Foto menu + badge kalori di pojok kiri atas
- Nama menu + badge "Skor cocok {N}%" (dari Lapis 3)
- 4 StatBox: Protein, Serat, Karbo, Lemak
- Breakdown bahan: Base / Protein / Topping / Dressing — **tampilkan gram tiap bahan** (contoh: "Dada Ayam Panggang 120 g")
- Card "Sesuai targetmu" — badge kriteria + "{n}/4 Kriteria terpenuhi" (§3.5)
- Total Pembayaran (angka besar, warna rust)
- CTA "Pesan Sekarang" → `/checkout`
- CTA sekunder "Ubah Topping" → `/ubah`
- Section "Alternatif lain" — 2 menu peringkat 2 & 3, klik untuk menukar menu utama

**Edge case:** jika setelah hard filter tidak ada menu tersisa (misal user exclude semua bahan), tampilkan empty state: *"Belum ada menu yang cocok dengan pantanganmu. Coba longgarkan satu pantangan atau naikkan budget."* + tombol kembali ke Preferensi. **Jangan tampilkan halaman kosong atau crash.**

### 7.4 Ubah Topping — `/ubah` (stepper 3)

Sesuai halaman 4 prototype.

- Daftar topping yang bisa ditambah/kurangi, pakai `<Counter>`
- Tiap item: foto, nama, "{kcal} kkal · {protein}g protein" per unit (1 unit = 25 g)
- Topping yang mengandung bahan di daftar `tidakSuka`: tampil dengan warning merah *"⚠ Mengandung {tag}, tidak disarankan"* — tetap bisa dipilih, tapi diberi peringatan
- Card "Ringkasan baru" — recalculate **live** setiap klik:
  - Kalori: `{baru} / {target}` — warna rust jika melewati target
  - Protein: `{baru} / min {target}`
  - Serat, Karbo, Lemak, Harga
- Warning box jika melewati target kalori atau budget
- "Simpan & Lanjut →" → `/checkout`
- "Kembali ke rekomendasi AI" → reset ke porsi hasil solver, kembali ke `/rekomendasi`

### 7.5 Checkout — `/checkout` (stepper 4)

Sesuai halaman 5 prototype, **dengan perubahan**: tanpa login, tanpa WhatsApp.

- **Opsi "Antar" dihapus sepenuhnya.** Bukan disabled, bukan "segera hadir" — hilangkan toggle-nya. Semua pesanan adalah ambil di tempat. Satu opsi yang tidak bisa dipilih hanya menambah kebingungan.
- **Form data pengambil** (dikembalikan — dibutuhkan agar kasir bisa memanggil nama saat pesanan siap):
  - Nama Lengkap — wajib, minimal 2 karakter
  - No. WhatsApp — wajib, validasi format nomor Indonesia (`08…` atau `+628…`, 9–15 digit)
  - Keduanya tetap **tanpa login**. Data hanya dipakai di sesi ini dan ikut tersimpan ke riwayat pesanan.
- Waktu ambil: dropdown — "Secepatnya (~15–20 mnt)" / "30 menit lagi" / "1 jam lagi"
- Metode pembayaran: [QRIS] [E-wallet] [Transfer] — **ketiganya aktif dan bisa dipilih**. Tiap pilihan menampilkan panel berbeda:

  | Metode | Yang ditampilkan |
  |---|---|
  | **QRIS** (default) | Gambar QR mockup + "Tunjukkan kode ini ke kasir" |
  | **E-wallet** | Nomor e-wallet + tombol **Salin** |
  | **Transfer** | Nama bank, nomor rekening, nama pemilik + tombol **Salin** nomor rekening |

  Nomor placeholder (semuanya fiktif, aman untuk demo):
  ```
  E-wallet : 0812-3456-7890  (OVO / GoPay — a.n. FixSalad Kitchen)
  Transfer : BCA 1234567890  (a.n. FixSalad Kitchen)
  ```

  Tombol Salin memakai `navigator.clipboard.writeText()`, dibungkus try/catch, dan menampilkan "Tersalin!" selama 2 detik. Di konteks non-HTTPS clipboard API tidak tersedia — jika gagal, biarkan nomornya tetap bisa diblok dan disalin manual, jangan menampilkan error.
- Card "Pesananmu": foto, nama menu, ringkasan gizi, badge "Tersuai Preferensi"
- Rincian: Subtotal, Biaya kemasan Rp 0 (Promo), badge "+10 Poin"
- Total besar
- CTA "Bayar Sekarang →" → `/sukses`

### 7.6 Sukses — `/sukses`

Screen baru (tidak ada di prototype, tapi dibutuhkan).

- Ikon centang besar
- "Pesanan diterima!"
- **Kode pesanan besar**: `FS-4821` (generate: `FS-` + 4 digit acak)
- QRIS mockup: gambar QR statis + teks "Tunjukkan kode ini ke kasir"
- Ringkasan: nama menu, total, waktu ambil
- Tombol "Pesan lagi" → reset state order (bukan riwayat) → `/`
- Tombol sekunder "Lihat pesanan saya" → `/pesanan`

Saat masuk screen ini, pesanan **disimpan ke riwayat** (§8.2).

---

### 7.7 Pesanan — `/pesanan`

Riwayat pesanan yang sudah di-checkout.

**Ada pesanan:** daftar kartu, terbaru di atas. Tiap kartu berisi kode pesanan, nama menu, foto kecil, ringkasan gizi (`{kcal} kkal · {protein} g protein`), total harga, waktu ambil, dan timestamp. Di `lg` tampil sebagai grid 2 kolom.

**Belum ada pesanan:** empty state — ilustrasi/ikon sederhana, teks *"Belum ada pesanan. Racik menu pertamamu dulu."*, dan tombol **"Mulai Personalisasi →"** menuju `/preferensi`.

> **Catatan: ini sedikit berbeda dari permintaan.** Permintaannya adalah redirect langsung ke `/preferensi` kalau belum ada pesanan. Saya pakai empty state dengan tombol besar, bukan redirect otomatis, karena menekan "Pesanan" lalu tiba-tiba mendarat di halaman "Preferensi" tanpa penjelasan membuat menu nav itu terlihat rusak — penguji akan mengira salah klik. Empty state mencapai tujuan yang sama (mengarahkan user ke order flow) dengan satu klik, tapi user paham kenapa. Kalau Ren tetap mau redirect otomatis, ganti satu baris: `useEffect(() => { if (!orders.length) router.replace('/preferensi') }, [])`.

---

### 7.8 Nutrisi — `/nutrisi`

Halaman informasi gizi. Statis, tidak bergantung input user.

**Tiga bagian:**

**(a) Tabel bahan** — 27 bahan dari `ingredients.json`, nilai **per 100 g**: nama, kategori, kkal, protein, karbo, lemak, serat, natrium. Dikelompokkan per kategori (Base / Protein / Topping / Dressing), dengan heading per grup. Di mobile tabel di-scroll horizontal dalam container `overflow-x: auto`; jangan dipaksa mengecil sampai tidak terbaca.

Bahan yang punya `exclusionTag` diberi chip kecil di sebelah namanya (mis. "mengandung dairy") — ini membuat halaman berguna untuk user yang punya pantangan.

**(b) Profil gizi tiap menu** — 5 kartu menu dengan komposisi gizi **pada porsi referensi 500 kkal**. Hitung dengan memanggil `solvePortions(menu, 500, 30, 50000)` saat build/render.

> Label wajib di atas bagian ini: *"Nilai gizi di bawah dihitung pada porsi referensi 500 kkal. Porsi aktual menyesuaikan target kalori dan proteinmu."* Tanpa label ini angkanya menyesatkan — porsi FixSalad memang berubah per user, itu inti produknya.

**(c) Cara kami menghitung** — penjelasan singkat, 3 paragraf pendek:
1. Rumus Mifflin-St Jeor dan faktor aktivitas (§2.2, §2.3) — satu paragraf, tanpa notasi matematika berat
2. Tabel 4 tujuan: pengali kalori, protein per kg, batas natrium (ambil dari §2.4)
3. Disclaimer: *"Estimasi berdasarkan rumus standar. Angka aktual bisa berbeda ±15%. Bukan pengganti saran ahli gizi."*

Bagian (c) ini bernilai lebih dari sekadar konten halaman — saat demo, ia menunjukkan bahwa "AI" di produk ini punya dasar perhitungan yang bisa ditunjuk, bukan sekadar klaim pemasaran.

**Prioritas:** `/nutrisi` adalah satu-satunya tambahan yang benar-benar baru (sisanya koreksi). Kerjakan **paling akhir**. Kalau waktu habis, bagian (a) saja sudah cukup — (b) dan (c) bisa dipotong tanpa merusak apa pun.

---

## 8. State Management

Tidak perlu library. React Context + `useReducer`, satu provider di `app/layout.tsx`.

```typescript
type OrderState = {
  // Lapis 1 — data diri (opsional)
  mode: 'hitung' | 'manual';
  bodyData: { beratKg, tinggiCm, usia, gender, aktivitas, makanPerHari } | null;

  // Input preferensi
  tujuan: Tujuan | null;
  targetKcal: number | null;
  minProteinG: number | null;
  tidakSuka: string[];
  preferensiRasa: Rasa | null;
  budget: number | null;
  bentuk: 'wrap' | 'bowl' | null;

  // Hasil
  rekomendasi: ScoredMenu[] | null;    // sudah terurut
  menuTerpilih: ScoredMenu | null;
  toppingTambahan: Record<string, number>;   // ingredientId → jumlah unit

  // Checkout
  waktuAmbil: string;
  kodePesanan: string | null;

  // Riwayat (§8.2)
  orders: Order[];
};

type Order = {
  kode: string;             // "FS-4821"
  namaMenu: string;
  foto: string;
  kcal: number;
  protein: number;
  total: number;
  waktuAmbil: string;
  dibuatPada: string;       // ISO timestamp
};
```

**State order aktif hilang saat refresh.** Itu dapat diterima untuk prototype demo — isi form bukan sesuatu yang perlu bertahan.

### 8.2 Riwayat pesanan — pengecualian localStorage

Spec versi awal melarang localStorage sepenuhnya. **Aturan itu dicabut untuk riwayat pesanan saja**, karena halaman `/pesanan` tidak ada gunanya tanpanya: user checkout, menekan "Pesanan", refresh, lalu riwayatnya kosong — terlihat seperti bug, dan saat demo akan ditanya.

Aturan pemakaian:

```ts
const KEY = 'fixsalad_orders';

function loadOrders(): Order[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }          // private mode, storage diblokir, JSON rusak
}

function saveOrder(o: Order): void {
  try {
    const next = [o, ...loadOrders()].slice(0, 20);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* abaikan — riwayat tetap jalan dari state React sesi ini */ }
}
```

- **Semua akses dibungkus try/catch.** Di private mode atau saat site data diblokir, pembacaan bisa melempar error. Halaman harus tetap render.
- Baca localStorage **hanya di dalam `useEffect`**, tidak saat render. Mengaksesnya saat render menyebabkan hydration mismatch di Next.js, dan error itu muncul sebagai halaman putih.
- Batasi 20 pesanan terakhir.
- Tulis saat masuk `/sukses`, bukan saat klik "Bayar Sekarang" — supaya pesanan yang gagal tidak tercatat.
- Tetap **jangan** pakai localStorage untuk apa pun yang lain: input form, preferensi, menu terpilih. Semua itu tetap di state React.

---

## 9. Struktur Proyek

```
website/
├── data/
│   ├── ingredients.csv          ← sumber (sudah ada)
│   ├── menu_templates.csv       ← sumber (sudah ada)
│   ├── ingredients.json         ← hasil konversi
│   └── menus.json               ← hasil konversi
├── model/
│   ├── export_data.py           ← CSV → JSON
│   ├── train_ranker.py          ← modeling utama
│   ├── requirements.txt
│   └── output/
│       ├── model_weights.json   ← dipakai website
│       ├── confusion_matrix.png ← untuk laporan
│       ├── feature_importance.png
│       └── metrics_report.txt
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  ← Landing
│   │   ├── preferensi/page.tsx
│   │   ├── rekomendasi/page.tsx
│   │   ├── ubah/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── sukses/page.tsx
│   │   ├── pesanan/page.tsx     ← §7.7
│   │   └── nutrisi/page.tsx     ← §7.8
│   ├── components/
│   │   ├── Stepper.tsx
│   │   ├── Chip.tsx
│   │   ├── StatBox.tsx
│   │   ├── CriteriaBadge.tsx
│   │   ├── Counter.tsx
│   │   ├── MenuImage.tsx        ← §6.5 onError fallback
│   │   ├── SiteNav.tsx          ← §6.4 bottom (mobile) / top (desktop)
│   │   └── PageShell.tsx        ← container 1200px + grid dua kolom
│   ├── lib/
│   │   ├── planner.ts           ← Lapis 1
│   │   ├── solver.ts            ← Lapis 2
│   │   ├── ranker.ts            ← Lapis 3
│   │   ├── features.ts          ← feature engineering (harus identik dengan Python)
│   │   ├── data.ts              ← load JSON
│   │   └── types.ts
│   ├── context/
│   │   └── OrderContext.tsx
│   └── styles/globals.css
├── public/
│   ├── img/menu/m01.jpg … m05.jpg
│   ├── img/ingredient/*.jpg
│   └── qris-mock.png
└── __tests__/
    ├── planner.test.ts
    └── solver.test.ts
```

---

## 10. Testing (wajib, bukan opsional)

Solver adalah satu-satunya komponen yang bisa diam-diam salah. Test harus membuktikan constraint terpenuhi.

```typescript
// __tests__/solver.test.ts
describe('solvePortions', () => {

  it('menjaga tiap gram dalam rentang min-max', () => {
    // untuk 200 input acak × 5 menu:
    //   expect(gram[i]).toBeGreaterThanOrEqual(minGram[i])
    //   expect(gram[i]).toBeLessThanOrEqual(maxGram[i])
  });

  it('total kalori dalam toleransi ±8% untuk target yang feasible', () => { });

  it('memenuhi protein minimum jika secara matematis mungkin', () => { });

  it('tidak pernah menyertakan bahan dengan exclusionTag yang dilarang', () => { });

  it('selalu mengembalikan angka valid, tidak pernah NaN atau Infinity', () => {
    // termasuk input ekstrem: target 100 kkal, target 2000 kkal, budget 10.000
  });
});

// __tests__/planner.test.ts
describe('calculateTargets', () => {
  it('cocok dengan contoh manual Mifflin-St Jeor', () => {
    // Pria 70kg 175cm 22th: BMR = 700 + 1093.75 - 110 + 5 = 1688.75
    // × 1.375 (ringan) = 2322 TDEE
    // × 0.80 (defisit) = 1857 kkal/hari ÷ 3 = 619 kkal/meal
  });
});
```

Test NaN adalah yang paling penting. Pembagian dengan nol pada `calorie_gap` atau `price_ratio` ketika budget = 0 akan merusak seluruh ranking tanpa menimbulkan error yang terlihat.

---

## 11. Deployment

**Status akun (terverifikasi dari sesi ini):**

| Item | Nilai |
|---|---|
| Username Vercel | `stephanierenatap` |
| Plan | Hobby (gratis, cukup) |
| Team | REMI (`team_TxxGyAfAhKbuVuv1onHCbsoL`) |
| GitHub | sudah tersambung ke Vercel untuk import |
| Project aktif | belum ada — normal, belum ada yang di-deploy |

**Langkah deploy** (dikerjakan Ren; Claude tidak punya akses tulis ke GitHub dari sesi ini):

1. `git init`, commit, push ke repo baru di GitHub (private tidak masalah)
2. Buka [vercel.com/new](https://vercel.com/new) → Import Git Repository → pilih repo
3. Framework preset: Next.js (terdeteksi otomatis)
4. Deploy. Tidak ada environment variable yang perlu diisi.
5. URL produksi: `fixsalad.vercel.app` (atau sesuai ketersediaan)

Setelah project ada di Vercel, Claude **bisa** membantu dari chat: cek status deployment, baca build log kalau gagal, dan lihat runtime error setelah live. Cukup sebutkan nama project-nya.

**Cek sebelum demo:**
- [ ] Buka di HP sungguhan, bukan hanya DevTools mobile view
- [ ] Semua 6 screen bisa diakses lewat alur normal
- [ ] Tidak ada gambar yang gagal dimuat (404)
- [ ] Angka kalori/protein/harga masuk akal untuk 5 skenario berbeda
- [ ] Empty state muncul saat semua bahan di-exclude
- [ ] Lighthouse score mobile > 80

---

## 12. Jadwal 2 Hari

### Hari 1

| Waktu | Ren | Claude (chat) | Claude Code |
|---|---|---|---|
| Pagi | Repo GitHub + import Vercel · jalankan `train_ranker.py` di Colab | Interpretasi koefisien, siapkan tabel laporan | **Sesi 1:** scaffold + 5 screen (UI, data dummy) |
| Siang | Review tampilan di HP, kasih koreksi | Draft BMC + SWOT | Perbaiki sesuai koreksi |
| Sore | Survei Gen-Z untuk BMC/SWOT | Draft laporan teknis | — |
| Malam | Verifikasi baris AKG dari PDF | — | — |

### Hari 2

| Waktu | Ren | Claude (chat) | Claude Code |
|---|---|---|---|
| Pagi | — | Review hasil, cek angka masuk akal | **Sesi 2:** integrasi logic + unit test |
| Siang | Test manual 5 skenario di HP | Finalisasi laporan | Perbaikan bug |
| Sore | Deploy + cek checklist §11 | Review akhir | — |
| Malam | **Buffer** — jangan tambah fitur | — | — |

**Aturan buffer:** setengah hari terakhir adalah jatah untuk bug yang pasti muncul. Fitur baru yang ditambahkan di hari 2 sore berisiko merusak yang sudah jalan tanpa waktu memperbaikinya.

---

## 13. Pembagian Kerja

### Yang hanya bisa Ren kerjakan

| Tugas | Kenapa tidak bisa didelegasikan | Estimasi |
|---|---|---|
| Push repo ke GitHub + import di Vercel | Claude tidak punya akses tulis GitHub dari sesi ini (§11) | 15 menit |
| Jalankan `train_ranker.py` di Colab | Agar paham prosesnya — ini deliverable data science Anda | 1 jam |
| Verifikasi 1 baris AKG 19–29 dari PDF Permenkes | Untuk kutipan laporan (§4.3) | 2 menit |
| Review tampilan hasil Claude Code di HP | Keputusan visual | 30 menit |
| Survei Gen-Z untuk validasi BMC & SWOT | Riset primer, tidak boleh dikarang | 1–2 jam |

**Sudah tidak jadi blocker:** harga bahan (sudah diisi angka pasar yang wajar), foto menu (URL Unsplash sudah masuk `menu_templates.csv`, §6.5), dan data training (sintetis, jalan tanpa survei).

**Harga bahan** sekarang adalah estimasi pasar yang masuk akal, bukan hasil survei. Untuk demo ini cukup. Di laporan, tulis **"estimasi harga pasar"** — jangan tulis "hasil survei supplier" kecuali Anda benar-benar mensurvei. Kalau sempat survei sebelum deadline, ganti angkanya di `ingredients.csv`, jalankan ulang `export_data.py` dan `train_ranker.py`, lalu salin ulang metrik ke laporan.

### Yang Claude kerjakan di chat ini

- ✅ Spec ini
- ✅ `train_ranker.py` + `export_data.py`
- Interpretasi hasil model, kritik metrik yang menyesatkan
- Draft BMC (9 blok) & SWOT
- Draft laporan teknis: rumusan masalah, metodologi, hasil, keterbatasan
- Review desain & logic saat ada yang terlihat salah

### Yang Claude Code kerjakan

- Scaffold Next.js + Tailwind + konfigurasi
- Implementasi 6 screen sesuai design token di §6
- Port Lapis 1, 2, 3 ke TypeScript (`planner.ts`, `solver.ts`, `ranker.ts`, `features.ts`)
- Unit test solver & planner
- Setup deploy Vercel

---

## 14. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Modeling molor | Website tidak punya skor | Fallback rule-based (§4.9) — website jalan tanpa model |
| Scope creep hari 2 | Fitur baru merusak yang sudah jalan | Aturan buffer §12 |
| URL foto Unsplash mati / diblokir WiFi kampus | Gambar rusak saat demo | `onError` fallback ke placeholder gradient — wajib (§6.5) |
| Solver menghasilkan NaN | Ranking rusak diam-diam | Unit test §10 wajib dijalankan |
| Harga bukan hasil survei | Klaim margin di BMC tidak berdasar | Tulis "estimasi harga pasar" di laporan, bukan "hasil survei" |
| Ditanya "datanya dari mana?" saat sidang | Jawaban gugup merusak kredibilitas | Keterbatasan sudah ditulis eksplisit (§4.4) dan daftar pertanyaan + jawabannya ada di `model/README.md` |

**Satu risiko yang tidak ada mitigasinya: mengarang data survei.** Harga dan nama produk boleh dikarang — itu katalog demo. Respons survei tidak: begitu laporan menulis "kami mensurvei N responden dan menemukan X", itu jadi klaim bukti. Kalau ketahuan dikarang, yang jatuh bukan cuma nilai tugas ini. Model sudah jalan tanpa survei — jangan ambil risikonya.

---

## 15. Keputusan yang Sudah Final

| Topik | Keputusan |
|---|---|
| Auth | Tidak ada login, ikon profil dihapus. Nama + No. WhatsApp diisi saat checkout (§7.5) |
| Pengantaran | Hanya ambil di tempat. Opsi "Antar" dihapus sepenuhnya |
| Target device | **Website responsif penuh** — bukan kolom mobile di tengah layar (§6.3b) |
| Navigasi | `<SiteNav>` — bottom bar di mobile, top nav di desktop. Semua 4 rute berfungsi (§6.4) |
| Riwayat pesanan | `/pesanan` + localStorage, **hanya untuk riwayat** (§8.2) |
| Halaman Nutrisi | `/nutrisi` — tabel bahan, profil menu, penjelasan metode (§7.8) |
| Payment | QRIS mockup — gambar statis + kode pesanan |
| Database | Tidak ada. State di React, hilang saat refresh |
| Backend terpisah | Tidak ada. Semua logic di client TypeScript |
| Hosting | Vercel free tier |
| LP solver | Ditolak — proportional scaling (§3.3) |
| ML | Logistic Regression + within-group centering, fallback rule-based |
| Screen Data Diri | **Bukan screen terpisah.** Pill tab di dalam `/preferensi`, stepper tetap 4 langkah (§7.2) |
| Foto menu | URL Unsplash di `menu_templates.csv`, wajib ada `onError` fallback (§6.5) |
| Harga bahan | Estimasi pasar, bukan survei. Ditulis "estimasi" di laporan |
| Data training | Sintetis, dikalibrasi ke antropometri Indonesia. Survei riil = future work |
| Deployment | Import manual di dashboard Vercel; Claude bisa bantu debug build setelahnya (§11) |
| Bahasa UI | Indonesia |
| Bahasa prompt Claude Code | Inggris |
