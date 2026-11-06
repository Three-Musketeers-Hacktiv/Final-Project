import { createHmac } from "node:crypto";

import { getServerEnv } from "@/server/config/env";
import { getDatabase } from "@/server/db/mongodb";
import { ApiError } from "@/server/http/api-error";

type RateLimitKind = "login" | "register";

type RateLimitDocument = {
  key: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS: Record<RateLimitKind, number> = { register: 5, login: 10 };

function requestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimitKey(kind: RateLimitKind, request: Request, username?: string): string {
  const env = getServerEnv();
  const input = `${kind}:${requestIp(request)}:${username ?? ""}`;
  return createHmac("sha256", env.JWT_SECRET).update(input).digest("hex");
}

export async function consumeAuthRateLimit(
  kind: RateLimitKind,
  request: Request,
  username?: string,
): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS);
  const expiresAt = new Date(windowStart.getTime() + WINDOW_MS * 2);
  const key = rateLimitKey(kind, request, username);
  const collection = database.collection<RateLimitDocument>("auth_rate_limits");

  await collection.updateOne(
    { key, windowStart },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true },
  );

  const current = await collection.findOne({ key, windowStart });
  if (current && current.count > MAX_ATTEMPTS[kind]) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowStart.getTime() + WINDOW_MS - now) / 1000));
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many authentication attempts. Try again later.",
      undefined,
      { "Retry-After": retryAfterSeconds.toString() },
    );
  }
}
