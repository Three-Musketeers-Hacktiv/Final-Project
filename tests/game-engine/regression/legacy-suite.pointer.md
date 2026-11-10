# Test lama tetap di tempatnya

Suite ini tidak memindahkan test yang sudah ada.

Regression otomatis untuk aturan yang sudah dicakup sebelumnya:

- `src/game/game.test.ts`
- `src/game/balance.sim.test.ts`
- `src/ui/autoRun.test.ts`

Jalankan bersama suite baru dengan `npm test` dari root repository.
File `known-contracts.test.ts` hanya mengunci kontrak yang mudah pecah (versi state, API yang tidak diekspor, arah rantai consequence), bukan salinan skenario di `game.test.ts`.

Test backend di folder `app/` memakai Vitest terpisah dan bukan bagian dari suite engine ini.
