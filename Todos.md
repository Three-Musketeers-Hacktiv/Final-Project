# Todos — Portfolio Edition

Deadline 13 November 2026 · A: sistem · B: UI · C: konten/persistensi.

Semua tugas belum dikerjakan. Tanda selesai hanya diberikan setelah implementasi, review dan pemeriksaan yang relevan. Integrasi harian wajib; waktu terakhir digunakan untuk stabilisasi.

## 3 November — Kesepakatan dan fondasi

- [ ] Bersama: periksa rubrik bootcamp, terutama backend/API/database dan bukti kontribusi.
- [ ] Bersama: setujui scope 20 hari tanpa formasi atau HP pasukan.
- [ ] C: buat repository React/Vite/TypeScript, dependency dan lockfile.
- [ ] C: siapkan script typecheck, lint, test dan build; catat Node.
- [ ] A: definisikan GameState, fase, snapshot stat, efek, event, reward dan BattleResult.
- [ ] A + C: masukkan angka PRD ke konfigurasi.
- [ ] Bersama: sepakati pengedit kontrak/state dan batas file tiap developer.
- [ ] B: siapkan layout dashboard menggunakan kontrak dan contoh data.

## 4–5 November — Persiapan kota

- [ ] A: state awal dan stat turunan pemanah, penjaga, tembok.
- [ ] A: kalender 20 hari dan pemasukan sekali per hari persiapan.
- [ ] A: rekrut dua jenis pasukan, upgrade tembok, perbaikan dan skip aksi.
- [ ] A: validasi fase, aksi, gold, HP penuh dan batas upgrade secara atomik.
- [ ] B: dashboard gold, HP, attack, defense, jumlah pasukan, aksi tersisa.
- [ ] B: panel belanja dengan biaya dan perubahan stat.
- [ ] B: pratinjau wave dan penjelasan sumber attack/defense.
- [ ] C: data dua wave dan bentuk JSON event/reward.
- [ ] A: uji biaya kurang, aksi kedua, batas tembok, perbaikan sebagian dan stat turunan.
- [ ] Bersama: UI dapat membeli dan maju ke hari 10 memakai state sebenarnya.

## 6 November — Satu siklus lengkap

- [ ] A: resolveBattle deterministik dengan damage simultan dan minimum satu ke kota.
- [ ] A: kondisi kota nol berarti kalah, termasuk kedua pihak nol.
- [ ] A: log ronde dan hasil hanya dihitung sekali.
- [ ] B: konfirmasi Mulai, dua HP bar, laporan dan rincian perhitungan.
- [ ] B: penyajian lima detik/ronde, percepatan dan Lihat Hasil jika waktu cukup.
- [ ] A: uji fatal simultan, defense tinggi, battle satu ronde, HP tidak negatif.
- [ ] Bersama: mainkan hari 1–10 tanpa intervensi developer.

Jika milestone terlambat, gunakan laporan langsung. Jangan mengorbankan aturan atau integrasi demi animasi.

## 7–8 November — Event, hadiah dan hari 20

- [ ] A: handler biaya/efek event dan diskon tanpa stacking, pembulatan ke atas.
- [ ] A: bonus defense seluruh wave target dan pembersihan efek setelah wave.
- [ ] C: tulis prompt sesuai skema dan paket PRD; generate empat event.
- [ ] C: validasi hari, ID unik, dua pilihan, opsi gratis, tipe dan nilai efek.
- [ ] Bersama: review narasi/efek dan simpan catatan persetujuan.
- [ ] B: event wajib sebelum aksi, konsekuensi terstruktur, pilihan tidak terjangkau.
- [ ] A + B: game over akibat event dan pencegahan klik ganda.
- [ ] C: konfigurasi tiga reward; tanpa gold otomatis tambahan.
- [ ] A: reward sekali, bonus hari 11–19 dan kedaluwarsa.
- [ ] B: panel reward, indikator efek, layar menang/kalah dan mulai ulang.
- [ ] Bersama: uji kedua pilihan setiap event dan ketiga hadiah.
- [ ] Bersama: alur hari 1–20 lengkap.

