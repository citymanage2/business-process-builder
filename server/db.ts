import { eq, like, and, or, desc, asc, sql, inArray } from "drizzle-orm";
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
  // Process Builder imports
  InsertBuilderProcess, builderProcesses, BuilderProcess,
  InsertProcessVersion, processVersions, ProcessVersion,
  InsertProcessCategory, processCategories, ProcessCategory,
  InsertProcessTag, processTags, ProcessTag,
  InsertProcessTagRelation, processTagRelations,
  InsertProcessAccess, processAccess, ProcessAccess,
  InsertProcessComment, processComments, ProcessComment,
  InsertProcessTemplate, processTemplates, ProcessTemplate,
  InsertTemplateRating, templateRatings,
  InsertUserNotification, userNotifications, UserNotification,
  InsertNotificationSetting, notificationSettings,
  InsertSavedFilter, savedFilters
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

// ============================================================================
// Process Builder Database Operations
// ============================================================================

// ==================== Process Categories ====================

export async function getAllProcessCategories(): Promise<ProcessCategory[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(processCategories).orderBy(processCategories.order);
}

export async function getProcessCategoryById(id: number): Promise<ProcessCategory | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(processCategories).where(eq(processCategories.id, id)).limit(1);
  return result[0];
}

export async function createProcessCategory(category: InsertProcessCategory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processCategories).values(category).returning({ id: processCategories.id });
  return result[0].id;
}

export async function updateProcessCategory(id: number, data: Partial<InsertProcessCategory>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processCategories).set({ ...data, updatedAt: new Date() }).where(eq(processCategories.id, id));
}

export async function deleteProcessCategory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(processCategories).where(eq(processCategories.id, id));
}

// ==================== Process Tags ====================

export async function getAllProcessTags(): Promise<ProcessTag[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(processTags).orderBy(processTags.name);
}

export async function createProcessTag(tag: InsertProcessTag): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processTags).values(tag).returning({ id: processTags.id });
  return result[0].id;
}

export async function deleteProcessTag(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(processTags).where(eq(processTags.id, id));
}

export async function getOrCreateTag(name: string, color?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Try to find existing tag
  const existing = await db.select().from(processTags).where(eq(processTags.name, name)).limit(1);
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  // Create new tag
  return await createProcessTag({ name, color });
}

// ==================== Builder Processes ====================

export async function createBuilderProcess(process: InsertBuilderProcess): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(builderProcesses).values(process).returning({ id: builderProcesses.id });
  return result[0].id;
}

export async function getBuilderProcessById(id: number): Promise<BuilderProcess | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(builderProcesses).where(eq(builderProcesses.id, id)).limit(1);
  return result[0];
}

export async function getUserBuilderProcesses(userId: number): Promise<BuilderProcess[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(builderProcesses)
    .where(eq(builderProcesses.userId, userId))
    .orderBy(desc(builderProcesses.lastEditedAt));
}

export async function getPublicBuilderProcesses(limit: number = 50, offset: number = 0): Promise<BuilderProcess[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(builderProcesses)
    .where(and(
      eq(builderProcesses.visibility, "public"),
      eq(builderProcesses.status, "published")
    ))
    .orderBy(desc(builderProcesses.viewCount))
    .limit(limit)
    .offset(offset);
}

export async function updateBuilderProcess(id: number, data: Partial<InsertBuilderProcess>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderProcesses).set({ 
    ...data, 
    updatedAt: new Date(),
    lastEditedAt: new Date()
  }).where(eq(builderProcesses.id, id));
}

export async function deleteBuilderProcess(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related records first
  await db.delete(processVersions).where(eq(processVersions.processId, id));
  await db.delete(processTagRelations).where(eq(processTagRelations.processId, id));
  await db.delete(processAccess).where(eq(processAccess.processId, id));
  await db.delete(processComments).where(eq(processComments.processId, id));
  
  // Delete the process
  await db.delete(builderProcesses).where(eq(builderProcesses.id, id));
}

export async function archiveBuilderProcess(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderProcesses).set({ 
    status: "archived",
    updatedAt: new Date()
  }).where(eq(builderProcesses.id, id));
}

