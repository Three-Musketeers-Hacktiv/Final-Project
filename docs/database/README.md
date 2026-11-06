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

Pembahasan penghapusan game_ruleset dan penyederhanaan packageId belum diterapkan pada diagram. Ringkasan keputusan terkunci ada di bagian atas [Database_proposal.md](Database_proposal.md).

Inti schema:
- `GameState version: 3` (wall / troops / city)
- Kampanye panjang (~100 hari): banyak `runs_event` dan banyak `game_report`
- `game_report.gameRunId` → `game_runs`; di diagram hanya disandingkan visual dengan `runs_event`
- Auth: `bcrypt` + JWT (`jsonwebtoken`); `actionId` dibuat client untuk dedupe

Alur proses: [FLOW_DATABASE.md](FLOW_DATABASE.md) dan [database_flow.drawio](database_flow.drawio).

Alur Mulai Game: katalog `event_data` → AI jika perlu → tautkan lewat `runs_event`. Efek pilihan masuk `game_runs.state`, bukan `game_report`.
