import {
  boolean,
  doublePrecision,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

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
export const bpProcessStatusEnum = pgEnum("bp_process_status", ["draft", "published", "archived"]);
export const bpVisibilityEnum = pgEnum("bp_visibility", ["private", "public"]);
export const bpConnectionTypeEnum = pgEnum("bp_connection_type", ["sequence", "data", "conditional"]);
export const bpCollaboratorRoleEnum = pgEnum("bp_collaborator_role", ["owner", "editor", "viewer", "commenter"]);
export const bpThemeEnum = pgEnum("bp_theme", ["light", "dark", "auto"]);
export const bpNotificationFrequencyEnum = pgEnum("bp_notification_frequency", ["instant", "daily", "weekly"]);


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

// ====================
// Business Process Builder (bp_) tables
// ====================

export const bpCategories = pgTable("bp_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id").references(() => bpCategories.id, { onDelete: "set null" }),
  color: varchar("color", { length: 7 }),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BpCategory = typeof bpCategories.$inferSelect;
export type InsertBpCategory = typeof bpCategories.$inferInsert;

export const bpTags = pgTable("bp_tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BpTag = typeof bpTags.$inferSelect;
export type InsertBpTag = typeof bpTags.$inferInsert;

export const bpProcesses = pgTable("bp_processes", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => bpCategories.id, { onDelete: "set null" }),
  status: bpProcessStatusEnum("status").default("draft").notNull(),
  visibility: bpVisibilityEnum("visibility").default("private").notNull(),
  thumbnail: text("thumbnail"),
  viewCount: integer("view_count").default(0).notNull(),
  version: integer("version").default(1).notNull(),
  content: text("content"),
  archivedAt: timestamp("archived_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BpProcess = typeof bpProcesses.$inferSelect;
export type InsertBpProcess = typeof bpProcesses.$inferInsert;

export const bpProcessVersions = pgTable("bp_process_versions", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => bpProcesses.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  content: text("content").notNull(),
  comment: text("comment"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BpProcessVersion = typeof bpProcessVersions.$inferSelect;
export type InsertBpProcessVersion = typeof bpProcessVersions.$inferInsert;

export const bpProcessBlocks = pgTable(
  "bp_process_blocks",
  {
    id: serial("id").primaryKey(),
    processId: integer("process_id").notNull().references(() => bpProcesses.id, { onDelete: "cascade" }),
    blockId: varchar("block_id", { length: 100 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    properties: text("properties"),
    positionX: doublePrecision("position_x"),
    positionY: doublePrecision("position_y"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  table => ({
    processBlockUnique: uniqueIndex("bp_process_blocks_process_block_unique").on(
      table.processId,
      table.blockId,
    ),
  }),
);

export type BpProcessBlock = typeof bpProcessBlocks.$inferSelect;
export type InsertBpProcessBlock = typeof bpProcessBlocks.$inferInsert;

export const bpProcessConnections = pgTable("bp_process_connections", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => bpProcesses.id, { onDelete: "cascade" }),
  sourceBlockId: varchar("source_block_id", { length: 100 }).notNull(),
  targetBlockId: varchar("target_block_id", { length: 100 }).notNull(),
  type: bpConnectionTypeEnum("type").notNull(),
  label: varchar("label", { length: 255 }),
  properties: text("properties"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BpProcessConnection = typeof bpProcessConnections.$inferSelect;
export type InsertBpProcessConnection = typeof bpProcessConnections.$inferInsert;

export const bpProcessTags = pgTable(
  "bp_process_tags",
  {
    processId: integer("process_id").notNull().references(() => bpProcesses.id, { onDelete: "cascade" }),
    tagId: integer("tag_id").notNull().references(() => bpTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.processId, table.tagId] }),
  }),
);

export type BpProcessTag = typeof bpProcessTags.$inferSelect;
export type InsertBpProcessTag = typeof bpProcessTags.$inferInsert;

export const bpProcessCollaborators = pgTable("bp_process_collaborators", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => bpProcesses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: bpCollaboratorRoleEnum("role").default("viewer").notNull(),
  invitedBy: integer("invited_by").references(() => users.id, { onDelete: "set null" }),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export type BpProcessCollaborator = typeof bpProcessCollaborators.$inferSelect;
export type InsertBpProcessCollaborator = typeof bpProcessCollaborators.$inferInsert;

export const bpComments = pgTable("bp_comments", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => bpProcesses.id, { onDelete: "cascade" }),
  blockId: varchar("block_id", { length: 100 }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id").references(() => bpComments.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BpComment = typeof bpComments.$inferSelect;
export type InsertBpComment = typeof bpComments.$inferInsert;

export const bpTemplates = pgTable("bp_templates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => bpCategories.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(false).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BpTemplate = typeof bpTemplates.$inferSelect;
export type InsertBpTemplate = typeof bpTemplates.$inferInsert;

export const bpNotifications = pgTable("bp_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  relatedProcessId: integer("related_process_id").references(() => bpProcesses.id, { onDelete: "set null" }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BpNotification = typeof bpNotifications.$inferSelect;
export type InsertBpNotification = typeof bpNotifications.$inferInsert;

export const bpUserSettings = pgTable("bp_user_settings", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  theme: bpThemeEnum("theme").default("auto").notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(false).notNull(),
  notificationFrequency: bpNotificationFrequencyEnum("notification_frequency")
    .default("instant")
    .notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BpUserSettings = typeof bpUserSettings.$inferSelect;
export type InsertBpUserSettings = typeof bpUserSettings.$inferInsert;

