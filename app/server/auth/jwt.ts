import { jwtVerify, SignJWT } from "jose";

import { getServerEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/api-error";

export type JwtConfig = {
  secret: string;
  issuer: string;
  audience: string;
  ttlSeconds: number;
};

export type SessionPrincipal = {
  userId: string;
  jti: string;
  expiresAt: Date;
};

function defaultJwtConfig(): JwtConfig {
  const env = getServerEnv();
  return {
    secret: env.JWT_SECRET,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    ttlSeconds: env.SESSION_TTL_SECONDS,
  };
}

function signingKey(config: JwtConfig): Uint8Array {
  return new TextEncoder().encode(config.secret);
}

export async function signSessionJwt(
  userId: string,
  jti: string,
  now = new Date(),
  config = defaultJwtConfig(),
): Promise<{ token: string; expiresAt: Date }> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = new Date((issuedAt + config.ttlSeconds) * 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(signingKey(config));

  return { token, expiresAt };
}

export async function verifySessionJwt(
  token: string,
  config = defaultJwtConfig(),
): Promise<SessionPrincipal> {
  try {
    const { payload } = await jwtVerify(token, signingKey(config), {
      algorithms: ["HS256"],
      issuer: config.issuer,
      audience: config.audience,
    });

    if (
      typeof payload.sub !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.sub) ||
      typeof payload.jti !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.jti) ||
      typeof payload.iat !== "number" ||
      !payload.exp
    ) {
      throw new Error("JWT claims are incomplete");
    }

    return {
      userId: payload.sub,
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }
}
