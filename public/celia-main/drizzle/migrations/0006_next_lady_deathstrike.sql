CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"ip_address" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nas_listing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_id" uuid NOT NULL,
	"path" text NOT NULL,
	"entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nas_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"host" text NOT NULL,
	"protocol" text DEFAULT 'SMB' NOT NULL,
	"share" text NOT NULL,
	"username" text,
	"password_enc" text,
	"base_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"name" text NOT NULL,
	"api_key_hash" text,
	"status" text DEFAULT 'OFFLINE' NOT NULL,
	"ip_address" text,
	"last_heartbeat" timestamp,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_agents_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "transfer_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"device_id" text NOT NULL,
	"device_name" text,
	"device_label" text,
	"device_type" text DEFAULT 'UNKNOWN' NOT NULL,
	"drive_letter" text,
	"filesystem" text,
	"total_capacity" bigint,
	"free_space" bigint,
	"serial_number" text,
	"connected" boolean DEFAULT true NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_job_id" uuid,
	"source_path" text NOT NULL,
	"destination_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" bigint,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_no" serial NOT NULL,
	"agent_id" text,
	"employee_id" text,
	"device_id" uuid,
	"customer_name" text,
	"customer_phone" text,
	"customer_notes" text,
	"source_path" text NOT NULL,
	"destination_path" text NOT NULL,
	"total_size" bigint,
	"transferred_size" bigint DEFAULT 0 NOT NULL,
	"file_count" integer,
	"transferred_files" integer DEFAULT 0 NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration_seconds" integer,
	"average_speed" bigint,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"cancel_requested_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "transfer_log" CASCADE;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nas_listing" ADD CONSTRAINT "nas_listing_share_id_nas_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."nas_shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_devices" ADD CONSTRAINT "transfer_devices_agent_id_transfer_agents_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."transfer_agents"("agent_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_transfer_job_id_transfer_jobs_id_fk" FOREIGN KEY ("transfer_job_id") REFERENCES "public"."transfer_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_jobs" ADD CONSTRAINT "transfer_jobs_agent_id_transfer_agents_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."transfer_agents"("agent_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_jobs" ADD CONSTRAINT "transfer_jobs_employee_id_user_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_jobs" ADD CONSTRAINT "transfer_jobs_device_id_transfer_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."transfer_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transfer_devices_agent_device_uniq" ON "transfer_devices" USING btree ("agent_id","device_id");--> statement-breakpoint
CREATE INDEX "transfer_devices_connected_idx" ON "transfer_devices" USING btree ("connected");--> statement-breakpoint
CREATE INDEX "transfer_items_job_idx" ON "transfer_items" USING btree ("transfer_job_id");--> statement-breakpoint
CREATE INDEX "transfer_jobs_status_idx" ON "transfer_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transfer_jobs_created_at_idx" ON "transfer_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transfer_jobs_employee_id_idx" ON "transfer_jobs" USING btree ("employee_id");