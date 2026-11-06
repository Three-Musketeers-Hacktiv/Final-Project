# 03: Cegah klik ganda dan action dari state lama

**What to build:** Pemanggil memakai controller minimal yang memiliki state terbaru. Dua permintaan dari tampilan yang sama hanya boleh menghasilkan satu perubahan, sementara action baru setelah tampilan diperbarui tetap bekerja normal. Reset permainan menolak semua permintaan dari run lama.

**Blocked by:** 01 — Amankan pergantian hari dan pemasukan; 02 — Kunci alur battle, laporan, dan reward.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Sediakan controller tanpa UI sebagai pintu dispatch action permainan resmi terhadap state terbaru. Controller menggunakan aturan engine, bukan menyalin ekonomi, transisi, battle, atau reward.
- [ ] Perintah membawa runId, expectedRevision, dan actionId. Pemeriksaan identitas, penerapan action, serta penggantian state berlangsung atomik.
- [ ] Perintah dengan run salah, revision usang, atau actionId yang telah diterima ditolak dengan kode error stabil, tanpa perubahan state atau revision.
- [ ] Klik dan retry dari tampilan yang sama mempertahankan expectedRevision asal; retry action yang sama mempertahankan actionId. Controller tidak mengganti revision lama dengan revision terbaru secara otomatis.
- [ ] Dua perintah lanjut dari revision yang sama menghasilkan maksimal satu perpindahan hari meskipun actionId berbeda. Controller menahan permintaan lanjut yang masih diproses; setelah state baru ditampilkan, action baru yang disengaja tetap dapat berjalan.
- [ ] Action gagal tidak mengubah state atau menghabiskan kesempatan ekonomi. Tetapkan urutan pemeriksaan dan perilaku retry gagal secara jelas dalam kontrak.
- [ ] Penanda deduplikasi action sukses dibatasi pada umur run dan menggunakan data yang dapat diserialisasi bila disimpan. Gunakan identitas run baru ketika reset dan batalkan konteks permintaan tertunda.
- [ ] Reset menghasilkan state awal normal dengan pemasukan hari 1 tepat sekali. Permintaan run lama ditolak meskipun revision kebetulan sama dengan run baru.
- [ ] Controller tidak menyebabkan action komposit menaikkan revision dua kali dan tidak mengembalikan snapshot mutable yang memungkinkan pemanggil mengubah state miliknya secara tidak sengaja.
- [ ] Uji dispatch controller untuk klik ganda, actionId berulang, dua perintah berbeda dari revision sama, stale action setelah action lain, reset run, action gagal, dan action baru yang valid setelah pembaruan state.
- [ ] Jalankan alur 20 hari melalui dispatch controller dengan action nyata untuk membuktikan integrasi dengan aturan pada tiket 01/02.
- [ ] Dokumentasikan kontrak dispatch, error, revision, actionId, reset, dan kewajiban pemanggil mempertahankan identitas tampilan asal.
- [ ] Jalankan test, typecheck, dan script lint yang tersedia; laporkan hasil aktual. Jalankan build hanya jika tersedia dan relevan.

## Scope notes

Tidak membuat tombol, React, request jaringan, timer, atau autosave. Pembatalan konteks khusus load save dilengkapi pada tiket 04.
