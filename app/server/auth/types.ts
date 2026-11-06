import type { ObjectId } from "mongodb";

export type SaveGamePointer = {
  gameRunId: ObjectId;
  savedRevision: number;
  savedAt: Date;
};

export type UserDocument = {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  saveGame: SaveGamePointer | null;
  gameHistory: Array<{
    gameRunId: ObjectId;
    result: "victory" | "gameOver";
    endedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export type SessionDocument = {
  _id: ObjectId;
  userId: ObjectId;
  jti: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  userAgentHash?: string;
};

export type PublicUser = {
  id: string;
  username: string;
  hasActiveSave: boolean;
};

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toHexString(),
    username: user.username,
    hasActiveSave: user.saveGame !== null,
  };
}
