# API Contract — Fantasy City Defense

Status: **Engine v4 backend contract**
Versi kontrak: `1`  
Base path: `/api`  
Transport: HTTPS + JSON  
Auth: JWT dalam cookie session `HttpOnly`

Dokumen terkait:

- [Backend implementation plan](./BACKEND_IMPLEMENTATION_PLAN.md)
- [Database schema v3](./DATABASE_SCHEMA_V3.md)
- [Auth and session specification](./AUTH_SESSION_SPEC.md)
- [AI event runtime](./AI_EVENT_RUNTIME.md)
- [Game engine contract](../../docs/DEV1_CONTRACT.md)

Tipe TypeScript yang dapat langsung dipakai frontend tersedia di `../contracts/api.ts`. File kontrak ini tidak berisi kode server, credential, atau akses database.

## 1. Prinsip kontrak

- Backend menjadi sumber kebenaran state tersimpan.
- Engine menjadi sumber kebenaran aturan game.
- Frontend tidak menghitung biaya, damage, income, efek, atau transisi fase.
- Semua perubahan gameplay dikirim sebagai command dengan `actionId` dan `expectedRevision`.
- Event/choice ID berasal dari `state.eventPlan` dan `eventNarrative.choices`; ID tidak boleh dibentuk atau di-hardcode berdasarkan hari.
- Semua ID keluar API berbentuk string, termasuk `ObjectId` MongoDB yang sudah diubah menjadi hex string.
- Timestamp API menggunakan ISO 8601 UTC.
- Response tidak pernah memuat password hash, session token, connection string, API key, atau stack trace.

## 2. Response envelope

### Sukses

```ts
type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: {
    requestId: string;
    contractVersion: 1;
  };
};
```

### Gagal

```ts
type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
  meta?: {
    requestId: string;
    contractVersion: 1;
  };
};
```

`fields` hanya dipakai untuk validation error yang aman ditampilkan pada formulir. Detail internal dicatat di server log menggunakan `requestId`.

## 3. Shared view untuk frontend

```ts
type EventNarrativeView = {
  eventId: string;
  packageId: string;
  day: number;
  title: string;
  description: string;
  source: "ai" | "fallback" | "mock" | "local";
  choices: Array<{
    id: string;
    label: string;
    goldCost: number;
    effects: Effect[];
  }>; // 2-4 trusted engine choices
};

type BattleReportView = {
  id: string;
  runId: string;
  wave: number; // 1-10
  day: number; // 10, 20, ..., 100
  sourceRevision: number;
  battleResult: BattleResult;
  createdAt: string;
};

type TimelineCategory = "city" | "battle" | "event";
type TimelineTone = "city" | "gain" | "loss" | "neutral";

type TimelineEntry = {
  id: string;
  day: number;
  category: TimelineCategory;
  tone: TimelineTone;
  icon: TimelineIcon;
  highlight?: string;
  text: string;
};

type GameView = {
  state: GameState;
  stats: EffectiveStats;
  wavePreview: ReturnType<typeof getWavePreview>;
  eventNarrative: EventNarrativeView | null;
  rewardOptions: RewardOption[]; // exactly 3 in reward phase, otherwise []
  report: BattleReportView | null;
  timeline: TimelineEntry[];
};
```

Catatan:

- `state` berasal dari snapshot MongoDB yang sudah divalidasi sebagai version 4, termasuk `runId`, `difficulty`, 20-entry `eventPlan`, dan `pendingConsequences`.
- `stats` dan `wavePreview` selalu berasal dari selector engine.
- `eventNarrative` hanya mendekorasi teks/label; cost dan effects tetap dari package engine terpercaya.
- Source persisten setelah dekorasi adalah `ai`, `fallback`, atau `mock`; `local` hanya boleh muncul sementara dari engine sebelum backend mendekorasi event.
- `report` hanya tersedia jika battle terkait sudah diselesaikan.
- `timeline` selalu tersedia dalam urutan kronologis. Run baru dan dokumen lama tanpa field timeline dibaca sebagai `[]`.
- Timeline dibuat backend dari action serta snapshot sebelum/sesudah; frontend tidak mengirim atau membuat ulang entry persisten.

