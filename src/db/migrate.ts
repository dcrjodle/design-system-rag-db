import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migrations complete.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
