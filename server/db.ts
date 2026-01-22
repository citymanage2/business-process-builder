import { eq, like, and, or, desc, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { 
  InsertUser, users,
  InsertCompany, companies,
  InsertInterview, interviews,
  InsertBusinessProcess, businessProcesses,
  InsertRecommendation, recommendations,
  InsertComment, comments,
  InsertDocument, documents,
  InsertErrorLog, errorLogs,
  InsertSupportChat, supportChats,
  InsertSupportMessage, supportMessages,
  InsertFaqArticle, faqArticles, FaqArticle,
  // Process Builder tables
  builderCategories, InsertBuilderCategory, BuilderCategory,
  builderProcesses, InsertBuilderProcess, BuilderProcess,
  builderVersions, InsertBuilderVersion, BuilderVersion,
  builderCollaborators, InsertBuilderCollaborator, BuilderCollaborator,
  builderComments, InsertBuilderComment, BuilderComment,
  builderTemplates, InsertBuilderTemplate, BuilderTemplate,
  builderNotifications, InsertBuilderNotification, BuilderNotification
} from "../drizzle/schema";
import { ENV } from './_core/env';

// Global connection pool - reuses connections efficiently
let pool: Pool | null = null;

// Initialize connection pool (called once on server start)
function initPool() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not set");
    return null;
  }

  if (pool) {
    return pool;
  }

  console.log('[Database] Initializing connection pool...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return error after 10 seconds if unable to connect
  });

  pool.on('error', (err) => {
    console.error('[Database] Unexpected pool error:', err);
  });

  console.log('[Database] Connection pool initialized');
  return pool;
}

// Get database instance with connection pooling
export async function getDb() {
  const currentPool = initPool();
  
  if (!currentPool) {
    console.warn("[Database] Pool not available");
    return null;
  }

  try {
    return drizzle(currentPool);
  } catch (error) {
    console.error("[Database] Failed to get drizzle instance:", error);
    return null;
  }
}

// Graceful shutdown - close all connections
export async function closePool() {
  if (pool) {
    console.log('[Database] Closing connection pool...');
    await pool.end();
    pool = null;
    console.log('[Database] Connection pool closed');
  }
}

// Get connection pool metrics for monitoring
export function getPoolMetrics() {
  if (!pool) {
    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      maxConnections: 0,
      status: 'not_initialized'
    };
  }

  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
    maxConnections: pool.options.max || 20,
    status: 'active'
  };
}

