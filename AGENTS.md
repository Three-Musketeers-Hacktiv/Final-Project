# Developer 1 — Sistem Game Fantasy City Defense

> **Konflik persyaratan vs implementasi (baca dulu)**  
> Dokumen ini tetap berisi **persyaratan tertulis** brief prototipe awal (campaign **20 hari**, **2 wave**, max upgrade **5**, event hari tetap, dll.).  
> **Perilaku implementasi saat ini** di `src/game` adalah campaign **100 hari**, **10 wave**, max level **18**, `GAME_STATE_VERSION = 4`, difficulty, `eventPlan` per run, dan consequence.  
> Jangan menghapus atau diam-diam mengganti persyaratan di bawah agar “cocok” dengan kode tanpa keputusan tim.  
> Untuk perilaku kode terkini, gunakan: [`docs/game-engine/README.md`](./docs/game-engine/README.md), [`docs/DEV1_CONTRACT.md`](./docs/DEV1_CONTRACT.md), [`docs/CAMPAIGN_100_DAY_CONTRACT.md`](./docs/CAMPAIGN_100_DAY_CONTRACT.md).  
> Inventaris konflik: [`docs/game-engine/DOCUMENTATION_SYNC.md`](./docs/game-engine/DOCUMENTATION_SYNC.md).

## Tujuan

Implementasikan sistem permainan TypeScript untuk prototipe web single-player bertema lord yang mempertahankan kota fantasy dari monster. Target prototipe 20 hari, dengan pertempuran pada hari 10 dan 20. Deadline proyek: 13 November 2026.

Dokumen ini merupakan instruksi untuk coding agent yang membantu Developer 1. Kerjakan implementasi dan pengujian yang relevan, bukan hanya memberikan rencana atau contoh kode. Jangan mengklaim pemeriksaan lulus jika belum dijalankan.

## Mulai dari repository yang tersedia

1. Baca instruksi repository, package.json, konfigurasi TypeScript, dokumentasi proyek, dan implementasi yang berkaitan.
2. Identifikasi kontrak data serta pola state yang sudah dipakai Developer 2 dan 3.
3. Gunakan struktur dan dependency yang sudah ada. Jangan membuat proyek baru atau mengganti framework jika aplikasi tersedia.
4. Pertahankan perubahan rekan. Hindari mengubah UI, backend AI, persistensi, dan kontrak publik tanpa kebutuhan integrasi yang jelas.
5. Jika repository belum memiliki sistem game, gunakan struktur usulan di bawah dan dokumentasikan kontrak integrasinya.

## Keputusan terbaru yang berlaku

- Kota memiliki HP, attack, defense, gold, serta tiga level: tembok, pasukan, dan kota.
- **Upgrade terpisah:** tembok menaikkan defense, pasukan menaikkan attack, kota menaikkan MaxHP dan pemasukan harian. Ini menggantikan upgrade tunggal yang menaikkan attack dan defense sekaligus.
- Upgrade kota menaikkan `cityMaxHp` dan mengisi `cityHp` sebesar bonus itu (bukan heal penuh). Perbaikan HP tetap aksi terpisah dan tidak menaikkan maksimum.
- Tidak ada rekrutmen unit, HP pasukan individual, atau formasi. "Pasukan" di sini hanya level attack kota.
- Tidak ada mana, sihir, formasi 3×2, targeting skuad, atau HP pasukan individual.
- Battle menggunakan satu HP bar kota melawan satu HP bar monster.
- Developer 3 menangani pembuatan narasi event oleh AI. Sistem game hanya menerima pilihan dan efek yang sudah tervalidasi.

## Lingkup tanggung jawab

Implementasikan:

- Tipe data dan aturan permainan.
- Kalender 20 hari dan transisi fase.
- Pemasukan gold dan batas satu aksi per hari persiapan.
- Upgrade kota serta perbaikan HP.
- Perhitungan attack dan defense efektif.
- Battle otomatis dengan damage bersamaan.
- Kondisi menang dan kalah.
- Penerapan biaya serta efek pilihan event.
- Tiga pilihan reward dan kedaluwarsa bonus.
- Pengujian aturan ekonomi, battle, event, reward, dan transisi.

