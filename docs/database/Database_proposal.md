# Penjelasan database Fantasy City Defense

Kami merancang database game ini menggunakan MongoDB. Permainannya single-player dan berlangsung selama 20 hari, dengan serangan monster pada hari ke-10 dan ke-20.

Data yang perlu kami simpan mulai dari identitas pemain sampai kondisi kota setelah diserang. Ada delapan koleksi yang kami gunakan dalam rancangan ini: User, game_ruleset, game_runs, game_actions, runs_event, game_properties, game_report, dan event_data. Di MongoDB, istilah koleksi bisa dipahami sebagai tempat mengelompokkan data sejenis, mirip tabel pada database relasional.

Referensi: [diagram draw.io](schema_new.completed.drawio) dan [dokumentasi folder](README.md).

## Istilah yang digunakan

Nama koleksi dan field tetap memakai bahasa yang tertulis pada diagram. Penjelasannya menggunakan bahasa Indonesia agar mudah dibaca bersama kode.

| Istilah pada diagram/kode | Arti dalam pembahasan ini |
|---|---|
| collection / document | Koleksi adalah kelompok data sejenis; dokumen adalah satu data di dalam koleksi |
| run | Satu sesi permainan, sejak mulai baru sampai selesai atau ditinggalkan |
| state | Kondisi permainan lengkap pada suatu saat |
| snapshot | Salinan kondisi atau nilai pada satu revisi tertentu |
| revision | Nomor urut perubahan kondisi permainan yang berhasil |
| version | Versi format penyimpanan; berbeda dengan nomor revisi |
| action | Tindakan yang dikirim pemain atau antarmuka, misalnya upgrade atau memilih opsi kejadian |
| event | Kejadian terjadwal yang menawarkan dua pilihan |
| packageId | Identitas paket pilihan, biaya, dan efek yang dikenali mesin permainan |
| properties / stats | Nilai statistik, seperti emas, HP, level, serangan, dan pertahanan |
| wave | Gelombang serangan monster, yaitu pada hari ke-10 dan ke-20 |
| payload | Rincian perintah, misalnya ID pilihan; tidak memuat harga atau damage yang dipercaya dari pemain |
| commit | Penyelesaian transaksi sehingga seluruh perubahan resmi tersimpan |
| rollback | Pembatalan semua perubahan dalam transaksi yang gagal |
| null | Nilai sengaja belum tersedia, misalnya permainan belum selesai |
| PK / REF | Identitas unik dokumen / referensi ke identitas dokumen lain |

Rancangan ini menggunakan Next.js untuk tampilan dan endpoint backend, MongoDB untuk penyimpanan, serta mesin TypeScript yang sudah ada untuk aturan permainan. Pembagian ini adalah rancangan integrasi, bukan klaim bahwa penyimpanannya sudah berjalan.

## 1. User: data pemain dan permainan yang dapat dilanjutkan

Di User, kami menyimpan identitas pemain, riwayat permainan yang selesai, dan referensi save aktif.

| Field | Fungsi |
|---|---|
| `_id` | Identitas unik pengguna |
| `username` | Nama untuk daftar, masuk, dan ditampilkan di game; wajib dan unik |
| `passwordHash` | Hasil hashing password dengan bcrypt di backend; bukan password asli dan tidak dikirim ke browser |
| `createdAt` | Waktu akun dibuat |
| `updatedAt` | Waktu data akun terakhir diubah |
| `lastLoginAt` | Waktu login terakhir berhasil, atau null jika belum pernah login |
| `gameHistory` | Ringkasan permainan yang sudah selesai |
| `saveGame` | Penunjuk permainan yang dapat dilanjutkan |

Setiap entri gameHistory berisi runId, hasil victory atau gameOver, dan endedAt. Backend perlu memastikan permainan yang sama hanya masuk satu kali ke riwayat.

saveGame berisi runId, savedRevision, dan savedAt. Jika pemain belum punya save aktif, nilainya null. Saat pemain menekan Lanjutkan, runId inilah yang dipakai untuk mencari progres lengkap di game_runs.state.

Dengan pembagian ini, data pada user cukup untuk menjawab dua hal: permainan apa saja yang sudah selesai dan permainan mana yang ingin dilanjutkan.

### Register: membuat akun baru

