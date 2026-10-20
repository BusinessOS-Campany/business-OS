CREATE TABLE "advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text,
	"employee_name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"advance_date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_employee_id_user_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advances_employee_id_idx" ON "advances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "advances_advance_date_idx" ON "advances" USING btree ("advance_date");