Di luar tugas inti: UI produk final, API AI asli, API key, backend produksi, dan deployment. **Pengecualian yang diminta pengguna:** implementasikan mock frontend, mock backend HTTP, serta penyimpanan debug terisolasi untuk menguji engine sesuai bagian testing harness di bawah. Mock harus mudah diganti oleh implementasi Developer 2 dan 3.

## Aturan kalender dan fase

Gunakan fase yang jelas, menyesuaikan nama yang sudah ada di repository:

`preparation`, `event`, `battleReady`, `battleReport`, `reward`, `gameOver`, `victory`.

- Hari persiapan: 1–9 dan 11–19.
- Hari battle: 10 dan 20.
- Pemasukan hanya diberikan ketika memasuki hari persiapan, tepat sekali per hari, termasuk hari 1.
- Event terjadwal pada hari 3, 7, 13, dan 17. Pilihan event harus selesai sebelum aksi atau lanjut hari.
- Maksimal satu aksi ekonomi berhasil per hari: salah satu dari upgrade tembok, pasukan, kota, atau perbaikan. Aksi gagal tidak menghabiskan jatah.
- Pemain boleh lanjut tanpa memakai aksi. Jatah tidak terakumulasi.
- Tidak ada pemasukan atau aksi ekonomi pada hari battle.
- Setelah battle pertama berhasil, pemain melihat laporan lalu wajib memilih satu reward sebelum memasuki hari 11.
- Setelah battle kedua berhasil, laporan diteruskan ke kemenangan, tanpa reward tambahan.
- HP nol dari sumber apa pun langsung menghasilkan game over.
- Fase akhir tidak menerima aksi permainan, kecuali pembuatan permainan baru oleh pemanggil.

## Konfigurasi awal

Gunakan nilai repository jika sudah disepakati tim. Jika belum ada, gunakan nilai uji berikut dalam satu konfigurasi terpusat. Jangan menyebarkan angka ke berbagai fungsi.

| Parameter | Nilai uji |
|---|---:|
| Hari awal | 1 |
| Gold sebelum pemasukan hari 1 | 100 |
| Pemasukan harian | 15 |
| HP awal/maksimum kota | 150 |
| Base attack | 10 |
| Base defense | 2 |
| Biaya upgrade pertama | 50 |
| Kenaikan biaya tiap upgrade berikutnya | 20 |
| Bonus tembok / pasukan / kota | Defense +2 / attack +5 / MaxHP +20 dan income +8 |
| Maksimal tiap jalur | 5 kali; mulai dari level 0 |
| Biaya perbaikan | 30 |
| Pemulihan per perbaikan | Sampai 30 HP |
| Wave 1, hari 10 | Goblin: HP 150, attack 22 |
| Wave 2, hari 20 | Orc: HP 260, attack 34 |

Biaya upgrade berikutnya = biaya dasar + level saat ini × kenaikan biaya. Angka ini merupakan default implementasi yang perlu playtest, bukan balancing final.

Attack dan defense diturunkan dari base stat, level, kontribusi sistem lain yang sudah tersedia, dan efek yang berlaku. Jangan menyimpan total turunan terpisah yang berisiko tidak sinkron.

## Ekonomi dan validasi aksi

- Periksa fase, hari, aksi tersisa, biaya, level maksimum, dan kebutuhan perbaikan sebelum mengubah state.
- Gold tidak boleh negatif. HP harus berada pada rentang 0 sampai maksimum.
- Tidak boleh upgrade setelah mencapai batas atau memperbaiki kota dengan HP penuh.
- Perbaikan tidak boleh melewati maksimum HP.
- Seluruh perubahan satu aksi bersifat atomik. Jika validasi gagal, state asal tidak berubah.
- Kembalikan error terstruktur dengan kode yang dapat digunakan UI; jangan memakai alert atau teks UI di engine.
- Jangan menerima biaya, bonus upgrade, atau nilai stat arbitrer dari tombol UI. Hitung berdasarkan konfigurasi yang dipercaya.

