import "dotenv/config";
import {
  pgTable,
  pgEnum,
  bigserial,
  text,
  jsonb,
  timestamp,
  bigint,
  vector,
  index,
  unique,
} from "drizzle-orm/pg-core";

const embeddingDimensions = Number(process.env.EMBEDDING_DIMENSIONS) || 1536;

export const tierEnum = pgEnum("tier", ["atom", "molecule", "organism"]);
export const sourceEnum = pgEnum("source", ["figma", "codebase", "manual"]);

export const tokens = pgTable(
  "tokens",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull().unique(),
    category: text("category").notNull(),
    value: text("value").notNull(),
    description: text("description"),
    embedding: vector("embedding", { dimensions: embeddingDimensions }),
  },
  (t) => [
    index("tokens_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const components = pgTable(
  "components",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull().unique(),
    tier: tierEnum("tier").notNull(),
    code: text("code").notNull(),
    imports: text("imports"),
    propsSchema: jsonb("props_schema"),
    usageRules: text("usage_rules"),
    requirements: text("requirements"),
    examples: text("examples"),
    version: text("version"),
    source: sourceEnum("source").default("manual"),
    embedding: vector("embedding", { dimensions: embeddingDimensions }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("components_tier_idx").on(t.tier),
    index("components_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const componentChangeLog = pgTable("component_change_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  componentId: bigint("component_id", { mode: "number" })
    .notNull()
    .references(() => components.id, { onDelete: "cascade" }),
  source: sourceEnum("source"),
  codeBefore: text("code_before"),
  codeAfter: text("code_after"),
  fieldsChanged: jsonb("fields_changed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const componentDependencies = pgTable(
  "component_dependencies",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    parentId: bigint("parent_id", { mode: "number" })
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    childId: bigint("child_id", { mode: "number" })
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    context: text("context"),
  },
  (t) => [
    unique("unique_dep").on(t.parentId, t.childId),
    index("deps_parent_idx").on(t.parentId),
    index("deps_child_idx").on(t.childId),
  ]
);

export const componentTokenUsage = pgTable(
  "component_token_usage",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    componentId: bigint("component_id", { mode: "number" })
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    tokenId: bigint("token_id", { mode: "number" })
      .notNull()
      .references(() => tokens.id, { onDelete: "cascade" }),
    property: text("property"),
  },
  (t) => [
    unique("unique_token_usage").on(t.componentId, t.tokenId, t.property),
    index("token_usage_component_idx").on(t.componentId),
    index("token_usage_token_idx").on(t.tokenId),
  ]
);
