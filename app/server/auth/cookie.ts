import { getServerEnv } from "@/server/config/env";

function cookieBase(): { name: string; secure: boolean } {
  const env = getServerEnv();
  return {
    name: env.SESSION_COOKIE_NAME,
    secure: env.NODE_ENV !== "development" && env.NODE_ENV !== "test",
  };
}

export function readSessionCookie(request: Request): string | null {
  const { name } = cookieBase();
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date): void {
  const { name, secure } = cookieBase();
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  response.headers.append(
    "Set-Cookie",
    `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Expires=${expiresAt.toUTCString()}${secure ? "; Secure" : ""}`,
  );
}

export function clearSessionCookie(response: Response): void {
  const { name, secure } = cookieBase();
  response.headers.append(
    "Set-Cookie",
    `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure ? "; Secure" : ""}`,
  );
}
