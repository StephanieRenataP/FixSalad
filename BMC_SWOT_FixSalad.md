# FixSalad — Business Model Canvas & SWOT

**Draft** · 21 Oktober 2026 · Venture Creation Semester 5

> **Cara pakai dokumen ini.** Ini draft untuk divalidasi, bukan hasil akhir. Angka yang ditandai **[ASUMSI]** belum pernah diuji ke pasar — ganti dengan data Anda sendiri kalau sempat survei, atau tulis apa adanya sebagai asumsi di laporan. Dosen penguji jauh lebih menghargai asumsi yang diberi label daripada angka yang terdengar pasti tapi tidak punya dasar.

---

## 1. Business Model Canvas

### 1.1 Customer Segments

**Segmen utama — Mahasiswa 19–25 tahun di kota besar**
- Punya niat hidup sehat tapi tidak punya pengetahuan gizi untuk mengeksekusinya
- Tidak tahu berapa kalori dan protein yang mereka butuhkan, apalagi cara memecahnya per porsi makan
- Sensitif harga: Rp 30.000–50.000 per meal adalah batas atas yang wajar
- Terbiasa memesan lewat aplikasi, tidak terbiasa membaca tabel gizi

**Segmen sekunder — Pekerja muda 25–30 tahun**
- Daya beli lebih tinggi, waktu lebih sedikit
- Sudah punya tujuan spesifik (defisit kalori, bulking) tapi tidak mau menghitung manual
- Berpotensi jadi pelanggan berulang, bukan sekali coba

**Yang BUKAN target:**
- Atlet dan binaragawan — kebutuhan gizinya terlalu spesifik, dan salad tidak bisa memenuhi target kalori bulking di atas ~900 kkal per meal (keterbatasan nyata, lihat SPEC.md §5.3)
- Pasien dengan kondisi medis khusus — FixSalad bukan layanan medis dan tidak boleh diposisikan begitu

> **[ASUMSI]** Pembagian segmen ini berasal dari problem statement, bukan dari riset pasar. Validasi lewat survei singkat ke 30 mahasiswa akan jauh memperkuat bagian ini.

---

### 1.2 Value Propositions

**Proposisi inti: menghapus beban berpikir, bukan sekadar menjual salad.**

| Masalah pelanggan | Yang FixSalad lakukan |
|---|---|
| "Saya tidak tahu butuh berapa kalori" | Hitung otomatis dari berat, tinggi, usia, aktivitas, dan tujuan |
| "Saya tidak tahu menu mana yang cocok" | Sistem memilihkan dan menunjukkan skor kecocokan |
| "Saya tidak suka bahan tertentu" | Pantangan jadi filter keras — bahan yang ditolak tidak pernah muncul |
| "Takut kemahalan" | Budget jadi batasan dalam perhitungan, bukan kejutan di akhir |
| "Memilih itu melelahkan" | Satu form, satu hasil, langsung bisa dipesan |

**Diferensiasi yang bisa dipertahankan:**

Pesaing menjual *pilihan*. Menu salad biasa memberi 15 opsi dan menyuruh pelanggan memutuskan sendiri — itu justru memperparah decision fatigue yang jadi masalah awalnya. FixSalad menjual *keputusan*: satu rekomendasi, dengan alasan yang bisa ditunjukkan.

Yang membuatnya kredibel adalah perhitungannya bisa dibuka. Target kalori berasal dari rumus Mifflin-St Jeor, porsi tiap bahan ditentukan constrained optimization, dan urutan menu dari model yang dilatih. Halaman `/nutrisi` memperlihatkan metodenya. Ini bukan klaim "AI" tanpa isi.

> **Catatan jujur untuk laporan:** porsi dihitung deterministik (bukan ML), dan ML dipakai untuk peringkat preferensi. Di materi pemasaran "Personalisasi dengan AI" boleh dipakai. Di laporan teknis, jelaskan pembagiannya apa adanya — klaim berlebihan adalah yang paling mudah dipatahkan saat sidang.

---

