import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerComponentTools } from "./tools/components.js";
import { registerTokenTools } from "./tools/tokens.js";
import { registerSearchTools } from "./tools/search.js";
import { registerSyncTools } from "./tools/sync.js";

export function createServer() {
  const server = new McpServer({
    name: "design-system-rag-db",
    version: "1.0.0",
  });

  registerComponentTools(server);
  registerTokenTools(server);
  registerSearchTools(server);
  registerSyncTools(server);

  return server;
}