export async function createUser(data: { email?: string; phone?: string; name?: string; provider?: string; providerId?: string; passwordHash?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertUser = {
    email: data.email,
    phone: data.phone,
    name: data.name,
    provider: data.provider || 'local',
    providerId: data.providerId,
    passwordHash: data.passwordHash,
    tokenBalance: 1000,
    lastSignedIn: new Date(),
  };

  // Set admin role for owner email
  if (data.email && data.email === ENV.ownerEmail) {
    values.role = 'admin';
  }

  const result = await db.insert(users).values(values).returning({ id: users.id });
  const userId = result[0].id;
  
  const user = await getUserById(userId);
  if (!user) throw new Error("Failed to create user");
  return user!;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserLastSignIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

// Legacy function - kept for compatibility
export async function upsertUser(user: InsertUser): Promise<void> {
  console.warn("[Database] upsertUser is deprecated, use createUser instead");
}

export async function getUserByOpenId(openId: string) {
  console.warn("[Database] getUserByOpenId is deprecated, use getUserByEmail instead");
  return undefined;
}

// Companies
export async function createCompany(company: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companies).values(company).returning({ id: companies.id });
  return result[0].id;
}

export async function getUserCompanies(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(companies).where(eq(companies.userId, userId));
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCompany(id: number, data: Partial<InsertCompany>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set(data).where(eq(companies.id, id));
}

export async function deleteCompany(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(companies).where(eq(companies.id, id));
}

// Interviews
export async function createInterview(interview: InsertInterview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(interviews).values(interview).returning({ id: interviews.id });
  return result[0].id;
}

export async function getInterviewById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(interviews).where(eq(interviews.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateInterview(id: number, data: Partial<InsertInterview>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(interviews).set(data).where(eq(interviews.id, id));
}

// Business Processes
export async function createBusinessProcess(process: InsertBusinessProcess) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(businessProcesses).values(process).returning({ id: businessProcesses.id });
  return result[0].id;
}

export async function getCompanyProcesses(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(businessProcesses).where(eq(businessProcesses.companyId, companyId));
}

export async function getProcessById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(businessProcesses).where(eq(businessProcesses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateBusinessProcess(id: number, data: Partial<InsertBusinessProcess>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(businessProcesses).set(data).where(eq(businessProcesses.id, id));
}

export async function deleteBusinessProcess(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Удаляем связанные рекомендации
  await db.delete(recommendations).where(eq(recommendations.businessProcessId, id));
  // Удаляем связанные комментарии
  await db.delete(comments).where(eq(comments.businessProcessId, id));
  // Удаляем сам процесс
  await db.delete(businessProcesses).where(eq(businessProcesses.id, id));
}

// Recommendations
export async function createRecommendation(recommendation: InsertRecommendation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(recommendations).values(recommendation).returning({ id: recommendations.id });
  return result[0].id;
}

export async function getProcessRecommendations(businessProcessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(recommendations).where(eq(recommendations.businessProcessId, businessProcessId));
}

// Comments
export async function createComment(comment: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(comments).values(comment).returning({ id: comments.id });
  return result[0].id;
}

export async function getProcessComments(businessProcessId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(comments).where(eq(comments.businessProcessId, businessProcessId));
}

export async function deleteComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(comments).where(eq(comments.id, id));
}

// ============ Documents ============

export async function createDocument(doc: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(documents).values(doc);
  return result;
}

export async function getDocumentsByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(documents).where(eq(documents.companyId, companyId));
  return result;
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(documents).where(eq(documents.id, id));
}

// ============ Interview Drafts ============

export async function saveDraftInterview(interview: InsertInterview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (interview.id) {
    // Update existing draft
    await db.update(interviews)
      .set({
        answers: interview.answers,
        progress: interview.progress,
        status: interview.status || "draft",
        updatedAt: new Date(),
      })
      .where(eq(interviews.id, interview.id));
    return interview.id;
  } else {
    // Create new draft
    const result = await db.insert(interviews).values({
      ...interview,
      status: "draft",
    }).returning({ id: interviews.id });
    return result[0]?.id;
  }
}

export async function getDraftInterviews(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select()
    .from(interviews)
    .where(and(
      eq(interviews.companyId, companyId),
      eq(interviews.status, "draft")
    ));
  return result;
}

// ==================== Admin Functions ====================

export async function getAllUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get users: database not available");
    return [];
  }

  try {
    const result = await db.select().from(users);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get all users:", error);
    return [];
  }
}

export async function updateUserBalance(userId: number, newBalance: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update balance: database not available");
    return false;
  }

  try {
    await db.update(users)
      .set({ tokenBalance: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user balance:", error);
    return false;
  }
}

export async function getErrorLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get error logs: database not available");
    return [];
  }

  try {
    const result = await db.select().from(errorLogs).limit(limit).orderBy(errorLogs.createdAt);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get error logs:", error);
    return [];
  }
}

export async function createErrorLog(log: InsertErrorLog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create error log: database not available");
    return;
  }

  try {
    await db.insert(errorLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to create error log:", error);
  }
}

