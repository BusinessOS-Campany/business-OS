CREATE TABLE "transfer_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"file_size" bigint NOT NULL,
	"operation" text DEFAULT 'copy' NOT NULL,
	"source_dir" text,
	"dest_dir" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
