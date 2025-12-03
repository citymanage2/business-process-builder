CREATE TYPE "public"."category" AS ENUM('optimization', 'automation', 'risk', 'metric');--> statement-breakpoint
CREATE TYPE "public"."chat_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."format" AS ENUM('B2B', 'B2C', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."interview_type" AS ENUM('voice', 'form_full', 'form_short');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."process_status" AS ENUM('draft', 'in_review', 'approved');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."sender_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."token_type" AS ENUM('email_verification', 'password_reset');--> statement-breakpoint
CREATE TABLE "business_processes" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"interview_id" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "process_status" DEFAULT 'draft' NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"start_event" text,
	"end_event" text,
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
	"crm_funnels" text,
	"required_documents" text,
	"salary_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_process_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"step_id" varchar(100),
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"industry" varchar(255),
	"region" varchar(255),
	"format" "format",
	"average_check" varchar(100),
	"products_services" text,
	"it_systems" text,
	"business_model" text,
	"client_segments" text,
	"key_products" text,
	"regions" text,
	"seasonality" text,
	"strategic_goals" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_key" varchar(500) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"error_type" varchar(100) NOT NULL,
	"error_message" text NOT NULL,
	"stack_trace" text,
	"request_url" text,
	"request_method" varchar(10),
	"user_agent" text,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"keywords" text NOT NULL,
	"category" varchar(100),
	"order" integer DEFAULT 0 NOT NULL,
	"is_published" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"interview_type" "interview_type" DEFAULT 'voice' NOT NULL,
	"status" "status" DEFAULT 'in_progress' NOT NULL,
	"audio_url" text,
	"transcript" text,
	"structured_data" text,
	"answers" text,
	"progress" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_process_id" integer NOT NULL,
	"category" "category" NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"tools_suggested" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" "chat_status" DEFAULT 'open' NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_role" "sender_role" NOT NULL,
	"message" text NOT NULL,
	"is_read" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" text,
	"password_hash" varchar(255),
	"provider" varchar(64),
	"provider_id" varchar(255),
	"role" "role" DEFAULT 'user' NOT NULL,
	"email_verified" integer DEFAULT 0 NOT NULL,
	"token_balance" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"type" "token_type" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "business_processes" ADD CONSTRAINT "business_processes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_processes" ADD CONSTRAINT "business_processes_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_business_process_id_business_processes_id_fk" FOREIGN KEY ("business_process_id") REFERENCES "public"."business_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_business_process_id_business_processes_id_fk" FOREIGN KEY ("business_process_id") REFERENCES "public"."business_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_chats" ADD CONSTRAINT "support_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_chat_id_support_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."support_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;