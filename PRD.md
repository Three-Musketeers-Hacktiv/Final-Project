# PRD — Fantasy City Defense: Portfolio Edition

Versi 1.0 · Target prototipe 13 November 2026

## 1. Ringkasan

Pemain menjadi lord kota fantasy dan membagi gold antara kekuatan serangan, defense, serta perbaikan. Setiap sepuluh hari, kota melawan satu wave monster secara otomatis. Informasi musuh tersedia sebelum wave agar belanja merupakan keputusan, bukan tebakan.

Prototipe selesai pada hari 20. Tidak ada formasi, HP pasukan, mana, atau sihir. Rincian dan angka berikut adalah **default implementasi prototipe**, bukan klaim sudah seimbang. Simpan angka dalam konfigurasi dan catat perubahan hasil playtest.

## 2. Fase dan alur

Fase state: `preparation`, `event`, `battle`, `battleReport`, `reward`, `gameOver`, `victory`.

Saat memasuki hari persiapan (1–9 dan 11–19):

1. Tambahkan pemasukan sekali.
2. Jika ada event belum selesai, selesaikan event sebelum belanja.
3. Pemain dapat melakukan maksimal satu aksi utama atau melewatinya.
4. Tombol lanjut mengakhiri hari. Aksi tidak terpakai tidak dibawa ke hari berikutnya.

Saat masuk hari 10 atau 20, pemasukan dan belanja tidak tersedia. Tampilkan konfirmasi wave dengan stat kedua pihak. Pemain menekan Mulai, lalu hasil dihitung dan disimpan sekali. Pemutaran battle tidak mengubah hasil.

Setelah laporan hari 10, jika kota bertahan, pemain memilih satu reward sebelum hari 11. Hari 20 membuka kemenangan tanpa reward. HP kota nol kapan pun berarti game over. Event atau reward tidak memakai aksi utama.

## 3. Kota, pasukan, dan biaya

### Nilai uji awal

| Parameter | Nilai |
|---|---:|
| Gold sebelum pemasukan hari 1 | 100 |
| Pemasukan per hari persiapan | 15 |
| HP kota awal dan maksimum | 150 |
| Base attack | 10 |
| Base defense | 2 |
| Pasukan awal | 0 |
| Rekrut satu pemanah | 30 gold; attack +5 |
| Rekrut satu penjaga | 35 gold; defense +2 |
| Upgrade tembok | 70 gold; defense +5; maksimal dua tingkat |
| Perbaiki kota | 30 gold; pulihkan sampai 30 HP |

Stat turunan:

`attack = baseAttack + archerCount × archerAttack`

`defense = baseDefense + guardCount × guardDefense + wallLevel × wallDefense`

Defense efektif menambahkan bonus event aktif. Nilai attack/defense diturunkan dari sumbernya, bukan disimpan sebagai total terpisah yang bisa tidak sinkron.

### Aksi utama

Rekrut satu pemanah, rekrut satu penjaga, upgrade tembok, atau perbaiki kota. Tidak ada batas jumlah pasukan untuk prototipe; jumlah pembelian dibatasi gold dan aksi harian.

Sebelum aksi: periksa fase, aksi tersisa, gold, tingkat maksimum, dan kebutuhan perbaikan. Aksi tidak valid tidak mengubah state. Tidak boleh memperbaiki HP penuh. HP dibatasi nol sampai maksimum. Pasukan tidak berkurang setelah battle.

Tembok memberi peningkatan defense lebih besar dalam satu aksi tetapi memiliki batas tingkat. Penjaga menyediakan peningkatan lebih kecil dan fleksibel. Tunjukkan perbedaan ini di UI; uji apakah salah satunya tidak pernah layak dibeli.

## 4. Informasi ancaman

Dashboard menampilkan nama monster, HP, attack, dan hari serangan berikutnya. Satu wave memakai satu bar HP gabungan, bukan beberapa musuh individual.

| Wave | Hari | Nama | HP | Attack |
|---|---:|---|---:|---:|
| 1 | 10 | Gerombolan Goblin | 150 | 22 |
| 2 | 20 | Pasukan Orc | 260 | 34 |

