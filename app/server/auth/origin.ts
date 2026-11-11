import { getServerEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/api-error";

export function assertTrustedOrigin(request: Request): void {
  const env = getServerEnv();
  const origin = request.headers.get("origin");

  if (env.NODE_ENV === "production" && origin !== env.APP_ORIGIN) {
    throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed");
  }

  if (origin && origin !== env.APP_ORIGIN) {
    throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed");
  }
}
