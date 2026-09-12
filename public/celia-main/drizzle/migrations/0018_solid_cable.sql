CREATE INDEX "balance_charge_created_at_idx" ON "balance_charge" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "copy_records_created_at_idx" ON "copy_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "hobani_income_created_at_idx" ON "hobani_income" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transfer_jobs_status_created_at_idx" ON "transfer_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "transfer_jobs_agent_source_idx" ON "transfer_jobs" USING btree ("agent_id","source_path");