CREATE TABLE "ai_agent_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_preference" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"active_account_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"label" text,
	"image" text,
	"email" text,
	"phone" text,
	"url" text,
	"summary" text,
	"location" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"meta_version" text,
	"meta_canonical" text,
	"meta_last_modified" timestamp with time zone,
	"template_id" text DEFAULT 'classic' NOT NULL,
	"source_cv_id" uuid,
	"kind" text DEFAULT 'primary' NOT NULL,
	CONSTRAINT "cv_kind_check" CHECK ("cv"."kind" in ('primary', 'application_clone', 'import_staging'))
);
--> statement-breakpoint
CREATE TABLE "cv_award" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"title" text,
	"date" text,
	"awarder" text,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "cv_certificate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"name" text,
	"date" text,
	"url" text,
	"issuer" text
);
--> statement-breakpoint
CREATE TABLE "cv_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"institution" text,
	"url" text,
	"area" text,
	"study_type" text,
	"start_date" text,
	"end_date" text,
	"score" text,
	"courses" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_interest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"sort" integer NOT NULL,
	"name" text,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_language" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"sort" integer NOT NULL,
	"language" text,
	"fluency" text
);
--> statement-breakpoint
CREATE TABLE "cv_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"sort" integer NOT NULL,
	"network" text,
	"username" text,
	"url" text
);
--> statement-breakpoint
CREATE TABLE "cv_project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"name" text,
	"description" text,
	"start_date" text,
	"end_date" text,
	"url" text,
	"entity" text,
	"type" text,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_publication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"name" text,
	"publisher" text,
	"release_date" text,
	"url" text,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "cv_reference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"sort" integer NOT NULL,
	"name" text,
	"reference" text
);
--> statement-breakpoint
CREATE TABLE "cv_skill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"sort" integer NOT NULL,
	"name" text,
	"level" text,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_template_presentation" (
	"cv_id" uuid NOT NULL,
	"template_id" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cv_template_presentation_pkey" PRIMARY KEY("cv_id","template_id")
);
--> statement-breakpoint
CREATE TABLE "cv_volunteer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"organization" text,
	"position" text,
	"url" text,
	"start_date" text,
	"end_date" text,
	"summary" text,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "cv_work" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_id" uuid NOT NULL,
	"name" text,
	"location" text,
	"description" text,
	"position" text,
	"url" text,
	"start_date" text,
	"end_date" text,
	"summary" text,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"job_title" text,
	"job_company" text,
	"job_source_type" text,
	"job_raw_text" text,
	"source_cv_id" uuid,
	"tailored_cv_id" uuid,
	"cover_letter" text,
	"selection_rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_message" text,
	"intake_source_cv_id" uuid,
	"cover_letter_email_subject" text,
	"source_cv_snapshot" jsonb,
	"source_application_id" uuid,
	"is_list_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_api_key" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"label" text,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"encrypted_secret" text
);
--> statement-breakpoint
CREATE TABLE "mcp_export" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cv_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"filename" text NOT NULL,
	"template_id" text,
	"mode" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mcp_export_id_user_id_key" UNIQUE("id","user_id"),
	CONSTRAINT "mcp_export_kind_check" CHECK ("mcp_export"."kind" in ('html', 'pdf', 'screenshot', 'jsonresume')),
	CONSTRAINT "mcp_export_size_bytes_check" CHECK ("mcp_export"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"crop" jsonb,
	"cropped_storage_path" text,
	"thumbnail_storage_path" text,
	CONSTRAINT "media_storage_path_key" UNIQUE("storage_path")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"mcp_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_scrape_config" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "web_scrape_config_provider_check" CHECK ("web_scrape_config"."provider" in ('firecrawl', 'tavily'))
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_agent_account" ADD CONSTRAINT "ai_agent_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_preference" ADD CONSTRAINT "ai_agent_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_preference" ADD CONSTRAINT "ai_agent_preference_active_account_id_ai_agent_account_id_fk" FOREIGN KEY ("active_account_id") REFERENCES "public"."ai_agent_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv" ADD CONSTRAINT "cv_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv" ADD CONSTRAINT "cv_source_cv_id_cv_id_fk" FOREIGN KEY ("source_cv_id") REFERENCES "public"."cv"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_award" ADD CONSTRAINT "cv_award_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_certificate" ADD CONSTRAINT "cv_certificate_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_education" ADD CONSTRAINT "cv_education_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_interest" ADD CONSTRAINT "cv_interest_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_language" ADD CONSTRAINT "cv_language_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_profile" ADD CONSTRAINT "cv_profile_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_project" ADD CONSTRAINT "cv_project_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_publication" ADD CONSTRAINT "cv_publication_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_reference" ADD CONSTRAINT "cv_reference_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_skill" ADD CONSTRAINT "cv_skill_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_template_presentation" ADD CONSTRAINT "cv_template_presentation_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_volunteer" ADD CONSTRAINT "cv_volunteer_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_work" ADD CONSTRAINT "cv_work_cv_id_cv_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cv"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_source_cv_id_cv_id_fk" FOREIGN KEY ("source_cv_id") REFERENCES "public"."cv"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_tailored_cv_id_cv_id_fk" FOREIGN KEY ("tailored_cv_id") REFERENCES "public"."cv"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_intake_source_cv_id_cv_id_fk" FOREIGN KEY ("intake_source_cv_id") REFERENCES "public"."cv"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_source_application_id_job_application_id_fk" FOREIGN KEY ("source_application_id") REFERENCES "public"."job_application"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_api_key" ADD CONSTRAINT "mcp_api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_export" ADD CONSTRAINT "mcp_export_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_scrape_config" ADD CONSTRAINT "web_scrape_config_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_agent_account_user_label_unique" ON "ai_agent_account" USING btree ("user_id","label") WHERE "ai_agent_account"."label" is not null;--> statement-breakpoint
CREATE INDEX "cv_source_cv_id_idx" ON "cv" USING btree ("source_cv_id");--> statement-breakpoint
CREATE INDEX "cv_user_id_updated_at_idx" ON "cv" USING btree ("user_id","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "cv_user_kind_updated_idx" ON "cv" USING btree ("user_id","kind","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "cv_award_cv_id_date_idx" ON "cv_award" USING btree ("cv_id","date" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "cv_certificate_cv_id_date_idx" ON "cv_certificate" USING btree ("cv_id","date" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "cv_education_cv_id_start_date_idx" ON "cv_education" USING btree ("cv_id","start_date" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "cv_interest_cv_id_sort_idx" ON "cv_interest" USING btree ("cv_id","sort");--> statement-breakpoint
CREATE INDEX "cv_language_cv_id_sort_idx" ON "cv_language" USING btree ("cv_id","sort");--> statement-breakpoint
CREATE INDEX "cv_profile_cv_id_sort_idx" ON "cv_profile" USING btree ("cv_id","sort");--> statement-breakpoint
CREATE INDEX "cv_project_cv_id_start_date_idx" ON "cv_project" USING btree ("cv_id","start_date" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "cv_publication_cv_id_release_date_idx" ON "cv_publication" USING btree ("cv_id","release_date" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "cv_reference_cv_id_sort_idx" ON "cv_reference" USING btree ("cv_id","sort");--> statement-breakpoint
CREATE INDEX "cv_skill_cv_id_sort_idx" ON "cv_skill" USING btree ("cv_id","sort");--> statement-breakpoint
CREATE INDEX "cv_template_presentation_cv_id_idx" ON "cv_template_presentation" USING btree ("cv_id");--> statement-breakpoint
CREATE INDEX "cv_volunteer_cv_id_start_date_idx" ON "cv_volunteer" USING btree ("cv_id","start_date" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "cv_work_cv_id_start_date_idx" ON "cv_work" USING btree ("cv_id","start_date" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "job_application_source_application_id_idx" ON "job_application" USING btree ("source_application_id") WHERE "job_application"."source_application_id" is not null;--> statement-breakpoint
CREATE INDEX "job_application_user_list_visible_updated_idx" ON "job_application" USING btree ("user_id","is_list_visible","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "job_application_user_updated_idx" ON "job_application" USING btree ("user_id","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "mcp_api_key_user_id_idx" ON "mcp_api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcp_export_expiry_idx" ON "mcp_export" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "mcp_export_user_idx" ON "mcp_export" USING btree ("user_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "media_user_id_created_at_idx" ON "media" USING btree ("user_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
--> statement-breakpoint
CREATE TRIGGER "ai_agent_account_set_updated_at" BEFORE UPDATE ON "ai_agent_account" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "ai_agent_preference_set_updated_at" BEFORE UPDATE ON "ai_agent_preference" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "cv_set_updated_at" BEFORE UPDATE ON "cv" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "cv_template_presentation_set_updated_at" BEFORE UPDATE ON "cv_template_presentation" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "job_application_set_updated_at" BEFORE UPDATE ON "job_application" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "user_settings_set_updated_at" BEFORE UPDATE ON "user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "web_scrape_config_set_updated_at" BEFORE UPDATE ON "web_scrape_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
