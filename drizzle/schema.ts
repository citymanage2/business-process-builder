import { integer, pgEnum, pgTable, text, timestamp, varchar, serial } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const formatEnum = pgEnum("format", ["B2B", "B2C", "mixed"]);
export const interviewTypeEnum = pgEnum("interview_type", ["voice", "form_full", "form_short"]);
export const statusEnum = pgEnum("status", ["draft", "in_progress", "completed", "failed"]);
export const processStatusEnum = pgEnum("process_status", ["draft", "in_review", "approved"]);
export const categoryEnum = pgEnum("category", ["optimization", "automation", "risk", "metric"]);
export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);
export const chatStatusEnum = pgEnum("chat_status", ["open", "closed"]);
export const senderRoleEnum = pgEnum("sender_role", ["user", "admin"]);


export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 20 }).unique(),
  name: text("name"),
  passwordHash: varchar("password_hash", { length: 255 }), // For email/password auth
  provider: varchar("provider", { length: 64 }), // 'google' or 'local'
  providerId: varchar("provider_id", { length: 255 }), // Google ID or null for local
  role: roleEnum("role").default("user").notNull(),
  tokenBalance: integer("token_balance").default(1000).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }),
  region: varchar("region", { length: 255 }),
  format: formatEnum("format"),
  averageCheck: varchar("average_check", { length: 100 }),
  productsServices: text("products_services"),
  itSystems: text("it_systems"),
  // Расширенные данные из полной анкеты (50 вопросов)
  businessModel: text("business_model"),
  clientSegments: text("client_segments"),
  keyProducts: text("key_products"),
  regions: text("regions"),
  seasonality: text("seasonality"),
  strategicGoals: text("strategic_goals"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// Interviews table
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  interviewType: interviewTypeEnum("interview_type").default("voice").notNull(),
  status: statusEnum("status").default("in_progress").notNull(),
  audioUrl: text("audio_url"),
  transcript: text("transcript"),
  structuredData: text("structured_data"),
  // Ответы на вопросы анкеты (JSON)
  answers: text("answers"),
  // Прогресс заполнения для черновиков
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;

// Business processes table
export const businessProcesses = pgTable("business_processes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  interviewId: integer("interview_id").references(() => interviews.id, { onDelete: "set null" }),
  version: integer("version").default(1).notNull(),
  status: processStatusEnum("status").default("draft").notNull(),
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
  // Расширенные данные для новой функциональности
  stageDetails: text("stage_details"), // Детальное описание каждого этапа (JSON)
  totalTime: integer("total_time"), // Общее время процесса в минутах
  totalCost: integer("total_cost"), // Общая стоимость процесса по ФОТ в рублях
  crmFunnels: text("crm_funnels"), // 3 варианта воронок CRM (JSON)
  requiredDocuments: text("required_documents"), // Список необходимых документов (JSON)
  salaryData: text("salary_data"), // Данные о зарплатах ролей (JSON)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BusinessProcess = typeof businessProcesses.$inferSelect;
export type InsertBusinessProcess = typeof businessProcesses.$inferInsert;

// Recommendations table
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  businessProcessId: integer("business_process_id").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  category: categoryEnum("category").notNull(),
  priority: priorityEnum("priority").default("medium").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  toolsSuggested: text("tools_suggested"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  businessProcessId: integer("business_process_id").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stepId: varchar("step_id", { length: 100 }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// Documents table - прикрепленные документы к компании
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// Error logs table - логи ошибок системы
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
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

// Support chats table - чаты поддержки
export const supportChats = pgTable("support_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: chatStatusEnum("status").default("open").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SupportChat = typeof supportChats.$inferSelect;
export type InsertSupportChat = typeof supportChats.$inferInsert;

// Support messages table - сообщения в чатах поддержки
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => supportChats.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderRole: senderRoleEnum("sender_role").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read").default(0).notNull(), // 0 = не прочитано, 1 = прочитано
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;

/**
 * FAQ articles table for knowledge base
 */
export const faqArticles = pgTable("faq_articles", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  keywords: text("keywords").notNull(), // Comma-separated keywords for search
  category: varchar("category", { length: 100 }),
  order: integer("order").default(0).notNull(), // Display order
  isPublished: integer("is_published").default(1).notNull(), // 1 = published, 0 = draft
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FaqArticle = typeof faqArticles.$inferSelect;
export type InsertFaqArticle = typeof faqArticles.$inferInsert;

// =============================================
// Process Builder Tables
// =============================================

// Enums for Process Builder
export const builderBlockTypeEnum = pgEnum("builder_block_type", [
  "start", "end", "entry_point", "exit_point",
  "task", "subprocess", "manual_action", "automated_action", "send_notification", "api_call",
  "condition", "multiple_choice", "parallel_gateway", "exclusive_gateway",
  "data_input", "data_output", "data_store", "document",
  "timer_event", "signal_event", "error_event", "escalation_event",
  "role", "department", "external_system"
]);

export const builderConnectionTypeEnum = pgEnum("builder_connection_type", [
  "sequence_flow", "data_flow", "conditional_flow"
]);

export const builderProcessStatusEnum = pgEnum("builder_process_status", [
  "draft", "published", "archived"
]);

export const builderVisibilityEnum = pgEnum("builder_visibility", [
  "private", "public"
]);

export const builderAccessRoleEnum = pgEnum("builder_access_role", [
  "owner", "editor", "viewer", "commenter"
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "invite", "comment", "mention", "process_update", "deadline", "system"
]);

// Categories for organizing processes
export const builderCategories = pgTable("builder_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // HEX color code
  icon: varchar("icon", { length: 50 }), // Icon name from library
  parentId: integer("parent_id"), // For hierarchical categories
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }), // null for system categories
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BuilderCategory = typeof builderCategories.$inferSelect;
export type InsertBuilderCategory = typeof builderCategories.$inferInsert;

// Main processes table
export const builderProcesses = pgTable("builder_processes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => builderCategories.id, { onDelete: "set null" }),
  status: builderProcessStatusEnum("status").default("draft").notNull(),
  visibility: builderVisibilityEnum("visibility").default("private").notNull(),
  tags: text("tags"), // JSON array of tags
  thumbnail: text("thumbnail"), // Base64 or URL of process thumbnail
  currentVersion: integer("current_version").default(1).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  // Canvas settings
  canvasSettings: text("canvas_settings"), // JSON: zoom, pan position, grid settings
  // Process data (blocks and connections stored as JSON for quick loading)
  blocksData: text("blocks_data"), // JSON array of all blocks
  connectionsData: text("connections_data"), // JSON array of all connections
  // Metadata
  deletedAt: timestamp("deleted_at"), // For soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BuilderProcess = typeof builderProcesses.$inferSelect;
export type InsertBuilderProcess = typeof builderProcesses.$inferInsert;

// Version history for processes
export const builderVersions = pgTable("builder_versions", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => builderProcesses.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment"), // Version comment
  snapshot: text("snapshot").notNull(), // Full JSON snapshot of the process state
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BuilderVersion = typeof builderVersions.$inferSelect;
export type InsertBuilderVersion = typeof builderVersions.$inferInsert;

// Collaborators for shared access
export const builderCollaborators = pgTable("builder_collaborators", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => builderProcesses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: builderAccessRoleEnum("role").default("viewer").notNull(),
  inviteToken: varchar("invite_token", { length: 255 }),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export type BuilderCollaborator = typeof builderCollaborators.$inferSelect;
export type InsertBuilderCollaborator = typeof builderCollaborators.$inferInsert;

// Comments on processes and blocks
export const builderComments = pgTable("builder_comments", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => builderProcesses.id, { onDelete: "cascade" }),
  blockId: varchar("block_id", { length: 100 }), // If commenting on a specific block
  parentId: integer("parent_id"), // For threaded comments
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  resolved: integer("resolved").default(0).notNull(), // 0 = unresolved, 1 = resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BuilderComment = typeof builderComments.$inferSelect;
export type InsertBuilderComment = typeof builderComments.$inferInsert;

// Templates for reusable processes
export const builderTemplates = pgTable("builder_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => builderCategories.id, { onDelete: "set null" }),
  authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
  isSystem: integer("is_system").default(0).notNull(), // 1 = system template
  isPublished: integer("is_published").default(0).notNull(), // 1 = publicly visible
  thumbnail: text("thumbnail"),
  processData: text("process_data").notNull(), // JSON snapshot of blocks and connections
  tags: text("tags"),
  usageCount: integer("usage_count").default(0).notNull(),
  rating: integer("rating").default(0).notNull(), // Average rating * 10 for precision
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BuilderTemplate = typeof builderTemplates.$inferSelect;
export type InsertBuilderTemplate = typeof builderTemplates.$inferInsert;

// Notifications for users
export const builderNotifications = pgTable("builder_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  processId: integer("process_id").references(() => builderProcesses.id, { onDelete: "cascade" }),
  commentId: integer("comment_id").references(() => builderComments.id, { onDelete: "cascade" }),
  fromUserId: integer("from_user_id").references(() => users.id, { onDelete: "set null" }),
  isRead: integer("is_read").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BuilderNotification = typeof builderNotifications.$inferSelect;
export type InsertBuilderNotification = typeof builderNotifications.$inferInsert;


