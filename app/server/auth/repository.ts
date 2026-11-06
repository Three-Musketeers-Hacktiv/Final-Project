import { MongoServerError, ObjectId } from "mongodb";

import { getDatabase, getMongoClient } from "@/server/db/mongodb";
import { ApiError } from "@/server/http/api-error";
import type { SessionDocument, UserDocument } from "@/server/auth/types";

export async function createUser(username: string, passwordHash: string): Promise<UserDocument> {
  const database = await getDatabase();
  const now = new Date();
  const user: UserDocument = {
    _id: new ObjectId(),
    username,
    passwordHash,
    saveGame: null,
    gameHistory: [],
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  try {
    await database.collection<UserDocument>("users").insertOne(user);
    return user;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new ApiError(409, "USERNAME_TAKEN", "Username is already registered");
    }
    throw error;
  }
}

export async function findUserByUsername(username: string): Promise<UserDocument | null> {
  const database = await getDatabase();
  return database.collection<UserDocument>("users").findOne({ username });
}

export async function findUserById(userId: ObjectId): Promise<UserDocument | null> {
  const database = await getDatabase();
  return database.collection<UserDocument>("users").findOne({ _id: userId });
}

export async function replaceUserSession(
  userId: ObjectId,
  jti: string,
  expiresAt: Date,
  userAgentHash?: string,
): Promise<SessionDocument> {
  const client = await getMongoClient();
  const database = await getDatabase();
  const transaction = client.startSession();
  const now = new Date();
  const sessionDocument: SessionDocument = {
    _id: new ObjectId(),
    userId,
    jti,
    createdAt: now,
    expiresAt,
    lastSeenAt: now,
    ...(userAgentHash ? { userAgentHash } : {}),
  };

  try {
    await transaction.withTransaction(async () => {
      await database.collection<SessionDocument>("sessions").deleteMany({ userId }, { session: transaction });
      await database.collection<SessionDocument>("sessions").insertOne(sessionDocument, { session: transaction });
      await database.collection<UserDocument>("users").updateOne(
        { _id: userId },
        { $set: { lastLoginAt: now, updatedAt: now } },
        { session: transaction },
      );
    });
  } finally {
    await transaction.endSession();
  }

  return sessionDocument;
}

export async function findActiveSession(userId: ObjectId, jti: string): Promise<SessionDocument | null> {
  const database = await getDatabase();
  return database.collection<SessionDocument>("sessions").findOne({
    userId,
    jti,
    expiresAt: { $gt: new Date() },
  });
}

export async function deleteSession(userId: ObjectId, jti: string): Promise<void> {
  const database = await getDatabase();
  await database.collection<SessionDocument>("sessions").deleteOne({ userId, jti });
}
