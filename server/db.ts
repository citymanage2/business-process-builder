import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
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
  bpCategories,
  bpComments,
  bpNotifications,
  bpProcessBlocks,
  bpProcessCollaborators,
  bpProcessConnections,
  bpProcesses,
  bpProcessTags,
  bpProcessVersions,
  bpTags,
  bpTemplates,
  bpUserSettings,
  InsertBpCategory,
  InsertBpComment,
  InsertBpNotification,
  InsertBpProcess,
  InsertBpProcessBlock,
  InsertBpProcessCollaborator,
  InsertBpProcessConnection,
  InsertBpProcessTag,
  InsertBpProcessVersion,
  InsertBpTag,
  InsertBpTemplate,
  InsertBpUserSettings,
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

// =====================
// Business Process Builder (bp_) data access
// =====================

export async function createBpProcess(process: InsertBpProcess) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bpProcesses).values(process).returning({ id: bpProcesses.id });
  return result[0].id;
}

export async function listBpProcesses(filters: {
  ownerId?: number;
  visibility?: "private" | "public";
  status?: "draft" | "published" | "archived";
  categoryId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters.ownerId) conditions.push(eq(bpProcesses.ownerId, filters.ownerId));
  if (filters.visibility) conditions.push(eq(bpProcesses.visibility, filters.visibility));
  if (filters.status) conditions.push(eq(bpProcesses.status, filters.status));
  if (filters.categoryId) conditions.push(eq(bpProcesses.categoryId, filters.categoryId));
  conditions.push(isNull(bpProcesses.deletedAt));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(like(bpProcesses.title, term), like(bpProcesses.description, term)));
  }

  const query = db
    .select()
    .from(bpProcesses)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bpProcesses.updatedAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);

  return await query;
}

export async function getBpProcessById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bpProcesses).where(eq(bpProcesses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateBpProcess(id: number, data: Partial<InsertBpProcess>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpProcesses).set({ ...data, updatedAt: new Date() }).where(eq(bpProcesses.id, id));
}

export async function softDeleteBpProcess(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(bpProcesses)
    .set({ deletedAt: new Date(), status: "archived", archivedAt: new Date() })
    .where(eq(bpProcesses.id, id));
}

export async function restoreBpProcess(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpProcesses).set({ deletedAt: null, archivedAt: null, status: "draft" }).where(eq(bpProcesses.id, id));
}

export async function hardDeleteBpProcess(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bpProcesses).where(eq(bpProcesses.id, id));
}

export async function incrementBpProcessViewCount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(bpProcesses)
    .set({ viewCount: sql`${bpProcesses.viewCount} + 1` })
    .where(eq(bpProcesses.id, id));
}

export async function createBpProcessVersion(version: InsertBpProcessVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bpProcessVersions).values(version).returning({ id: bpProcessVersions.id });
  return result[0].id;
}

export async function listBpProcessVersions(processId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(bpProcessVersions)
    .where(eq(bpProcessVersions.processId, processId))
    .orderBy(desc(bpProcessVersions.versionNumber));
}

export async function getBpProcessVersionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bpProcessVersions).where(eq(bpProcessVersions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listBpProcessBlocks(processId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bpProcessBlocks).where(eq(bpProcessBlocks.processId, processId));
}

export async function createBpProcessBlock(block: InsertBpProcessBlock) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bpProcessBlocks).values(block).returning({ id: bpProcessBlocks.id });
  return result[0].id;
}

export async function updateBpProcessBlock(id: number, data: Partial<InsertBpProcessBlock>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpProcessBlocks).set({ ...data, updatedAt: new Date() }).where(eq(bpProcessBlocks.id, id));
}

export async function deleteBpProcessBlock(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bpProcessBlocks).where(eq(bpProcessBlocks.id, id));
}

export async function replaceBpProcessBlocks(processId: number, blocks: InsertBpProcessBlock[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bpProcessBlocks).where(eq(bpProcessBlocks.processId, processId));
  if (blocks.length > 0) {
    await db.insert(bpProcessBlocks).values(blocks);
  }
}

export async function listBpProcessConnections(processId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bpProcessConnections).where(eq(bpProcessConnections.processId, processId));
}

export async function createBpProcessConnection(connection: InsertBpProcessConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(bpProcessConnections)
    .values(connection)
    .returning({ id: bpProcessConnections.id });
  return result[0].id;
}

export async function updateBpProcessConnection(id: number, data: Partial<InsertBpProcessConnection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpProcessConnections).set(data).where(eq(bpProcessConnections.id, id));
}

