# 02: Kunci alur battle, laporan, dan reward

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Pemain harus menyelesaikan battle dan laporan sebelum memilih reward atau menang. Reward pertama hanya dipilih sekali dan diterapkan sebelum pemasukan hari 11; permainan yang berakhir tidak menerima action permainan lanjutan.

**Blocked by:** 01 — Amankan pergantian hari dan pemasukan.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Validasi action battle, laporan, dan reward mencocokkan hari, wave, hasil kemenangan, serta penanda progres; jangan hanya memeriksa nama fase.
- [ ] Wave pertama yang dimenangkan mengikuti battleReady → battleReport → reward → hari 11. Tidak tersedia jalan menuju hari 11 sebelum memilih reward yang sah.
- [ ] Reward hanya diterapkan sekali. Pemberian reward dan masuk hari 11 atomik; reward bonus pemasukan aktif sebelum pemasukan hari 11 dihitung.
- [ ] Wave kedua yang dimenangkan mengikuti battleReady → battleReport → victory, tanpa reward tambahan.
- [ ] Kota nol tetap menghasilkan gameOver, termasuk kedua pihak tumbang. Semua action permainan resmi menolak gameOver/victory tanpa mutasi; pembuatan run baru tetap menjadi operasi pemanggil.
- [ ] Battle yang sudah terselesaikan tidak dihitung ulang atau menerapkan damage lagi. Lanjut laporan tidak merusak hasil battle tersimpan.
- [ ] Input dengan kombinasi hari/fase, hasil wave, atau progres yang tidak konsisten ditolak secara terstruktur tanpa mengubah gold, HP, efek, penanda pemasukan, atau revision.
- [ ] Perubahan ini menjaga aturan revision satu kenaikan per action publik berhasil, termasuk pemilihan reward yang sekaligus memajukan hari.
- [ ] Tambahkan tes action publik untuk transisi sah/tidak sah, reward berulang, urutan bonus hari 11, fase akhir, dan pemuatan ulang laporan melalui serialisasi JSON.
- [ ] Perkuat integrasi 20 hari menggunakan action nyata tanpa lompat state. Setiap upgrade/perbaikan yang direncanakan harus di-assert berhasil, bukan dilewati diam-diam bila gagal. Buktikan hari 10/20 tidak memberi pemasukan.
- [ ] Perbarui kontrak integrasi untuk prasyarat transisi, error, dan urutan reward/pemasukan.
- [ ] Jalankan test, typecheck, dan script lint yang tersedia; laporkan hasil aktual. Jalankan build hanya jika tersedia dan relevan.

## Scope notes

Tidak mengubah rumus battle, balancing, atau jenis hadiah. Pengamanan pemasangan respons narasi event dan validasi semua angka snapshot battle tetap merupakan pekerjaan terpisah.