Pemain mengisi username, password, dan konfirmasi password. Username juga digunakan sebagai nama yang ditampilkan, sehingga tidak diperlukan email atau displayName terpisah. Konfirmasi password hanya untuk pemeriksaan formulir dan tidak disimpan.

Backend memeriksa isi formulir, menyamakan konfirmasi password, lalu menormalisasi username dengan trim dan huruf kecil. Rancangan aturan username: 3 sampai 30 karakter, berisi huruf a–z, angka, atau garis bawah. Contohnya, Andi_01 dan andi_01 dianggap username yang sama. Aturan ini harus konsisten saat register dan login.

Buat indeks unique pada User.username. Pengecekan nama sebelum insert membantu pesan formulir, tetapi indeks unik tetap diperlukan untuk menangani dua pendaftaran bersamaan. Username yang sudah terpakai ditolak; backend tidak mengganti akun atau save pengguna lama.

Backend mengolah password dengan pustaka `bcrypt` (salt otomatis dari pustaka), lalu menyimpan hasilnya sebagai passwordHash. Jangan menyimpan password asli, konfirmasi password, atau mencatatnya ke log. Jangan memakai hashing umum seperti SHA-256 saja untuk password. Cost factor bcrypt mengikuti panduan keamanan dan kemampuan server.

Akun baru berisi _id, username, passwordHash, createdAt, updatedAt, lastLoginAt: null, gameHistory: [], dan saveGame: null. Penyimpanan username/passwordHash menggantikan rancangan authSubject sebelumnya; tidak memerlukan akun layanan autentikasi eksternal. Sesudah berhasil daftar, pengguna diarahkan ke halaman login.

### Login: masuk ke akun yang sama

Pemain memasukkan username dan password. Backend menormalisasi username dengan aturan yang sama, mengambil akun berdasarkan username, lalu memverifikasi password terhadap passwordHash dengan `bcrypt.compare`. Hash tidak didekripsi dan tidak dibandingkan dengan password sebagai teks biasa.

Jika akun tidak ditemukan atau password salah, kembalikan pesan umum seperti “Username atau password tidak sesuai” dan jangan menerbitkan token. Jika berhasil, buat JWT dengan pustaka `jsonwebtoken` (payload minimal berisi User._id) lalu perbarui lastLoginAt serta updatedAt. Identitas akun pada token berasal dari User._id, bukan hanya username.

Client menyimpan JWT (misalnya di memori atau penyimpanan aman yang disepakati FE/BE) dan mengirimkannya di header `Authorization: Bearer <token>` pada request terlindungi. PasswordHash tidak dikirim dalam respons profil. Endpoint perlu membatasi percobaan login/register; secret JWT, masa berlaku (`expiresIn`), dan cara menyimpan token di client perlu diatur saat implementasi. Koleksi sesi server-side atau denylist token belum dirinci pada diagram ini.

Setelah login, aplikasi menampilkan username. Jika User.saveGame ada, pemain dapat menekan Lanjutkan untuk membuka game_runs miliknya. Login tidak memulai run baru, memanggil AI ulang, atau menerapkan upgrade lagi. Setelah logout, client membuang JWT; akun, katalog event dan progres yang tersimpan tetap ada. Untuk masuk kembali, pemain memakai username dan password yang sama.

Panduan penyimpanan password: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Bagian ini merupakan rancangan autentikasi; formulir register/login, bcrypt, JWT (`jsonwebtoken`), indeks unik dan endpoint Next.js belum diimplementasikan.

## 2. game_ruleset: versi aturan permainan

Kami memisahkan aturan game ke game_ruleset. Isinya mencakup biaya upgrade, statistik monster, efek event, dan pilihan reward.

| Field | Fungsi |
|---|---|
| `_id` | Identitas versi aturan |
| `engineVersion` | Versi atau commit engine yang kompatibel |
| `config` | Aturan kota, biaya, wave monster, paket event, dan reward |
| `createdAt` | Waktu aturan dipublikasikan |

Misalnya, tim mengubah pemasukan gold pada versi berikutnya. Permainan yang sudah berjalan tetap punya referensi ke versi aturan sebelumnya, sehingga kami tahu aturan mana yang digunakan saat run itu dibuat.

