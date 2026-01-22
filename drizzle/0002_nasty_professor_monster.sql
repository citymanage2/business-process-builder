CREATE TABLE "business_process_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_process_id" integer NOT NULL,
	"version" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"comment" text
);
--> statement-breakpoint
ALTER TABLE "business_processes" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "business_processes" ADD COLUMN "is_template" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "business_processes" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "business_process_versions" ADD CONSTRAINT "business_process_versions_business_process_id_business_processes_id_fk" FOREIGN KEY ("business_process_id") REFERENCES "public"."business_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_process_versions" ADD CONSTRAINT "business_process_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;