## 4. Auth endpoints

### `POST /api/auth/register`

Request:

```json
{
  "username": "player_01",
  "password": "secret123",
  "confirmPassword": "secret123"
}
```

Validasi:

- Username dinormalisasi dengan `trim().toLowerCase()`.
- Username 3–30 karakter: `a-z`, angka, underscore.
- Password minimum 6 dan maksimum 128 karakter.
- Konfirmasi harus sama.

Sukses: `201 Created`

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "672abc...",
      "username": "player_01",
      "hasActiveSave": false
    }
  }
}
```

Error utama:

- `VALIDATION_ERROR` — 400
- `USERNAME_TAKEN` — 409
- `RATE_LIMITED` — 429

Register tidak otomatis membuat run. Keputusan apakah register langsung login dapat ditetapkan saat review frontend; default kontrak: user diarahkan login.

### `POST /api/auth/login`

Request:

```json
{
  "username": "player_01",
  "password": "secret123"
}
```

Sukses: `200 OK`

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "672abc...",
      "username": "player_01",
      "hasActiveSave": true
    },
    "sessionExpiresAt": "2026-11-13T12:00:00.000Z"
  }
}
```

Login sukses mencabut session lama user, membuat record session `jti` baru selama tujuh hari, menandatangani JWT, dan memasangnya sebagai cookie `HttpOnly`. JWT tidak dikembalikan di body. Pesan gagal selalu umum.

Error utama:

- `INVALID_CREDENTIALS` — 401
- `RATE_LIMITED` — 429

### `POST /api/auth/logout`

Body: kosong.

Sukses: `200 OK`

```json
{
  "ok": true,
  "data": {
    "loggedOut": true
  }
}
```

Logout idempotent: cookie/session yang sudah tidak ada tetap menghasilkan respons aman dan tidak menghapus save.

### `GET /api/auth/me`

Sukses: `200 OK`

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "672abc...",
      "username": "player_01",
      "hasActiveSave": true
    },
    "sessionExpiresAt": "2026-11-13T12:00:00.000Z"
  }
}
```

Session tidak ada/expired: `401 UNAUTHENTICATED`.

## 5. Run endpoints

### `POST /api/runs`

Membuat run baru secara idempotent.

Request:

```json
{
  "startRequestId": "f749f4a6-e7bd-45de-b563-b5ae27c50d49",
  "replaceActiveSave": false,
  "difficulty": "normal"
}
```

Aturan:

- `startRequestId` dibuat frontend sekali untuk satu intent Mulai Game.
- Retry intent yang sama harus memakai ID yang sama.
- Jika save aktif ada dan `replaceActiveSave` false, server menolak.
- Jika true, pointer save berpindah ke run baru; run lama tetap tersimpan dan tidak dianggap selesai.
- Create run hanya menyimpan state awal, delapan properties revision 0, metadata ruleset, dan pointer save.
- Narasi event dibuat ketika action engine memasuki scheduled/consequence event yang dipilih engine. Jika AI tidak tersedia/gagal, fallback lokal digunakan pada action yang sama.
- Create run mengembalikan `state.eventPlan`; setiap entry berisi `day`, `packageId`, dan `eventId` yang dipilih engine secara deterministik dari `runId`.

Sukses run baru: `201 Created`. Retry run yang sudah sukses: `200 OK` dengan run yang sama.

```json
{
  "ok": true,
  "data": {
    "runId": "672def...",
    "game": {},
    "replayed": false
  }
}
```

`game` mengikuti `GameView`.

Error utama:

- `UNAUTHENTICATED` — 401
- `ACTIVE_SAVE_EXISTS` — 409
- `START_REQUEST_CONFLICT` — 409 jika ID sama membawa payload berbeda

### `GET /api/runs/current`

Mengambil save aktif milik user.

Sukses: `200 OK` dengan `{ runId, game: GameView }`.

Tidak ada save: `404 NO_ACTIVE_SAVE`.

Load tidak memanggil action engine, tidak menambah income, dan tidak menghitung battle ulang.

Ketika run mencapai `victory` atau `gameOver`, response action terakhir tetap membawa final `GameView`, tetapi pointer save aktif dihapus. Frontend menyimpan `runId` dari sesi tersebut dan memakai `GET /api/runs/:runId` bila perlu membaca kembali hasil akhirnya.

### `GET /api/runs/:runId`

Mengambil run tertentu milik user.

- `runId` adalah hex string `ObjectId`.
- Run tidak ada atau bukan milik user menghasilkan `404 RUN_NOT_FOUND`.
- Run selesai tetap dapat dibaca sebagai history/detail, tetapi tidak dapat menerima action gameplay.

## 6. Gameplay action endpoint

### `POST /api/runs/:runId/actions`

Request union:

```ts
type SubmitActionRequest =
  | BaseAction<"upgradeWall", Record<string, never>>
  | BaseAction<"upgradeTroops", Record<string, never>>
  | BaseAction<"upgradeCity", Record<string, never>>
  | BaseAction<"repairCity", Record<string, never>>
  | BaseAction<"endPreparationDay", Record<string, never>>
  | BaseAction<"chooseEventOption", { choiceId: string }>
  | BaseAction<"startBattle", Record<string, never>>
  | BaseAction<"continueFromReport", Record<string, never>>
  | BaseAction<"chooseReward", { rewardId: string }>
  | BaseAction<"surrender", Record<string, never>>;