Ruleset yang sudah dipublikasikan perlu dijaga agar tidak berubah. Kalau ada perubahan balancing, kami membuat dokumen baru. Backend dan hak akses database yang akan menegakkan aturan ini; validator hanya memeriksa isi dokumennya.

Saat ini engine belum otomatis membaca ruleset dari database. Kami masih perlu membuat penghubungnya dan memastikan versi kode engine sesuai dengan aturan yang dipilih.

## 3. game_runs: penyimpanan lengkap satu sesi permainan

Setiap kali pemain memulai permainan baru, kami membuat satu game_runs. Dokumen ini menyimpan progres dari awal sampai permainan berakhir.

| Field | Fungsi |
|---|---|
| `_id` | Identitas sesi permainan, sama dengan `state.runId` |
| `userId` | Referensi wajib ke User._id pemilik permainan |
| `rulesetId` | Referensi aturan yang digunakan |
| `startRequestId` | Identitas permintaan Mulai Game yang tetap sama saat retry; unik bersama userId |
| `state` | Kondisi lengkap permainan |
| `createdAt` | Waktu permainan dibuat |
| `updatedAt` | Waktu progres terakhir disimpan |
| `endedAt` | Waktu permainan selesai, atau null jika belum selesai |

Bagian state berisi kondisi lengkap yang dibutuhkan untuk melanjutkan permainan:

| Kelompok | Data |
|---|---|
| Identitas | `version`, `revision`, `runId` |
| Kalender | `day`, `phase` |
| Kota dan ekonomi | `gold`, `cityHp`, `cityMaxHp`, `upgradeLevel` |
| Aksi dan pemasukan | `actionUsedToday`, `incomeGrantedDays` |
| Event | `activeEvent`, `completedEventIds` |
| Efek | `effects` |
| Progres battle dan reward | `wavesCleared`, `battleResult`, `rewardChosenId` |

Kami menyimpan data tersebut bersama dalam satu dokumen karena biasanya dibaca dan diperbarui bersamaan. Dalam MongoDB, cara ini disebut embedding.

Ada dua penanda yang perlu dibedakan. version menunjukkan format save yang digunakan, saat ini version: 2. revision menunjukkan berapa kali state sudah berubah. Jadi, keduanya memiliki fungsi yang berbeda.

Attack dan defense efektif dihitung engine dari aturan dasar, level upgrade, dan efek aktif. Hasil perhitungan ini tidak perlu menjadi total terpisah yang terus diperbarui. Untuk laporan battle, kami tetap menyimpan statistik saat serangan berlangsung agar hasilnya bisa dijelaskan kembali.

Saat pemain melanjutkan game, aplikasi membaca state yang tersimpan. Pemasukan gold dan damage yang sudah diterapkan tidak dihitung ulang.

## 4. game_actions: catatan tindakan pemain dan pencegahan klik ganda

game_actions mencatat aksi yang berhasil mengubah permainan. Contohnya upgrade, perbaikan kota, lanjut hari, mulai battle, atau memilih reward.

| Field | Fungsi |
|---|---|
| `_id` | Identitas dokumen log |
| `runId` | Referensi permainan |
| `actionId` | Identitas perintah yang tetap sama ketika dikirim ulang |
| `revisionBefore` | Revisi sebelum aksi |
| `revisionAfter` | Revisi sesudah aksi, harus sebelum +1 |
| `type` | Jenis aksi engine |
| `payload` | Data perintah, misalnya ID pilihan |
| `createdAt` | Waktu aksi dicatat |

Misalnya, pemain menekan tombol upgrade dua kali karena respons pertama belum muncul. Kedua permintaan perlu dikenali supaya saldo tidak terpotong dua kali. Untuk itu kami memakai actionId dan revision.

Jika upgrade pertama berhasil, revisi bisa berubah dari 8 menjadi 9. Permintaan lain yang masih membawa revisi 8 ditolak karena berasal dari tampilan lama. Kalau actionId yang sama dikirim ulang setelah sukses, backend juga menolaknya tanpa membeli upgrade lagi.

Kami menambahkan indeks unik pada pasangan runId dan actionId, serta runId dan revisionAfter. Pemeriksaan backend dan transaksi tetap dibutuhkan agar penulisan datanya konsisten.