// Token balance operations
export async function getUserBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user balance: database not available");
    return 0;
  }

  try {
    const result = await db.select({ tokenBalance: users.tokenBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return result.length > 0 ? (result[0].tokenBalance || 0) : 0;
  } catch (error) {
    console.error("[Database] Failed to get user balance:", error);
    return 0;
  }
}

export async function deductTokens(userId: number, amount: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot deduct tokens: database not available");
    return false;
  }

  try {
    // Получаем текущий баланс
    const currentBalance = await getUserBalance(userId);
    
    // Проверяем достаточность средств
    if (currentBalance < amount) {
      console.warn(`[Database] Insufficient balance for user ${userId}: ${currentBalance} < ${amount}`);
      return false;
    }

    // Списываем токены
    const newBalance = currentBalance - amount;
    await db.update(users)
      .set({ tokenBalance: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    console.log(`[Database] Deducted ${amount} tokens from user ${userId}. New balance: ${newBalance}`);
    return true;
  } catch (error) {
    console.error("[Database] Failed to deduct tokens:", error);
    return false;
  }
}

// ==================== Support Chat Functions ====================

/**
 * Создать новый чат поддержки для пользователя
 */
export async function createSupportChat(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(supportChats).values({
    userId,
    status: "open",
    lastMessageAt: new Date(),
  }).returning({ id: supportChats.id });

  return result[0].id;
}

/**
 * Получить чат поддержки пользователя (создать если не существует)
 */
export async function getOrCreateUserSupportChat(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Проверяем существующий открытый чат
  const existingChats = await db
    .select()
    .from(supportChats)
    .where(and(eq(supportChats.userId, userId), eq(supportChats.status, "open")))
    .limit(1);

  if (existingChats.length > 0) {
    return existingChats[0];
  }

  // Создаем новый чат
  const chatId = await createSupportChat(userId);
  
  // Получаем созданный чат
  const newChat = await db
    .select()
    .from(supportChats)
    .where(eq(supportChats.id, chatId))
    .limit(1);

  return newChat[0];
}

/**
 * Отправить сообщение в чат поддержки
 */
export async function sendSupportMessage(
  chatId: number,
  senderId: number,
  senderRole: "user" | "admin",
  message: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Вставляем сообщение
  await db.insert(supportMessages).values({
    chatId,
    senderId,
    senderRole,
    message,
    isRead: 0,
  });

  // Обновляем время последнего сообщения в чате
  await db
    .update(supportChats)
    .set({ lastMessageAt: new Date() })
    .where(eq(supportChats.id, chatId));
}

/**
 * Получить все сообщения чата
 */
export async function getSupportChatMessages(chatId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.chatId, chatId))
    .orderBy(supportMessages.createdAt);
}

/**
 * Получить все чаты (для админа)
 */
export async function getAllSupportChats() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Получаем чаты с информацией о пользователях
  const chats = await db
    .select({
      id: supportChats.id,
      userId: supportChats.userId,
      status: supportChats.status,
      lastMessageAt: supportChats.lastMessageAt,
      createdAt: supportChats.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(supportChats)
    .leftJoin(users, eq(supportChats.userId, users.id))
    .orderBy(supportChats.lastMessageAt);

  return chats;
}

/**
 * Отметить сообщения как прочитанные
 */
export async function markMessagesAsRead(chatId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Отмечаем непрочитанные сообщения от противоположной роли
  const oppositeRole = role === "user" ? "admin" : "user";
  
  await db
    .update(supportMessages)
    .set({ isRead: 1 })
    .where(
      and(
        eq(supportMessages.chatId, chatId),
        eq(supportMessages.senderRole, oppositeRole),
        eq(supportMessages.isRead, 0)
      )
    );
}

/**
 * Получить количество непрочитанных сообщений для роли
 */
export async function getUnreadMessagesCount(chatId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Считаем непрочитанные сообщения от противоположной роли
  const oppositeRole = role === "user" ? "admin" : "user";
  
  const result = await db
    .select()
    .from(supportMessages)
    .where(
      and(
        eq(supportMessages.chatId, chatId),
        eq(supportMessages.senderRole, oppositeRole),
        eq(supportMessages.isRead, 0)
      )
    );

  return result.length;
}

// =====================
// FAQ Articles
// =====================

export async function getAllFaqArticles(): Promise<FaqArticle[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(faqArticles)
    .where(eq(faqArticles.isPublished, 1))
    .orderBy(faqArticles.order, faqArticles.id);
  
  return result;
}

export async function searchFaqByKeywords(query: string): Promise<FaqArticle[]> {
  const db = await getDb();
  if (!db) return [];
  
  const searchTerm = `%${query.toLowerCase()}%`;
  
  const result = await db
    .select()
    .from(faqArticles)
    .where(
      and(
        eq(faqArticles.isPublished, 1),
        or(
          like(faqArticles.question, searchTerm),
          like(faqArticles.answer, searchTerm),
          like(faqArticles.keywords, searchTerm)
        )
      )
    )
    .orderBy(faqArticles.order, faqArticles.id)
    .limit(5);
  
  return result;
}

export async function createFaqArticle(article: InsertFaqArticle): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(faqArticles).values(article).returning({ id: faqArticles.id });
  return result[0].id;
}

