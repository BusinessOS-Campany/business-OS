ALTER TABLE "copy_records" ADD COLUMN "is_complete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "copy_records" ADD COLUMN "stop_reason" text;--> statement-breakpoint
ALTER TABLE "copy_records" ADD COLUMN "stopped_at" timestamp;