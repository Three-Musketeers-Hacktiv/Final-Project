import { decodeProtectedHeader, SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { signSessionJwt, verifySessionJwt, type JwtConfig } from "./jwt";

const config: JwtConfig = {
  secret: "test-secret-value-with-at-least-32-characters",
  issuer: "test-issuer",
  audience: "test-audience",
  ttlSeconds: 604800,
};

const userId = "690c9e50c8fd8a13507d4621";
const jti = "81f1112b-9da7-4b40-8fa6-d95fcf91d405";

describe("session JWT", () => {
  it("signs HS256 claims with a fixed seven-day expiry", async () => {
    const now = new Date("2026-11-06T12:00:00.000Z");
    const result = await signSessionJwt(userId, jti, now, config);
    const principal = await verifySessionJwt(result.token, config);

    expect(decodeProtectedHeader(result.token).alg).toBe("HS256");
    expect(principal.userId).toBe(userId);
    expect(principal.jti).toBe(jti);
    expect(result.expiresAt.toISOString()).toBe("2026-11-13T12:00:00.000Z");
  });

  it("rejects a token signed with another secret", async () => {
    const { token } = await signSessionJwt(userId, jti, new Date(), config);
    await expect(
      verifySessionJwt(token, { ...config, secret: "another-secret-value-with-at-least-32-chars" }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("rejects an unexpected signing algorithm", async () => {
    const key = new TextEncoder().encode(config.secret);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS384" })
      .setSubject(userId)
      .setJti(jti)
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);

    await expect(verifySessionJwt(token, config)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("rejects a non-UUID jti", async () => {
    const key = new TextEncoder().encode(config.secret);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setJti("predictable-session")
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);

    await expect(verifySessionJwt(token, config)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
});
