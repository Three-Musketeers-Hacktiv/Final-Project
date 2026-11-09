# Database Schema — Engine State v4 — Fantasy City Defense

Status: **Implemented for MongoDB Atlas**
Database: MongoDB Atlas  
State: `GameState.version === 4`
ID dokumen: `ObjectId`

Dokumen terkait:

- [API contract](./API_CONTRACT.md)
- [Backend implementation plan](./BACKEND_IMPLEMENTATION_PLAN.md)
- [Auth and session specification](./AUTH_SESSION_SPEC.md)
- [Game engine contract](../../docs/DEV1_CONTRACT.md)

## 1. Konvensi umum

- Nama collection menggunakan `snake_case` plural bila sesuai rancangan yang telah disepakati.
- `_id` dan referensi antar-document menggunakan `ObjectId`.
- API mengubah `ObjectId` menjadi hex string.
- `GameState.runId` menyimpan hex string dari `_id` document `game_runs`.
- Nama field REF mengikuti collection tujuan: `userId`, `gameRunId`, `gameRulesetId`, `eventDataId`, dan `gameActionId`.
- `runId` pada `GameState`/API dan `rulesetId` pada metadata ruleset bukan nama field REF MongoDB.
- `actionId` dan `startRequestId` tetap UUID/string idempotency dari frontend.
- Timestamp disimpan sebagai BSON `Date` dalam UTC.
- Semua document yang berubah memiliki `createdAt`; document mutable juga memiliki `updatedAt`.
- Password plaintext, JWT lengkap, JWT signing secret, dan provider AI API key tidak pernah disimpan.
- State lama dengan `version !== 4` ditolak; tidak dimigrasikan diam-diam.

### Catatan penerapan perubahan nama REF

Jika index versi lama sudah pernah dibuat di Atlas pada field `runId`/`rulesetId`, jangan langsung menjalankan setup index dengan data lama. Migrasikan field dokumen ke `gameRunId`/`gameRulesetId`, verifikasi hasilnya, lalu hapus index lama secara manual sebelum menjalankan `npm.cmd run db:indexes`. Script tidak menghapus atau mengubah data/index lama secara otomatis.

## 2. Daftar collection

| Collection | Fungsi |
|---|---|
| `users` | Identitas, password hash, save aktif, history ringkas |
| `sessions` | Single active session tujuh hari |
| `game_rulesets` | Metadata ruleset immutable |
| `game_runs` | Snapshot state lengkap satu permainan |
| `game_actions` | Audit action sukses dan idempotency |
| `game_properties` | Delapan snapshot stat per revision |
| `event_data` | Katalog narasi event tervalidasi |
| `runs_event` | Event yang dialokasikan ke satu run |
| `game_reports` | Battle report immutable per wave |
| `auth_rate_limits` | Opsional: rate limit persisten jika Vercel firewall tidak dipakai |

## 3. `users`

```ts
type UserDocument = {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  saveGame: null | {
    gameRunId: ObjectId;
    savedRevision: number;
    savedAt: Date;
  };
  gameHistory: Array<{
    gameRunId: ObjectId;
    result: "victory" | "gameOver";
    endedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};
```

Aturan:

- `username` sudah dinormalisasi lowercase dan trim.
- `passwordHash` adalah hasil bcrypt dengan cost factor yang dikonfigurasi server.
- `saveGame` hanya pointer; state lengkap tetap di `game_runs`.
- Satu run hanya boleh masuk history satu kali.
- History panjang dapat dipindahkan ke collection terpisah setelah MVP; bukan kebutuhan prototype.

Indeks:

```text
unique { username: 1 }
```

## 4. `sessions`

```ts
type SessionDocument = {
  _id: ObjectId;
  userId: ObjectId;
  jti: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  userAgentHash?: string;
};
```

Aturan:

