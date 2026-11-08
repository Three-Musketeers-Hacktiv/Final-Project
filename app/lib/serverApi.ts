import { headers } from "next/headers";
import { apiRequest } from "./api";

/**
 * Calls this app's own `/api` routes from a server component, forwarding the player's cookie,
 * so pages load through the same API contract as the browser does. Server components only.
 * Reads request headers, so the calling component must sit inside <Suspense>.
 */
export async function serverApiRequest<T>(path: string): Promise<T> {
  const cookie = (await headers()).get("cookie");
  // APP_ORIGIN, not the request's Host header: a forged Host must never receive the session cookie.
  const origin = process.env.APP_ORIGIN;
  if (!origin) throw new Error("APP_ORIGIN is not set");

  return apiRequest<T>(new URL(path, origin).toString(), { headers: cookie ? { cookie } : {} });
}
