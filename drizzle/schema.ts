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

// Process visibility enum
export const visibilityEnum = pgEnum("visibility", ["private", "public"]);

// Process Builder - Templates table
export const processTemplates = pgTable("process_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  tags: text("tags"), // JSON array of tags
  diagramData: text("diagram_data").notNull(), // Full process structure JSON
  isPublic: integer("is_public").default(0).notNull(), // 0 = private, 1 = public
  isBuiltIn: integer("is_built_in").default(0).notNull(), // 1 = predefined template
  usageCount: integer("usage_count").default(0).notNull(),
  rating: integer("rating").default(0), // Average rating (0-50 stored as integer, displayed as 0-5)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProcessTemplate = typeof processTemplates.$inferSelect;
export type InsertProcessTemplate = typeof processTemplates.$inferInsert;

// Process Versions for version control
export const processVersions = pgTable("process_versions", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshotData: text("snapshot_data").notNull(), // Full process state JSON
  changeDescription: text("change_description"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProcessVersion = typeof processVersions.$inferSelect;
export type InsertProcessVersion = typeof processVersions.$inferInsert;

// Process Permissions for collaboration
export const permissionLevelEnum = pgEnum("permission_level", ["owner", "editor", "viewer", "commenter"]);

export const processPermissions = pgTable("process_permissions", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permissionLevel: permissionLevelEnum("permission_level").notNull(),
  invitedBy: integer("invited_by").references(() => users.id, { onDelete: "set null" }),
  inviteToken: varchar("invite_token", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProcessPermission = typeof processPermissions.$inferSelect;
export type InsertProcessPermission = typeof processPermissions.$inferInsert;

// User Categories for organizing processes
export const userCategories = pgTable("user_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  parentId: integer("parent_id").references((): any => userCategories.id, { onDelete: "set null" }),
  color: varchar("color", { length: 20 }),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserCategory = typeof userCategories.$inferSelect;
export type InsertUserCategory = typeof userCategories.$inferInsert;

// Process Notifications
export const notificationTypeEnum = pgEnum("notification_type", [
  "invite", "comment", "mention", "change", "deadline", "system"
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  relatedProcessId: integer("related_process_id").references(() => businessProcesses.id, { onDelete: "cascade" }),
  relatedCommentId: integer("related_comment_id").references(() => comments.id, { onDelete: "cascade" }),
  isRead: integer("is_read").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;