- Browser hanya menerima JWT lengkap melalui cookie `HttpOnly`.
- Database menyimpan identifier `jti`, bukan JWT lengkap.
- JWT claim `sub` berisi hex string dari `userId`; `jti` harus cocok dengan dokumen session aktif.
- Expiry tetap tujuh hari sejak login; tidak sliding.
- Login sukses mencabut session lama sebelum membuat session baru.
- Satu user memiliki maksimal satu session aktif.

Indeks:

```text
unique { userId: 1 }
unique { jti: 1 }
TTL    { expiresAt: 1 } expireAfterSeconds: 0
```

## 5. `game_rulesets`

```ts
type GameRulesetDocument = {
  _id: ObjectId;
  rulesetId: string;
  engineVersion: string;
  stateVersion: 4;
  configFingerprint: string;
  status: "active" | "retired";
  createdAt: Date;
};
```

Aturan MVP:

- Ruleset hanya metadata dan audit compatibility.
- Engine tetap membaca config source code.
- Document ruleset yang sudah digunakan run immutable.
- Perubahan balancing membuat ruleset metadata baru.
- Existing `rulesetId` dengan fingerprint berbeda harus ditolak; fingerprint lama tidak boleh ditimpa.

Indeks:

```text
unique { rulesetId: 1 }
```

## 6. `game_runs`

```ts
type TimelineCategory = "city" | "battle" | "event";
type TimelineTone = "city" | "gain" | "loss" | "neutral";

type TimelineEntry = {
  id: string;
  day: number;
  category: TimelineCategory;
  tone: TimelineTone;
  icon: string;
  highlight?: string;
  text: string;
};

type GameRunDocument = {
  _id: ObjectId;
  userId: ObjectId;
  gameRulesetId: ObjectId;
  startRequestId: string;
  startRequestPayloadHash: string;
  state: GameState;
  timeline: TimelineEntry[];
  createdAt: Date;
  updatedAt: Date;
  endedAt: Date | null;
};
```

Aturan:

- `state.runId === _id.toHexString()`.
- `state.version === 4` dan `state.difficulty` adalah `easy`, `normal`, atau `hard`.
- `state.eventPlan` berisi 20 scheduled event tepercaya yang direkonstruksi dari `state.runId` dan `state.difficulty`.
- `state.pendingConsequences` serta active consequence event divalidasi terhadap package engine tepercaya.
- `state.rewardsChosenByWave` menyimpan reward pilihan untuk wave 1-9; field legacy `rewardChosenId` tidak digunakan.
- `state.revision` hanya dinaikkan engine.
- `timeline` disimpan di top-level run, bukan di dalam `GameState`, dan berurutan paling lama ke paling baru.
- Run baru memakai `timeline: []`; dokumen lama tanpa field dinormalisasi sebagai `[]` saat read.
- ID entry berbentuk `${actionId}:${index}` dan append terjadi atomik bersama update revision.
- Timeline hanya dibuat backend dari hasil action sukses; request frontend tidak boleh memasok entry.
- Backend tidak menyimpan total attack/defense ke state.
- Run selesai immutable untuk gameplay.
- `startRequestPayloadHash` mendeteksi penggunaan ID sama dengan payload berbeda.

Indeks:

```text
unique { userId: 1, startRequestId: 1 }
index  { userId: 1, updatedAt: -1 }
index  { userId: 1, endedAt: 1 }
```

Optimistic update filter:

```ts
{
  _id: runId,
  userId,
  "state.revision": expectedRevision,
}
```

## 7. `game_actions`

```ts
type GameActionType =
  | "upgradeWall"
  | "upgradeTroops"
  | "upgradeCity"
  | "repairCity"
  | "endPreparationDay"
  | "chooseEventOption"
  | "startBattle"
  | "continueFromReport"
  | "chooseReward"
  | "surrender"
  | "attachActiveEvent";

type GameActionDocument = {
  _id: ObjectId;
  gameRunId: ObjectId;
  userId: ObjectId;
  actionId: string;
  type: GameActionType;
  payload: Record<string, unknown>;
  payloadHash: string;
  revisionBefore: number;
  revisionAfter: number;
  createdAt: Date;
};
```

