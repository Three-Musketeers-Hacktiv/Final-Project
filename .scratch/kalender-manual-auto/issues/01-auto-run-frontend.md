# 01: Auto Run frontend dengan engine berbasis input

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Pada kampanye prototipe 20 hari, pemain dapat menyalakan Auto di frontend sehingga Lanjut hari dikirim tiap lima detik lewat handler yang sama dengan tombol manual, tanpa timer di engine.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Permainan baru dimulai Manual; Auto Run mengirim advance-day melalui handler yang sama dengan tombol manual setiap lima detik.
- [ ] Tidak ada timer, field mode auto, atau loop otomatis baru di state/domain engine.
- [ ] Hanya preparation sah yang menerima input lanjut hari otomatis; belanja tetap manual; Auto boleh lanjut saat aksi belum dipakai.
- [ ] Masuk event atau battleReady menjeda auto; laporan/reward/fase akhir tidak diproses otomatis.
- [ ] Penyelesaian keputusan wajib tidak menjalankan auto kembali; Lanjutkan auto memulai lima detik penuh.
- [ ] Pergantian ke Manual segera membatalkan penjadwalan; aktivasi berulang tidak membuat timer ganda.
- [ ] Penolakan action menghentikan auto dan menampilkan alasan tanpa mengubah state game.
- [ ] Pengujian controller memakai waktu simulasi (clock inject) dan mengamati perilaku publik, termasuk pemasukan dan aksi harian existing pada alur 20 hari.

## Referensi

Spesifikasi: ../spec.md · Plan: plans/auto-run-20-dan-50.md
