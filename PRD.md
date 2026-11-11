# Aturan permainan Bastionfall

Kampanye berlangsung 100 hari dengan battle setiap kelipatan 10. Pada hari persiapan, pemain menerima pemasukan sekali saat memasuki hari. Pemain boleh melakukan satu aksi ekonomi yang berhasil atau langsung lanjut hari. Aksi gagal tidak memakai jatah.

## Ekonomi pada difficulty Normal

| Parameter | Aturan |
|---|---|
| Awal permainan | 150/150 HP, attack 10, defense 2, semua level 0 |
| Gold hari pertama | 100 + 28 pemasukan = 128 |
| Upgrade | Biaya dasar 45 + 30 × level saat ini pada jalur tersebut |
| Tembok | +3 defense per level |
| Pasukan | +5 attack per level |
| Kota | +35 MaxHP, +35 HP saat ini, +5 pemasukan harian |
| Batas upgrade | Level 18 per jalur |
| Repair | 25 gold untuk memulihkan hingga 60 HP, dibatasi MaxHP |

Easy dan Hard mengubah statistik monster, biaya dan pemasukan. [Tabel difficulty](src/game/difficulty.ts) dan [konfigurasi game](src/game/config.ts) memuat angka lengkap.

## Event dan battle

Engine memilih dua hari event per blok sepuluh hari berdasarkan run ID. Pemain menyelesaikan event aktif sebelum berbelanja atau lanjut hari. Paket menawarkan 2–4 pilihan dengan minimal satu pilihan gratis. Sebagian pilihan menjadwalkan konsekuensi. Beberapa event dapat muncul berurutan pada hari yang sama.

Dalam battle, kota memberikan damage sebesar attack efektif dan menerima minimal 1 damage setelah defense. Damage diterapkan bersamaan. Kota kalah jika HP mencapai nol, termasuk ketika monster juga tumbang. HP yang tersisa dibawa ke hari berikutnya. Setelah menang wave 1–9, pemain melanjutkan laporan dan memilih satu dari tiga reward. Setelah menang wave 10, laporan mengantar pemain ke victory. Pemain juga dapat mengakhiri run melalui surrender.

Lihat [kontrak kampanye](docs/CAMPAIGN_100_DAY_CONTRACT.md) untuk aturan reward, expiry dan integrasi.