Catatan ini membantu kami menelusuri aksi pemain dan memeriksa duplikasi. Progres untuk melanjutkan permainan tetap diambil dari game_runs.state, bukan dibangun ulang dari log. Aksi gagal atau aksi yang tidak mengubah state tidak menambah log sukses maupun revision.

## 5. game_properties: catatan nilai statistik setelah tindakan

Setelah game_actions, kami menyimpan rincian statnya di game_properties. Hubungannya one-to-many: satu aksi mempunyai beberapa dokumen properties. Pada prototipe ini, setiap aksi yang mengubah state menyimpan enam stat, yaitu gold, cityHp, cityMaxHp, upgradeLevel, attack, dan defense.

| Field | Arti | Contoh ilustrasi |
|---|---|---|
| _id | Identitas unik satu catatan statistik | prop-level-001 |
| runId | Sesi permainan pemilik statistik | run-001 |
| gameActionId | Referensi ke _id dokumen game_actions yang menghasilkan nilai ini | log-001 |
| revision | Nomor perubahan saat nilai dicatat | 1 |
| statKey | Nama statistik yang dicatat | upgradeLevel |
| statValue | Nilai statistik setelah tindakan berhasil | 1 |
| createdAt | Waktu catatan tersimpan | Waktu server |

Setiap dokumen berisi satu nilai statistik. gameActionId menunjuk _id pada game_actions. Misalnya, setelah upgrade, satu properties mencatat level baru dan properties lain mencatat attack yang baru, semuanya berasal dari aksi dan revisi yang sama.

Data lama tetap disimpan sebagai riwayat. Backend menulis satu log aksi, enam stat, state terbaru, dan penunjuk save dalam satu transaksi. Indeks unik runId, revision, dan statKey membantu mencegah baris stat ganda. Untuk permainan baru, enam stat awal memakai revision 0 dan gameActionId null karena belum ada aksi pemain.

Ketika pemain logout atau koneksinya terputus, stat yang sudah berhasil disimpan tetap ada di database. Saat login kembali, backend mencari save milik user tersebut dan mengambil snapshot stat pada revisi yang sama. Logout tidak menghapus save. Kalau request upgrade belum tersimpan, kami tidak menganggap upgrade berhasil dan memeriksa actionId saat request dikirim ulang.

Save lengkap tetap berada di game_runs.state karena untuk melanjutkan game kami juga membutuhkan informasi fase, event, efek, pemasukan, dan battle. Attack dan defense pada properties merupakan catatan hasil perhitungan engine saat itu. Kami tidak mengambil angka dari revisi yang berbeda atau menerapkan upgrade lagi ketika memuat save. Penambahan koleksi ini belum menyediakan permainan offline penuh.

## 6. runs_event: kejadian yang dialami pemain

Saat Mulai Game, backend memilih empat event dari katalog event_data. Jika katalog yang sesuai belum tersedia, AI membuat narasi dan backend menyimpan hasil valid ke event_data agar dapat dipakai pemain lain. runs_event hanya menghubungkan event yang dipilih dengan sesi pemain dan mencatat pilihan pemain tersebut. Cerita ditampilkan pada hari 3, 7, 13, dan 17.

| Field | Fungsi |
|---|---|
| `_id` | Identitas dokumen event |
| `runId` | Referensi permainan |
| `eventId` | Identitas event dalam run |
| `packageId` | Identitas paket efek terpercaya |
| `eventDataId` | Referensi katalog event_data yang digunakan |
| `day` | Hari event: 3, 7, 13, atau 17 |
| `narrative` | Judul, deskripsi, dan dua label pilihan beserta ID |
| `source` | Sumber narasi: ai, mock pengujian, atau fallback |
| `chosenChoiceId` | Pilihan pemain, atau null jika belum dipilih |
| `createdAt` | Waktu narasi disimpan |
| `resolvedAt` | Waktu pilihan selesai, atau null jika belum selesai |

AI atau mock hanya menyuplai cerita dan label pilihan. Biaya serta efeknya mengikuti paket aturan yang sudah ditentukan tim. Dengan begitu, narasi tidak bisa tiba-tiba menambahkan bonus atau mekanik baru.

Setiap pasangan runId dan eventId dibuat unik. Jika respons jaringan datang terlambat setelah fallback dipilih, backend tidak boleh mengganti narasi yang sudah digunakan pemain.