export async function incrementProcessViewCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(builderProcesses)
    .set({ viewCount: sql`${builderProcesses.viewCount} + 1` })
    .where(eq(builderProcesses.id, id));
}

export async function searchBuilderProcesses(
  userId: number,
  query: string,
  filters?: {
    categoryId?: number;
    tagIds?: number[];
    status?: "draft" | "published" | "archived";
    visibility?: "private" | "public";
  }
): Promise<BuilderProcess[]> {
  const db = await getDb();
  if (!db) return [];
  
  const searchTerm = `%${query.toLowerCase()}%`;
  
  let conditions = [
    or(
      eq(builderProcesses.userId, userId),
      and(eq(builderProcesses.visibility, "public"), eq(builderProcesses.status, "published"))
    ),
    or(
      like(sql`LOWER(${builderProcesses.title})`, searchTerm),
      like(sql`LOWER(${builderProcesses.description})`, searchTerm)
    )
  ];
  
  if (filters?.categoryId) {
    conditions.push(eq(builderProcesses.categoryId, filters.categoryId));
  }
  if (filters?.status) {
    conditions.push(eq(builderProcesses.status, filters.status));
  }
  if (filters?.visibility) {
    conditions.push(eq(builderProcesses.visibility, filters.visibility));
  }
  
  return await db.select()
    .from(builderProcesses)
    .where(and(...conditions))
    .orderBy(desc(builderProcesses.lastEditedAt))
    .limit(50);
}

// ==================== Process Versions ====================

export async function createProcessVersion(version: InsertProcessVersion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processVersions).values(version).returning({ id: processVersions.id });
  return result[0].id;
}

export async function getProcessVersions(processId: number): Promise<ProcessVersion[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(processVersions)
    .where(eq(processVersions.processId, processId))
    .orderBy(desc(processVersions.version));
}

export async function getProcessVersionById(id: number): Promise<ProcessVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(processVersions).where(eq(processVersions.id, id)).limit(1);
  return result[0];
}

export async function getLatestVersionNumber(processId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ version: processVersions.version })
    .from(processVersions)
    .where(eq(processVersions.processId, processId))
    .orderBy(desc(processVersions.version))
    .limit(1);
  
  return result.length > 0 ? result[0].version : 0;
}

// ==================== Process Tag Relations ====================

export async function addTagsToProcess(processId: number, tagIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete existing tags
  await db.delete(processTagRelations).where(eq(processTagRelations.processId, processId));
  
  // Add new tags
  if (tagIds.length > 0) {
    const values = tagIds.map(tagId => ({ processId, tagId }));
    await db.insert(processTagRelations).values(values);
  }
}

export async function getProcessTags(processId: number): Promise<ProcessTag[]> {
  const db = await getDb();
  if (!db) return [];
  
  const relations = await db.select({ tagId: processTagRelations.tagId })
    .from(processTagRelations)
    .where(eq(processTagRelations.processId, processId));
  
  if (relations.length === 0) return [];
  
  const tagIds = relations.map(r => r.tagId);
  return await db.select().from(processTags).where(inArray(processTags.id, tagIds));
}

// ==================== Process Access (Sharing) ====================

export async function createProcessAccess(access: InsertProcessAccess): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processAccess).values(access).returning({ id: processAccess.id });
  return result[0].id;
}