### 1.3 Channels

| Tahap | Channel | Catatan |
|---|---|---|
| Awareness | Instagram & TikTok organik, poster kampus | Konten "berapa kalori kebutuhanmu?" lebih menarik daripada foto makanan |
| Evaluation | Website FixSalad | Form personalisasi itu sendiri adalah alat akuisisi — orang mencobanya karena penasaran |
| Purchase | Website → pickup di tempat | Tidak ada delivery di fase ini |
| Delivery | Ambil di tempat, tunjukkan kode pesanan | Menghindari biaya dan kompleksitas logistik |
| After-sales | — | Belum ada di fase prototype |

**Keputusan sadar:** tidak masuk GoFood/GrabFood di fase ini. Komisi 20–30% akan menghabiskan margin, dan yang lebih penting — platform itu menghilangkan alur personalisasi, yaitu justru satu-satunya hal yang membedakan FixSalad.

---

### 1.4 Customer Relationships

- **Self-service** — seluruh alur pesan berjalan tanpa interaksi staf
- **Automated personalization** — sistem mengingat preferensi dalam satu sesi dan menyusun ulang rekomendasi saat input berubah
- **Tatap muka saat pickup** — kontak langsung yang justru berharga di fase awal: ini kesempatan mengumpulkan feedback kualitatif yang tidak muncul dari data

**Rencana retensi** (belum diimplementasikan): riwayat pesanan sudah tersimpan per browser, jadi fondasi untuk "pesan lagi yang kemarin" sudah ada.

---

### 1.5 Revenue Streams

**Sumber utama: penjualan per menu.**

Harga jual = modal bahan × 2,0, dibulatkan ke Rp 500 terdekat.

| Menu | Modal (porsi ~500 kkal) | Harga jual | Margin kotor |
|---|---|---|---|
| M01 Spicy Chicken Protein Bowl | ~Rp 17.750 | Rp 35.500 | Rp 17.750 |
| M03 Tofu Tempeh Fiber Wrap | ~Rp 9.000 | Rp 18.000 | Rp 9.000 |
| M05 Classic Chicken Caesar Wrap | ~Rp 16.500 | Rp 33.000 | Rp 16.500 |

> **[ASUMSI]** Harga bahan adalah estimasi pasar, bukan hasil survei supplier. Markup 2,0× adalah praktik umum F&B untuk produk fresh. Keduanya perlu diverifikasi sebelum dipakai sebagai proyeksi bisnis.

**Yang sering dilupakan dalam perhitungan margin ini:** angka di atas adalah margin *kotor*, baru dikurangi bahan. Belum dikurangi kemasan, tenaga kerja, sewa, dan — paling besar untuk produk fresh — **food waste**. Sayuran yang tidak terjual dalam 1–2 hari jadi kerugian total. Margin bersih realistis kemungkinan jauh di bawah 50%.

**Potensi sumber pendapatan lain (fase lanjut):**
- Paket mingguan berlangganan — meningkatkan prediktabilitas permintaan, yang langsung menekan food waste
- Add-on topping berbayar — sudah ada mekanismenya di screen Ubah Topping

---

### 1.6 Key Resources

| Jenis | Isi |
|---|---|
| **Intelektual** | Dataset gizi & harga 27 bahan; algoritma planner + solver; model ranking terlatih |
| **Teknologi** | Website Next.js, hosting Vercel |
| **Fisik** | Dapur/area prep, lemari pendingin, peralatan dasar |
| **Manusia** | Tim prep & operasional; kemampuan teknis untuk memelihara sistem |

Aset yang paling tidak mudah ditiru bukan resepnya — resep salad tidak punya proteksi apa pun. Yang sulit ditiru adalah **dataset bahan yang terstruktur** (gizi + harga + batas porsi + tag pantangan dalam satu tabel yang konsisten) dan pengetahuan cara memetakan input awam jadi angka gizi. Pesaing bisa meniru tampilannya dalam seminggu; membangun ulang datasetnya butuh waktu jauh lebih lama.

---

