import { z } from "zod";
import { eq } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../../db/index.js";
import { components } from "../../db/schema.js";
import { syncComponent, bulkSync, rebuildDependencies } from "../../sync/index.js";
import { getEmbedder } from "../../embeddings/index.js";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function error(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }], isError: true as const };
}

const componentInput = {
  name: z.string(),
  tier: z.enum(["atom", "molecule", "organism"]),
  code: z.string(),
  source: z.enum(["figma", "codebase", "manual"]),
  propsSchema: z.any().optional(),
  usageRules: z.string().optional(),
  requirements: z.string().optional(),
  examples: z.string().optional(),
  version: z.string().optional(),
};

export function registerSyncTools(server: McpServer) {
  server.tool(
    "sync_component",
    "Upsert a component from any source (figma, codebase, manual). Diffs code, logs changes, detects dependencies, re-embeds.",
    componentInput,
    async (input) => {
      try {
        const result = await syncComponent(input);
        return json(result);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Sync failed");
      }
    }
  );

  server.tool(
    "bulk_sync_components",
    "Batch upsert multiple components at once",
    { components: z.array(z.object(componentInput)) },
    async ({ components: comps }) => {
      try {
        const results = await bulkSync(comps);
        return json(results);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Bulk sync failed");
      }
    }
  );

  server.tool(
    "detect_dependencies",
    "Re-parse a component's code and rebuild its dependency edges",
    { name: z.string() },
    async ({ name }) => {
      try {
        const comp = await db
          .select({ id: components.id, code: components.code })
          .from(components)
          .where(eq(components.name, name))
          .limit(1);

        if (!comp.length) return json({ error: "Not found" });

        const deps = await rebuildDependencies(comp[0].id, comp[0].code);
        return json({ name, dependencies: deps });
      } catch (e) {
        return error(e instanceof Error ? e.message : "Dependency detection failed");
      }
    }
  );

  server.tool(
    "update_component_context",
    "Update usage_rules, requirements, or examples on a component. Re-generates embedding.",
    {
      name: z.string(),
      usageRules: z.string().optional(),
      requirements: z.string().optional(),
      examples: z.string().optional(),
    },
    async ({ name, usageRules, requirements, examples }) => {
      try {
        if (!usageRules && !requirements && !examples) {
          return error("Provide at least one of usageRules, requirements, or examples");
        }

        const existing = await db
          .select()
          .from(components)
          .where(eq(components.name, name))
          .limit(1);

        if (!existing.length) return json({ error: "Not found" });

        const comp = existing[0];
        const newRules = usageRules ?? comp.usageRules;
        const newReqs = requirements ?? comp.requirements;
        const newExamples = examples ?? comp.examples;

        const embedder = getEmbedder();
        const embedding = await embedder.embed(
          [comp.name, comp.tier, newRules, newReqs].filter(Boolean).join(" — ")
        );

        await db
          .update(components)
          .set({
            usageRules: newRules,
            requirements: newReqs,
            examples: newExamples,
            embedding,
            updatedAt: new Date(),
          })
          .where(eq(components.id, comp.id));

        return json({ id: comp.id, name: comp.name, updated: true });
      } catch (e) {
        return error(e instanceof Error ? e.message : "Update failed");
      }
    }
  );

  server.tool(
    "add_component",
    "Insert a new component with code and metadata",
    componentInput,
    async (input) => {
      try {
        const result = await syncComponent(input);
        return json(result);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Add failed");
      }
    }
  );
}