export async function getProcessAccessList(processId: number): Promise<(ProcessAccess & { user?: { id: number; name: string | null; email: string | null } })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const accesses = await db.select({
    id: processAccess.id,
    processId: processAccess.processId,
    userId: processAccess.userId,
    accessLevel: processAccess.accessLevel,
    inviteToken: processAccess.inviteToken,
    invitedAt: processAccess.invitedAt,
    acceptedAt: processAccess.acceptedAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(processAccess)
    .leftJoin(users, eq(processAccess.userId, users.id))
    .where(eq(processAccess.processId, processId));
  
  return accesses.map(a => ({
    ...a,
    user: a.userName || a.userEmail ? { id: a.userId, name: a.userName, email: a.userEmail } : undefined
  }));
}

export async function getUserAccessToProcess(processId: number, userId: number): Promise<ProcessAccess | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(processAccess)
    .where(and(eq(processAccess.processId, processId), eq(processAccess.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function updateProcessAccess(id: number, data: Partial<InsertProcessAccess>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processAccess).set(data).where(eq(processAccess.id, id));
}

export async function deleteProcessAccess(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(processAccess).where(eq(processAccess.id, id));
}

export async function getAccessByInviteToken(token: string): Promise<ProcessAccess | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(processAccess)
    .where(eq(processAccess.inviteToken, token))
    .limit(1);
  
  return result[0];
}

export async function getSharedProcessesForUser(userId: number): Promise<BuilderProcess[]> {
  const db = await getDb();
  if (!db) return [];
  
  const accesses = await db.select({ processId: processAccess.processId })
    .from(processAccess)
    .where(eq(processAccess.userId, userId));
  
  if (accesses.length === 0) return [];
  
  const processIds = accesses.map(a => a.processId);
  return await db.select()
    .from(builderProcesses)
    .where(inArray(builderProcesses.id, processIds))
    .orderBy(desc(builderProcesses.lastEditedAt));
}

// ==================== Process Comments ====================

export async function createProcessComment(comment: InsertProcessComment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processComments).values(comment).returning({ id: processComments.id });
  return result[0].id;
}

export async function getProcessCommentsList(processId: number): Promise<(ProcessComment & { user?: { id: number; name: string | null; email: string | null } })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const commentList = await db.select({
    id: processComments.id,
    processId: processComments.processId,
    userId: processComments.userId,
    parentId: processComments.parentId,
    nodeId: processComments.nodeId,
    content: processComments.content,
    isResolved: processComments.isResolved,
    createdAt: processComments.createdAt,
    updatedAt: processComments.updatedAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(processComments)
    .leftJoin(users, eq(processComments.userId, users.id))
    .where(eq(processComments.processId, processId))
    .orderBy(asc(processComments.createdAt));
  
  return commentList.map(c => ({
    ...c,
    user: { id: c.userId, name: c.userName, email: c.userEmail }
  }));
}

export async function updateProcessComment(id: number, data: Partial<InsertProcessComment>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processComments).set({ ...data, updatedAt: new Date() }).where(eq(processComments.id, id));
}

export async function deleteProcessComment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(processComments).where(eq(processComments.id, id));
}

export async function resolveProcessComment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processComments).set({ isResolved: 1, updatedAt: new Date() }).where(eq(processComments.id, id));
}

// ==================== Process Templates ====================

export async function createProcessTemplate(template: InsertProcessTemplate): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processTemplates).values(template).returning({ id: processTemplates.id });
  return result[0].id;
}

export async function getProcessTemplateById(id: number): Promise<ProcessTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(processTemplates).where(eq(processTemplates.id, id)).limit(1);
  return result[0];
}

export async function getPublicProcessTemplates(categoryId?: number): Promise<ProcessTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  let conditions = [
    eq(processTemplates.isPublic, 1),
    eq(processTemplates.isApproved, 1)
  ];
  
  if (categoryId) {
    conditions.push(eq(processTemplates.categoryId, categoryId));
  }
  
  return await db.select()
    .from(processTemplates)
    .where(and(...conditions))
    .orderBy(desc(processTemplates.usageCount));
}

export async function getUserProcessTemplates(userId: number): Promise<ProcessTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(processTemplates)
    .where(eq(processTemplates.userId, userId))
    .orderBy(desc(processTemplates.createdAt));
}

export async function updateProcessTemplate(id: number, data: Partial<InsertProcessTemplate>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processTemplates).set({ ...data, updatedAt: new Date() }).where(eq(processTemplates.id, id));
}

export async function deleteProcessTemplate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(templateRatings).where(eq(templateRatings.templateId, id));
  await db.delete(processTemplates).where(eq(processTemplates.id, id));
}

export async function incrementTemplateUsageCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(processTemplates)
    .set({ usageCount: sql`${processTemplates.usageCount} + 1` })
    .where(eq(processTemplates.id, id));
}

// ==================== Template Ratings ====================

