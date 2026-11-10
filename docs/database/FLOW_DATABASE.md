# Alur proses database

Dokumen ini menjelaskan rancangan penyimpanan untuk game single-player. Nama koleksi mengikuti [schema_new.completed.drawio](schema_new.completed.drawio). Detail field ada di [Database_proposal.md](Database_proposal.md). Diagram yang dapat diedit: [database_flow.drawio](database_flow.drawio).

> **Catatan:** beberapa langkah di bawah masih menyebut hari event tetap 3/7/13/17 dan `version: 3`. Engine aktif memakai `eventPlan` per run dan `version: 4` — lihat [`../game-engine/README.md`](../game-engine/README.md). Sesuaikan alur create-run saat mengimplementasikan persistensi.

Alur ini adalah rancangan integrasi Next.js, mesin permainan, dan MongoDB. Status implementasi backend aktual ada di `app/docs/` (bukan diasumsikan dari teks historis “belum diimplementasikan” saja). Tidak ada seeding data dalam dokumen ini.

## 1. Mulai baru atau lanjutkan permainan

```mermaid
flowchart TD
    A[Pengguna masuk atau membuka permainan] --> B{Sesi pengguna sah?}
    B -->|Tidak| C[Tampilkan permintaan masuk atau pesan akses ditolak]
    B -->|Ya| D{Pilih permainan baru atau lanjutkan?}
    D -->|Baru| E{Ada save aktif?}
    E -->|Ya| F[Minta konfirmasi mengganti slot lanjut]
    F -->|Batal| G[Pertahankan save sebelumnya]
    F -->|Setuju| H[Mesin membuat state awal dan runId baru]
    E -->|Tidak| H
    H --> POOL[Cari event_data yang cocok untuk hari 3, 7, 13, 17]
    POOL -->|Katalog cukup| READY[Gunakan event katalog yang sudah tervalidasi]
    POOL -->|Konten kurang| AI[Minta AI membuat narasi untuk paket yang kurang]
    AI --> VALID{Struktur, ID dan isi narasi valid?}
    VALID -->|Ya| CATALOG[Simpan konten AI tervalidasi ke event_data]
    CATALOG --> READY
    VALID -->|Gagal atau timeout| FALLBACK[Gunakan narasi cadangan dari paket yang sama]
    READY --> I[Transaksi: buat game_runs version 3, delapan properties awal, empat runs_event dan pointer save User]
    FALLBACK --> CATALOG_F[Simpan atau gunakan fallback terpercaya di event_data]
    CATALOG_F --> READY
    I --> J{Commit berhasil?}
    J -->|Tidak| K[Batalkan transaksi dan tampilkan gagal menyimpan]
    J -->|Ya| L[Tampilkan permainan; kalender menunggu input]
    D -->|Lanjutkan| M[Baca User.saveGame]
    M --> N{Ada penunjuk save?}
    N -->|Tidak| O[Tampilkan belum ada permainan tersimpan]
    N -->|Ya| P[Periksa pemilik dan baca game_runs.state serta properties revisi yang sama]
    P --> Q{Versi, revisi, dan data konsisten?}
    Q -->|Tidak| R[Tampilkan masalah save; jangan hapus atau gabungkan data diam-diam]
    Q -->|Ya| S[Baca laporan atau event tersimpan bila diperlukan]
    S --> L
```

Delapan properties awal memiliki revision 0 dan gameActionId null. Pembuatan run bukan aksi gameplay yang menambah revisi. User.saveGame hanya menunjuk run dan revisi; state lengkap tetap di game_runs.

Saat lanjut permainan, backend tidak menjalankan ulang pemasukan, pertempuran, efek kejadian atau reward. Kalender otomatis milik frontend juga tidak boleh langsung berjalan setelah load.

## 2. Tindakan pemain sampai berhasil tersimpan

