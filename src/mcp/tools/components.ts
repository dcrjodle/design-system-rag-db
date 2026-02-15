import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../../db/index.js";
import {
  components,
  componentDependencies,
  componentTokenUsage,
  componentChangeLog,
  tokens,
} from "../../db/schema.js";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function error(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }], isError: true as const };
}

export function registerComponentTools(server: McpServer) {
  server.tool(
    "get_component",
    "Get a component by name or id",
    { name: z.string().optional(), id: z.number().optional() },
    async ({ name, id }) => {
      try {
        if (!name && !id) return error("Provide either name or id");
        const row = await db
          .select()
          .from(components)
          .where(id ? eq(components.id, id) : eq(components.name, name!))
          .limit(1);
        if (!row.length) return json({ error: "Not found" });
        const { embedding, ...rest } = row[0];
        return json(rest);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Failed to get component");
      }
    }
  );

  server.tool(
    "list_components",
    "List components, optionally filtered by tier",
    { tier: z.enum(["atom", "molecule", "organism"]).optional() },
    async ({ tier }) => {
      try {
        const q = db
          .select({
            id: components.id,
            name: components.name,
            tier: components.tier,
            version: components.version,
            source: components.source,
            updatedAt: components.updatedAt,
          })
          .from(components);

        const rows = tier
          ? await q.where(eq(components.tier, tier))
          : await q;

        return json(rows);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Failed to list components");
      }
    }
  );

  server.tool(
    "get_component_dependencies",
    "Get the child components used by a given component",
    { name: z.string() },
    async ({ name }) => {
      try {
        const parent = await db.select({ id: components.id }).from(components).where(eq(components.name, name)).limit(1);
        if (!parent.length) return json({ error: "Not found" });

        const rows = await db
          .select({
            id: components.id,
            name: components.name,
            tier: components.tier,
            context: componentDependencies.context,
          })
          .from(componentDependencies)
          .innerJoin(components, eq(components.id, componentDependencies.childId))
          .where(eq(componentDependencies.parentId, parent[0].id));

        return json(rows);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Failed to get dependencies");
      }
    }
  );

  server.tool(
    "get_component_dependents",
    "Get the parent components that use a given component",
    { name: z.string() },
    async ({ name }) => {
      try {
        const child = await db.select({ id: components.id }).from(components).where(eq(components.name, name)).limit(1);
        if (!child.length) return json({ error: "Not found" });

        const rows = await db
          .select({
            id: components.id,
            name: components.name,
            tier: components.tier,
            context: componentDependencies.context,
          })
          .from(componentDependencies)
          .innerJoin(components, eq(components.id, componentDependencies.parentId))
          .where(eq(componentDependencies.childId, child[0].id));

        return json(rows);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Failed to get dependents");
      }
    }
  );

  server.tool(
    "get_component_tokens",
    "Get the design tokens used by a component",
    { name: z.string() },
    async ({ name }) => {
      try {
        const comp = await db.select({ id: components.id }).from(components).where(eq(components.name, name)).limit(1);
        if (!comp.length) return json({ error: "Not found" });

        const rows = await db
          .select({
            tokenId: tokens.id,
            tokenName: tokens.name,
            category: tokens.category,
            value: tokens.value,
            property: componentTokenUsage.property,
          })
          .from(componentTokenUsage)
          .innerJoin(tokens, eq(tokens.id, componentTokenUsage.tokenId))
          .where(eq(componentTokenUsage.componentId, comp[0].id));

        return json(rows);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Failed to get tokens");
      }
    }
  );

  server.tool(
    "get_component_history",
    "Get the change log for a component",
    { name: z.string(), limit: z.number().optional() },
    async ({ name, limit }) => {
      try {
        const comp = await db.select({ id: components.id }).from(components).where(eq(components.name, name)).limit(1);
        if (!comp.length) return json({ error: "Not found" });

        const rows = await db
          .select()
          .from(componentChangeLog)
          .where(eq(componentChangeLog.componentId, comp[0].id))
          .orderBy(componentChangeLog.createdAt)
          .limit(limit ?? 20);

        return json(rows);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Failed to get history");
      }
    }
  );
}
