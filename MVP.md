# MVP — Fantasy City Defense: Portfolio Edition

Versi 1.0 · Deadline 13 November 2026 · Tim: tiga junior developer

## Tujuan

Menghasilkan prototipe web strategi pertahanan kota yang selesai dimainkan, stabil, dan dapat dijelaskan setiap anggota tim saat kelulusan bootcamp. Fokus engineering: aturan TypeScript terpisah dari UI, state yang konsisten, autosave, validasi konten AI, pengujian, dan kolaborasi melalui review kode.

Target wajib adalah **20 hari dan dua wave**, bukan kampanye 100 hari. MVP produk jangka berikutnya adalah 100 hari dan sepuluh wave setelah prototipe lolos evaluasi. Jadwal mengasumsikan pekerjaan penuh waktu sampai deadline.

## Lingkup wajib

| Bagian | Prototipe |
|---|---|
| Platform | Browser, single-player, desktop prioritas |
| Kalender | Hari persiapan 1–9 dan 11–19; wave hari 10 dan 20 |
| Ekonomi | Satu currency gold, pemasukan harian, maksimal satu aksi utama per hari |
| Kota | HP, attack, defense, upgrade tembok, perbaikan |
| Pasukan | Pemanah menambah attack; penjaga menambah defense |
| Pertempuran | Satu HP bar kota versus satu HP bar monster; serangan bersamaan |
| Informasi | Stat wave berikutnya terlihat selama persiapan |
| Event | Empat event tetap; dibuat AI sebelum rilis, diperiksa tim |
| Reward | Pilih satu dari tiga hadiah setelah wave pertama |
| Persistensi | Satu autosave browser, lanjutkan dan mulai baru |
| Akhir | Kalah ketika HP kota nol; menang setelah wave kedua |
| Presentasi | Dashboard jelas, indikator HP, ringkasan battle, hasil akhir |

Tidak ada mana, sihir, formasi 3×2, targeting antarskuad, skuad terluka, cadangan, equipment, API AI runtime, akun, backend, atau database. Kebutuhan backend/autentikasi belum dikonfirmasi terhadap rubrik bootcamp; tim harus memeriksanya hari pertama.

## Keputusan penyederhanaan

- Pasukan adalah jumlah permanen, tanpa HP individual atau korban. Tidak ada pemulihan pasukan.
- Upgrade kota hanya meningkatkan defense tembok; tidak sekaligus menaikkan semua stat.
- Penjaga dan tembok sama-sama memberi defense, tetapi tembok lebih mahal, lebih besar peningkatannya, dan terbatas dua tingkat. Angka harus diuji.
- Event dijadwalkan, bukan acak. AI menghasilkan tulisan dari paket efek yang ditentukan tim.
- Interval serangan hanya penyajian; hasil dihitung sekali saat wave dimulai.
- Tiga reward merupakan pilihan ekonomi; tidak ada bonus gold tambahan otomatis.

## Kriteria selesai

- Alur hari 1–20 dapat dimainkan tanpa intervensi developer.
- Setiap aksi, event, reward, pemasukan, dan damage hanya diterapkan sekali.
- Biaya tidak menghasilkan gold negatif; HP selalu valid.
- Battle kedua pihak bersamaan dan kondisi sama-sama tumbang mengikuti PRD.
- Refresh dapat melanjutkan dari event, laporan, reward, dan akhir permainan.
- Empat event lolos validator dan review manusia; runtime tanpa AI.
- Typecheck, lint, pengujian aturan, dan build produksi lulus.
- URL demo, README aktual, catatan playtest, dan kontribusi ketiga developer tersedia.

## Target playtest

Uji lima orang di luar tim bila tersedia; catat jumlah sebenarnya. Target empat memahami alur tanpa dibimbing dan dapat menjelaskan penyebab kehilangan HP. Uji fokus pemanah, penjaga/tembok, dan campuran. Periksa apakah perbaikan diperlukan, apakah satu hadiah selalu unggul, dan apakah pemain masih bisa pulih setelah wave pertama.

## Tim dan milestone

| Pemilik | Fokus |
|---|---|
| A | Aturan kalender, ekonomi, efek, battle, dan unit test |
| B | Dashboard, aksi, event, battle, reward, hasil akhir |
| C | Konfigurasi, konten AI, validator, autosave, build, dokumentasi |

| Tanggal | Hasil wajib |
|---|---|
| 3 November | Rubrik, kontrak data, setup dan pembagian file |
| 4–5 November | Dashboard, ekonomi, pasukan, upgrade, pergantian hari |
| 6 November | Hari 1–10 sampai laporan battle |
| 7–8 November | Empat event, reward, dan alur 20 hari |
| 9 November | Autosave lengkap dan build terintegrasi |
| 10 November | Playtest; hentikan fitur baru |
| 11–12 November | Perbaikan, balancing, deploy, latihan demo |
| 13 November | Pemeriksaan dan penyerahan |

Jika terlambat, potong animasi dan pemolesan visual terlebih dahulu. Pertahankan kebenaran aturan, save, dan akhir permainan. Kampanye 100 hari tidak menggantikan waktu perbaikan.

## Tahap setelah deadline

Perluas konfigurasi menjadi sepuluh wave dan 20 event, lalu uji ekonomi sepanjang 100 hari. Formasi dan backend bukan perluasan otomatis; evaluasi berdasarkan tujuan produk atau rubrik.