## Battle deterministik

Implementasikan fungsi murni yang menerima snapshot kota dan monster, lalu mengembalikan hasil serta log ronde.

Untuk setiap ronde:

1. Hitung damage ke monster = attack efektif kota.
2. Hitung damage ke kota = maksimum(1, attack monster − defense efektif kota).
3. Terapkan kedua damage berdasarkan kondisi awal ronde secara bersamaan.
4. Batasi HP minimum nol dan simpan hasil ronde.
5. Berhenti ketika salah satu HP nol.

Aturan hasil:

- Monster nol dan kota masih hidup: wave berhasil.
- Kota nol: kalah, termasuk jika monster juga nol pada ronde sama.
- HP kota tersisa dibawa ke hari berikutnya.
- Tidak ada damage tambahan setelah battle.
- Tidak ada randomness, critical, kecepatan, atau skill.
- Tolak konfigurasi battle invalid, termasuk HP awal tidak positif atau attack kota tidak positif.

Log berisi nomor ronde, damage kedua pihak, dan HP sesudah ronde. Total HP yang hilang di laporan memakai selisih HP sebenarnya, bukan penjumlahan damage overkill.

Jangan memakai timer di engine. Interval lima detik, percepatan, dan animasi merupakan tanggung jawab UI. Hitung hasil sekali saat battle dimulai dan simpan hasil/log dalam state. UI boleh memutar ulang log tanpa menerapkan damage lagi.

## Kontrak event

Paket efek ditetapkan kode/config; AI hanya membuat narasi sesuai paket. Pisahkan narasi dari efek atau pastikan adapter hanya memasukkan efek yang sudah divalidasi terhadap paket terpercaya. Jangan mempercayai angka baru dari respons AI.

Struktur minimum:

- Event: ID, hari, judul, narasi, dan tepat dua pilihan.
- Pilihan: ID, label, biaya gold, daftar efek.
- Efek berupa discriminated union TypeScript, bukan kode atau ekspresi yang dieksekusi.

Efek prototipe:

- Gold bertambah langsung.
- HP kota berkurang langsung.
- Bonus defense untuk satu wave target.
- Diskon biaya upgrade sampai wave berikutnya.

**Penyesuaian karena tidak ada rekrutmen dalam tugas terbaru:** gunakan diskon upgrade sebagai pengganti diskon rekrutmen. Dokumentasikan kontrak ini agar Developer 2 dan 3 menyesuaikan payload serta labelnya.

Minimal satu pilihan setiap event gratis tanpa prasyarat. Pilihan berbayar ditolak bila gold kurang. Pilihan harus berasal dari event aktif pada hari yang sesuai. Terapkan biaya, efek, penanda selesai, dan perubahan fase sebagai satu transaksi.

Paket awal jika tim belum menyediakan:

| Hari | Pilihan A | Pilihan B |
|---|---|---|
| 3 | Bayar 20 gold, defense +4 wave pertama | Gratis tanpa efek |
| 7 | Bayar 15 gold | Gratis, HP kota −10 |
| 13 | Gratis, gold +20 | Gratis, diskon upgrade 25% sampai wave kedua |
| 17 | Bayar 20 gold, defense +4 wave kedua | Gratis tanpa efek |

Engine tidak perlu menunggu jaringan atau menghasilkan cerita. Jika adapter AI belum tersedia, gunakan fixture event lokal dengan kontrak yang sama. Event aktif yang sudah disimpan tidak boleh diganti hanya karena respons jaringan datang terlambat.

## Reward dan durasi efek

Setelah wave pertama berhasil, sediakan tepat tiga pilihan; pemain mengambil satu:

1. Gold +40 langsung.
2. Bonus pemasukan +6 pada hari persiapan 11–19.
3. Diskon upgrade kota 25% pada hari 11–19.

Tidak ada bonus gold otomatis di luar pilihan tersebut. Reward dipilih sekali. Bonus tidak aktif sebelum dipilih.

