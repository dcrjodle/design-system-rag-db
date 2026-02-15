ALTER TABLE "components" ALTER COLUMN "embedding" SET DATA TYPE vector(768);--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "embedding" SET DATA TYPE vector(768);