```mermaid
flowchart TD
    A[Pemain memilih tindakan: upgrade, repair, lanjut hari, pilihan event atau battle] --> B[Kirim gameRunId, actionId, expectedRevision dan rincian pilihan]
    B --> C[Backend memeriksa JWT dan hak akses]
    C --> D{Akses sah?}
    D -->|Tidak| E[Tolak tanpa mengubah data]
    D -->|Ya| F[Mulai transaksi; baca game_runs dan log actionId pada run tersebut]
    F --> G{actionId sudah berhasil dicatat?}
    G -->|Ya| H[Batalkan transaksi; kembalikan status duplikat dan muat state terkini]
    G -->|Tidak| I{expectedRevision cocok?}
    I -->|Tidak| J[Batalkan transaksi; minta antarmuka memuat state terbaru]
    I -->|Ya| K[Mesin memeriksa fase, hari, biaya dan aturan; hitung state baru]
    K --> L{Aksi sah dan mengubah state?}
    L -->|Gagal atau tanpa perubahan| M[Tidak menambah log atau revisi; batalkan transaksi dan kirim hasil]
    L -->|Ya| N[Tulis game_runs.state dengan filter revisi lama; tambah satu game_actions]
    N --> O[Tambah delapan game_properties yang merujuk log tersebut dan revisi hasilnya]
    O --> P[Perbarui data terkait: runs_event, game_report dan penunjuk save atau history User]
    P --> Q{Seluruh penulisan dan commit berhasil?}
    Q -->|Tidak| R[Batalkan seluruh transaksi; jangan tampilkan sukses]
    Q -->|Ya| S[Kirim state tersimpan ke antarmuka]
```

Pada setiap aksi yang berhasil mengubah state, mesin menaikkan revision tepat satu kali. Backend tidak menambahkan revisi kedua. game_properties berisi delapan nilai: gold, cityHp, cityMaxHp, wallLevel, troopLevel, cityLevel, attack, dan defense. Semuanya berasal dari hasil mesin dan selector pada revisi yang sama.

MongoDB memerlukan replica set atau deployment yang mendukung transaksi beberapa dokumen untuk alur ini. Konflik penulisan dapat mengharuskan transaksi dicoba ulang, tetapi expectedRevision dan actionId asal tetap diperiksa. Backend tidak boleh mengubah permintaan lama menjadi aksi baru secara otomatis.

## 3. Pilihan kejadian yang mengubah statistik kota

```mermaid
flowchart TD
    A[Hari kejadian; game_runs berada pada fase event] --> B[Baca runs_event yang dibuat saat Mulai Game]
    B --> C[Cocokkan paket event_data, hari dan status belum selesai]
    C --> D[Aktifkan narasi tersimpan ke state.activeEvent secara atomik]
    D --> E[Tampilkan dua pilihan]
    E --> F[Pemain memilih satu ID opsi]
    F --> G[Jalankan jalur transaksi aksi dengan type chooseEventOption]
    G --> H{Pilihan aktif, belum selesai dan biaya cukup?}
    H -->|Tidak| I[Tolak; emas dan statistik tetap]
    H -->|Ya| J[Mesin menerapkan biaya dan efek ke state baru]
    J --> K[Perbarui game_runs.state; tambahkan game_actions]
    K --> L[Tambah delapan game_properties dengan gameActionId log tadi]
    L --> M[Isi chosenChoiceId dan resolvedAt pada runs_event; perbarui save User]
    M --> N{HP kota nol?}
    N -->|Ya| O[State gameOver; tambahkan history sekali dan bersihkan save run terkait]
    N -->|Tidak| P[Kembali preparation pada hari yang sama]
    O --> Q[Commit semua perubahan; baru kirim hasil]
    P --> Q
```

Hubungan runs_event tetap ke game_runs melalui gameRunId. Untuk mengetahui perubahan stat akibat pilihan, ikuti game_actions bertipe chooseEventOption, kemudian game_properties melalui gameActionId. Tidak diperlukan referensi langsung dari runs_event ke setiap baris properties.

Narasi yang dibuat saat Mulai Game belum menerapkan efek. Pemasangan narasi yang mengubah state tetap memakai pemeriksaan revisi dan dicatat sebagai aksi attachActiveEvent beserta snapshot statistik. Respons terlambat harus diabaikan jika run sudah berganti, event selesai atau narasi cadangan sudah dipilih. Jika commit gagal pada langkah mana pun, seluruh perubahan terkait dibatalkan.

Pilihan event tidak memakai jatah aksi ekonomi dan tidak memberikan pemasukan hari itu lagi. Bonus pertahanan atau diskon tersimpan di effects pada state lengkap agar durasinya tetap benar.

## 4. Pertempuran, laporan, reward, dan akhir permainan