export async function updateFaqArticle(id: number, article: Partial<InsertFaqArticle>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(faqArticles).set(article).where(eq(faqArticles.id, id));
}

export async function deleteFaqArticle(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(faqArticles).where(eq(faqArticles.id, id));
}

export async function getFaqArticleById(id: number): Promise<FaqArticle | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(faqArticles).where(eq(faqArticles.id, id)).limit(1);
  return result[0];
}


// ============ User Auth Helpers ============

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// =============================================
// Process Builder Functions
// =============================================

// ============ Categories ============

export async function createBuilderCategory(category: InsertBuilderCategory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(builderCategories).values(category).returning({ id: builderCategories.id });
  return result[0].id;
}

export async function getAllBuilderCategories(userId?: number): Promise<BuilderCategory[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Return system categories (userId is null) and user's own categories
  const result = await db
    .select()
    .from(builderCategories)
    .where(
      userId
        ? or(isNull(builderCategories.userId), eq(builderCategories.userId, userId))
        : isNull(builderCategories.userId)
    )
    .orderBy(builderCategories.name);
  
  return result;
}

export async function updateBuilderCategory(id: number, data: Partial<InsertBuilderCategory>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderCategories).set({ ...data, updatedAt: new Date() }).where(eq(builderCategories.id, id));
}

export async function deleteBuilderCategory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(builderCategories).where(eq(builderCategories.id, id));
}

// ============ Processes ============

export async function createBuilderProcess(process: InsertBuilderProcess): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(builderProcesses).values(process).returning({ id: builderProcesses.id });
  return result[0].id;
}

export async function getBuilderProcessById(id: number): Promise<BuilderProcess | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(builderProcesses)
    .where(and(eq(builderProcesses.id, id), isNull(builderProcesses.deletedAt)))
    .limit(1);
  
  return result[0];
}

