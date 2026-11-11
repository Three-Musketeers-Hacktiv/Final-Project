# 01: Amankan pergantian hari dan pemasukan

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Pemain hanya berpindah ke hari berikutnya melalui action resmi, menerima pemasukan tepat sekali per hari persiapan, dan memperoleh maksimal satu aksi ekonomi berhasil per hari. Event wajib tidak dapat dilewati melalui state dengan fase yang tidak konsisten.

**Blocked by:** None (can start immediately).

**Status:** done

## Acceptance criteria

- [x] Gunakan spesifikasi Pengamanan Transisi Hari sebagai sumber aturan; balancing tidak diubah.
- [x] `enterDay` menjadi helper internal dan tidak tersedia sebagai API publik untuk menentukan hari arbitrer. Inisialisasi run tetap memberi pemasukan hari pertama tepat sekali.
- [x] Lanjut hari hanya diterima pada hari persiapan dan fase yang sah, menuju tepat hari berikutnya. Hari bukan bilangan bulat, di luar kalender, mundur, atau lompatan ditolak dengan error terstruktur.
- [x] Masuk ulang hari yang sama tidak mengubah state, pemasukan, jatah aksi, event, atau hasil battle. Helper internal menolak transisi tersebut tanpa diekspor hanya untuk pengujian.
- [x] Event terjadwal yang belum selesai memblokir belanja dan lanjut, termasuk ketika fase pada input salah ditandai preparation. Penyelesaian event tidak memberi pemasukan atau mereset aksi.
- [x] Aksi gagal mempertahankan jatah, satu aksi berhasil menghabiskannya, skip diperbolehkan, dan jatah tidak terakumulasi.
- [x] Penanda pemasukan menjadi daftar hari unik `incomeGrantedDays`, hanya berisi hari persiapan yang telah menerima pemasukan. Pemasukan, penanda, fase, dan reset aksi diperbarui secara atomik.
- [x] Hari battle tidak memberi pemasukan atau kesempatan belanja. Gunakan konfigurasi kalender terpusat.
- [x] Naikkan versi format state untuk perubahan skema dan tambahkan revision yang terpisah. Setiap action publik yang berhasil mengubah state menaikkan revision sekali, termasuk action komposit; error dan no-op tidak menaikkannya. Tetapkan revisi awal secara konsisten dalam kontrak.
- [x] Sesuaikan seluruh pemanggil dan fixture yang terdampak perubahan API/skema agar tetap dapat digunakan. Helper debug menjaga invariant dan tidak menjadi API lompat hari produksi.
- [x] Tambahkan tes perilaku melalui action publik untuk pemasukan, ekonomi, kalender, event wajib, kemurnian input, revision, dan serialisasi JSON. Jangan menambahkan ekspor internal untuk kebutuhan tes.
- [x] Perbarui kontrak Developer 2 dan 3 untuk perubahan API, versi state, penanda pemasukan, revision, dan error. Nyatakan bahwa pemeriksaan save lama akan disediakan pada tiket 04; ini belum membuat autosave.
- [x] Jalankan test, typecheck, dan script lint yang tersedia; laporkan hasil aktual. Jalankan build hanya jika tersedia dan relevan.

## Comments

- Implemented 2026-11-05: `enterDay` internalized; `incomeGrantedDays` + `revision`; state `version: 2`; public advance via `endPreparationDay` / `chooseReward` only.
- No separate debug jump-day helper added (none existed); tests use public actions only.
- Tickets 02–04 not started (battle/reward hardening, controller, save load).

## Scope notes

Tidak membuat controller, frontend, penyimpanan browser, atau backend. Tetap pertahankan alur battle/reward yang ada sampai diperketat pada tiket 02.