Ini konfigurasi uji. Nama berbeda belum berarti memiliki kemampuan khusus. Jangan menjanjikan perbedaan perilaku yang belum diimplementasikan.

## 5. Battle

Setiap ronde kedua pihak menyerang bersamaan:

- Damage ke monster = attack kota.
- Damage ke kota = `max(1, monsterAttack − defenseEfektif)`.
- HP kedua pihak dikurangi berdasarkan kondisi awal ronde, minimum nol.
- Pihak yang terkena serangan fatal tetap menyerang pada ronde tersebut.
- Monster kalah dan kota hidup: wave berhasil.
- Kota nol, termasuk ketika monster juga nol: pemain kalah.

Battle selesai ketika salah satu HP nol. HP kota yang tersisa dibawa ke hari berikutnya. HP monster diinisialisasi dari konfigurasi setiap wave. Tidak ada damage kota tambahan setelah battle.

**Aturan ini menggantikan rancangan lama:** defense mengurangi damage setiap ronde, minimum satu; kota ikut menyerang sejak awal; tidak ada fase pasukan tumbang terlebih dahulu.

Attack kota selalu positif. Validator menolak konfigurasi HP/attack tidak valid. Dengan damage minimum satu dan HP terbatas, battle tidak macet.

### Penyajian

Ronde pertama ditampilkan setelah lima detik. Sediakan percepatan ×5 dan tombol Lihat Hasil. Hasil tidak bergantung pada timer atau apakah tab aktif. Engine mengembalikan log: nomor ronde, damage kedua pihak, HP setelah ronde, dan status akhir.

Laporan menjelaskan jumlah ronde, attack kota, defense efektif, damage per ronde, total HP hilang, dan hasil. Jika waktu sempit, laporan langsung adalah fallback yang sah.

## 6. Event dari AI sebelum rilis

Jadwal tetap: hari 3, 7, 13, 17. Tidak ada layanan AI atau API key dalam runtime. AI hanya menulis cerita dan label berdasarkan paket efek berikut.

| Hari | Bentuk | Pilihan A | Pilihan B |
|---|---|---|---|
| 3 | Pertukaran | Bayar 20 gold, defense +4 untuk wave berikutnya | Gratis, tanpa efek |
| 7 | Dilema | Bayar 15 gold | Gratis, HP kota −10 |
| 13 | Kesempatan | Gratis, gold +20 | Gratis, diskon rekrutmen 25% sampai wave berikutnya |
| 17 | Pertukaran | Bayar 20 gold, defense +4 untuk wave berikutnya | Gratis, tanpa efek |

Tim boleh menyesuaikan angka setelah uji. AI tidak boleh mengubah mekanik, menambahkan sihir, atau menciptakan cabang cerita yang membutuhkan sistem lain.

### Kontrak

Event: `id`, `day`, `title`, `description`, `choices` tepat dua.

Choice: `id`, `label`, `goldCost`, `effects`.

Efek yang didukung:

- `grantGold` dengan amount positif.
- `damageCity` dengan amount positif.
- `nextWaveDefense` dengan amount positif dan target wave.
- `recruitDiscount` dengan rate antara nol dan satu, berakhir setelah wave berikutnya.

Minimal satu pilihan gratis tanpa prasyarat. Pilihan berbayar dinonaktifkan jika gold kurang. Tidak ada biaya tersembunyi di teks. UI merender biaya, efek, dan durasi dari data terstruktur. Jika event menghabiskan HP, buka game over.

Efek event diterapkan sekali. Bonus defense digunakan selama seluruh wave target dan dihapus setelah resolusi. Diskon berlaku untuk pemanah/penjaga, tidak untuk tembok atau perbaikan. Biaya akhir dibulatkan ke atas. Diskon tidak ditumpuk; pakai rate terbesar yang aktif.

### Pipeline konten

1. C menyediakan aturan dunia, skema JSON, dan paket efek yang disepakati A.
2. AI menulis empat event Bahasa Indonesia.
3. Validator memeriksa struktur, ID unik, jadwal, tepat dua pilihan, angka, efek dan kecocokan paket.
4. Rekan memeriksa narasi sesuai efek, tidak berulang, dan tanpa mekanik baru.
5. Tim menguji kedua pilihan masing-masing event.
6. JSON yang disetujui disertakan dalam build. Simpan prompt dan catatan review.