## 9 November — Save dan build

- [ ] C: save version, validasi load, error save dan lanjutkan.
- [ ] A + C: hasil battle disimpan sebelum visual; refresh menuju laporan tersimpan.
- [ ] C: persist hari, fase, gold, HP, pasukan, tembok, aksi, event, efek dan reward.
- [ ] B: konfirmasi mulai baru ketika save aktif dan pesan masalah penyimpanan.
- [ ] Bersama: refresh pada event, persiapan, battle, laporan, reward dan akhir.
- [ ] Bersama: uji klik cepat agar aksi, pemasukan, damage dan hadiah tidak ganda.
- [ ] C: jalankan pemeriksaan dan preview build produksi.

## 10 November — Playtest dan pembekuan fitur

- [ ] Bersama: uji lima pemain bila tersedia; catat jumlah aktual.
- [ ] Catat pemahaman belanja, event, defense, hasil battle dan reward.
- [ ] A + C: bandingkan fokus attack, fokus defense dan campuran.
- [ ] Periksa apakah tembok mendominasi penjaga atau satu hadiah selalu terbaik.
- [ ] Periksa peluang pulih setelah wave 1 dan durasi battle.
- [ ] Bersama: prioritaskan bug penghambat dan kesalahan aturan; hentikan fitur baru.
- [ ] C: tulis hasil playtest dan perubahan angka, termasuk alasan.

## 11–12 November — Stabilisasi dan portofolio

- [ ] A: perbaiki logika dan tambahkan regression test untuk bug yang relevan.
- [ ] B: perjelas label, kontras, biaya, efek, dan laporan; cek layar sempit.
- [ ] C: perbarui konfigurasi dan validasi konten.
- [ ] Bersama: ulangi jalur menang, kalah battle, kalah event, dan refresh.
- [ ] C: typecheck, lint, test, build lulus.
- [ ] C: deploy statis dan verifikasi URL dari perangkat lain.
- [ ] C: lengkapi README dengan URL, Node, perintah dan hasil aktual.
- [ ] Bersama: catat kontribusi, PR/review, penggunaan AI dan keputusan desain.
- [ ] Bersama: buat diagram alur sederhana dan latihan demo tiga anggota.
- [ ] Bersama: pastikan setiap orang mampu menjelaskan kode bagiannya.

## 13 November — Penyerahan

- [ ] URL demo, repository dan dokumentasi dapat diakses penilai.
- [ ] Permainan baru, lanjut, kedua wave dan hasil akhir berfungsi.
- [ ] Tidak ada API key, kontrol debug publik atau placeholder yang menyesatkan.
- [ ] Catat versi rilis dan masalah yang masih ada.
- [ ] Siapkan salinan build dan skenario demo cadangan.
- [ ] Periksa seluruh persyaratan rubrik bootcamp.

## Setelah deadline

- [ ] Evaluasi apakah konsep menarik sebelum menambah konten.
- [ ] Tambahkan delapan wave dan 16 event untuk target 100 hari.
- [ ] Uji ekonomi 100 hari; jangan menganggap angka prototipe langsung cocok.
- [ ] Evaluasi fitur berikutnya berdasarkan hasil pemain dan tujuan portofolio.

## Aturan kerja dengan AI

- [ ] Setiap tugas AI menyertakan aturan PRD, kontrak, file yang boleh diubah dan acceptance criteria.
- [ ] Hindari beberapa sesi mengedit file sama.
- [ ] Developer membaca perubahan dan menjalankan pemeriksaan sebelum merge.
- [ ] Reviewer memastikan AI tidak menambah fitur atau mengubah aturan diam-diam.
- [ ] Klaim pengujian sesuai hasil yang benar-benar dijalankan.
