# FixSalad — Modeling

Bagian data science dari proyek. Tiga file, jalankan berurutan.

## File

| File | Isi |
|---|---|
| `fixsalad_core.py` | Lapis 1 (planner) + Lapis 2 (solver) + feature engineering. **Sumber kebenaran** — implementasi TypeScript harus menghasilkan angka identik. |
| `export_data.py` | CSV → JSON untuk website |
| `train_ranker.py` | Lapis 3 — training, evaluasi, export bobot model |

## Cara menjalankan

### Lokal

```bash
cd model
pip install -r requirements.txt
python export_data.py      # CSV -> JSON
python train_ranker.py     # training (~20 detik)
```

### Google Colab

```python
# Upload folder model/ dan data/ ke Colab, lalu:
!pip install -q scikit-learn pandas matplotlib
%cd model
!python export_data.py
!python train_ranker.py
```

Semua dependensi sudah tersedia di Colab — `pip install` biasanya tidak perlu.

## Output

```
output/
├── model_weights.json       <- SALIN KE website/data/
├── metrics_report.txt       <- angka untuk tabel laporan
├── confusion_matrix.png     <- untuk slide
├── feature_importance.png   <- untuk slide
├── centering_comparison.png <- untuk slide (gambar paling penting)
└── training_data.csv        <- dataset hasil generate, untuk lampiran
```

## Hasil yang diharapkan

```
Model                        Top-1 Acc    ROC-AUC   Arah koef
Rule-based (baseline)            0.654      0.812           -
LR — tanpa centering             0.704      0.891         7/9
LR — within-group ctr            0.723      0.913         8/9
Random Forest (ctr)              0.717      0.923           -
Tebak acak                       0.231      0.500           -
```

Angka bisa bergeser ±0.03 kalau `ingredients.csv` diubah (misal setelah survei harga). Itu normal. Yang **tidak** normal: Top-1 LR jatuh di bawah baseline, atau `Arah koef` turun di bawah 7/9. Kalau itu terjadi, periksa apakah ada bahan dengan nilai gizi yang tidak masuk akal.

Satu koefisien (`fiber_density`) masih meleset arahnya. Perhatikan bahwa itu juga koefisien yang paling dekat ke nol — model memang punya bukti paling lemah untuk fitur itu. **Laporkan 8/9 apa adanya**, jangan dibulatkan jadi 9/9.

**Untuk laporan:** salin angka dari `output/metrics_report.txt` hasil run Anda sendiri, bukan dari tabel ini. Tabel ini bisa basi kalau data berubah.

## Hal yang paling sering ditanya penguji

**"Datanya dari mana?"**
Sintetis — 800 profil user yang dibangkitkan dari distribusi yang dikalibrasi ke antropometri dewasa Indonesia usia 19–29 (nilai tengah mengacu AKG 2019 / Permenkes 28/2019; simpangan baku adalah asumsi sebaran populasi). Labelnya dibangkitkan dengan utility function + noise Gumbel.

Jawab ini dengan tenang dan langsung. Menyebut "sintetis" lebih dulu, sebelum ditanya, jauh lebih kuat daripada terlihat seperti sedang menutupi sesuatu.

**"Berarti modelnya cuma belajar aturan kalian sendiri?"**
Ya, tepat. Itu keterbatasan yang kami nyatakan eksplisit di laporan (SPEC.md §4.4). Yang dibuktikan di sini adalah pipeline-nya utuh dan metodologinya benar, bukan bahwa model memprediksi preferensi manusia nyata. Validasi dengan data riil kami tulis sebagai future work, dan desain surveinya sudah disiapkan.

**"Kenapa tidak survei sungguhan saja?"**
Waktu pengerjaan dua hari. Survei yang benar butuh responden riil dan waktu tunggu. Kami memilih menyatakan keterbatasan dengan jujur daripada mengarang respons — data survei yang dikarang akan membuat seluruh temuan tidak sah.

**"Kenapa Logistic Regression, bukan deep learning?"**
Dataset 3.447 baris dengan 9 fitur. Neural network akan overfit dan tidak memberi koefisien yang bisa diinterpretasi. Random Forest kami coba dan menang 1.2 pp pada akurasi, tapi tidak bisa diekspor ke beberapa angka untuk dijalankan di browser. LR dipilih sadar sebagai trade-off akurasi vs deployability dan interpretability.

**"Kenapa Top-1 accuracy, bukan accuracy biasa?"**
Dengan ~4,3 menu per user, model yang menebak "tidak dipilih" untuk semua baris sudah dapat accuracy ~77%. Angka itu menipu. Top-1 mengukur yang benar-benar dirasakan user: apakah menu peringkat 1 adalah menu yang dia pilih.

**"Kenapa pakai within-group centering?"**
Ini temuan kami sendiri — lihat SPEC.md §4.8. Tanpa centering, model akurat (AUC 0.904) tapi koefisien `calorie_gap` keluar dengan tanda terbalik. Model yang kesimpulannya akan dijadikan temuan tidak cukup dinilai dari akurasi saja.