Batas awal: judul 60 karakter, narasi 450, label 120. Jangan mengasumsikan pemain memiliki jenis pasukan tertentu. Konten invalid menggagalkan pemeriksaan sebelum rilis.

## 7. Tiga pilihan reward

Setelah wave 1 berhasil, pilih tepat satu:

| Pilihan | Efek |
|---|---|
| Bantuan kerajaan | Gold +40 langsung |
| Jalur perdagangan | Pemasukan +6 per hari persiapan 11–19 |
| Logistik pasukan | Diskon rekrutmen 25% pada hari 11–19 |

Tidak ada bonus gold tetap di luar pilihan ini. Diskon reward dan event tidak ditumpuk. Bonus fase berakhir ketika wave 2 selesai. Nilai uji harus dibandingkan berdasarkan rencana belanja: uang cepat, pemasukan total lebih besar, atau rekrutmen berulang.

## 8. Save dan konsistensi

Satu save browser dengan versi format. Simpan hari, fase, HP, gold, jumlah pasukan, wall level, aksi terpakai, hari pemasukan terakhir, event aktif/selesai, efek, reward terambil, serta hasil/log battle.

Hasil battle dihitung dan disimpan sebelum animasi. Selama pemutaran gunakan HP visual terpisah dari HP final dalam state. Refresh pada fase battle membuka laporan hasil tersimpan, bukan menghitung atau melukai kota lagi.

Perubahan state bersifat atomik. Cegah klik ganda pada aksi/transisi. Save tidak valid menampilkan pesan dan pilihan mulai baru; tidak dihapus diam-diam. Mulai baru dengan save aktif membutuhkan konfirmasi. Jika penyimpanan gagal, game tetap dapat berjalan di memori dengan pemberitahuan bahwa progres belum tersimpan.

Tidak ada akun, sinkronisasi perangkat, atau jaminan data bertahan setelah data browser dihapus.

## 9. UI

- Pembuka: permainan baru/lanjutkan.
- Dashboard: hari, gold, HP, rincian attack/defense, pasukan, tembok, aksi, ancaman, efek aktif.
- Panel aksi: biaya dan perubahan sebelum membeli.
- Event: cerita, dua pilihan, konsekuensi dan durasi.
- Battle: dua HP bar, ronde, percepatan dan Lihat Hasil.
- Laporan: angka perhitungan dan hasil.
- Reward: tiga pilihan dan durasi.
- Akhir: hari, wave, stat kota, dan Main Lagi.

Desktop prioritas. Label jelas, kontrol tidak terpotong pada layar sempit, dan status tidak dibedakan dengan warna saja.

## 10. Penerimaan

- Alur menang 20 hari dan game over dapat dicapai.
- Pemasukan hanya hari persiapan, sekali per hari.
- Satu aksi per hari; biaya gagal tidak mengubah state.
- Stat turunan, batas HP/tembok, pembulatan diskon benar.
- Serangan simultan dan kondisi kedua pihak nol diuji.
- Defense minimum satu per ronde, tanpa damage tambahan di akhir.
- Event/reward tidak dapat diambil dua kali; kedaluwarsa tepat.
- Refresh diuji pada seluruh fase tanpa duplikasi efek.
- Konten AI lolos validator dan review manusia.
- Typecheck, lint, unit test, dan build produksi lulus.

## 11. Portofolio dan risiko

Bukti penyerahan: URL demo, repository, README aktual, diagram alur sederhana, pengujian aturan, catatan playtest, PR/review, dan kontribusi tiap anggota. Setiap developer harus memahami kode yang dibantu AI.

Risiko utama: terlalu banyak defense, pilihan hadiah dominan, tumpang tindih penjaga/tembok, dan durasi battle. Tangani melalui konfigurasi dan uji, bukan menambah fitur. Rubrik bootcamp belum diperiksa; konfirmasi kewajiban teknis sebelum coding. Jangan menambah backend sekadar menambah jumlah teknologi.
