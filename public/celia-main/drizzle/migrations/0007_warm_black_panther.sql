ALTER TABLE "transfer_jobs" ADD COLUMN "nas_share_id" uuid;--> statement-breakpoint
ALTER TABLE "transfer_jobs" ADD COLUMN "current_speed" bigint;--> statement-breakpoint
ALTER TABLE "transfer_jobs" ADD CONSTRAINT "transfer_jobs_nas_share_id_nas_shares_id_fk" FOREIGN KEY ("nas_share_id") REFERENCES "public"."nas_shares"("id") ON DELETE set null ON UPDATE no action;