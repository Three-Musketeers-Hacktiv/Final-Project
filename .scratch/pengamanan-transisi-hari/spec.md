# Pengamanan Transisi Hari

Status: ready-for-agent

## Problem Statement

Pemain harus menjalani kalender 20 hari dengan pemasukan tepat sekali pada setiap hari persiapan dan maksimal satu aksi ekonomi berhasil per hari. Event, battle, laporan, dan reward wajib mengikuti urutan permainan.

Saat ini API `enterDay` menerima hari tujuan langsung, mereset kesempatan aksi, dan hanya menyimpan penanda pemasukan hari terakhir. Pemanggil dapat masuk ulang ke hari yang sama, mundur lalu maju untuk menerima pemasukan kembali, atau melewati event, battle, dan reward. Klik ganda juga dapat menjalankan dua perpindahan yang masing-masing tampak valid jika controller memakai state terbaru tanpa mengenali asal permintaan.

## Solution

Batasi perpindahan melalui action resmi. Engine menentukan hari tujuan dan memvalidasi fase serta urutan permainan. Pemasukan, reset aksi, dan perubahan fase terjadi sebagai satu transaksi. Controller memakai state terbaru secara atomik dan menolak action yang berasal dari run atau revisi tampilan lama.

## User Stories

1. Sebagai pemain, saya ingin pemasukan hari pertama diberikan tepat sekali agar saldo awal konsisten.
2. Sebagai pemain, saya ingin menerima pemasukan tepat sekali pada setiap hari persiapan agar ekonomi mengikuti kalender.
3. Sebagai pemain, saya ingin hari battle tidak memberi pemasukan agar aturan ekonomi konsisten.
4. Sebagai pemain, saya ingin maksimal satu aksi ekonomi berhasil per hari agar keputusan belanja bermakna.
5. Sebagai pemain, saya ingin aksi gagal tidak menghabiskan kesempatan agar dapat mencoba aksi yang valid.
6. Sebagai pemain, saya ingin boleh lanjut tanpa belanja agar dapat menabung.
7. Sebagai pemain, saya ingin kesempatan yang tidak digunakan tidak terakumulasi agar batas harian konsisten.
8. Sebagai pemain, saya ingin event wajib selesai sebelum belanja atau lanjut agar keputusan event tidak terlewati.
9. Sebagai pemain, saya ingin menyelesaikan battle hari 10 sebelum melanjutkan agar progres permainan sah.
10. Sebagai pemain, saya ingin laporan wave pertama diikuti pemilihan satu reward agar hadiah tidak terlewati.
11. Sebagai pemain, saya ingin reward diterapkan sebelum pemasukan hari 11 agar bonus pemasukan langsung bekerja pada hari yang benar.
12. Sebagai pemain, saya ingin kemenangan mengikuti laporan wave kedua agar tidak ada reward tambahan.
13. Sebagai pemain, saya ingin klik ganda hanya menjalankan satu perpindahan agar tidak kehilangan hari.
14. Sebagai pemain, saya ingin refresh mempertahankan pemasukan dan kesempatan aksi agar progres tidak berubah.
15. Sebagai pemain, saya ingin game over dan kemenangan menolak action lanjutan agar hasil akhir tetap.
16. Sebagai pengembang frontend, saya ingin error terstruktur agar UI dapat menjelaskan penolakan.
17. Sebagai pengembang integrasi, saya ingin permintaan permainan lama ditolak setelah reset agar run baru tidak tercampur.
18. Sebagai pengembang, saya ingin penolakan mempertahankan state asal agar action bersifat atomik.
19. Sebagai pengembang, saya ingin fixture debug terpisah dari alur normal agar alat pengujian tidak membuka jalan pintas permainan.
20. Sebagai pengembang persistensi, saya ingin versi save yang tidak didukung ditolak secara jelas agar data lama tidak ditafsirkan secara keliru.

## Implementation Decisions

