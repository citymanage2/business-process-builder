import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
  InsertSupportMessage, supportMessages
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Companies
export async function createCompany(company: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companies).values(company);
  return result[0].insertId;
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
  const result = await db.insert(interviews).values(interview);
  return result[0].insertId;
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
  const result = await db.insert(businessProcesses).values(process);
  return result[0].insertId;
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
  const result = await db.insert(recommendations).values(recommendation);
  return result[0].insertId;
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
  const result = await db.insert(comments).values(comment);
  return result[0].insertId;
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
    });
    return result[0]?.insertId;
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
  });

  return result[0].insertId;
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