export async function deleteBpProcessConnection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bpProcessConnections).where(eq(bpProcessConnections.id, id));
}

export async function replaceBpProcessConnections(
  processId: number,
  connections: InsertBpProcessConnection[],
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bpProcessConnections).where(eq(bpProcessConnections.processId, processId));
  if (connections.length > 0) {
    await db.insert(bpProcessConnections).values(connections);
  }
}

export async function listBpCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bpCategories).orderBy(bpCategories.name);
}

export async function createBpCategory(category: InsertBpCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bpCategories).values(category).returning({ id: bpCategories.id });
  return result[0].id;
}

export async function updateBpCategory(id: number, data: Partial<InsertBpCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpCategories).set({ ...data, updatedAt: new Date() }).where(eq(bpCategories.id, id));
}

export async function deleteBpCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bpCategories).where(eq(bpCategories.id, id));
}

export async function listBpTags() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bpTags).orderBy(bpTags.name);
}

export async function searchBpTags(query: string) {
  const db = await getDb();
  if (!db) return [];
  const term = `%${query}%`;
  return await db.select().from(bpTags).where(like(bpTags.name, term)).orderBy(bpTags.name).limit(10);
}

export async function createBpTag(tag: InsertBpTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bpTags).values(tag).returning({ id: bpTags.id });
  return result[0].id;
}

export async function createBpProcessTag(processTag: InsertBpProcessTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(bpProcessTags).values(processTag);
}

export async function deleteBpProcessTag(processId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(bpProcessTags)
    .where(and(eq(bpProcessTags.processId, processId), eq(bpProcessTags.tagId, tagId)));
}

export async function listBpProcessCollaborators(processId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bpProcessCollaborators).where(eq(bpProcessCollaborators.processId, processId));
}

export async function createBpProcessCollaborator(collaborator: InsertBpProcessCollaborator) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(bpProcessCollaborators)
    .values(collaborator)
    .returning({ id: bpProcessCollaborators.id });
  return result[0].id;
}

export async function updateBpProcessCollaborator(id: number, data: Partial<InsertBpProcessCollaborator>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpProcessCollaborators).set(data).where(eq(bpProcessCollaborators.id, id));
}

export async function deleteBpProcessCollaborator(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bpProcessCollaborators).where(eq(bpProcessCollaborators.id, id));
}

export async function listBpComments(processId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bpComments).where(eq(bpComments.processId, processId));
}

export async function createBpComment(comment: InsertBpComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bpComments).values(comment).returning({ id: bpComments.id });
  return result[0].id;
}

export async function updateBpComment(id: number, data: Partial<InsertBpComment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpComments).set({ ...data, updatedAt: new Date() }).where(eq(bpComments.id, id));
}

export async function deleteBpComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bpComments).where(eq(bpComments.id, id));
}

export async function listBpTemplates(filters: { isPublic?: boolean; categoryId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.isPublic !== undefined) conditions.push(eq(bpTemplates.isPublic, filters.isPublic));
  if (filters.categoryId) conditions.push(eq(bpTemplates.categoryId, filters.categoryId));
  return await db
    .select()
    .from(bpTemplates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bpTemplates.usageCount));
}

export async function getBpTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bpTemplates).where(eq(bpTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBpTemplate(template: InsertBpTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bpTemplates).values(template).returning({ id: bpTemplates.id });
  return result[0].id;
}

export async function updateBpTemplate(id: number, data: Partial<InsertBpTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpTemplates).set({ ...data, updatedAt: new Date() }).where(eq(bpTemplates.id, id));
}

export async function listBpNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bpNotifications).where(eq(bpNotifications.userId, userId));
}

export async function createBpNotification(notification: InsertBpNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(bpNotifications)
    .values(notification)
    .returning({ id: bpNotifications.id });
  return result[0].id;
}

export async function markBpNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpNotifications).set({ isRead: true }).where(eq(bpNotifications.id, id));
}

export async function markAllBpNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bpNotifications).set({ isRead: true }).where(eq(bpNotifications.userId, userId));
}

export async function deleteBpNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bpNotifications).where(eq(bpNotifications.id, id));
}

export async function getBpUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bpUserSettings).where(eq(bpUserSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertBpUserSettings(userId: number, data: Partial<InsertBpUserSettings>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getBpUserSettings(userId);
  if (!existing) {
    await db.insert(bpUserSettings).values({ userId, ...data });
    return;
  }

  await db.update(bpUserSettings).set({ ...data, updatedAt: new Date() }).where(eq(bpUserSettings.userId, userId));
}
