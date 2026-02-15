import { z } from "zod";
import { eq } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../../db/index.js";
import { tokens, componentTokenUsage, components } from "../../db/schema.js";
import { getEmbedder } from "../../embeddings/index.js";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function error(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }], isError: true as const };
}

export function registerTokenTools(server: McpServer) {
  server.tool(
    "add_token",
    "Insert a new design token",
    {
      name: z.string(),
      category: z.string(),
      value: z.string(),
      description: z.string().optional(),
    },
    async ({ name, category, value, description }) => {
      try {
        const embedder = getEmbedder();
        const embedding = await embedder.embed([name, category, description].filter(Boolean).join(" — "));

        const [row] = await db
          .insert(tokens)
          .values({ name, category, value, description, embedding })
          .returning();

        const { embedding: _, ...rest } = row;
        return json(rest);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Failed to add token");
      }
    }
  );

  server.tool(
    "get_token_usage",
    "Get which components use a given design token",
    { name: z.string() },
    async ({ name }) => {
      try {
        const token = await db.select({ id: tokens.id }).from(tokens).where(eq(tokens.name, name)).limit(1);
        if (!token.length) return json({ error: "Not found" });

        const rows = await db
          .select({
            componentId: components.id,
            componentName: components.name,
            tier: components.tier,
            property: componentTokenUsage.property,
          })
          .from(componentTokenUsage)
          .innerJoin(components, eq(components.id, componentTokenUsage.componentId))
          .where(eq(componentTokenUsage.tokenId, token[0].id));

        return json(rows);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Failed to get token usage");
      }
    }
  );
}
