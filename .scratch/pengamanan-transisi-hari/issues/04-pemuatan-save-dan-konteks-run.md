# 04: Amankan pemuatan save dan pergantian konteks run

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Pemanggil dapat menyerahkan snapshot save yang didukung kepada controller untuk melanjutkan progres tanpa mengulang pemasukan, biaya, damage, atau reward. Load mengganti konteks permintaan sehingga action dari sesi sebelum load tidak dapat diterapkan, termasuk ketika runId dan revision kebetulan sama.

**Blocked by:** 03 — Cegah klik ganda dan action dari state lama.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Sediakan operasi load snapshot pada controller dengan validasi versi format dan struktur/invariant yang diperlukan untuk menjaga transisi hari, fase, progres wave, revision, serta penanda pemasukan.
- [ ] Save versi lama atau versi yang tidak didukung ditolak melalui error terstruktur. Input dan state aktif tidak berubah pada penolakan; pemanggil tidak diarahkan menghapus save diam-diam.
- [ ] Loading save tidak memanggil prosedur memasuki hari, menambah pemasukan, mereset aksi, menghitung ulang battle, atau menerapkan ulang efek event/reward.
- [ ] Load yang berhasil mengganti state secara atomik dan membatalkan konteks permintaan sebelumnya. Perintah tertunda sebelum load ditolak bahkan jika runId dan revision pada snapshot sama dengan state sebelumnya; gunakan identitas konteks controller yang baru atau mekanisme setara.
- [ ] Penanda deduplikasi tidak membuka peluang penerapan ulang action sukses setelah load; dokumentasikan hubungan penanda run, revision, dan konteks controller.
- [ ] Snapshot yang dimuat mempertahankan progres game termasuk kesempatan aksi, event aktif/selesai, hasil battle, pilihan reward, efek, dan hari pemasukan. Pemanggil dapat membuat action baru yang sah setelah load.
- [ ] Tambahkan tes round-trip JSON pada fase event, battleReport, dan reward. Selesaikan action terkait setelah load dan buktikan biaya/damage/bonus diterapkan maksimal sekali.
- [ ] Uji load setelah aksi ekonomi terpakai, save versi lama, snapshot transisi tidak konsisten, penolakan tanpa mutasi, serta stale action sebelum load dengan runId/revision yang sama.
- [ ] Pertahankan hasil akhir alur 20 hari melalui controller dengan titik simpan/muat terpilih tanpa melompat hari atau memodifikasi state untuk memajukan progres.
- [ ] Dokumentasikan API load, error, versi save, pembatalan konteks, dan tanggung jawab lapisan persistensi untuk Developer 2 dan 3.
- [ ] Jalankan test, typecheck, dan script lint yang tersedia; laporkan hasil aktual. Jalankan build hanya jika tersedia dan relevan.

## Scope notes

Tiket ini mengamankan penerimaan snapshot, bukan membuat autosave yang dapat digunakan pemain. Penyimpanan otomatis dan pembacaan ulang browser, localStorage, tombol lanjut bermain, serta penanganan refresh pada UI merupakan pekerjaan frontend/persistensi terpisah. Tes refresh pada tiket ini berupa simulasi serialisasi dan load snapshot. Migrasi save versi lama dan validasi menyeluruh terhadap semua payload rusak tidak termasuk lingkup.