## 7. game_report: laporan hasil pertempuran

Setelah battle selesai, kami menyimpan laporannya di game_report. Laporan tetap dibuat saat pemain kalah.

| Field | Arti |
|---|---|
| _id | Identitas unik laporan |
| runId | Sesi permainan yang mengalami pertempuran |
| wave | Gelombang pertama atau kedua |
| day | Hari pertempuran, 10 atau 20 |
| actionId | Identitas permintaan mulai pertempuran; dicocokkan dengan runId pada log aksi |
| sourceRevision | Nomor revisi hasil penyelesaian pertempuran |
| battleResult | Hasil menang/kalah, statistik, HP sebelum/sesudah, dan catatan setiap ronde |
| postAttack | Kondisi kota sesudah serangan selesai dan efek gelombang dibersihkan |
| createdAt | Waktu laporan disimpan |

Perhatikan bahwa game_report.actionId menunjuk identitas permintaan, sedangkan game_properties.gameActionId menunjuk _id dokumen log. Keduanya harus diperiksa backend bersama sesi permainan yang sesuai.

battleResult menyimpan hasil pertempuran beserta log ronde. postAttack menyimpan kondisi setelah battle, yaitu HP kota, gold, level upgrade, fase, progres wave, dan efek yang tersisa. Snapshot ini diambil sebelum pemain memilih reward.

Laporan tersebut tetap menyimpan kondisi saat battle selesai, walaupun pemain sudah lanjut ke hari berikutnya. Saat refresh, aplikasi cukup membaca hasilnya. Kota tidak menerima damage untuk kedua kalinya.

Kami memakai indeks unik pada pasangan runId dan wave supaya satu wave hanya mempunyai satu laporan dalam run tersebut.

## 8. event_data: daftar kejadian dan aturan pilihan

| Field | Arti |
|---|---|
| _id | Identitas dokumen katalog kejadian |
| rulesetId | Referensi versi aturan yang memuat kejadian |
| packageId | ID paket pilihan dan efek yang dikenali mesin permainan |
| day | Hari kejadian ditampilkan |
| title | Judul bawaan kejadian |
| description | Narasi bawaan yang sudah disetujui |
| choices | Dua pilihan, masing-masing berisi id, label, goldCost dan effects |
| createdAt | Waktu paket dicatat |
| source | Asal konten katalog: ai, mock, atau fallback |

event_data adalah perpustakaan event bersama. Isinya dapat berkembang menjadi banyak variasi cerita untuk empat jadwal hari. AI membuat judul, deskripsi, dan label; backend menggabungkannya dengan biaya serta efek dari paket mesin yang terpercaya. Setiap dokumen memiliki _id sendiri, rulesetId, packageId, day, choices, source, dan createdAt. Minimal satu pilihan gratis. Semua konten AI harus divalidasi sebelum masuk katalog yang dapat dipakai pemain lain.

runs_event menunjuk katalog tersebut melalui eventDataId. Satu event_data dapat dipakai banyak permainan. runs_event mencatat event katalog yang dipakai, salinan narasi yang ditampilkan, asal kontennya, serta pilihan dan waktu penyelesaian untuk satu run. Backend memeriksa ruleset, paket, dan hari agar sesuai. Katalog yang sudah dipublikasikan dijaga agar tetap, melalui role dan aturan backend.

### Mengapa ada eventDataId, packageId, dan eventId?

eventDataId adalah referensi dokumen event_data. packageId adalah identitas paket yang dikenal konfigurasi mesin, misalnya event-day-3. eventId mengenali kejadian itu pada satu sesi permainan. Pada prototipe nilainya bisa mirip, tetapi tugas field-nya berbeda. Kombinasi runId dan eventId membedakan kejadian hari ke-3 milik dua pemain.

Karena satu packageId sekarang dapat memiliki banyak variasi cerita untuk dipakai ulang, _id event_data harus berbeda dari packageId. packageId mengidentifikasi aturan, sedangkan _id mengidentifikasi satu variasi konten katalog. Begitu juga game_ruleset: masih ada pada diagram sebagai versi aturan, walaupun untuk prototipe satu konfigurasi koleksi ini belum wajib.

## Hubungan antar koleksi

