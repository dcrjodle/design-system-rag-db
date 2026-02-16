import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  components,
  componentChangeLog,
  componentDependencies,
} from "../db/schema.js";
import { getEmbedder } from "../embeddings/index.js";
import { matchDependencies } from "./parse-deps.js";

type Source = "figma" | "codebase" | "manual";
type Tier = "atom" | "molecule" | "organism";

interface SyncInput {
  name: string;
  tier: Tier;
  code: string;
  source: Source;
  propsSchema?: unknown;
  usageRules?: string;
  requirements?: string;
  examples?: string;
  version?: string;
  imports?: string;
}

function embeddingText(c: { name: string; tier: string; usageRules?: string | null; requirements?: string | null }) {
  return [c.name, c.tier, c.usageRules, c.requirements].filter(Boolean).join(" — ");
}

export async function syncComponent(input: SyncInput) {
  const embedder = getEmbedder();
  const existing = await db
    .select()
    .from(components)
    .where(eq(components.name, input.name))
    .limit(1);

  const embedding = await embedder.embed(embeddingText(input));
  let componentId: number;
  let isNew = false;

  if (existing.length > 0) {
    const old = existing[0];
    const changed: string[] = [];
    if (old.code !== input.code) changed.push("code");
    if (input.usageRules !== undefined && old.usageRules !== input.usageRules) changed.push("usage_rules");
    if (input.requirements !== undefined && old.requirements !== input.requirements) changed.push("requirements");
    if (input.examples !== undefined && old.examples !== input.examples) changed.push("examples");
    if (input.imports !== undefined && old.imports !== input.imports) changed.push("imports");
    if (input.propsSchema !== undefined) changed.push("props_schema");

    if (changed.length > 0) {
      await db.insert(componentChangeLog).values({
        componentId: old.id,
        source: input.source,
        codeBefore: old.code,
        codeAfter: input.code,
        fieldsChanged: changed,
      });
    }

    await db
      .update(components)
      .set({
        code: input.code,
        tier: input.tier,
        source: input.source,
        propsSchema: input.propsSchema ?? old.propsSchema,
        usageRules: input.usageRules ?? old.usageRules,
        requirements: input.requirements ?? old.requirements,
        examples: input.examples ?? old.examples,
        imports: input.imports ?? old.imports,
        version: input.version ?? old.version,
        embedding,
        updatedAt: new Date(),
      })
      .where(eq(components.id, old.id));

    componentId = old.id;
  } else {
    const [row] = await db
      .insert(components)
      .values({
        name: input.name,
        tier: input.tier,
        code: input.code,
        source: input.source,
        propsSchema: input.propsSchema,
        usageRules: input.usageRules,
        requirements: input.requirements,
        examples: input.examples,
        imports: input.imports,
        version: input.version,
        embedding,
      })
      .returning({ id: components.id });

    componentId = row.id;
    isNew = true;
  }

  const deps = await rebuildDependencies(componentId, input.code);

  return { id: componentId, name: input.name, isNew, dependenciesFound: deps };
}

export async function rebuildDependencies(componentId: number, code: string) {
  const matched = await matchDependencies(code, componentId);

  await db
    .delete(componentDependencies)
    .where(eq(componentDependencies.parentId, componentId));

  if (matched.length > 0) {
    await db.insert(componentDependencies).values(
      matched.map((child) => ({
        parentId: componentId,
        childId: child.id,
      }))
    );
  }

  return matched.map((m) => m.name);
}

export async function bulkSync(inputs: SyncInput[]) {
  const results = [];
  for (const input of inputs) {
    results.push(await syncComponent(input));
  }
  return results;
}
