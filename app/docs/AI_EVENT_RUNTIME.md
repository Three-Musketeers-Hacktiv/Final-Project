# AI Event Runtime Specification

Status: **Draft untuk review backend dan game-engine developer**  
Pemilik: Backend  
Terakhir diperbarui: 2026-11-06

## 1. Tujuan dan batas tanggung jawab

Runtime AI digunakan untuk menghasilkan narasi ketika action engine memasuki event baru. Create run tidak memanggil AI. AI **bukan** sumber kebenaran aturan permainan.

- Game engine menentukan efek, biaya, syarat, damage, attack, defense, dan hasil aksi.
- Backend memilih data event tepercaya, meminta variasi narasi kepada AI, memvalidasi respons, lalu menyimpannya.
- Frontend hanya menampilkan narasi dan pilihan yang sudah dikembalikan backend.
- Kegagalan AI tidak boleh membuat action memasuki hari event gagal; fallback lokal harus tetap menghasilkan bentuk narasi yang sama.

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

Payload prompt implementasi:

- locale `id-ID`;
- `eventId` dan hari event;
- title serta description lokal dari engine;
- daftar ID pilihan, gold cost, dan effects tepercaya;
- instruksi untuk mempertahankan choice ID serta tidak menambah pilihan, biaya, efek, atau aturan gameplay.

Jangan mengirim:

- username, password, session token, IP mentah, atau data pribadi pemain;
- secret, connection string, atau konfigurasi internal;
- input bebas pemain yang tidak disanitasi.

## 5. Alur runtime

1. Frontend mengirim action `endPreparationDay` pada hari sebelum jadwal event.
2. Engine menghasilkan state berikutnya dengan `activeEvent` tepercaya.
3. Backend membangun prompt dari event tersebut.
4. Permintaan AI diselesaikan **sebelum** transaksi action MongoDB dibuka.
5. Respons Structured Output diparse dan divalidasi dengan Zod.
6. Backend memastikan kedua `choice.id` unik dan berasal dari pilihan engine.
7. Backend hanya mengganti title, description, dan label; cost/effect tetap dari engine.
8. Jika AI gagal atau tidak dikonfigurasi, backend memakai title/description/label lokal dari engine sebagai fallback.
9. Transaksi action menyimpan state, action log, properties, `event_data`, dan `runs_event` bersama-sama.

Retry yang sudah tercatat ditolak sebelum generasi narasi. Pada request konkuren, lebih dari satu panggilan provider mungkin sempat berjalan, tetapi optimistic revision dan unique index memastikan hanya satu action/event yang tersimpan.

## 6. Fallback wajib

Fallback berasal langsung dari `activeEvent` tepercaya yang dibuat engine. Fallback memiliki bentuk data yang sama dengan output AI dan tidak mengubah cost/effects.

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
- Retry SDK: maksimum satu kali sesuai `OPENAI_MAX_RETRIES`.
- Output invalid/refusal akhirnya masuk fallback; backend tidak membuka transaksi selama menunggu provider.
- Batasi concurrency action agar perpindahan ke hari event tidak membuat lonjakan permintaan.
- Total waktu AI harus memiliki budget yang lebih kecil daripada timeout endpoint Vercel.

Nilai final perlu diuji di Preview Vercel dan dapat disesuaikan melalui environment variable.

## 8. Penyimpanan dan audit

Metadata minimum pada `event_data`:

```ts
type EventGenerationMetadata = {
  source: "ai" | "fallback";
  model?: string;
  promptVersion: string;
  createdAt: Date;
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
interface EventNarrativeGenerator {
  readonly model: string | null;
  generate(event: ActiveEvent): Promise<GeneratedEventNarrative>;
}
```

Implementasi menyediakan generator OpenAI, fallback lokal, dan generator substitusi untuk unit test.

## 10. Pengujian

- Unit test dekorasi field narasi tanpa mengubah cost/effects.
- Unit test choice ID tidak tepercaya menghasilkan fallback.
- Unit test fallback ketika provider tidak dikonfigurasi dijalankan melalui flow campaign/API.
- Campaign API memakai fallback lokal agar deterministik dan gratis bila key tidak tersedia.
- Smoke test OpenAI asli bersifat eksplisit, tidak dijalankan pada setiap test lokal/CI, dan memakai batas biaya.
- Contract test memastikan frontend selalu menerima bentuk event yang sama untuk source `ai` maupun `fallback`.

## 11. Kriteria penerimaan

- Action yang memasuki hari event tetap berhasil saat OpenAI tidak dikonfigurasi atau gagal.
- Tidak ada efek gameplay yang bersumber dari teks AI.
- Output selalu lolos schema Zod dan validasi bisnis sebelum disimpan.
- Retry request yang sudah tercatat tidak membuat record event ganda; transaksi dan index tetap menjadi pengaman request konkuren.
- Secret hanya tersedia di server.
- Source narasi dapat diaudit sebagai `ai` atau `fallback`.

## 12. Referensi resmi

- [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart)
- [Structured Outputs dengan Responses API](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [API key dan project service account](https://developers.openai.com/api/docs/guides/api-keys)

