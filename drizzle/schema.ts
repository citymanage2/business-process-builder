import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  tokenBalance: int("tokenBalance").default(1000).notNull(), // Баланс токенов для генерации процессов
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Companies table
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }),
  region: varchar("region", { length: 255 }),
  format: mysqlEnum("format", ["B2B", "B2C", "mixed"]),
  averageCheck: varchar("averageCheck", { length: 100 }),
  productsServices: text("productsServices"),
  itSystems: text("itSystems"),
  // Расширенные данные из полной анкеты (50 вопросов)
  businessModel: text("businessModel"),
  clientSegments: text("clientSegments"),
  keyProducts: text("keyProducts"),
  regions: text("regions"),
  seasonality: text("seasonality"),
  strategicGoals: text("strategicGoals"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// Interviews table
export const interviews = mysqlTable("interviews", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().references(() => companies.id, { onDelete: "cascade" }),
  interviewType: mysqlEnum("interviewType", ["voice", "form_full", "form_short"]).default("voice").notNull(),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "failed"]).default("in_progress").notNull(),
  audioUrl: text("audioUrl"),
  transcript: text("transcript"),
  structuredData: text("structuredData"),
  // Ответы на вопросы анкеты (JSON)
  answers: text("answers"),
  // Прогресс заполнения для черновиков
  progress: int("progress").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;

// Business processes table
export const businessProcesses = mysqlTable("businessProcesses", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().references(() => companies.id, { onDelete: "cascade" }),
  interviewId: int("interviewId").references(() => interviews.id, { onDelete: "set null" }),
  version: int("version").default(1).notNull(),
  status: mysqlEnum("status", ["draft", "in_review", "approved"]).default("draft").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  startEvent: text("startEvent"),
  endEvent: text("endEvent"),
  stages: text("stages"),
  roles: text("roles"),
  steps: text("steps"),
  branches: text("branches"),
  documents: text("documents"),
  itIntegration: text("itIntegration"),
  diagramData: text("diagramData"),
  // Расширенные данные для новой функциональности
  stageDetails: text("stageDetails"), // Детальное описание каждого этапа (JSON)
  totalTime: int("totalTime"), // Общее время процесса в минутах
  totalCost: int("totalCost"), // Общая стоимость процесса по ФОТ в рублях
  crmFunnels: text("crmFunnels"), // 3 варианта воронок CRM (JSON)
  requiredDocuments: text("requiredDocuments"), // Список необходимых документов (JSON)
  salaryData: text("salaryData"), // Данные о зарплатах ролей (JSON)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessProcess = typeof businessProcesses.$inferSelect;
export type InsertBusinessProcess = typeof businessProcesses.$inferInsert;

// Recommendations table
export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  businessProcessId: int("businessProcessId").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  category: mysqlEnum("category", ["optimization", "automation", "risk", "metric"]).notNull(),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  toolsSuggested: text("toolsSuggested"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;

// Comments table
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  businessProcessId: int("businessProcessId").notNull().references(() => businessProcesses.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  stepId: varchar("stepId", { length: 100 }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// Documents table - прикрепленные документы к компании
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// Error logs table - логи ошибок системы
export const errorLogs = mysqlTable("errorLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  errorType: varchar("errorType", { length: 100 }).notNull(),
  errorMessage: text("errorMessage").notNull(),
  stackTrace: text("stackTrace"),
  requestUrl: text("requestUrl"),
  requestMethod: varchar("requestMethod", { length: 10 }),
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;
// Support chats table - чаты поддержки
export const supportChats = mysqlTable("supportChats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportChat = typeof supportChats.$inferSelect;
export type InsertSupportChat = typeof supportChats.$inferInsert;

// Support messages table - сообщения в чатах поддержки
export const supportMessages = mysqlTable("supportMessages", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull().references(() => supportChats.id, { onDelete: "cascade" }),
  senderId: int("senderId").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderRole: mysqlEnum("senderRole", ["user", "admin"]).notNull(),
  message: text("message").notNull(),
  isRead: int("isRead").default(0).notNull(), // 0 = не прочитано, 1 = прочитано
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;