Aturan:

- Hanya action sukses yang mengubah state dicatat.
- `revisionAfter === revisionBefore + 1`.
- Action gagal/no-op tidak membuat log sukses.
- `payload` hanya field command aman; tidak menyimpan cookie, password, atau secret.
- `payloadHash` mendeteksi reuse actionId dengan payload berbeda.
- `attachActiveEvent` adalah helper internal backend/engine dan tidak diterima endpoint action publik.
- `surrender` adalah action publik dengan payload kosong; action sukses menghasilkan final state `gameOver`.

Indeks:

```text
unique { gameRunId: 1, actionId: 1 }
unique { gameRunId: 1, revisionAfter: 1 }
index  { gameRunId: 1, createdAt: 1 }
```

## 8. `game_properties`

Satu document mewakili satu stat pada satu revision.

```ts
type GamePropertyKey =
  | "gold"
  | "cityHp"
  | "cityMaxHp"
  | "wallLevel"
  | "troopLevel"
  | "cityLevel"
  | "attack"
  | "defense";

type GamePropertyDocument = {
  _id: ObjectId;
  gameRunId: ObjectId;
  gameActionId: ObjectId | null;
  revision: number;
  statKey: GamePropertyKey;
  statValue: number;
  createdAt: Date;
};
```

Aturan:

- Revision 0 memiliki `gameActionId: null`.
- Setiap revision sukses menghasilkan tepat delapan document.
- `attack` dan `defense` berasal dari selector engine untuk state pada revision itu.
- Properties untuk audit; load utama tetap memakai `game_runs.state`.

Indeks:

```text
unique { gameRunId: 1, revision: 1, statKey: 1 }
index  { gameActionId: 1 }
```

## 9. `event_data`

```ts
type EventDataDocument = {
  _id: ObjectId;
  gameRulesetId: ObjectId;
  packageId: string;
  day: number;
  narrative: {
    title: string;
    description: string;
    choices: Array<{ id: string; label: string }>; // 2-4
  };
  source: "ai" | "fallback" | "mock";
  model?: string;
  promptVersion: string;
  schemaVersion: 1;
  validationStatus: "valid";
  createdAt: Date;
};
```

Aturan:

- Tidak menyimpan arbitrary cost/effects dari model.
- `packageId`, day, dan choice IDs diverifikasi terhadap engine package.
- Katalog valid dapat dipakai banyak run.
- Document yang sudah dirujuk run tidak diedit; buat variasi baru.
- Tidak menyimpan raw API key, username pemain, atau data pribadi.

Indeks:

```text
index { gameRulesetId: 1, packageId: 1, day: 1, createdAt: -1 }
```

Indeks ini tidak unique karena satu package dapat memiliki banyak variasi narasi.

## 10. `runs_event`

```ts
type RunEventDocument = {
  _id: ObjectId;
  gameRunId: ObjectId;
  eventDataId: ObjectId;
  eventId: string;
  packageId: string;
  day: number;
  narrativeSnapshot: {
    title: string;
    description: string;
    choices: Array<{ id: string; label: string }>; // 2-4
    source: "ai" | "fallback" | "mock";
  };
  chosenChoiceId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};
```

Aturan:

- Narrative snapshot membekukan cerita yang diterima run.
- Resolusi pilihan hanya mengubah `runs_event` milik run tersebut.
- Cost/effects tetap di engine/state; bukan sumber dari snapshot narasi.

Indeks:

```text
unique { gameRunId: 1, eventId: 1 }
index  { gameRunId: 1, day: 1 }
```

## 11. `game_reports`

```ts
type GameReportDocument = {
  _id: ObjectId;
  gameRunId: ObjectId;
  userId: ObjectId;
  wave: 1 | 2;
  day: 10 | 20;
  actionId: string;
  gameActionId: ObjectId;
  sourceRevision: number;
  battleResult: BattleResult;
  postAttack: {
    cityHp: number;
    gold: number;
    wallLevel: number;
    troopLevel: number;
    cityLevel: number;
    phase: GamePhase;
    wavesCleared: number;
    effects: ActiveEffects;
  };
  createdAt: Date;
};
```