| Hubungan | Kardinalitas |
|---|---|
| User ke game_runs | Satu user dapat memiliki banyak run; setiap run dimiliki satu user |
| game_ruleset ke game_runs | Satu ruleset dapat dipakai banyak run; setiap run memakai satu ruleset |
| game_runs ke game_actions | Satu run memiliki banyak catatan aksi |
| event_data ke runs_event | Satu paket event dapat digunakan banyak run |
| game_ruleset ke event_data | Satu ruleset dapat memiliki banyak variasi event untuk empat jadwal prototipe |
| game_runs ke runs_event | Satu run memiliki maksimal empat event terjadwal pada prototipe |
| User.saveGame ke game_runs | Satu user menunjuk maksimal satu save aktif |
| User.gameHistory ke game_runs | Setiap entri history menunjuk satu run selesai |
| game_actions ke game_properties | Satu action mempunyai banyak stat, enam pada prototipe ini |
| game_runs ke game_properties | Satu run mempunyai banyak snapshot stat dari berbagai revisi |
| game_runs ke game_report | Satu run mempunyai maksimal dua laporan, satu per wave resolved |

Hubungan ini memakai referensi ID bertipe string. Karena MongoDB tidak menyediakan foreign key seperti database relasional, kami menuliskan REF pada diagram. Backend perlu memeriksa apakah dokumen tujuan ada dan apakah run itu benar-benar milik pemain yang sedang mengaksesnya.

Penghapusan juga harus ditangani backend. Jika sebuah run dihapus, data terkait perlu dibersihkan bersama; tidak ada cascade otomatis pada rancangan MongoDB ini.

## Contoh alur pemain

1. Saat akun dibuat, gameHistory masih kosong dan saveGame bernilai null.
2. Pemain memulai permainan. Backend memeriksa startRequestId dan memilih event dari event_data yang cocok paket dan harinya. Untuk katalog yang kurang, backend meminta AI membuat narasi lalu menyimpan hasil valid ke event_data. Transaksi awal menyimpan game_runs, enam properties awal, empat penghubung runs_event dan pointer save User.
3. Pemain melakukan upgrade. Backend menjalankan aturan engine, kemudian menyimpan state, satu log aksi, enam properties baru yang merujuk log itu, dan informasi save bersama-sama. Menyimpan ulang state yang tidak berubah tidak menambah revision.
4. Jika koneksi terputus setelah penyimpanan selesai, pemain bisa memuat hasil yang sudah tersimpan. Backend memeriksa actionId jika request yang sama dikirim ulang.
5. Ketika battle selesai, game_report ikut disimpan dalam transaksi yang sama. Saat refresh, aplikasi membaca laporan tersebut tanpa menjalankan battle lagi.
6. Saat permainan berakhir, backend mencatat endedAt dan menambahkan ringkasan ke history satu kali. saveGame dikosongkan hanya jika masih menunjuk run yang selesai, supaya akhir run lama tidak menghapus save run lain.

Satu akun memiliki satu slot lanjut aktif. Jika pemain memilih mulai baru, UI meminta konfirmasi sebelum mengganti referensi save. Run lama tetap ada. Permainan yang ditinggalkan tidak otomatis dianggap menang atau kalah.

Saat memuat save, backend memeriksa pemiliknya terlebih dahulu. Proses load tidak menambah pemasukan, mengulang damage, atau memberikan event dan reward lagi.

## Cara kami menjaga data tetap sesuai

Penulisan satu dokumen MongoDB bersifat atomik. Untuk perubahan yang melibatkan beberapa dokumen, kami merancang penggunaan transaksi. Artinya, perubahan pada run, properties, action, event, report, dan user yang terkait harus tersimpan bersama. Jika salah satu gagal, perubahan dalam transaksi dibatalkan.

Transaksi beberapa dokumen membutuhkan deployment yang mendukungnya, seperti replica set. Backend juga harus menunggu commit berhasil sebelum mengirim respons sukses.

Frontend mengirim runId, actionId, expectedRevision, dan pilihan aksi. Backend memeriksa pemilik, duplikasi, serta revisi, lalu menjalankan engine untuk menentukan biaya dan hasilnya. Harga upgrade, damage, dan saldo hasil perhitungan frontend tidak langsung dipercaya.