- Modul kalender, transisi, state awal, ekonomi, reward, tipe state, ekspor publik, dan kontrak integrasi akan disesuaikan sesuai kebutuhan perubahan ini.
- Jadikan `enterDay` helper internal. API publik tidak menerima perintah lompat ke hari arbitrer. Helper inisialisasi boleh masuk dari state kosong ke hari pertama tepat sekali.
- Gunakan kalender terpusat untuk menentukan hari persiapan, event, battle, dan batas hari. Hari harus bilangan bulat dalam rentang konfigurasi.
- `endPreparationDay` hanya diterima pada fase preparation dan hari persiapan yang sah; tujuannya tepat hari berikutnya. Event terjadwal yang belum selesai tetap memblokir action meskipun fase pada state tidak konsisten.
- Penyelesaian event tetap pada hari yang sama tanpa memberi pemasukan atau mereset kesempatan aksi.
- Hari 10 mengikuti battleReady → battleReport → reward → hari 11 jika kota bertahan. Pilihan reward dan masuk hari 11 menjadi satu transaksi; bonus reward aktif sebelum pemasukan hari 11 dihitung.
- Hari 20 mengikuti battleReady → battleReport → victory jika kota bertahan. Kota nol menghasilkan gameOver. Fase akhir tidak menerima action permainan.
- Validasi prasyarat laporan dan reward mencocokkan hari, wave, kemenangan, dan penanda wave selesai. Tidak cukup hanya memeriksa nama fase.
- Masuk ulang hari yang sama tidak boleh mengubah state; perpindahan mundur, lompatan hari, dan hari di luar kalender ditolak. Pilih penolakan terstruktur untuk pemanggilan transisi internal yang tidak sah.
- Ganti penanda pemasukan hari terakhir dengan daftar unik `incomeGrantedDays`. Hanya hari persiapan yang sah boleh dicatat. Pemasukan, penanda, reset aksi, dan fase baru dikembalikan bersama dalam satu state baru.
- Bedakan `version` sebagai versi format save dari `revision` sebagai urutan perubahan state. Setiap action sukses yang mengubah state menaikkan revision sekali; error dan no-op tidak menaikkannya.
- Tambahkan controller minimal tanpa UI yang memiliki state terbaru dan menjadi pintu penerapan action oleh pemanggil. Perintah membawa runId, expectedRevision, dan actionId; pemeriksaan dan penerapan hasil bersifat atomik.
- Klik atau retry dari tampilan yang sama memakai expectedRevision yang sama; retry action yang sama mempertahankan actionId. Setelah action pertama diterima, perintah kedua dari tampilan lama ditolak tanpa perpindahan tambahan. Controller tidak boleh mengganti expectedRevision lama dengan revisi terbaru secara otomatis.
- Controller menahan permintaan lanjut hari selama permintaan sebelumnya diproses. Setelah state baru ditampilkan, klik baru yang disengaja boleh memajukan hari berikutnya.
- Identitas action yang diterima tidak boleh diterapkan kembali pada run yang sama. Jika penanda deduplikasi disimpan, gunakan objek atau array yang dapat diserialisasi dan batasi pada umur run tersebut.
- Reset membuat identitas run baru dan membuang permintaan tertunda. Load save membatalkan konteks permintaan sebelumnya sebelum menerima action baru, termasuk ketika save memakai runId yang sama.
- Loading save tidak memanggil prosedur memasuki hari. Karena format berubah, naikkan versi format dan tolak save versi lama dengan error terstruktur tanpa menghapus atau mengubah datanya. Migrasi save lama bukan bagian pekerjaan ini.
- Error membedakan fase tidak valid, transisi tidak valid, game berakhir, run tidak cocok, revisi usang, action duplikat, dan versi save tidak didukung. Gunakan kode stabil yang didokumentasikan untuk UI.
- Engine tetap murni dan state tetap JSON-serializable. Controller tidak memerlukan React, DOM, HTTP, timer, atau penyimpanan browser.
- Fixture debug memakai helper terpisah yang menjaga invariant. Jangan mempertahankan API lompat hari produksi hanya untuk memudahkan fixture.

## Testing Decisions

Gunakan Vitest yang sudah tersedia. Acuan adalah tes ekonomi, kalender, event/reward, kemurnian state, pemuatan ulang laporan, dan integrasi 20 hari yang sudah ada.

Utamakan dua batas pengujian: action publik engine untuk aturan permainan dan dispatch controller untuk duplikasi serta konkurensi. Tidak perlu mengekspor helper internal demi tes. Tes memeriksa hari, fase, gold, HP, kesempatan aksi, revision, dan error yang terlihat pemanggil, bukan susunan helper.

- Buktikan pemasukan hari 1 dan semua hari persiapan tepat sekali, serta tidak ada pemasukan pada hari 10/20.
- Buktikan aksi gagal tidak menghabiskan jatah, skip diperbolehkan, dan jatah tidak terakumulasi.
- Buktikan pemanggilan ulang tidak mereset aksi atau memberi pemasukan tambahan.
- Buktikan event, battle, laporan, dan reward tidak bisa dilewati, termasuk state dengan fase/hari atau penanda progres yang tidak konsisten.
- Buktikan reward pemasukan diterapkan sebelum pendapatan hari 11, dan reward hanya dipilih sekali.
- Buktikan klik ganda, actionId berulang, dan dua action dari revision yang sama menghasilkan maksimal satu perubahan yang diterima.
- Buktikan action baru setelah state diperbarui tetap dapat berjalan normal.
- Buktikan perintah dari run lama dan permintaan tertunda sebelum load ditolak.
- Buktikan refresh melalui serialisasi JSON pada event, laporan, dan reward tidak menggandakan pemasukan, biaya, damage, atau bonus.
- Buktikan save versi lama ditolak tanpa perubahan data dan tanpa menjalankan ulang transisi.
- Buktikan semua penolakan menjaga input state, revision, dan penanda pemasukan tetap utuh.
- Buktikan semua action permainan ditolak pada gameOver dan victory, kecuali pembuatan run baru melalui pemanggil.
- Pertahankan integrasi 20 hari melalui action nyata, tanpa lompat state. Action upgrade/perbaikan yang direncanakan harus di-assert berhasil, bukan diam-diam dilewati ketika gagal.

Implementasi selesai setelah tes relevan, typecheck, dan script lint repository dijalankan serta hasil aktual dilaporkan. Build hanya dijalankan jika script atau aplikasi terintegrasi sudah tersedia.

## Out of Scope

- Implementasi kode sebagai bagian penulisan spesifikasi ini.
- Perubahan balancing, biaya, damage, jenis event, atau reward.
- Pengamanan pemasangan respons narasi event dan validasi numerik battle secara menyeluruh; keduanya pekerjaan terpisah.
- Frontend produk, testing harness lengkap, mock backend HTTP, adapter jaringan, atau penyimpanan browser.
- Migrasi save versi lama dan validasi seluruh kemungkinan kerusakan payload save.
- Penambahan pasukan, sihir, akun, database, atau deployment.

## Further Notes

Pemasukan harian mengikuti konfigurasi repository yang berlaku, tanpa mengubah balancing. Upgrade tetap menaikkan attack dan defense sekaligus; tidak ada rekrutmen baru dan diskon tetap untuk upgrade.

Dokumentasikan perubahan API, versi state, kontrak perintah controller, error, dan kebijakan save untuk Developer 2 dan 3. Status ready-for-agent menunjukkan spesifikasi siap menjadi dasar implementasi, bukan bahwa implementasi atau tes baru telah dijalankan.