Aturan:

- Dibuat dalam transaksi yang sama dengan action `startBattle`.
- Tetap dibuat ketika hasilnya kalah.
- Immutable setelah dibuat.
- Playback frontend membaca document ini; tidak menghitung battle ulang.

Indeks:

```text
unique { gameRunId: 1, wave: 1 }
unique { gameRunId: 1, actionId: 1 }
```

## 12. `auth_rate_limits` (opsional)

Dipakai bila rate limiting tidak sepenuhnya ditangani Vercel Firewall.

```ts
type AuthRateLimitDocument = {
  _id: ObjectId;
  key: string; // HMAC dari route + IP + optional username
  windowStart: Date;
  count: number;
  expiresAt: Date;
};
```

Indeks:

```text
unique { key: 1, windowStart: 1 }
TTL    { expiresAt: 1 } expireAfterSeconds: 0
```

Jangan menyimpan IP mentah jika hash/fingerprint cukup untuk kebutuhan rate limit.

## 13. Transaction boundaries

### Register

- Insert user.
- Unique username menangani race.
- Session tidak dibuat jika register tidak auto-login.

### Login

- Verify password sebelum transaction.
- Hapus session lama.
- Buat session baru.
- Update `lastLoginAt`.

### Create run

- Insert `game_runs` revision 0.
- Insert delapan properties revision 0.
- Update `users.saveGame`.

Create run tidak membuat `event_data` atau `runs_event`. Keduanya dibuat kemudian dalam transaksi action yang pertama kali memasuki hari event, setelah generasi AI/fallback selesai di luar transaction.

### Gameplay action

- Conditional update `game_runs` berdasarkan revision.
- Insert `game_actions`.
- Insert delapan `game_properties`.
- Update `runs_event` jika event choice.
- Insert `game_reports` jika battle.
- Update `users.saveGame` ke revision terbaru selama run masih aktif.
- Jika game selesai, set `users.saveGame` menjadi `null` serta update history/endedAt.

Semua operasi terkait harus commit atau rollback bersama.

## 14. Load consistency

Saat continue:

1. Load user dan pointer save.
2. Load `game_runs` menggunakan `_id + userId`.
3. Validasi state versi 3.
4. Pastikan `state.runId` cocok dengan `_id`.
5. Validasi ruleset fingerprint dan `eventPlan` patched state.
6. Pastikan pointer run dan revision cocok dengan state.
7. Bila membaca properties, ambil seluruh delapan dari revision yang sama.
8. Load active run event/report bila relevan.

Backend tidak menyusun state kembali dari action log atau properties.

## 15. Index initialization

- Index dibuat oleh script/fungsi idempotent backend.
- Initialization tidak dijalankan sembarang pada setiap request production.
- Hasil index setup dicatat tanpa connection string.
- Kegagalan unique index karena data kotor harus menghentikan deployment/setup dan dilaporkan.

## 16. Deletion dan retention

- MVP tidak menyediakan delete account/run melalui API publik.
- Tidak ada cascade otomatis di MongoDB.
- Jika delete ditambahkan, backend harus menghapus data turunan berdasarkan run dalam proses terkontrol.
- Session expired dibersihkan TTL index.
- Rate-limit record dibersihkan TTL index.
- Action/report/history dipertahankan untuk audit prototype kecuali kebijakan retention ditetapkan kemudian.

## 17. Acceptance schema

- Semua collection dan index dapat dibuat idempotent pada database kosong.
- Transaksi create run dan gameplay dapat di-rollback penuh.
- Dua action pada revision sama tidak dapat keduanya commit.
- Satu wave tidak dapat memiliki dua report.
- Satu revision memiliki tepat delapan properties.
- Run milik user lain tidak dapat dibaca/ditulis.
- Tidak ada secret atau token mentah di database/log.

