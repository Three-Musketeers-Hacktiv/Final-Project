# Mencoba engine di browser

Dari root repository, jalankan `npm ci` lalu `npm run play`. Buka [localhost:5173](http://localhost:5173). Vite memuat [UI uji](../src/ui/main.ts) yang memanggil engine langsung dan menyimpan state di localStorage dengan key `fantasy-try-ui-v1`.

Gunakan mode manual atau auto untuk mencoba pergantian hari, upgrade, event, battle dan reward. Untuk menguji autentikasi, narasi backend, atau save MongoDB, jalankan [aplikasi Next.js](../app/README.md).

Di root, `npm test` menjalankan suite Vitest dan `npm run typecheck` memeriksa TypeScript. Daftar perintah tersedia di [package.json](../package.json).
