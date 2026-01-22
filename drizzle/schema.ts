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

// ============== Business Process Builder Tables ==============

// Enums for process builder
export const builderProcessStatusEnum = pgEnum("builder_process_status", ["draft", "published", "archived"]);
export const processVisibilityEnum = pgEnum("process_visibility", ["private", "public"]);
export const blockTypeEnum = pgEnum("block_type", [
  // Start and End
  "start", "end", "entry_point", "exit_point",
  // Actions
  "task", "subprocess", "manual_action", "automated_action", "send_notification", "api_call",
  // Decisions
  "condition", "multiple_choice", "parallel_gateway", "exclusive_gateway",
  // Data
  "data_input", "data_output", "data_store", "document",
  // Events
  "timer_event", "signal_event", "error_event", "escalation_event",
  // Participants
  "role", "department", "external_system"
]);
export const connectionTypeEnum = pgEnum("connection_type", ["sequence", "data", "conditional"]);
export const accessLevelEnum = pgEnum("access_level", ["owner", "editor", "commenter", "viewer"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "collaboration_invite", "comment_added", "mention", "process_updated", "deadline_approaching", "system"
]);

// Process Categories
export const processCategories = pgTable("process_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // hex color
  icon: varchar("icon", { length: 100 }),
  parentId: integer("parent_id").references((): any => processCategories.id, { onDelete: "set null" }),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProcessCategory = typeof processCategories.$inferSelect;
export type InsertProcessCategory = typeof processCategories.$inferInsert;

// Process Tags
export const processTags = pgTable("process_tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 7 }), // hex color
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProcessTag = typeof processTags.$inferSelect;
export type InsertProcessTag = typeof processTags.$inferInsert;

// Builder Processes - main table for process builder
export const builderProcesses = pgTable("builder_processes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => processCategories.id, { onDelete: "set null" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: builderProcessStatusEnum("status").default("draft").notNull(),
  visibility: processVisibilityEnum("visibility").default("private").notNull(),
  currentVersion: integer("current_version").default(1).notNull(),
  // Canvas data stored as JSON
  nodes: text("nodes"), // JSON array of ReactFlow nodes
  edges: text("edges"), // JSON array of ReactFlow edges
  viewport: text("viewport"), // JSON object with zoom and position
  // Metadata
  thumbnail: text("thumbnail"), // base64 or URL of process preview
  viewCount: integer("view_count").default(0).notNull(),
  lastEditedAt: timestamp("last_edited_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BuilderProcess = typeof builderProcesses.$inferSelect;
export type InsertBuilderProcess = typeof builderProcesses.$inferInsert;

// Process Versions - for version history
export const processVersions = pgTable("process_versions", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => builderProcesses.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment"),
  // Snapshot of process state
  nodes: text("nodes").notNull(),
  edges: text("edges").notNull(),
  viewport: text("viewport"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProcessVersion = typeof processVersions.$inferSelect;
export type InsertProcessVersion = typeof processVersions.$inferInsert;

// Process-Tag Junction Table
export const processTagRelations = pgTable("process_tag_relations", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => builderProcesses.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => processTags.id, { onDelete: "cascade" }),
});

export type ProcessTagRelation = typeof processTagRelations.$inferSelect;
export type InsertProcessTagRelation = typeof processTagRelations.$inferInsert;

// Process Access - for sharing and collaboration
export const processAccess = pgTable("process_access", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => builderProcesses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessLevel: accessLevelEnum("access_level").notNull(),
  inviteToken: varchar("invite_token", { length: 64 }),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export type ProcessAccess = typeof processAccess.$inferSelect;
export type InsertProcessAccess = typeof processAccess.$inferInsert;

// Process Comments - for collaboration
export const processComments = pgTable("process_comments", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull().references(() => builderProcesses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references((): any => processComments.id, { onDelete: "cascade" }),
  nodeId: varchar("node_id", { length: 100 }), // Optional: comment on specific node
  content: text("content").notNull(),
  isResolved: integer("is_resolved").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProcessComment = typeof processComments.$inferSelect;
export type InsertProcessComment = typeof processComments.$inferInsert;

// Process Templates
export const processTemplates = pgTable("process_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => processCategories.id, { onDelete: "set null" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  // Template data
  nodes: text("nodes").notNull(),
  edges: text("edges").notNull(),
  // Metadata
  isPublic: integer("is_public").default(0).notNull(),
  isApproved: integer("is_approved").default(0).notNull(), // For moderation
  usageCount: integer("usage_count").default(0).notNull(),
  rating: integer("rating").default(0).notNull(), // Average rating * 100 (e.g., 450 = 4.5)
  ratingCount: integer("rating_count").default(0).notNull(),
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProcessTemplate = typeof processTemplates.$inferSelect;
export type InsertProcessTemplate = typeof processTemplates.$inferInsert;

// Template Ratings
export const templateRatings = pgTable("template_ratings", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => processTemplates.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TemplateRating = typeof templateRatings.$inferSelect;
export type InsertTemplateRating = typeof templateRatings.$inferInsert;

// User Notifications
export const userNotifications = pgTable("user_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  relatedProcessId: integer("related_process_id").references(() => builderProcesses.id, { onDelete: "cascade" }),
  relatedCommentId: integer("related_comment_id").references(() => processComments.id, { onDelete: "cascade" }),
  isRead: integer("is_read").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

// User Notification Settings
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  emailEnabled: integer("email_enabled").default(1).notNull(),
  emailFrequency: varchar("email_frequency", { length: 20 }).default("instant").notNull(), // instant, daily
  pushEnabled: integer("push_enabled").default(1).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // HH:MM format
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // HH:MM format
  // Per-type settings (JSON object)
  typeSettings: text("type_settings"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting = typeof notificationSettings.$inferInsert;

// Saved Filters
export const savedFilters = pgTable("saved_filters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  filters: text("filters").notNull(), // JSON object with filter criteria
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SavedFilter = typeof savedFilters.$inferSelect;
export type InsertSavedFilter = typeof savedFilters.$inferInsert;