Diskon event dan reward tidak ditumpuk: gunakan rate terbesar yang berlaku. Biaya setelah diskon dibulatkan ke atas. Diskon upgrade tidak berlaku untuk perbaikan.

Bonus defense berlaku selama seluruh wave target dan dihapus setelah resolusi. Bonus fase berakhir setelah wave kedua; tampilkan data expiry yang jelas untuk UI. Reward dan event harus memiliki ID/penanda untuk mencegah penerapan dua kali.

## Arsitektur dan kontrak integrasi

Jika belum ada struktur, gunakan:

```text
src/game/
  types.ts
  config.ts
  initialState.ts
  stats.ts
  calendar.ts
  economy.ts
  battle.ts
  effects.ts
  events.ts
  rewards.ts
  transitions.ts
  index.ts
```

Nama dapat disesuaikan dengan repository. Hindari dependency tambahan jika TypeScript dan runner yang ada cukup.

Sediakan fungsi/API yang setara dengan:

- Membuat state awal yang sudah memasukkan pemasukan hari 1 tepat sekali.
- Menghitung stat efektif dan biaya aksi.
- Melakukan upgrade atau perbaikan.
- Memilih respons event berdasarkan ID.
- Mengakhiri hari persiapan.
- Menjalankan dan menyelesaikan battle sekali.
- Melanjutkan laporan menuju reward/kemenangan.
- Memilih reward berdasarkan ID.

Gunakan fungsi murni atau reducer/action sesuai arsitektur existing. Engine tidak mengakses React, DOM, localStorage, fetch, process.env, atau timer.

State harus JSON-serializable: gunakan objek, array, string, number dan boolean, bukan Date, Map, Set, fungsi, atau class instance. Simpan penanda aksi harian, pemasukan, event selesai, wave terselesaikan, efek dan hasil battle. Tentukan versi format bersama Developer 3.

Aksi yang diulang dari state baru harus ditolak atau menjadi no-op tanpa perubahan kedua. Lapisan state pemanggil harus memakai state terbaru secara atomik; jangan menerapkan hasil dari snapshot lama setelah aksi lain terjadi.

## Pengujian wajib

Gunakan runner repository; jika belum ada, gunakan Vitest. Uji aturan bermakna berikut:

- Pemasukan hari 1 dan hari berikutnya tepat sekali, tanpa pemasukan hari 10/20.
- Satu aksi berhasil per hari, aksi gagal tidak menghabiskan jatah, skip diperbolehkan.
- Biaya upgrade bertingkat, kenaikan attack/defense, batas level dan gold kurang.
- Perbaikan parsial, HP maksimum, serta penolakan pada HP penuh.
- Damage bersamaan, defense melebihi attack, overkill dan kedua pihak tumbang.
- Wave 1 menuju reward, wave 2 menuju kemenangan, kota nol menuju game over.
- Pilihan event invalid, biaya kurang, efek HP fatal dan penerapan ulang.
- Reward sekali, bonus pemasukan hanya pada hari yang valid.
- Diskon tidak ditumpuk, pembulatan biaya dan kedaluwarsa efek.
- State asal tidak berubah oleh fungsi murni dan dapat diserialisasi.
- State laporan yang dimuat kembali tidak menyebabkan battle dihitung atau damage diterapkan lagi.
- Satu integration test menjalankan alur 20 hari menggunakan aksi nyata, bukan langsung melompat state.

Sesuaikan fixture jika angka balancing berubah. Hindari assertion yang hanya menyalin implementasi tanpa membuktikan perilaku.

## Testing harness — mock frontend dan backend

### Tujuan dan batas

Selain engine, buat aplikasi pengujian yang benar-benar bisa dijalankan: mock frontend untuk memainkan 20 hari dan mock backend HTTP untuk mensimulasikan layanan narasi event. Jangan berhenti pada contoh kode atau fungsi mock yang tidak terhubung.

Engine tetap murni. React, fetch, localStorage, timer, dan environment variable hanya digunakan di adapter/harness yang relevan. Mock bukan implementasi produk final dan tidak boleh menimpa pekerjaan UI/backend rekan.