```mermaid
flowchart TD
    A[Hari 10 atau 20; fase battleReady] --> B[Pemain menekan Mulai battle]
    B --> C[Jalur transaksi startBattle memeriksa aksi dan progres wave]
    C --> D[Mesin menghitung semua ronde sekali dengan damage bersamaan]
    D --> E[Simpan state, satu log aksi dan delapan properties]
    E --> F[Buat game_report berisi battleResult dan postAttack]
    F --> G{Kota masih hidup dan monster kalah?}
    G -->|Tidak| H[Fase gameOver; history sekali; kosongkan save jika menunjuk run ini]
    G -->|Ya| I[Fase battleReport; simpan pointer lanjut]
    H --> J[Commit; tampilkan hasil tersimpan]
    I --> J
    J --> K{Pemain menang dan melanjutkan laporan?}
    K -->|Tidak| L[Tetap pada laporan tersimpan atau layar kalah]
    K -->|Ya| M{Wave pertama?}
    M -->|Ya| N[Aksi lanjut laporan membuka reward]
    N --> O[Pemain memilih satu reward]
    O --> P[Transaksi: terapkan reward lalu masuk hari 11; pemasukan dihitung sekali]
    M -->|Tidak, wave kedua| Q[Aksi lanjut laporan membuka victory; catat history dan bersihkan save terkait]
```

Setiap aksi setelah laporan juga mengikuti transaksi pada alur nomor 2. game_report tetap menjadi catatan saat battle selesai; reward dan progres berikutnya tidak menimpa postAttack.

Kota HP nol selalu kalah, termasuk ketika monster juga nol pada ronde yang sama. Indeks unik `gameRunId` dan `wave` mencegah laporan wave yang sama ditulis dua kali, tanpa membatasi jumlah wave di sepanjang run (schema siap ~100 hari). Backend tetap memeriksa log dan revisi. Membaca laporan setelah refresh tidak menerapkan damage lagi. Outcome event tidak memakai `game_report` — dicatat di `runs_event` plus `game_actions`/`game_properties`.

## 5. Koneksi terputus atau pengguna keluar akun

| Keadaan | Yang dilakukan aplikasi |
|---|---|
| Pengguna keluar akun setelah save berhasil | Client buang JWT; simpan tetap ada di database |
| Koneksi terputus sebelum transaksi selesai | Jangan menganggap aksi berhasil; periksa hasil server ketika tersambung |
| Transaksi sudah commit tetapi respons tidak sampai | Muat state terbaru atau periksa actionId yang sama; jangan memotong biaya lagi |
| Permintaan dicoba ulang dan actionId sudah tercatat | Tanggapi sebagai duplikat; jangan menjalankan aksi dua kali |
| Transaksi sudah dibatalkan | Tidak ada perubahan parsial; retry tetap memakai identitas permintaan asal |
| Save menunjuk revisi yang tidak cocok dengan state | Tampilkan masalah dan lakukan rekonsiliasi backend; jangan campur revisi properties |

Selesainya request jaringan di sisi browser tidak selalu membuktikan transaksi sudah commit. Karena itu server menjadi acuan hasil penyimpanan. Rancangan ini belum mencakup bermain offline penuh atau penambahan hari berdasarkan waktu saat pemain tidak aktif.

## 6. AI membuat event yang disimpan untuk dipakai ulang

```mermaid
flowchart TD
    A[User menekan Mulai Game] --> B[Periksa JWT dan startRequestId]
    B --> C{Run permintaan yang sama sudah tersimpan?}
    C -->|Ya| D[Kembalikan run dan referensi event yang sama]
    C -->|Tidak| E[Cari event_data sesuai ruleset, paket dan hari]
    E --> F{Konten untuk empat jadwal tersedia?}
    F -->|Ya| G[Pilih event katalog yang sudah tervalidasi]
    F -->|Belum| H[AI membuat narasi untuk paket yang kurang di luar transaksi run]
    H --> I{Respons valid dan tepat waktu?}
    I -->|Ya| J[Gabungkan narasi dengan biaya dan efek terpercaya]
    I -->|Tidak| K[Pilih katalog lama yang cocok atau fallback terpercaya]
    J --> L[Simpan variasi konten baru di event_data]
    K --> L
    L --> G
    G --> M[Periksa lagi permintaan dan konteks penggantian save]
    M --> N[Transaksi: game_runs version 3, delapan properties awal, empat runs_event dan save User]
    N --> O{Commit berhasil?}
    O -->|Tidak| P[Batalkan perubahan run; katalog valid boleh tetap tersedia]
    O -->|Ya| Q[Mulai hari 1; event dipakai sesuai hari terjadwal]
```

### Perbedaan kedua koleksi

| Koleksi | Isi dan pemilik data |
|---|---|
| event_data | Cerita, label pilihan, biaya/efek terpercaya, paket, hari dan asal konten. Katalog bersama yang dapat digunakan banyak pemain |
| runs_event | Hubungan antara gameRunId dan eventDataId, salinan narasi saat dipilih, pilihan pengguna dan waktu penyelesaian. Bersifat per sesi permainan |

Satu dokumen event_data dapat dirujuk banyak runs_event. Mengambil pilihan hanya mengubah progres pemain terkait; tidak mengubah katalog bersama. Efek tidak diterapkan saat AI selesai menulis atau saat event disimpan.