### 1.7 Key Activities

1. **Operasional harian** — belanja bahan, prep, rakit pesanan, serah terima
2. **Pemeliharaan data** — update harga bahan saat harga pasar bergerak; ini langsung memengaruhi margin dan akurasi batas budget
3. **Pengembangan sistem** — perbaikan algoritma, penambahan menu
4. **Konten & akuisisi** — media sosial, promosi kampus
5. **Analisis permintaan** — menu mana yang menang, pantangan apa yang paling sering dipilih; data ini langsung memandu menu berikutnya

Aktivitas 2 paling sering diremehkan. Harga bahan segar di Indonesia bergerak mingguan. Kalau `ingredients.csv` tidak diperbarui, sistem akan menjanjikan harga yang tidak lagi menguntungkan.

---

### 1.8 Key Partnerships

| Mitra | Peran | Kenapa penting |
|---|---|---|
| Supplier sayur lokal / pasar | Pasokan harian bahan segar | Harga dan kesegaran menentukan margin sekaligus kualitas produk |
| Supplier protein (ayam, tuna, tempe) | Komponen biaya terbesar | Protein mendominasi modal tiap menu |
| Vercel, Unsplash | Infrastruktur & aset visual | Gratis di fase ini |
| Komunitas & UKM kampus | Akses ke segmen target | Jalur distribusi awal yang paling murah |

**Ketergantungan yang perlu diwaspadai:** supplier tunggal untuk bahan utama adalah risiko nyata. Kalau pemasok ayam naik harga 20%, margin M01 dan M05 langsung tergerus dan tidak ada alternatif cepat.

---

### 1.9 Cost Structure

**Biaya variabel (naik seiring penjualan)**
- Bahan baku — komponen terbesar, ~50% dari harga jual
- Kemasan ramah lingkungan
- Food waste — bahan segar yang tidak terjual

**Biaya tetap (jalan terus terlepas dari penjualan)**
- Sewa tempat prep
- Tenaga kerja
- Listrik, air, gas
- Infrastruktur digital — **Rp 0** di fase ini (Vercel hobby tier)

**Struktur ini value-driven, bukan cost-driven.** FixSalad tidak bersaing sebagai yang termurah; nilainya ada pada kecocokan dan kemudahan. Namun karena target segmennya mahasiswa yang sensitif harga, ada batas atas yang nyata — di atas Rp 50.000 per meal, proposisi nilainya runtuh berapa pun bagusnya personalisasi.

---

## 2. SWOT

### Strengths

| # | Kekuatan | Bukti |
|---|---|---|
| S1 | Personalisasi yang benar-benar berfungsi, bukan klaim | Pantangan jadi filter keras; mengubah tujuan mengubah peringkat menu secara nyata |
| S2 | Perhitungan punya dasar yang bisa ditunjukkan | Mifflin-St Jeor, constrained optimization, model terlatih — semuanya terdokumentasi dan dapat diaudit |
| S3 | Biaya teknologi nol | Vercel hobby tier, tanpa backend, tanpa database |
| S4 | Transparansi gizi | Halaman `/nutrisi` membuka data bahan dan metode perhitungan |
| S5 | Dataset bahan terstruktur | Gizi, harga, batas porsi, dan tag pantangan dalam satu tabel konsisten |

### Weaknesses

| # | Kelemahan | Dampak | Mitigasi |
|---|---|---|---|
| W1 | Model dilatih pada data sintetis | Belum terbukti memprediksi preferensi manusia nyata | Dinyatakan eksplisit di laporan; survei riil sebagai future work |
| W2 | Katalog hanya 5 menu | Pelanggan berulang cepat bosan | Prototype memang dibatasi; tambah menu setelah validasi |
| W3 | Harga bahan belum disurvei | Proyeksi margin belum berdasar | Survei supplier sebelum operasi nyata |
| W4 | Tidak ada akun pengguna | Riwayat hilang kalau ganti perangkat | Tidak kritis di fase ini; disengaja demi kecepatan |
| W5 | Salad tidak bisa memenuhi target bulking | Segmen bulking tidak terlayani penuh | Keterbatasan produk yang nyata; sistem menyampaikannya dengan jujur |
| W6 | Tidak ada pengalaman operasional | Food waste dan estimasi permintaan masih tebakan | Mulai dari volume kecil |

