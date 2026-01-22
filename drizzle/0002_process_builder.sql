CREATE TYPE "public"."bp_process_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."bp_visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TYPE "public"."bp_connection_type" AS ENUM('sequence', 'data', 'conditional');--> statement-breakpoint
CREATE TYPE "public"."bp_collaborator_role" AS ENUM('owner', 'editor', 'viewer', 'commenter');--> statement-breakpoint
CREATE TYPE "public"."bp_theme" AS ENUM('light', 'dark', 'auto');--> statement-breakpoint
CREATE TYPE "public"."bp_notification_frequency" AS ENUM('instant', 'daily', 'weekly');--> statement-breakpoint
CREATE TABLE "bp_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_id" integer,
	"color" varchar(7),
	"icon" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bp_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "bp_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bp_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "bp_processes" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category_id" integer,
	"status" "bp_process_status" DEFAULT 'draft' NOT NULL,
	"visibility" "bp_visibility" DEFAULT 'private' NOT NULL,
	"thumbnail" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"content" text,
	"archived_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bp_process_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"content" text NOT NULL,
	"comment" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bp_process_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_id" integer NOT NULL,
	"block_id" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"properties" text,
	"position_x" double precision,
	"position_y" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bp_process_blocks_process_block_unique" ON "bp_process_blocks" USING btree ("process_id","block_id");--> statement-breakpoint
CREATE TABLE "bp_process_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_id" integer NOT NULL,
	"source_block_id" varchar(100) NOT NULL,
	"target_block_id" varchar(100) NOT NULL,
	"type" "bp_connection_type" NOT NULL,
	"label" varchar(255),
	"properties" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bp_process_tags" (
	"process_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bp_process_tags_pk" PRIMARY KEY("process_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "bp_process_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "bp_collaborator_role" DEFAULT 'viewer' NOT NULL,
	"invited_by" integer,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bp_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_id" integer NOT NULL,
	"block_id" varchar(100),
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bp_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category_id" integer,
	"content" text NOT NULL,
	"author_id" integer NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"rating" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bp_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"related_process_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bp_user_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"theme" "bp_theme" DEFAULT 'auto' NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"push_notifications" boolean DEFAULT false NOT NULL,
	"notification_frequency" "bp_notification_frequency" DEFAULT 'instant' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bp_categories" ADD CONSTRAINT "bp_categories_parent_id_bp_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bp_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_processes" ADD CONSTRAINT "bp_processes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_processes" ADD CONSTRAINT "bp_processes_category_id_bp_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."bp_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_process_versions" ADD CONSTRAINT "bp_process_versions_process_id_bp_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."bp_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_process_versions" ADD CONSTRAINT "bp_process_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_process_blocks" ADD CONSTRAINT "bp_process_blocks_process_id_bp_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."bp_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_process_connections" ADD CONSTRAINT "bp_process_connections_process_id_bp_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."bp_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_process_tags" ADD CONSTRAINT "bp_process_tags_process_id_bp_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."bp_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_process_tags" ADD CONSTRAINT "bp_process_tags_tag_id_bp_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."bp_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_process_collaborators" ADD CONSTRAINT "bp_process_collaborators_process_id_bp_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."bp_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_process_collaborators" ADD CONSTRAINT "bp_process_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_process_collaborators" ADD CONSTRAINT "bp_process_collaborators_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_comments" ADD CONSTRAINT "bp_comments_process_id_bp_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."bp_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_comments" ADD CONSTRAINT "bp_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_comments" ADD CONSTRAINT "bp_comments_parent_id_bp_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bp_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_templates" ADD CONSTRAINT "bp_templates_category_id_bp_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."bp_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_templates" ADD CONSTRAINT "bp_templates_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_notifications" ADD CONSTRAINT "bp_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_notifications" ADD CONSTRAINT "bp_notifications_related_process_id_bp_processes_id_fk" FOREIGN KEY ("related_process_id") REFERENCES "public"."bp_processes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bp_user_settings" ADD CONSTRAINT "bp_user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
