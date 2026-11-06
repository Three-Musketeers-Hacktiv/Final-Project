import { Db, MongoClient } from "mongodb";

import { getServerEnv } from "@/server/config/env";

type MongoGlobal = typeof globalThis & {
  __cityDefenseMongoClientPromise?: Promise<MongoClient>;
};

const mongoGlobal = globalThis as MongoGlobal;

function createClientPromise(): Promise<MongoClient> {
  const env = getServerEnv();
  const client = new MongoClient(env.MONGODB_URI, {
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS,
  });

  return client.connect();
}

export function getMongoClient(): Promise<MongoClient> {
  if (!mongoGlobal.__cityDefenseMongoClientPromise) {
    mongoGlobal.__cityDefenseMongoClientPromise = createClientPromise().catch((error) => {
      delete mongoGlobal.__cityDefenseMongoClientPromise;
      throw error;
    });
  }

  return mongoGlobal.__cityDefenseMongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const env = getServerEnv();
  const client = await getMongoClient();
  return client.db(env.MONGODB_DB_NAME);
}

export async function pingDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.command({ ping: 1 });
}
