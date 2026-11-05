CREATE TABLE "ai_pool_usage_monthly" (
	"pool" text NOT NULL,
	"entry_id" text NOT NULL,
	"period" text NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"total_tokens" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_pool_usage_monthly_pool_entry_id_period_pk" PRIMARY KEY("pool","entry_id","period")
);
--> statement-breakpoint
CREATE TABLE "ai_user_usage_monthly" (
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"total_tokens" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_user_usage_monthly_user_id_period_pk" PRIMARY KEY("user_id","period")
);
--> statement-breakpoint
ALTER TABLE "ai_agent_preference" ADD COLUMN "active_source" text DEFAULT 'account' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_user_usage_monthly" ADD CONSTRAINT "ai_user_usage_monthly_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_preference" ADD CONSTRAINT "ai_agent_preference_source_check" CHECK ("ai_agent_preference"."active_source" in ('account', 'included'));