# AI Event Runtime Specification

Status: **Draft untuk review backend dan game-engine developer**  
Pemilik: Backend  
Terakhir diperbarui: 2026-11-06

## 1. Tujuan dan batas tanggung jawab

Runtime AI digunakan untuk menghasilkan narasi event ketika game dimulai atau ketika event baru perlu disiapkan. AI **bukan** sumber kebenaran aturan permainan.

- Game engine menentukan efek, biaya, syarat, damage, attack, defense, dan hasil aksi.
- Backend memilih data event tepercaya, meminta variasi narasi kepada AI, memvalidasi respons, lalu menyimpannya.
- Frontend hanya menampilkan narasi dan pilihan yang sudah dikembalikan backend.
- Kegagalan AI tidak boleh membuat permainan gagal dimulai atau dilanjutkan.

## 2. Integrasi OpenAI

Implementasi memakai:

- SDK resmi OpenAI untuk JavaScript/TypeScript.
- Responses API.
- Structured Outputs dengan schema Zod.
- API key dan model dari environment variable agar akun atau project OpenAI dapat diganti tanpa perubahan kode.

Environment variable terkait:

| Variable | Wajib | Default rekomendasi | Keterangan |
|---|---:|---|---|
| `OPENAI_API_KEY` | Ya pada runtime AI | - | Secret server-side; tidak boleh memakai prefix `NEXT_PUBLIC_`. |
| `OPENAI_MODEL` | Ya | ditentukan saat setup | Model dapat diganti oleh developer/deployment owner. |
| `OPENAI_TIMEOUT_MS` | Tidak | `10000` | Batas waktu satu permintaan. |
| `OPENAI_MAX_RETRIES` | Tidak | `1` | Retry aplikasi setelah kegagalan sementara. |
| `OPENAI_MAX_OUTPUT_TOKENS` | Tidak | `800` | Pembatas keluaran narasi. |
| `OPENAI_PROMPT_VERSION` | Tidak | `event-v1` | Versi prompt untuk audit dan reproduksi. |

Untuk pengembangan lokal, setiap developer dapat memakai key dari project OpenAI miliknya. Untuk production, gunakan project service account khusus aplikasi dan simpan key hanya pada Vercel Environment Variables.

## 3. Kontrak output AI

Contoh schema awal:

```ts
import { z } from "zod";

export const GeneratedEventNarrativeSchema = z.object({
  title: z.string(),
  description: z.string(),
  choices: z.tuple([
    z.object({
      id: z.string(),
      label: z.string(),
    }),
    z.object({
      id: z.string(),
      label: z.string(),
    }),
  ]),
});
```

Ketentuan schema Structured Outputs:

- Root schema berupa object, bukan union/`anyOf`.
- Semua field dinyatakan required.
- Object tidak menerima property tambahan.
- Validasi bisnis tambahan tetap dilakukan setelah parsing, misalnya panjang teks, bahasa, jumlah pilihan, dan kecocokan `choice.id`.

Respons AI tidak boleh menentukan nilai numerik gameplay. `choice.id` harus cocok dengan ID pilihan tepercaya yang diberikan backend. Label boleh divariasikan, tetapi backend menggabungkannya kembali dengan cost/effect yang berasal dari katalog atau engine.

## 4. Input yang dikirim ke AI

Payload prompt minimum:

- `packageId`, `eventId`, dan versi ruleset;
- hari atau fase permainan;
- tema dan konteks kota;
- daftar ID pilihan yang diizinkan;
- ringkasan konsekuensi yang aman untuk dinarasikan;
- bahasa keluaran, default `id-ID`;
- batas panjang title, description, dan label;
- instruksi untuk tidak menambah pilihan atau aturan baru.

Jangan mengirim:

- username, password, session token, IP mentah, atau data pribadi pemain;
- secret, connection string, atau konfigurasi internal;
- input bebas pemain yang tidak disanitasi.

## 5. Alur runtime

1. Backend memuat katalog event dan aturan engine melalui adapter read-only.
2. Backend menentukan paket event yang diperlukan untuk run.
3. Untuk setiap event yang perlu dinarasikan, backend membangun prompt dari data tepercaya.
4. Permintaan AI dilakukan **sebelum** transaksi MongoDB utama agar transaksi tidak menunggu layanan eksternal.
5. Respons Structured Output diparse dan divalidasi dengan Zod.
6. Backend memastikan semua `choice.id` sama dengan pilihan tepercaya.
7. Backend menggabungkan narasi dengan cost/effect dari engine.
8. Hasil valid disimpan ke `event_data` dengan metadata model, prompt version, dan source `ai`.
9. Jika AI gagal, backend memakai fallback deterministik dan menyimpan source `fallback`.
10. Transaksi pembuatan run menyimpan referensi event yang sudah siap digunakan.