Periksa repository terlebih dahulu. Jika UI/backend asli sudah ada, buat halaman/route dan adapter khusus testing di lokasi terpisah. Gunakan dependency yang tersedia; pilih server HTTP TypeScript minimal bila server belum ada. Jangan memasang framework besar atau database hanya untuk mock.

Struktur opsional:

```text
src/dev-harness/
  EngineTestPage.tsx
  engineController.ts
  eventClient.ts
  debugStorage.ts
  scenarios.ts
mock-server/
  server.ts
  fixtures.ts
```

### Mock frontend

Sediakan halaman berlabel jelas “Game Engine Test Harness” dengan:

- Hari, fase, gold, HP, level kota, attack/defense, aksi tersisa, dan efek aktif.
- Tombol permainan baru, upgrade, perbaikan, lanjut hari, mulai battle, lanjut laporan, pilihan event, dan tiga pilihan reward.
- Pratinjau wave, hasil/log battle, serta alasan aksi ditolak.
- Indikator permintaan event, fallback, dan error backend.
- Panel JSON state dan riwayat action/error untuk membantu debugging; tanpa data rahasia.
- Simpan/muat state debug dan reset save. Pakai key khusus seperti `fantasy-engine-harness-v1`, terpisah dari save produk.
- Pilihan fixture terverifikasi: awal permainan, gold tidak cukup, HP hampir habis, upgrade maksimum, sebelum wave 1, sebelum wave 2, serta fase event/reward.

Pemilihan fixture adalah alat debug dengan label jelas, bukan cara menjalankan alur normal. Fixture harus konsisten dengan fase/hari dan dibangun menggunakan helper yang menjaga invariant. Jalur pengujian 20 hari wajib tetap melalui action engine normal.

Semua tombol memanggil action/controller yang memakai engine; jangan menyalin rumus biaya, damage, transisi, atau reward di komponen. Panel boleh menampilkan biaya/stat dari selector engine. Saat action gagal, state tidak berubah dan error ditampilkan.

Untuk harness, laporan battle langsung cukup; animasi tidak wajib. Refresh setelah hasil battle tersimpan tidak menghitung atau menerapkan damage lagi. Error parse/save ditampilkan tanpa menghapus save secara diam-diam.

### Mock backend HTTP

Backend hanya menyediakan narasi event dan simulasi kegagalan. State permainan dan aturan ekonomi/battle tetap dikelola engine di frontend. Jangan membuat implementasi aturan kedua di server.

Sediakan kontrak setara berikut, menyesuaikan endpoint yang sudah disepakati tim jika ada:

| Endpoint | Fungsi |
|---|---|
| `GET /api/health` | Status server mock |
| `POST /api/events/generate` | Narasi deterministik sesuai paket event yang diminta |

Request minimum: `runId`, `eventId`, `day`, `packageId`, serta ringkasan kondisi kota yang diperlukan. Validasi tipe, ID paket, dan kecocokan hari. Gunakan fixture/paket lokal terpercaya, bukan nilai efek arbitrer dari request.

Response sukses: `eventId`, `packageId`, `title`, `description`, dan label pilihan yang mengacu pada ID pilihan paket. Backend mock tidak memanggil AI, tidak memerlukan API key, serta tidak membuat efek baru. Controller menggabungkan narasi dengan paket efek lokal setelah memvalidasi ID dan isi respons.

Request berulang dengan `runId` dan `eventId` sama harus memberikan narasi yang sama. Fixture tetap cukup untuk menjamin determinisme; tidak perlu database atau cache tanpa batas. Event yang sudah aktif/selesai disimpan frontend dan tidak diminta ulang saat refresh.

Sediakan mode debug yang dapat dipilih frontend atau konfigurasi server:

- Sukses normal.
- Respons terlambat melebihi timeout client.
- HTTP 500.
- Respons JSON dengan struktur/ID yang salah.
- Badan respons bukan JSON valid.