type BaseAction<TType extends string, TPayload> = {
  actionId: string;
  expectedRevision: number;
  type: TType;
  payload: TPayload;
};
```

Contoh:

```json
{
  "actionId": "5a9d7be4-1c56-4bf4-99e0-12ca9e6efbb9",
  "expectedRevision": 7,
  "type": "upgradeTroops",
  "payload": {}
}
```

Sukses: `200 OK`

```json
{
  "ok": true,
  "data": {
    "action": {
      "actionId": "5a9d7be4-1c56-4bf4-99e0-12ca9e6efbb9",
      "type": "upgradeTroops",
      "revisionBefore": 7,
      "revisionAfter": 8
    },
    "game": {}
  }
}
```

`game` mengikuti `GameView` dari state setelah commit.

### Mapping action ke engine

| `type` | Payload | Engine |
|---|---|---|
| `upgradeWall` | `{}` | `upgradeWall(state)` |
| `upgradeTroops` | `{}` | `upgradeTroops(state)` |
| `upgradeCity` | `{}` | `upgradeCity(state)` |
| `repairCity` | `{}` | `repairCity(state)` |
| `endPreparationDay` | `{}` | `endPreparationDay(state)` |
| `chooseEventOption` | `{ choiceId }` | `chooseEventOption(state, choiceId)` |
| `startBattle` | `{}` | `startBattle(state)` |
| `continueFromReport` | `{}` | `continueFromReport(state)` |
| `chooseReward` | `{ rewardId }` | `chooseReward(state, rewardId)` |
| `surrender` | `{}` | `surrender(state)` |

Frontend tidak dapat mengirim `attachActiveEvent`, `ensureLocalEvent`, state baru, cost, damage, effects, atau revision baru.

`surrender` mengakhiri run aktif sebagai `gameOver`. Response sukses tetap membawa final `GameView`; backend mengisi `endedAt`, mencatat history, dan menghapus active-save pointer melalui jalur transaksi final-state yang sama. Frontend tidak mengirim alasan surrender atau nilai state tambahan.

Untuk `chooseEventOption`, frontend wajib mengirim `choiceId` yang dibaca dari `game.eventNarrative.choices`. Legacy ID seperti `day3-skip` tidak menjadi kontrak dan tidak boleh diasumsikan tersedia pada run tertentu.

## 7. Idempotency dan retry

### Action sukses tetapi respons hilang

Frontend mengirim ulang request yang identik dengan `actionId` yang sama. Backend mencari action log dan mengembalikan `200` dengan metadata action yang sudah commit serta `GameView` tersimpan saat ini. State, revision, action log, dan timeline tidak diterapkan ulang.

Jika `actionId` yang sama digunakan dengan `type` atau `payload` berbeda, backend mengembalikan `409 ACTION_PAYLOAD_CONFLICT`.

Frontend mengganti game view lokal dengan response replay sukses tersebut. Tidak perlu request GET tambahan hanya untuk retry identik.

### Dua klik berbeda dari revision sama

Request pertama yang commit menang. Request kedua menghasilkan `409 STALE_REVISION` dengan `error.fields.currentRevision`. Frontend reload current game dan tidak mengubah ID request lama menjadi intent baru otomatis.

### Action ditolak engine

Tidak ada write dan revision tidak berubah. Error code stabil engine diteruskan, misalnya:

- `INVALID_PHASE`
- `INVALID_TRANSITION`
- `EVENT_REQUIRED`
- `NO_ACTION_LEFT`
- `INSUFFICIENT_GOLD`
- `MAX_UPGRADE`
- `HP_FULL`
- `INVALID_CHOICE`
- `EVENT_ALREADY_RESOLVED`
- `REWARD_ALREADY_CHOSEN`
- `BATTLE_INVALID`
- `BATTLE_ALREADY_RESOLVED`
- `GAME_ENDED`

## 8. HTTP status dan error code

| HTTP | Code | Keterangan |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Body/path/query tidak valid |
| 401 | `UNAUTHENTICATED` | Session tidak ada/expired/dicabut |
| 401 | `INVALID_CREDENTIALS` | Username/password tidak sesuai |
| 404 | `RUN_NOT_FOUND` | Run tidak ada atau bukan milik user |
| 404 | `NO_ACTIVE_SAVE` | User belum memiliki save aktif |
| 409 | `USERNAME_TAKEN` | Username sudah dipakai |
| 409 | `ACTIVE_SAVE_EXISTS` | New game perlu konfirmasi replace |
| 409 | `ACTION_PAYLOAD_CONFLICT` | `actionId` dipakai ulang dengan type/payload berbeda |
| 409 | `STALE_REVISION` | Expected revision tidak cocok |
| 409 | `UNSUPPORTED_STATE_VERSION` | Save bukan versi 3 |
| 409 | `RUN_INTEGRITY_ERROR` | `state.runId`, ruleset, atau bentuk patched state tidak konsisten |
| 409 | `SAVE_POINTER_MISMATCH` | Pointer active save tidak cocok dengan run/revision tersimpan |
| 409/422 | engine code | Action game ditolak engine |
| 429 | `RATE_LIMITED` | Terlalu banyak request |
| 500 | `INTERNAL_ERROR` | Error tak terduga |
| 503 | `SERVICE_UNAVAILABLE` | Dependency wajib tidak tersedia |

## 9. Kewajiban frontend

- Menggunakan JWT cookie session; tidak membaca cookie dengan JavaScript dan tidak menyimpan token auth di localStorage.
- Membuat `startRequestId` satu kali per intent Mulai Game.
- Membuat `actionId` satu kali per intent action.
- Menyimpan ID yang sama selama retry request yang sama.
- Mengirim `expectedRevision` dari state server terakhir.
- Menonaktifkan double-click saat request berjalan, tetapi tetap mengandalkan backend untuk keamanan.
- Mengganti local game view dengan response server setelah sukses.
- Menggunakan `game.timeline` dari response create/load/action sebagai sumber timeline persisten.
- Reload state pada `STALE_REVISION`; retry identik yang sukses langsung mengganti view lokal.
- Menampilkan error berdasarkan `error.code`, bukan parsing message.
- Tidak menghitung cost, damage, efek, atau state hasil secara lokal.

## 10. Perubahan kontrak

- Backend menjadi pemilik `contracts/**`.
- Perubahan breaking harus direview frontend sebelum merge.
- Contoh request/response dan Postman collection harus diperbarui bersama kontrak.
- Perubahan field wajib menaikkan versi kontrak bila frontend lama tidak kompatibel.
- Tidak ada field kontrak yang dihapus diam-diam.

## 11. Acceptance contract

- Semua endpoint mengembalikan response envelope konsisten.
- Auth cookie tidak dapat dibaca JavaScript browser.
- Ownership diperiksa pada setiap endpoint run.
- Retry tidak menggandakan action, income, event, battle, atau reward.
- Frontend dapat memainkan hari 1–20 hanya melalui endpoint pada dokumen ini.

