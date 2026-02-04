CREATE TYPE "public"."change_request_status" AS ENUM('pending', 'processing', 'preview', 'applied', 'rejected', 'rolled_back');--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_process_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" "change_request_status" DEFAULT 'pending' NOT NULL,
	"request_text" text NOT NULL,
	"request_type" varchar(50),
	"target_step_id" varchar(100),
	"proposed_changes" text,
	"changes_summary" text,
	"progress" integer DEFAULT 0,
	"progress_message" varchar(255),
	"previous_version_id" integer,
	"new_version_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"applied_at" timestamp,
	"rolled_back_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "process_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_process_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"stages" text,
	"roles" text,
	"steps" text,
	"branches" text,
	"documents" text,
	"it_integration" text,
	"diagram_data" text,
	"stage_details" text,
	"total_time" integer,
	"total_cost" integer,
	"change_request_id" integer,
	"change_summary" text,
	"created_by_id" integer,
	"is_active" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_business_process_id_business_processes_id_fk" FOREIGN KEY ("business_process_id") REFERENCES "public"."business_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_business_process_id_business_processes_id_fk" FOREIGN KEY ("business_process_id") REFERENCES "public"."business_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;