export async function getUserBuilderProcesses(userId: number, options?: {
  status?: "draft" | "published" | "archived";
  categoryId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<BuilderProcess[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(builderProcesses.ownerId, userId),
    isNull(builderProcesses.deletedAt)
  ];
  
  if (options?.status) {
    conditions.push(eq(builderProcesses.status, options.status));
  }
  
  if (options?.categoryId) {
    conditions.push(eq(builderProcesses.categoryId, options.categoryId));
  }
  
  if (options?.search) {
    conditions.push(
      or(
        like(builderProcesses.name, `%${options.search}%`),
        like(builderProcesses.description, `%${options.search}%`)
      )!
    );
  }
  
  let query = db
    .select()
    .from(builderProcesses)
    .where(and(...conditions))
    .orderBy(desc(builderProcesses.updatedAt));
  
  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  
  if (options?.offset) {
    query = query.offset(options.offset) as typeof query;
  }
  
  return await query;
}

export async function getPublicBuilderProcesses(options?: {
  categoryId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<BuilderProcess[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(builderProcesses.visibility, "public"),
    eq(builderProcesses.status, "published"),
    isNull(builderProcesses.deletedAt)
  ];
  
  if (options?.categoryId) {
    conditions.push(eq(builderProcesses.categoryId, options.categoryId));
  }
  
  if (options?.search) {
    conditions.push(
      or(
        like(builderProcesses.name, `%${options.search}%`),
        like(builderProcesses.description, `%${options.search}%`)
      )!
    );
  }
  
  let query = db
    .select()
    .from(builderProcesses)
    .where(and(...conditions))
    .orderBy(desc(builderProcesses.viewCount));
  
  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  
  if (options?.offset) {
    query = query.offset(options.offset) as typeof query;
  }
  
  return await query;
}

export async function getCollaboratorProcesses(userId: number): Promise<(BuilderProcess & { accessRole: string })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: builderProcesses.id,
      name: builderProcesses.name,
      description: builderProcesses.description,
      ownerId: builderProcesses.ownerId,
      categoryId: builderProcesses.categoryId,
      status: builderProcesses.status,
      visibility: builderProcesses.visibility,
      tags: builderProcesses.tags,
      thumbnail: builderProcesses.thumbnail,
      currentVersion: builderProcesses.currentVersion,
      viewCount: builderProcesses.viewCount,
      canvasSettings: builderProcesses.canvasSettings,
      blocksData: builderProcesses.blocksData,
      connectionsData: builderProcesses.connectionsData,
      deletedAt: builderProcesses.deletedAt,
      createdAt: builderProcesses.createdAt,
      updatedAt: builderProcesses.updatedAt,
      accessRole: builderCollaborators.role
    })
    .from(builderCollaborators)
    .innerJoin(builderProcesses, eq(builderCollaborators.processId, builderProcesses.id))
    .where(
      and(
        eq(builderCollaborators.userId, userId),
        isNull(builderProcesses.deletedAt)
      )
    )
    .orderBy(desc(builderProcesses.updatedAt));
  
  return result as (BuilderProcess & { accessRole: string })[];
}

export async function updateBuilderProcess(id: number, data: Partial<InsertBuilderProcess>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderProcesses).set({ ...data, updatedAt: new Date() }).where(eq(builderProcesses.id, id));
}

export async function softDeleteBuilderProcess(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderProcesses).set({ deletedAt: new Date() }).where(eq(builderProcesses.id, id));
}

export async function hardDeleteBuilderProcess(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related data first
  await db.delete(builderVersions).where(eq(builderVersions.processId, id));
  await db.delete(builderCollaborators).where(eq(builderCollaborators.processId, id));
  await db.delete(builderComments).where(eq(builderComments.processId, id));
  await db.delete(builderNotifications).where(eq(builderNotifications.processId, id));
  // Delete the process
  await db.delete(builderProcesses).where(eq(builderProcesses.id, id));
}

export async function restoreBuilderProcess(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderProcesses).set({ deletedAt: null }).where(eq(builderProcesses.id, id));
}

export async function incrementProcessViewCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(builderProcesses)
    .set({ viewCount: sql`${builderProcesses.viewCount} + 1` })
    .where(eq(builderProcesses.id, id));
}

// ============ Versions ============

export async function createBuilderVersion(version: InsertBuilderVersion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(builderVersions).values(version).returning({ id: builderVersions.id });
  return result[0].id;
}

export async function getProcessVersions(processId: number): Promise<BuilderVersion[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(builderVersions)
    .where(eq(builderVersions.processId, processId))
    .orderBy(desc(builderVersions.versionNumber));
}

export async function getVersionById(id: number): Promise<BuilderVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(builderVersions).where(eq(builderVersions.id, id)).limit(1);
  return result[0];
}

