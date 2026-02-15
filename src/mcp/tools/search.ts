import { z } from "zod";
import { and, eq, cosineDistance, desc, gt, sql } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../../db/index.js";
import { components, tokens } from "../../db/schema.js";
import { getEmbedder } from "../../embeddings/index.js";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function error(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }], isError: true as const };
}

export function registerSearchTools(server: McpServer) {
  server.tool(
    "search_components",
    "Semantic search across components using natural language",
    {
      query: z.string(),
      tier: z.enum(["atom", "molecule", "organism"]).optional(),
      limit: z.number().optional(),
      threshold: z.number().optional(),
    },
    async ({ query, tier, limit, threshold }) => {
      try {
        const embedder = getEmbedder();
        const queryEmbedding = await embedder.embed(query);
        const minScore = threshold ?? 0.3;

        const similarity = sql<number>`1 - (${cosineDistance(components.embedding, queryEmbedding)})`;

        const whereClause = tier
          ? and(gt(similarity, minScore), eq(components.tier, tier))
          : gt(similarity, minScore);

        const rows = await db
          .select({
            id: components.id,
            name: components.name,
            tier: components.tier,
            usageRules: components.usageRules,
            requirements: components.requirements,
            examples: components.examples,
            similarity,
          })
          .from(components)
          .where(whereClause)
          .orderBy(desc(similarity))
          .limit(limit ?? 10);

        return json(rows);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Search failed");
      }
    }
  );

  server.tool(
    "search_tokens",
    "Semantic search across design tokens using natural language",
    {
      query: z.string(),
      limit: z.number().optional(),
      threshold: z.number().optional(),
    },
    async ({ query, limit, threshold }) => {
      try {
        const embedder = getEmbedder();
        const queryEmbedding = await embedder.embed(query);
        const minScore = threshold ?? 0.3;

        const similarity = sql<number>`1 - (${cosineDistance(tokens.embedding, queryEmbedding)})`;

        const rows = await db
          .select({
            id: tokens.id,
            name: tokens.name,
            category: tokens.category,
            value: tokens.value,
            description: tokens.description,
            similarity,
          })
          .from(tokens)
          .where(gt(similarity, minScore))
          .orderBy(desc(similarity))
          .limit(limit ?? 10);

        return json(rows);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Search failed");
      }
    }
  );
}
