# Dokumentasi database Fantasy City Defense

Diagram yang dipakai: [schema_new.completed.drawio](schema_new.completed.drawio).

File schema dan diagram alternatif sudah dihapus agar hanya ada satu diagram acuan. Script MongoDB dan SQL sebelumnya juga sudah dihapus; folder ini tidak menyediakan script setup atau seeding database.

Penjelasan setiap koleksi dan alur penyimpanannya ada di [Database_proposal.md](Database_proposal.md).

## Isi folder

- schema_new.completed.drawio: diagram koleksi, field, dan relasi yang bisa diedit di draw.io.
- Database_proposal.md: bahan presentasi kepada instruktur.
- FLOW_DATABASE.md: alur mulai permainan, aksi, kejadian, pertempuran dan koneksi terputus dalam bahasa Indonesia.
- database_flow.drawio: enam halaman flowchart proses yang dapat diedit; diagram proses, bukan schema alternatif.
- README.md: petunjuk dokumentasi.

Pembersihan file tidak mengubah struktur koleksi pada diagram dan tidak menghapus data di server database. Integrasi backend serta pengujian database nyata belum dilakukan.

Pembahasan penghapusan game_ruleset dan penyederhanaan packageId belum diterapkan pada diagram. Keduanya masih mengikuti rancangan terakhir yang tersimpan.

Alur proses penyimpanan ada di [FLOW_DATABASE.md](FLOW_DATABASE.md), dengan versi diagram yang dapat diedit di [database_flow.drawio](database_flow.drawio).

Alur terbaru: Mulai Game → cari katalog event_data → AI membuat konten yang belum tersedia → validasi dan simpan ke event_data untuk dipakai ulang → runs_event menghubungkan empat event terpilih dengan run pemain. Event ditampilkan sesuai kalender dan efek baru diterapkan setelah pilihan pemain. Diagram menambahkan startRequestId pada game_runs; integrasi AI/database belum diimplementasikan.

Autentikasi terbaru memakai username dan password: User menyimpan username unik dan passwordHash, tanpa email/authSubject/displayName. Penjelasan register/login ada di Database_proposal.md; flowchart ada pada halaman 6 database_flow.drawio dan bagian 7 FLOW_DATABASE.md. Ini masih rancangan, belum endpoint login/register yang berjalan.
