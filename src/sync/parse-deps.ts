import { db } from "../db/index.js";
import { components } from "../db/schema.js";
import { inArray } from "drizzle-orm";

const JSX_TAG_RE = /<([A-Z]\w+)/g;

export function extractNames(code: string): string[] {
  const names = new Set<string>();
  for (const m of code.matchAll(JSX_TAG_RE)) {
    names.add(m[1]);
  }
  return [...names];
}

export async function matchDependencies(
  code: string,
  excludeComponentId?: number
): Promise<{ id: number; name: string }[]> {
  const names = extractNames(code);
  if (!names.length) return [];

  const rows = await db
    .select({ id: components.id, name: components.name })
    .from(components)
    .where(inArray(components.name, names));

  if (excludeComponentId !== undefined) {
    return rows.filter((r) => r.id !== excludeComponentId);
  }
  return rows;
}