export async function getLatestVersionNumber(processId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ maxVersion: sql<number>`MAX(${builderVersions.versionNumber})` })
    .from(builderVersions)
    .where(eq(builderVersions.processId, processId));
  
  return result[0]?.maxVersion || 0;
}

// ============ Collaborators ============

export async function addCollaborator(collaborator: InsertBuilderCollaborator): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(builderCollaborators).values(collaborator).returning({ id: builderCollaborators.id });
  return result[0].id;
}

export async function getProcessCollaborators(processId: number): Promise<(BuilderCollaborator & { userName?: string; userEmail?: string })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: builderCollaborators.id,
      processId: builderCollaborators.processId,
      userId: builderCollaborators.userId,
      role: builderCollaborators.role,
      inviteToken: builderCollaborators.inviteToken,
      invitedAt: builderCollaborators.invitedAt,
      acceptedAt: builderCollaborators.acceptedAt,
      userName: users.name,
      userEmail: users.email
    })
    .from(builderCollaborators)
    .leftJoin(users, eq(builderCollaborators.userId, users.id))
    .where(eq(builderCollaborators.processId, processId));
  
  return result as (BuilderCollaborator & { userName?: string; userEmail?: string })[];
}

export async function getCollaboratorByToken(token: string): Promise<BuilderCollaborator | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(builderCollaborators)
    .where(eq(builderCollaborators.inviteToken, token))
    .limit(1);
  
  return result[0];
}

export async function updateCollaborator(id: number, data: Partial<InsertBuilderCollaborator>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderCollaborators).set(data).where(eq(builderCollaborators.id, id));
}

export async function removeCollaborator(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(builderCollaborators).where(eq(builderCollaborators.id, id));
}

export async function getUserAccessToProcess(processId: number, userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Check if owner
  const process = await getBuilderProcessById(processId);
  if (process?.ownerId === userId) return "owner";
  
  // Check collaborator role
  const collab = await db
    .select({ role: builderCollaborators.role })
    .from(builderCollaborators)
    .where(
      and(
        eq(builderCollaborators.processId, processId),
        eq(builderCollaborators.userId, userId)
      )
    )
    .limit(1);
  
  if (collab[0]) return collab[0].role;
  
  // Check if public
  if (process?.visibility === "public" && process?.status === "published") {
    return "viewer";
  }
  
  return null;
}

// ============ Comments ============

export async function createBuilderComment(comment: InsertBuilderComment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(builderComments).values(comment).returning({ id: builderComments.id });
  return result[0].id;
}

export async function getProcessCommentsList(processId: number, blockId?: string): Promise<(BuilderComment & { userName?: string })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(builderComments.processId, processId)];
  
  if (blockId) {
    conditions.push(eq(builderComments.blockId, blockId));
  }
  
  const result = await db
    .select({
      id: builderComments.id,
      processId: builderComments.processId,
      blockId: builderComments.blockId,
      parentId: builderComments.parentId,
      userId: builderComments.userId,
      content: builderComments.content,
      resolved: builderComments.resolved,
      createdAt: builderComments.createdAt,
      updatedAt: builderComments.updatedAt,
      userName: users.name
    })
    .from(builderComments)
    .leftJoin(users, eq(builderComments.userId, users.id))
    .where(and(...conditions))
    .orderBy(builderComments.createdAt);
  
  return result as (BuilderComment & { userName?: string })[];
}

export async function updateBuilderComment(id: number, data: Partial<InsertBuilderComment>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderComments).set({ ...data, updatedAt: new Date() }).where(eq(builderComments.id, id));
}

export async function deleteBuilderComment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(builderComments).where(eq(builderComments.id, id));
}

// ============ Templates ============

export async function createBuilderTemplate(template: InsertBuilderTemplate): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(builderTemplates).values(template).returning({ id: builderTemplates.id });
  return result[0].id;
}