AI tidak dipanggil ulang ketika pemain melakukan retry request dengan `startRequestId` yang sama atau ketika narasi valid untuk event/run tersebut sudah tersimpan.

## 6. Fallback wajib

Fallback berasal dari template atau katalog yang ada di repository/backend, bukan dibuat saat error terjadi. Fallback harus memiliki bentuk data yang sama dengan output AI.

Fallback digunakan bila terjadi:

- timeout;
- error jaringan atau rate limit setelah retry;
- respons refusal atau tidak memiliki parsed output;
- output tidak lolos schema Zod;
- ID pilihan berubah, hilang, duplikat, atau tidak dikenal;
- model atau API key tidak tersedia pada environment non-production yang memang mengizinkan mode fallback.

Pada production demo, tidak adanya `OPENAI_API_KEY` atau `OPENAI_MODEL` harus terlihat pada preflight/deployment check. Permainan tetap memiliki fallback, tetapi status tersebut dicatat sebagai konfigurasi deployment yang tidak lengkap.

## 7. Timeout dan retry

- Timeout awal: 10 detik per permintaan.
- Retry aplikasi: maksimum satu kali hanya untuk kegagalan sementara.
- Jangan retry error schema atau respons yang secara valid ditolak model.
- Gunakan backoff singkat dengan jitter.
- Batasi concurrency agar start game tidak membuat lonjakan permintaan.
- Total waktu AI harus memiliki budget yang lebih kecil daripada timeout endpoint Vercel.

Nilai final perlu diuji di Preview Vercel dan dapat disesuaikan melalui environment variable.

## 8. Penyimpanan dan audit

Metadata minimum pada `event_data`:

```ts
type EventGenerationMetadata = {
  source: "ai" | "fallback";
  provider: "openai" | "local";
  model: string | null;
  promptVersion: string;
  generatedAt: Date;
};
```

Log operasional boleh mencatat:

- internal request/correlation ID;
- run ID dan event ID;
- model dan prompt version;
- latency;
- source `ai` atau `fallback`;
- kategori error;
- token usage bila tersedia.

Log tidak boleh memuat API key, cookie, token sesi, connection string, atau prompt lengkap yang mungkin mengandung data sensitif.

## 9. Antarmuka adapter

Kode domain tidak bergantung langsung pada SDK OpenAI.

```ts
type GenerateEventNarrativeInput = {
  eventId: string;
  day: number;
  locale: "id-ID" | "en-US";
  context: string;
  choices: Array<{
    id: string;
    consequenceSummary: string;
  }>;
};

type GenerateEventNarrativeResult = {
  narrative: z.infer<typeof GeneratedEventNarrativeSchema>;
  source: "ai" | "fallback";
  model: string | null;
  promptVersion: string;
};

interface EventNarrativeGenerator {
  generate(input: GenerateEventNarrativeInput): Promise<GenerateEventNarrativeResult>;
}
```

Adapter terpisah disiapkan untuk OpenAI, fallback lokal, dan mock test.

## 10. Pengujian

- Unit test schema output dan validasi ID pilihan.
- Unit test prompt builder tanpa snapshot secret.
- Unit test timeout, retry, refusal, invalid schema, dan fallback.
- Integration test start run memakai mock adapter agar deterministik dan gratis.
- Smoke test OpenAI asli bersifat eksplisit, tidak dijalankan pada setiap test lokal/CI, dan memakai batas biaya.
- Contract test memastikan frontend selalu menerima bentuk event yang sama untuk source `ai` maupun `fallback`.

## 11. Kriteria penerimaan

- Start run tetap berhasil saat OpenAI tidak merespons.
- Tidak ada efek gameplay yang bersumber dari teks AI.
- Output selalu lolos schema Zod dan validasi bisnis sebelum disimpan.
- Retry request tidak membuat generasi AI atau record event ganda.
- Secret hanya tersedia di server.
- Source narasi dapat diaudit sebagai `ai` atau `fallback`.

## 12. Referensi resmi

- [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart)
- [Structured Outputs dengan Responses API](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [API key dan project service account](https://developers.openai.com/api/docs/guides/api-keys)

