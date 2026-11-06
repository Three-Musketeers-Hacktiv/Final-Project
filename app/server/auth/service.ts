import { createHash, randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";

import { clearSessionCookie, readSessionCookie, setSessionCookie } from "@/server/auth/cookie";
import { signSessionJwt, verifySessionJwt } from "@/server/auth/jwt";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  createUser,
  deleteSession,
  findActiveSession,
  findUserById,
  findUserByUsername,
  replaceUserSession,
} from "@/server/auth/repository";
import type { LoginInput, RegisterInput } from "@/server/auth/schemas";
import { toPublicUser } from "@/server/auth/types";
import { getServerEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/api-error";

function userAgentHash(request: Request): string | undefined {
  const userAgent = request.headers.get("user-agent");
  return userAgent ? createHash("sha256").update(userAgent).digest("hex") : undefined;
}

export async function registerUser(input: RegisterInput) {
  const env = getServerEnv();
  const passwordHash = await hashPassword(input.password, env.BCRYPT_SALT_ROUNDS);
  const user = await createUser(input.username, passwordHash);
  return { user: toPublicUser(user) };
}

export async function loginUser(input: LoginInput, request: Request) {
  const user = await findUserByUsername(input.username);
  const passwordMatches = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !passwordMatches) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Username or password is incorrect");
  }

  const jti = randomUUID();
  const { token, expiresAt } = await signSessionJwt(user._id.toHexString(), jti);
  await replaceUserSession(user._id, jti, expiresAt, userAgentHash(request));

  return {
    token,
    expiresAt,
    user: toPublicUser(user),
  };
}

export async function authenticateRequest(request: Request) {
  const token = readSessionCookie(request);
  if (!token) throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");

  const principal = await verifySessionJwt(token);
  const userId = new ObjectId(principal.userId);
  const [session, user] = await Promise.all([
    findActiveSession(userId, principal.jti),
    findUserById(userId),
  ]);

  if (!session || !user) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  return { principal, session, user, publicUser: toPublicUser(user) };
}

export async function logoutUser(request: Request, response: Response): Promise<void> {
  const token = readSessionCookie(request);
  if (token) {
    try {
      const principal = await verifySessionJwt(token);
      await deleteSession(new ObjectId(principal.userId), principal.jti);
    } catch (error) {
      if (!(error instanceof ApiError && error.code === "UNAUTHENTICATED")) throw error;
    }
  }

  clearSessionCookie(response);
}

export function attachLoginCookie(response: Response, token: string, expiresAt: Date): void {
  setSessionCookie(response, token, expiresAt);
}