Validator memeriksa tipe data, field wajib, rentang dasar, dan beberapa hubungan nilai. Indeks unik membantu menolak duplikasi. Pemeriksaan urutan fase, masa berlaku efek, pemasukan harian, dan reward sekali tetap menjadi tugas engine dan backend.

Referensi teknis: [atomicity MongoDB](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/), [transaksi MongoDB](https://www.mongodb.com/docs/manual/core/transactions/), dan [schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/).

## Batas rancangan saat ini

History pada user hanya berisi ringkasan. Jika jumlah permainan meningkat, kami perlu memindahkannya ke koleksi terpisah atau mengambil history dari game_runs secara bertahap dengan pagination, supaya dokumen user tidak terus membesar.

Kami belum membutuhkan koleksi pasukan karena aturan terbaru tidak mencakup rekrutmen. Upgrade kota menaikkan attack dan defense sekaligus, dan diskon berlaku untuk upgrade.

Pada alur terbaru, pemain mendaftar dan masuk sebelum membuat atau melanjutkan permainan. Setiap run wajib memiliki userId yang diambil dari sesi terverifikasi, bukan dipercaya dari request browser.

## Bagian yang sudah dan belum dikerjakan

Acuan yang disimpan saat ini adalah diagram schema_new.completed.drawio dan dokumentasinya. File schema alternatif serta script MongoDB/SQL terdahulu sudah dihapus untuk merapikan folder. Referensi XML diagram telah diperiksa; belum ada pengujian pada server database.

Integrasi database ke backend, autentikasi, penyimpanan save nyata, dan pengujian transaksi serta validator pada server MongoDB masih perlu dikerjakan. Jika database sudah berisi user lama, penambahan field juga membutuhkan migrasi dan pengisian nilai awal.

## Contoh angka: satu upgrade memengaruhi enam catatan statistik

Contoh berikut hanya ilustrasi penjelasan, bukan dataset atau perintah pengisian database. Angka mengikuti konfigurasi mesin saat ini: emas awal 100 ditambah pemasukan hari pertama 25, HP 150, serangan dasar 10, pertahanan dasar 2, dan biaya upgrade pertama 50.

| Statistik | Sebelum upgrade pertama | Setelah berhasil |
|---|---|---|
| gold | 125 | 75 |
| cityHp | 150 | 150 |
| cityMaxHp | 150 | 150 |
| upgradeLevel | 0 | 1 |
| attack | 10 | 15 |
| defense | 2 | 4 |

Backend mencatat satu game_actions untuk upgrade tersebut dan enam game_properties yang semuanya merujuk log yang sama. Revisi berubah dari 0 menjadi 1. Di game_runs.state, jatah aksi hari itu sudah terpakai. Upgrade tidak memulihkan HP atau menambah HP maksimum.

Jika pemain logout setelah transaksi selesai, login berikutnya membaca revisi 1 dengan level 1 dan emas 75. Permainan tidak memotong 50 emas lagi. Jika transaksi gagal, perubahan dibatalkan sehingga pemain tidak mendapat level baru dengan saldo lama.

## Jika pilihan kejadian mengubah statistik kota

Hubungan utama runs_event tetap menuju game_runs melalui runId. Saat pemain mengambil pilihan, backend membaca paket event_data dan menjalankan tindakan chooseEventOption melalui mesin permainan. Biaya/efek baru diterapkan pada langkah ini, bukan ketika narasi diterima.

Hasilnya ditulis sebagai satu perubahan: game_runs.state diperbarui, satu log game_actions dicatat, enam game_properties baru dibuat, dan chosenChoiceId/resolvedAt pada runs_event diisi. Penunjuk save pengguna ikut diperbarui. Semua perubahan terkait disimpan dalam satu transaksi.

Jadi runs_event tidak perlu mempunyai referensi langsung ke game_properties. Stat hasil pilihan dapat ditelusuri lewat game_actions: cari log chooseEventOption pada run tersebut, baca ID pilihan di payload, lalu ikuti gameActionId pada properties.

Contohnya, pilihan gratis hari ke-7 mengurangi HP kota 10. Jika HP sebelumnya 150, hasilnya 140. Walaupun hanya HP yang berubah, keenam statistik tetap dicatat bersama pada revisi yang sama supaya pembacaan tidak mencampur revisi. Bonus pertahanan untuk satu gelombang dicatat pula di effects pada state lengkap. Snapshot statistik saja tidak menyimpan seluruh aturan durasi bonus.

## Perbedaan data utama, riwayat statistik, dan laporan

| Kebutuhan | Data yang dibaca | Alasannya |
|---|---|---|
| Melanjutkan permainan | User.saveGame dan game_runs.state | Memuat seluruh progres, kesempatan aksi, efek, dan keputusan |
| Memeriksa nilai upgrade pada revisi tertentu | game_properties berdasarkan runId dan revision | Memuat enam nilai hasil tindakan pada revisi yang sama |
| Menelusuri penyebab nilai berubah | game_actions beserta properties terkait | Menunjukkan tindakan dan hasilnya |
| Membaca pertempuran yang sudah selesai | game_report | Membaca hasil historis tanpa menghitung serangan lagi |
| Melihat pilihan kejadian yang diambil | runs_event dan event_data | Memisahkan pengalaman pemain dari paket aturan |

Stat lama dan laporan pertempuran tidak dipakai untuk menimpa kondisi permainan yang sudah lebih maju. Backend juga tidak boleh memilih catatan terbaru secara terpisah untuk setiap stat; semua nilai harus berasal dari revisi yang sama.

## Alur proses database

Flowchart dan penjelasan langkahnya tersedia di [FLOW_DATABASE.md](FLOW_DATABASE.md). Versi yang dapat diedit di draw.io tersedia di [database_flow.drawio](database_flow.drawio).

## Event AI yang bisa dipakai ulang oleh pemain lain

Alurnya: Mulai Game → periksa katalog event_data → gunakan konten yang cocok atau minta AI membuat konten yang kurang → validasi → simpan event baru ke event_data → hubungkan pilihan event dengan run lewat runs_event.

Contoh ilustrasi: event katalog event-suplai-001 menggunakan paket event-day-7. Permainan Andi dan Budi dapat menunjuk eventDataId yang sama. Andi bisa membayar 15 gold, sementara Budi memilih kehilangan 10 HP. Pilihan tersebut disimpan pada dua runs_event yang berbeda. Memilih opsi tidak mengubah dokumen katalog atau pilihan pemain lain.

Narasi katalog harus dapat digunakan bersama: tidak menyertakan nama, data pribadi, atau klaim kondisi khusus pemain yang belum tentu benar untuk pengguna lain. Backend memilih konten berdasarkan ruleset, packageId dan day yang cocok. Panggilan AI hanya menulis narasi/label; efek tetap dari paket engine. Pilihan dan hasil permainan pengguna lain tidak dikirim ke AI untuk membuat katalog bersama.

Setiap variasi memiliki _id unik. Jangan membuat indeks unik hanya pada rulesetId + packageId atau rulesetId + day karena satu paket/hari sekarang boleh memiliki banyak cerita. Gunakan indeks pencarian rulesetId + packageId + day; runs_event tetap unik pada runId + eventId untuk mencegah penjadwalan ganda pada satu run.

Konten katalog yang tervalidasi disimpan secara terpisah sebelum transaksi awal run. Jika pembuatan run gagal, konten valid tersebut boleh tetap ada untuk dipakai ulang. Jika AI gagal/timeout, gunakan konten lama yang cocok atau fallback terpercaya. Jangan menimpa katalog atau narasi run yang sudah dipakai hanya karena respons baru datang.

startRequestId tetap dipakai untuk deduplikasi pembuatan run, bukan identitas konten katalog. Saat login kembali, baca referensi event yang sudah dipilih; jangan memilih cerita lain atau memanggil AI ulang. source mencatat asal narasi (ai/mock/fallback); memakai ulang narasi AI tetap memiliki source ai.

Pada hari pertama activeEvent masih null dan efek belum diterapkan. Saat hari event tiba, backend mengaktifkan narasi yang sudah ditautkan. Perubahan statistik baru terjadi setelah pemain memilih lewat mesin permainan.

Perubahan ini masih berupa rancangan database dan alur. Pemanggilan AI, penyimpanan katalog, transaksi backend, indeks, dan perluasan ActiveEvent.source belum diimplementasikan.
