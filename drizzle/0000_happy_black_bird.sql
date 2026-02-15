CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('figma', 'codebase', 'manual');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('atom', 'molecule', 'organism');--> statement-breakpoint
CREATE TABLE "component_change_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"component_id" bigint NOT NULL,
	"source" "source",
	"code_before" text,
	"code_after" text,
	"fields_changed" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_dependencies" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"parent_id" bigint NOT NULL,
	"child_id" bigint NOT NULL,
	"context" text,
	CONSTRAINT "unique_dep" UNIQUE("parent_id","child_id")
);
--> statement-breakpoint
CREATE TABLE "component_token_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"component_id" bigint NOT NULL,
	"token_id" bigint NOT NULL,
	"property" text,
	CONSTRAINT "unique_token_usage" UNIQUE("component_id","token_id","property")
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" "tier" NOT NULL,
	"code" text NOT NULL,
	"props_schema" jsonb,
	"usage_rules" text,
	"requirements" text,
	"examples" text,
	"version" text,
	"source" "source" DEFAULT 'manual',
	"embedding" vector(1536),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "components_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"embedding" vector(1536),
	CONSTRAINT "tokens_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "component_change_log" ADD CONSTRAINT "component_change_log_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_dependencies" ADD CONSTRAINT "component_dependencies_parent_id_components_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_dependencies" ADD CONSTRAINT "component_dependencies_child_id_components_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_token_usage" ADD CONSTRAINT "component_token_usage_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_token_usage" ADD CONSTRAINT "component_token_usage_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deps_parent_idx" ON "component_dependencies" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "deps_child_idx" ON "component_dependencies" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "token_usage_component_idx" ON "component_token_usage" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "token_usage_token_idx" ON "component_token_usage" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "components_tier_idx" ON "components" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "components_embedding_idx" ON "components" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "tokens_embedding_idx" ON "tokens" USING hnsw ("embedding" vector_cosine_ops);