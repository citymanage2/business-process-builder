import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, serial } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

// Users table
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 20 }).unique(),
  name: text("name"),
  passwordHash: varchar("password_hash", { length: 255 }),
  provider: varchar("provider", { length: 64 }),
  providerId: varchar("provider_id", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  tokenBalance: int("token_balance").default(1000).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Companies table
export const companies = mysqlTable("companies", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }),
  region: varchar("region", { length: 255 }),
  format: mysqlEnum("format", ["B2B", "B2C", "mixed"]),
  averageCheck: varchar("average_check", { length: 100 }),
  productsServices: text("products_services"),
  itSystems: text("it_systems"),
  businessModel: text("business_model"),
  clientSegments: text("client_segments"),
  keyProducts: text("key_products"),
  regions: text("regions"),
  seasonality: text("seasonality"),
  strategicGoals: text("strategic_goals"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// Interviews table
export const interviews = mysqlTable("interviews", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  interviewType: mysqlEnum("interview_type", ["voice", "form_full", "form_short"]).default("voice").notNull(),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "failed"]).default("in_progress").notNull(),
  audioUrl: text("audio_url"),
  transcript: text("transcript"),
  structuredData: text("structured_data"),
  answers: text("answers"),
  progress: int("progress").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;

// Business processes table
export const businessProcesses = mysqlTable("business_processes", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  interviewId: int("interview_id").references(() => interviews.id, { onDelete: "set null" }),
  version: int("version").default(1).notNull(),
  status: mysqlEnum("process_status", ["draft", "in_review", "approved"]).default("draft").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  startEvent: text("start_event"),
  endEvent: text("end_event"),
  stages: text("stages"),
  roles: text("roles"),
  steps: text("steps"),
  branches: text("branches"),
  documents: text("documents"),
  itIntegration: text("it_integration"),
  diagramData: text("diagram_data"),
  bpmnXml: text("bpmn_xml"),
  stageDetails: text("stage_details"),
  totalTime: int("total_time"),
  totalCost: int("total_cost"),
  crmFunnels: text("crm_funnels"),
  requiredDocuments: text("required_documents"),
  salaryData: text("salary_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type BusinessProcess = typeof businessProcesses.$inferSelect;
export type InsertBusinessProcess = typeof businessProcesses.$inferInsert;

// Recommendations table
export const recommendations = mysqlTable("recommendations", {
  id: serial("id").primaryKey(),
  businessProcessId: int("business_process_id").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  category: mysqlEnum("category", ["optimization", "automation", "risk", "metric"]).notNull(),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  toolsSuggested: text("tools_suggested"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;

// Comments table
export const comments = mysqlTable("comments", {
  id: serial("id").primaryKey(),
  businessProcessId: int("business_process_id").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stepId: varchar("step_id", { length: 100 }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// Documents table
export const documents = mysqlTable("documents", {
  id: serial("id").primaryKey(),
  companyId: int("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(),
  fileSize: int("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// Error logs table
export const errorLogs = mysqlTable("error_logs", {
  id: serial("id").primaryKey(),
  userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
  errorType: varchar("error_type", { length: 100 }).notNull(),
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  requestUrl: text("request_url"),
  requestMethod: varchar("request_method", { length: 10 }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

// Support chats table
export const supportChats = mysqlTable("support_chats", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("chat_status", ["open", "closed"]).default("open").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SupportChat = typeof supportChats.$inferSelect;
export type InsertSupportChat = typeof supportChats.$inferInsert;

// Support messages table
export const supportMessages = mysqlTable("support_messages", {
  id: serial("id").primaryKey(),
  chatId: int("chat_id").notNull().references(() => supportChats.id, { onDelete: "cascade" }),
  senderId: int("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderRole: mysqlEnum("sender_role", ["user", "admin"]).notNull(),
  message: text("message").notNull(),
  isRead: int("is_read").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;

// FAQ articles table
export const faqArticles = mysqlTable("faq_articles", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  keywords: text("keywords").notNull(),
  category: varchar("category", { length: 100 }),
  order: int("order").default(0).notNull(),
  isPublished: int("is_published").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type FaqArticle = typeof faqArticles.$inferSelect;
export type InsertFaqArticle = typeof faqArticles.$inferInsert;

// Change Requests table
export const changeRequests = mysqlTable("change_requests", {
  id: serial("id").primaryKey(),
  businessProcessId: int("business_process_id").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("change_request_status", ["pending", "processing", "preview", "applied", "rejected", "rolled_back"]).default("pending").notNull(),
  requestText: text("request_text").notNull(),
  requestType: varchar("request_type", { length: 50 }),
  targetStepId: varchar("target_step_id", { length: 100 }),
  proposedChanges: text("proposed_changes"),
  changesSummary: text("changes_summary"),
  progress: int("progress").default(0),
  progressMessage: varchar("progress_message", { length: 255 }),
  newVersionId: int("new_version_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  appliedAt: timestamp("applied_at"),
  rolledBackAt: timestamp("rolled_back_at"),
});

export type ChangeRequest = typeof changeRequests.$inferSelect;
export type InsertChangeRequest = typeof changeRequests.$inferInsert;

// Process Versions table
export const processVersions = mysqlTable("process_versions", {
  id: serial("id").primaryKey(),
  businessProcessId: int("business_process_id").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  versionNumber: int("version_number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  stages: text("stages"),
  roles: text("roles"),
  steps: text("steps"),
  branches: text("branches"),
  documents: text("documents"),
  itIntegration: text("it_integration"),
  diagramData: text("diagram_data"),
  stageDetails: text("stage_details"),
  totalTime: int("total_time"),
  totalCost: int("total_cost"),
  changeRequestId: int("change_request_id"),
  changeSummary: text("change_summary"),
  createdById: int("created_by_id").references(() => users.id, { onDelete: "set null" }),
  isActive: int("is_active").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProcessVersion = typeof processVersions.$inferSelect;
export type InsertProcessVersion = typeof processVersions.$inferInsert;
