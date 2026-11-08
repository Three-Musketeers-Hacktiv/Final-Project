import type { ApiResponse } from "@/contracts/api";

/** A failed API call: `code` is stable (see app/docs/API_CONTRACT.md), `message` is for logs only. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Extra headers, e.g. the forwarded cookie when called from a server component (lib/serverApi.ts). */
  headers?: Record<string, string>;
};

/**
 * Calls a same-origin `/api` route and unwraps the `{ ok, data | error }` envelope.
 * The session cookie is HttpOnly, so the browser attaches it; this code never sees the token.
 * Throws ApiError for API failures and for network errors (code `NETWORK_ERROR`).
 */
export async function apiRequest<T>(path: string, { method = "GET", body, headers }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server");
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(response.status, "INTERNAL_ERROR", "The server sent an invalid response");
  }

  if (!payload.ok) {
    throw new ApiError(response.status, payload.error.code, payload.error.message, payload.error.fields);
  }
  return payload.data;
}
