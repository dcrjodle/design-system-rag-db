import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./mcp/server.js";
import { fork, execSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export { createServer } from "./mcp/server.js";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export interface ServerConfig {
  databaseUrl?: string;
  embeddingProvider?: "ollama" | "openai";
  embeddingDimensions?: string;
  ollamaHost?: string;
  ollamaModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  skipDocker?: boolean;
  skipMigrations?: boolean;
}

function applyConfig(config?: ServerConfig) {
  if (!config) return;
  if (config.databaseUrl) process.env.DATABASE_URL = config.databaseUrl;
  if (config.embeddingProvider)
    process.env.EMBEDDING_PROVIDER = config.embeddingProvider;
  if (config.embeddingDimensions)
    process.env.EMBEDDING_DIMENSIONS = config.embeddingDimensions;
  if (config.ollamaHost) process.env.OLLAMA_HOST = config.ollamaHost;
  if (config.ollamaModel) process.env.OLLAMA_MODEL = config.ollamaModel;
  if (config.openaiApiKey) process.env.OPENAI_API_KEY = config.openaiApiKey;
  if (config.openaiModel) process.env.OPENAI_MODEL = config.openaiModel;
}

export async function ensureDb(config?: ServerConfig) {
  applyConfig(config);

  if (!config?.skipDocker) {
    const compose = join(pkgRoot, "docker-compose.yml");
    execSync(`docker compose -f "${compose}" up -d --wait`, {
      stdio: "inherit",
    });
  }

  if (!config?.skipMigrations) {
    const client = postgres(process.env.DATABASE_URL!, { max: 1 });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: join(pkgRoot, "drizzle") });
    await client.end();
  }
}

export async function startServer(config?: ServerConfig) {
  await ensureDb(config);
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}

export function spawn(config?: ServerConfig): ChildProcess {
  const cli = join(dirname(fileURLToPath(import.meta.url)), "cli.js");

  const env: Record<string, string> = { ...process.env } as Record<
    string,
    string
  >;
  if (config?.databaseUrl) env.DATABASE_URL = config.databaseUrl;
  if (config?.embeddingProvider)
    env.EMBEDDING_PROVIDER = config.embeddingProvider;
  if (config?.embeddingDimensions)
    env.EMBEDDING_DIMENSIONS = config.embeddingDimensions;
  if (config?.ollamaHost) env.OLLAMA_HOST = config.ollamaHost;
  if (config?.ollamaModel) env.OLLAMA_MODEL = config.ollamaModel;
  if (config?.openaiApiKey) env.OPENAI_API_KEY = config.openaiApiKey;
  if (config?.openaiModel) env.OPENAI_MODEL = config.openaiModel;

  return fork(cli, [], { env, stdio: "pipe" });
}
