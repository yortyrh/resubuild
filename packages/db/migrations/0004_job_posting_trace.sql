ALTER TABLE "job_application" ADD COLUMN "job_source_url" text;--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "job_source_file_name" text;--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "job_summary" jsonb;