### Opportunities

| # | Peluang | Catatan |
|---|---|---|
| O1 | Tren hidup sehat Gen-Z yang paradoks — niat tinggi, eksekusi rendah | Persis celah yang diisi FixSalad |
| O2 | Belum ada pemain lokal yang menggabungkan personalisasi gizi + pemesanan | Kekosongan pasar dari problem statement |
| O3 | Integrasi smartwatch / aplikasi fitness | Long-term goal; rekomendasi menyesuaikan kalori terbakar hari itu |
| O4 | Model langganan mingguan | Permintaan jadi lebih terprediksi, food waste turun |
| O5 | Kemitraan korporat (katering kantor sehat) | Volume lebih besar, permintaan lebih stabil |

### Threats

| # | Ancaman | Tingkat | Catatan |
|---|---|---|---|
| T1 | Pemain F&B besar meniru fitur personalisasi | **Tinggi** | Fitur ini tidak punya proteksi hukum; yang membedakan hanya kualitas eksekusi dan dataset |
| T2 | Volatilitas harga bahan segar | **Tinggi** | Margin produk fresh tipis dan harga bergerak mingguan |
| T3 | Loyalitas rendah di kategori makanan sehat | Sedang | Pelanggan mudah pindah; retensi lebih sulit daripada akuisisi |
| T4 | Regulasi klaim gizi | Sedang | Menampilkan angka gizi membawa tanggung jawab; disclaimer wajib dipertahankan |
| T5 | Food waste melebihi perkiraan | Sedang | Risiko operasional terbesar untuk produk fresh |

---

## 3. Strategi dari Matriks SWOT

| Kombinasi | Strategi |
|---|---|
| **SO** (S1,S2 × O1,O2) | Jadikan transparansi perhitungan sebagai materi pemasaran utama. Konten "ini cara kami menghitung kebutuhanmu" membangun kepercayaan sekaligus mengedukasi — dan itu persis yang dibutuhkan segmen yang niatnya tinggi tapi pengetahuannya rendah. |
| **WO** (W1 × O1) | Gunakan pelanggan awal sebagai sumber data preferensi riil. Tiap pesanan adalah satu data point pilihan nyata — ini sekaligus menyelesaikan W1 dan memperbaiki model. |
| **ST** (S5 × T1) | Perdalam dataset, bukan tambah fitur. Pesaing bisa meniru UI dalam seminggu; membangun ulang data gizi-harga-pantangan yang terkurasi butuh waktu jauh lebih lama. |
| **WT** (W6,W3 × T2,T5) | Mulai dari volume kecil dengan menu terbatas, catat waste harian, dan perbarui harga bahan mingguan sebelum menaikkan skala. |

---

## 4. Yang Perlu Divalidasi Sebelum Laporan Final

Urut berdasarkan dampaknya terhadap kredibilitas laporan:

1. **Harga bahan riil** — survei 1–2 supplier. Seluruh perhitungan margin bergantung pada ini.
2. **Willingness to pay** — tanyakan ke 20–30 mahasiswa: berapa batas wajar untuk satu salad personalisasi? Ini memvalidasi atau mematahkan asumsi Rp 30–50 ribu.
3. **Segmentasi pelanggan** — apakah mahasiswa memang kesulitan dengan angka gizi, atau sebenarnya masalahnya harga?
4. **Preferensi menu** — menu mana yang paling menarik. Sekaligus menyediakan data riil untuk memperbaiki W1.

Poin 2 yang paling berisiko. Kalau batas wajar ternyata Rp 25.000, markup 2,0× tidak akan menutup biaya operasional, dan seluruh model pendapatan harus dirancang ulang. Lebih baik menemukan itu sekarang daripada di sesi tanya jawab.
