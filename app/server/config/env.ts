import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().min(1).default("city_defense_dev"),
  MONGODB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(5000),
  SESSION_COOKIE_NAME: z.string().min(1).default("city_defense_session"),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  JWT_ISSUER: z.string().min(1).default("city-defense-api"),
  JWT_AUDIENCE: z.string().min(1).default("city-defense-web"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  APP_ORIGIN: z.url(),
  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  GEMINI_API_KEY: optionalSecret,
  GEMINI_MODEL: optionalSecret,
  AI_API_KEY: optionalSecret,
  AI_MODEL: optionalSecret,
  AI_TIMEOUT_MS: z.coerce.number().int().positive().max(30000).default(10000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(4000).default(2500),
  AI_PROMPT_VERSION: z.string().min(1).default("event-advisor-en-v1"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(input: NodeJS.ProcessEnv | Record<string, unknown>): ServerEnv {
  return serverEnvSchema.parse(input);
}

let cachedEnv: ServerEnv | undefined;
let cachedEnvFingerprint: string | undefined;

function envFingerprint(env: NodeJS.ProcessEnv): string {
  return [
    env.AI_TIMEOUT_MS ?? "",
    env.AI_MAX_RETRIES ?? "",
    env.AI_MAX_OUTPUT_TOKENS ?? "",
    env.GEMINI_API_KEY ?? "",
    env.GEMINI_MODEL ?? "",
    env.AI_PROVIDER ?? "",
    env.AI_PROMPT_VERSION ?? "",
  ].join("|");
}

export function getServerEnv(): ServerEnv {
  const fingerprint = envFingerprint(process.env);
  if (!cachedEnv || cachedEnvFingerprint !== fingerprint) {
    cachedEnv = parseServerEnv(process.env);
    cachedEnvFingerprint = fingerprint;
  }

  return cachedEnv;
}

/** Clears cached env so tests can re-parse process.env. */
export function resetServerEnv(): void {
  cachedEnv = undefined;
  cachedEnvFingerprint = undefined;
}
