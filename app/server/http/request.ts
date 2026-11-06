import type { ZodType } from "zod";

import { ApiError } from "@/server/http/api-error";

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType !== "application/json") {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must contain valid JSON");
  }

  return schema.parse(body);
}