### Urutan penyimpanan

1. Baca paket biaya/efek yang dipercaya dari konfigurasi engine dan cari katalog yang sesuai. Katalog bukan sumber angka AI arbitrer.
2. Jika konten kurang, minta AI membuat narasi, validasi struktur/ID/teks, gabungkan dengan paket terpercaya, lalu simpan ke event_data. Jangan memegang transaksi run selama request AI.
3. Pilih empat event katalog, satu untuk setiap jadwal hari 3, 7, 13, 17. AI tidak harus dipanggil pada setiap permainan jika katalog sudah cukup; generasi baru dapat memperbanyak variasi yang dapat dipakai ulang.
4. Dalam transaksi awal, buat game_runs (`version: 3`) revision 0, delapan properties awal dan empat runs_event yang merujuk eventDataId terpilih, lalu perbarui User.saveGame. Setiap runs_event awal memiliki chosenChoiceId/resolvedAt null. activeEvent hari pertama tetap null.
5. Jika transaksi awal gagal, save lama tetap utuh. Katalog valid yang sudah tersimpan boleh tetap ada untuk permainan lain. Jika permintaan Mulai Game diulang setelah sukses, kembalikan run/event yang sama.

### Validasi, indeks dan reuse

Narasi bersama harus umum, tanpa data pribadi atau klaim keadaan spesifik pemain. Cocokkan ruleset, packageId dan day sebelum dipakai. source bernilai ai/mock/fallback; reuse konten AI tetap source ai. Salinan narrative pada runs_event membekukan yang benar-benar diterima pemain; jangan menimpanya dengan generasi baru.

Satu paket dapat memiliki banyak variasi: gunakan _id event_data yang unik per cerita. packageId boleh berulang pada beberapa dokumen katalog, sehingga indeks gameRulesetId + packageId + day adalah indeks pencarian, bukan unique. Unique gameRunId + eventId tetap dibutuhkan pada runs_event. Unique userId + startRequestId diperlukan untuk permintaan Mulai Game.

ID pilihan, batas panjang teks dan efek diverifikasi backend. Respons terlambat setelah fallback atau pergantian run harus diabaikan untuk run tersebut. Refresh/load hanya membaca narasi yang sudah ditautkan. Pilihan efek tetap dijalankan melalui chooseEventOption dan transaksi aksi pada diagram sebelumnya.

Semua ini masih rancangan. Kontrak engine ActiveEvent.source perlu diperluas untuk ai; backend AI, indeks katalog dan persistence belum diimplementasikan.

## 7. Register, login dan logout dengan username/password

```mermaid
flowchart TD
    A[Buka aplikasi] --> B{Sudah punya akun?}
    B -->|Belum| C[Isi username, password dan konfirmasi password]
    C --> D[Backend validasi formulir; normalisasi username]
    D --> E{Input valid dan konfirmasi cocok?}
    E -->|Tidak| F[Tampilkan kesalahan; jangan membuat akun]
    E -->|Ya| G[Hash password dengan bcrypt]
    G --> H[Insert User dengan username unique, passwordHash, history kosong dan save null]
    H --> I{Akun berhasil disimpan?}
    I -->|Nama duplikat atau gagal| J[Tampilkan kesalahan; jangan menimpa akun lama]
    I -->|Ya| K[Buka halaman login]
    B -->|Sudah| K
    K --> L[Isi username dan password]
    L --> M[Normalisasi username; cari User; bcrypt.compare passwordHash]
    M --> N{Kredensial cocok?}
    N -->|Tidak| O[Pesan umum username atau password tidak sesuai; tanpa JWT]
    N -->|Ya| P[Terbitkan JWT via jsonwebtoken; perbarui lastLoginAt dan updatedAt]
    P --> Q[Tampilkan username dan pilihan Mulai Game atau Lanjutkan]
    Q --> R{Pengguna memilih logout?}
    R -->|Ya| S[Client buang JWT; data User dan save tetap ada]
    S --> K
```

Nama pengguna adalah identitas masuk sekaligus nama tampilan. Email, authSubject dan displayName tidak digunakan. Backend menyimpan username yang sudah dinormalisasi dan memberi indeks unik. Password asli tidak masuk database atau log.

Akun belum pernah login memiliki `lastLoginAt` null. JWT memuat `User._id`; setiap endpoint game memeriksa kepemilikan run. Login tidak mengubah revision permainan. Secret JWT dan masa berlaku diatur saat implementasi; bagian ini bukan klaim fitur login sudah berfungsi.
