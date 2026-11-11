import { ZodError } from "zod";

import { ApiError } from "@/server/http/api-error";

const CONTRACT_VERSION = 1 as const;

function requestMeta(requestId: string) {
  return { requestId, contractVersion: CONTRACT_VERSION };
}

export function apiSuccess<T>(data: T, requestId: string, init?: ResponseInit): Response {
  return Response.json(
    { ok: true, data, meta: requestMeta(requestId) },
    init,
  );
}

export function apiFailure(
  status: number,
  code: string,
  message: string,
  requestId: string,
  fields?: Record<string, string>,
  headers?: HeadersInit,
): Response {
  return Response.json(
    {
      ok: false,
      error: { code, message, ...(fields ? { fields } : {}) },
      meta: requestMeta(requestId),
    },
    { status, headers },
  );
}

function zodFields(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "request", issue.message]),
  );
}

export function handleRouteError(error: unknown, requestId: string): Response {
  if (error instanceof ApiError) {
    return apiFailure(error.status, error.code, error.message, requestId, error.fields, error.headers);
  }

  if (error instanceof ZodError) {
    return apiFailure(400, "VALIDATION_ERROR", "Request validation failed", requestId, zodFields(error));
  }

  console.error("Unhandled route error", {
    requestId,
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  return apiFailure(500, "INTERNAL_ERROR", "An unexpected error occurred", requestId);
}

export function getRequestId(request: Request): string {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}
