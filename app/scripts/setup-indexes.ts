import { loadEnvConfig } from "@next/env";

import { ensureDatabaseIndexes } from "../server/db/indexes";
import { getDatabase, getMongoClient } from "../server/db/mongodb";

async function main() {
  loadEnvConfig(process.cwd());
  const database = await getDatabase();
  await ensureDatabaseIndexes(database);
  console.info(`MongoDB indexes are ready for database: ${database.databaseName}`);
  const client = await getMongoClient();
  await client.close();
}

main().catch((error) => {
  console.error("MongoDB index setup failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
