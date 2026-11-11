# Database Bastionfall

Backend menyimpan state v4 di `game_runs`, aksi di `game_actions`, statistik di `game_properties`, event run di `runs_event`, dan laporan battle di `game_reports`. Metadata aturan tersimpan di `game_rulesets`. Lihat [schema backend](../../app/docs/DATABASE_SCHEMA_V3.md) dan [indeks MongoDB](../../app/server/db/indexes.ts).

Dari folder `app/`, gunakan `npm run db:indexes` untuk menyiapkan indeks. [Panduan aplikasi](../../app/README.md) menjelaskan konfigurasi dan pengisian katalog.

[Diagram schema](schema_new.completed.drawio), [diagram proses](database_flow.drawio), [proposal](Database_proposal.md) dan [alur awal](FLOW_DATABASE.md) mendokumentasikan rancangan database proyek.