export async function getBuilderTemplates(options?: {
  categoryId?: number;
  systemOnly?: boolean;
  search?: string;
}): Promise<BuilderTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(builderTemplates.isPublished, 1)];
  
  if (options?.categoryId) {
    conditions.push(eq(builderTemplates.categoryId, options.categoryId));
  }
  
  if (options?.systemOnly) {
    conditions.push(eq(builderTemplates.isSystem, 1));
  }
  
  if (options?.search) {
    conditions.push(
      or(
        like(builderTemplates.name, `%${options.search}%`),
        like(builderTemplates.description, `%${options.search}%`)
      )!
    );
  }
  
  return await db
    .select()
    .from(builderTemplates)
    .where(and(...conditions))
    .orderBy(desc(builderTemplates.usageCount));
}

export async function getTemplateById(id: number): Promise<BuilderTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(builderTemplates).where(eq(builderTemplates.id, id)).limit(1);
  return result[0];
}

export async function updateBuilderTemplate(id: number, data: Partial<InsertBuilderTemplate>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderTemplates).set({ ...data, updatedAt: new Date() }).where(eq(builderTemplates.id, id));
}

export async function incrementTemplateUsage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(builderTemplates)
    .set({ usageCount: sql`${builderTemplates.usageCount} + 1` })
    .where(eq(builderTemplates.id, id));
}

export async function deleteBuilderTemplate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(builderTemplates).where(eq(builderTemplates.id, id));
}

// ============ Notifications ============

export async function createBuilderNotification(notification: InsertBuilderNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(builderNotifications).values(notification).returning({ id: builderNotifications.id });
  return result[0].id;
}

export async function getUserNotifications(userId: number, unreadOnly?: boolean): Promise<BuilderNotification[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(builderNotifications.userId, userId)];
  
  if (unreadOnly) {
    conditions.push(eq(builderNotifications.isRead, 0));
  }
  
  return await db
    .select()
    .from(builderNotifications)
    .where(and(...conditions))
    .orderBy(desc(builderNotifications.createdAt))
    .limit(50);
}

export async function markNotificationAsRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderNotifications).set({ isRead: 1 }).where(eq(builderNotifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderNotifications)
    .set({ isRead: 1 })
    .where(and(eq(builderNotifications.userId, userId), eq(builderNotifications.isRead, 0)));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(builderNotifications)
    .where(and(eq(builderNotifications.userId, userId), eq(builderNotifications.isRead, 0)));
  
  return result[0]?.count || 0;
}

// ============ User Statistics ============

export async function getUserBuilderStats(userId: number): Promise<{
  totalProcesses: number;
  publishedProcesses: number;
  draftProcesses: number;
  sharedWithMe: number;
  totalViews: number;
}> {
  const db = await getDb();
  if (!db) return { totalProcesses: 0, publishedProcesses: 0, draftProcesses: 0, sharedWithMe: 0, totalViews: 0 };
  
  // Get own processes count
  const ownProcesses = await db
    .select({ 
      count: sql<number>`count(*)`,
      status: builderProcesses.status,
      views: sql<number>`SUM(${builderProcesses.viewCount})`
    })
    .from(builderProcesses)
    .where(and(eq(builderProcesses.ownerId, userId), isNull(builderProcesses.deletedAt)))
    .groupBy(builderProcesses.status);
  
  // Get shared processes count
  const sharedCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(builderCollaborators)
    .where(eq(builderCollaborators.userId, userId));
  
  let totalProcesses = 0;
  let publishedProcesses = 0;
  let draftProcesses = 0;
  let totalViews = 0;
  
  for (const row of ownProcesses) {
    totalProcesses += Number(row.count);
    totalViews += Number(row.views) || 0;
    if (row.status === "published") publishedProcesses = Number(row.count);
    if (row.status === "draft") draftProcesses = Number(row.count);
  }
  
  return {
    totalProcesses,
    publishedProcesses,
    draftProcesses,
    sharedWithMe: sharedCount[0]?.count || 0,
    totalViews
  };
}