export async function rateTemplate(templateId: number, userId: number, rating: number, review?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if user already rated
  const existing = await db.select()
    .from(templateRatings)
    .where(and(eq(templateRatings.templateId, templateId), eq(templateRatings.userId, userId)))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing rating
    await db.update(templateRatings)
      .set({ rating, review })
      .where(eq(templateRatings.id, existing[0].id));
  } else {
    // Create new rating
    await db.insert(templateRatings).values({ templateId, userId, rating, review });
  }
  
  // Update template average rating
  const allRatings = await db.select({ rating: templateRatings.rating })
    .from(templateRatings)
    .where(eq(templateRatings.templateId, templateId));
  
  const avgRating = Math.round(allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length * 100);
  await db.update(processTemplates)
    .set({ rating: avgRating, ratingCount: allRatings.length })
    .where(eq(processTemplates.id, templateId));
}

// ==================== User Notifications ====================

export async function createUserNotification(notification: InsertUserNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userNotifications).values(notification).returning({ id: userNotifications.id });
  return result[0].id;
}

export async function getUserNotifications(userId: number, limit: number = 50): Promise<UserNotification[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(limit);
}

export async function markNotificationAsRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userNotifications).set({ isRead: 1 }).where(eq(userNotifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userNotifications).set({ isRead: 1 }).where(eq(userNotifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select()
    .from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, 0)));
  
  return result.length;
}

export async function deleteNotification(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(userNotifications).where(eq(userNotifications.id, id));
}

// ==================== Notification Settings ====================

export async function getOrCreateNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Create default settings
  await db.insert(notificationSettings).values({ userId });
  
  const newSettings = await db.select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);
  
  return newSettings[0];
}

export async function updateNotificationSettings(userId: number, data: Partial<InsertNotificationSetting>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notificationSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(notificationSettings.userId, userId));
}

// ==================== Saved Filters ====================

export async function createSavedFilter(filter: InsertSavedFilter): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(savedFilters).values(filter).returning({ id: savedFilters.id });
  return result[0].id;
}

export async function getUserSavedFilters(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(savedFilters)
    .where(eq(savedFilters.userId, userId))
    .orderBy(savedFilters.name);
}

export async function deleteSavedFilter(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(savedFilters).where(eq(savedFilters.id, id));
}

// ==================== Analytics Helpers ====================

export async function getUserProcessStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, drafts: 0, published: 0, archived: 0, totalViews: 0 };
  
  const processes = await db.select()
    .from(builderProcesses)
    .where(eq(builderProcesses.userId, userId));
  
  return {
    total: processes.length,
    drafts: processes.filter(p => p.status === "draft").length,
    published: processes.filter(p => p.status === "published").length,
    archived: processes.filter(p => p.status === "archived").length,
    totalViews: processes.reduce((sum, p) => sum + (p.viewCount || 0), 0)
  };
}

export async function getRecentActivity(userId: number, days: number = 30): Promise<{ date: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const processes = await db.select({ lastEditedAt: builderProcesses.lastEditedAt })
    .from(builderProcesses)
    .where(and(
      eq(builderProcesses.userId, userId),
      sql`${builderProcesses.lastEditedAt} >= ${startDate}`
    ));
  
  // Group by date
  const activity: Record<string, number> = {};
  processes.forEach(p => {
    const date = p.lastEditedAt?.toISOString().split('T')[0];
    if (date) {
      activity[date] = (activity[date] || 0) + 1;
    }
  });
  
  return Object.entries(activity).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
}

// Admin analytics
export async function getGlobalProcessStats() {
  const db = await getDb();
  if (!db) return { totalProcesses: 0, totalUsers: 0, totalTemplates: 0, activeUsersLast30Days: 0 };
  
  const allProcesses = await db.select().from(builderProcesses);
  const allUsers = await db.select().from(users);
  const allTemplates = await db.select().from(processTemplates);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeUsers = await db.select({ userId: builderProcesses.userId })
    .from(builderProcesses)
    .where(sql`${builderProcesses.lastEditedAt} >= ${thirtyDaysAgo}`);
  
  const uniqueActiveUsers = new Set(activeUsers.map(u => u.userId));
  
  return {
    totalProcesses: allProcesses.length,
    totalUsers: allUsers.length,
    totalTemplates: allTemplates.length,
    activeUsersLast30Days: uniqueActiveUsers.size
  };
}