Mode ini hanya untuk server mock. Request normal yang tidak valid harus ditolak secara terstruktur. Jalankan server pada loopback secara default. Gunakan proxy development atau origin frontend lokal yang dikonfigurasi; jangan mengubah konfigurasi produksi secara global.

### Adapter, fallback, dan refresh

- Gunakan timeout client terkonfigurasi; default uji lima detik.
- Timeout, network error, status gagal, atau schema invalid memakai event lokal dari paket yang sama.
- Simpan event terpilih sebelum menampilkannya, termasuk apakah sumbernya mock atau fallback.
- Batalkan/abaikan respons lama ketika run berubah, event selesai, atau fallback sudah dipakai. Gunakan identitas run/request, bukan hanya status loading.
- Jangan meminta ulang event pada setiap render. Cegah request bersamaan untuk event yang sama pada satu controller.
- Selama menunggu event wajib, blokir belanja dan lanjut hari, tetapi sediakan fallback setelah batas waktu agar permainan tidak macet.
- Jangan menerapkan efek saat narasi diterima. Efek hanya diterapkan ketika pilihan yang valid diambil melalui engine.
- Backend mati harus tetap memungkinkan alur 20 hari memakai event cadangan.

### Cara menjalankan dan dokumentasi

Tambahkan script nyata sesuai struktur repository untuk menjalankan frontend harness, backend mock, dan pengujian. Dokumentasikan dua terminal jika tidak ada runner gabungan; jangan mengasumsikan dependency atau perintah yang belum dibuat.

Sertakan petunjuk alamat halaman harness, port backend, proxy, cara memilih failure mode, reset save, dan langkah memainkan hari 1–20. Sebutkan mock bukan backend produksi dan UI ini bukan UI final. Jika harness ditambahkan ke aplikasi produk, batasi akses/bundling melalui entry atau konfigurasi development yang eksplisit.

### Pemeriksaan harness

- Jalankan frontend dan mock server; verifikasi health serta request event sukses melalui HTTP sebenarnya.
- Jalankan alur normal memakai event dari mock sampai hasil akhir.
- Matikan server dan buktikan fallback tetap dapat dimainkan.
- Uji delay, HTTP 500, JSON invalid, schema/ID salah, dan respons terlambat setelah fallback.
- Uji refresh pada event, laporan, serta reward tanpa duplikasi biaya/damage/bonus.
- Uji klik ganda, reset run saat request berjalan, dan load save invalid.
- Buat pengujian otomatis untuk adapter/fallback dan validasi kontrak yang paling berisiko. Gunakan runner yang tersedia; tidak wajib menambah framework E2E hanya untuk ini.
- Bedakan pemeriksaan otomatis dan pemeriksaan manual yang benar-benar dijalankan dalam laporan akhir.

## Kriteria selesai dan laporan akhir

- Modul TypeScript terhubung dengan pola aplikasi, bukan kumpulan contoh terpisah.
- Mock frontend dan backend HTTP bisa dijalankan bersama untuk menguji engine; fallback tetap bekerja ketika backend gagal.
- Kontrak untuk Developer 2 dan 3 terdokumentasi dengan contoh pemanggilan singkat.
- Tidak ada fitur di luar lingkup atau modifikasi tidak terkait.
- Typecheck, test dan lint yang tersedia dijalankan; build dijalankan jika perubahan memengaruhi aplikasi terintegrasi.
- Laporkan file yang berubah, kontrak integrasi, hasil pemeriksaan aktual, dan kendala yang tersisa.
- Catat default baru: tiga jalur upgrade (tembok/pasukan/kota), tanpa rekrutmen unit, dan diskon berlaku ke ketiga biaya upgrade. Jangan menyatakan seluruh PRD lama sudah sinkron jika dokumennya belum diperbarui.

## Agent skills

### Issue tracker

Spesifikasi dan tiket disimpan sebagai Markdown lokal di `.scratch/`. Lihat `docs/agents/issue-tracker.md`.

### Triage labels

Gunakan lima status bawaan. Lihat `docs/agents/triage-labels.md`.

### Domain docs

Gunakan satu konteks proyek. Lihat `docs/agents/domain.md`.
