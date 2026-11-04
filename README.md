# Fantasy City Defense — Game Engine

Pure TypeScript rules engine (no UI, no HTTP backend).

Instruksi agent: [AGENTS.md](./AGENTS.md). Kontrak: [docs/DEV1_CONTRACT.md](./docs/DEV1_CONTRACT.md).

## Keputusan

- Upgrade kota menaikkan **attack dan defense**.
- Tidak ada rekrutmen.
- Diskon berlaku untuk **biaya upgrade**.
- Fase: `preparation` | `event` | `battleReady` | `battleReport` | `reward` | `gameOver` | `victory`.
- Playtest: `dailyIncome = 25` (AGENTS table 15).

## Setup

```bash
npm install
npm run typecheck
npm test
```

Import dari `src/game` (lihat kontrak).
