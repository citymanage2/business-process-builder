import { eq, and, or, desc, asc, like, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  builderProcesses,
  processVersions,
  processCollaborators,
  processComments,
  processTemplates,
  processCategories,
  notifications,
  savedFilters,
  users,
  InsertBuilderProcess,
  InsertProcessVersion,
  InsertProcessCollaborator,
  InsertProcessComment,
  InsertProcessTemplate,
  InsertProcessCategory,
  InsertNotification,
  InsertSavedFilter,
  BuilderProcess,
  ProcessVersion,
  ProcessCollaborator,
  ProcessComment,
  ProcessTemplate,
  ProcessCategory,
  Notification,
  SavedFilter,
} from "../drizzle/schema";

// ==================== Process CRUD ====================

export async function createBuilderProcess(data: InsertBuilderProcess): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(builderProcesses).values(data).returning({ id: builderProcesses.id });
  return result[0].id;
}

export async function getBuilderProcessById(id: number): Promise<BuilderProcess | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(builderProcesses).where(eq(builderProcesses.id, id)).limit(1);
  return result[0];
}

export async function getUserProcesses(userId: number, options?: {
  status?: string;
  visibility?: string;
  categoryId?: number;
  search?: string;
  sortBy?: 'created' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<BuilderProcess[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(builderProcesses)
    .where(eq(builderProcesses.userId, userId));
  
  // Apply filters
  const conditions = [eq(builderProcesses.userId, userId)];
  
  if (options?.status) {
    conditions.push(eq(builderProcesses.status, options.status as any));
  }
  
  if (options?.visibility) {
    conditions.push(eq(builderProcesses.visibility, options.visibility as any));
  }
  
  if (options?.categoryId) {
    conditions.push(eq(builderProcesses.categoryId, options.categoryId));
  }
  
  if (options?.search) {
    conditions.push(
      or(
        like(builderProcesses.name, `%${options.search}%`),
        like(builderProcesses.description, `%${options.search}%`)
      ) as any
    );
  }
  
  // Build query with conditions
  let finalQuery = db.select().from(builderProcesses).where(and(...conditions));
  
  // Apply sorting
  const sortOrder = options?.sortOrder === 'asc' ? asc : desc;
  switch (options?.sortBy) {
    case 'name':
      finalQuery = finalQuery.orderBy(sortOrder(builderProcesses.name)) as any;
      break;
    case 'updated':
      finalQuery = finalQuery.orderBy(sortOrder(builderProcesses.updatedAt)) as any;
      break;
    case 'created':
    default:
      finalQuery = finalQuery.orderBy(sortOrder(builderProcesses.createdAt)) as any;
  }
  
  // Apply pagination
  if (options?.limit) {
    finalQuery = finalQuery.limit(options.limit) as any;
  }
  if (options?.offset) {
    finalQuery = finalQuery.offset(options.offset) as any;
  }
  
  return await finalQuery;
}

export async function getAccessibleProcesses(userId: number, options?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<(BuilderProcess & { accessRole?: string })[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get processes user owns or has access to
  const ownProcesses = await getUserProcesses(userId, options);
  
  // Get shared processes
  const collaborations = await db.select()
    .from(processCollaborators)
    .where(eq(processCollaborators.userId, userId));
  
  const sharedProcessIds = collaborations.map(c => c.processId);
  
  let sharedProcesses: BuilderProcess[] = [];
  if (sharedProcessIds.length > 0) {
    sharedProcesses = await db.select()
      .from(builderProcesses)
      .where(inArray(builderProcesses.id, sharedProcessIds));
  }
  
  // Combine and deduplicate
  const processMap = new Map<number, BuilderProcess & { accessRole?: string }>();
  
  for (const p of ownProcesses) {
    processMap.set(p.id, { ...p, accessRole: 'owner' });
  }
  
  for (const p of sharedProcesses) {
    if (!processMap.has(p.id)) {
      const collab = collaborations.find(c => c.processId === p.id);
      processMap.set(p.id, { ...p, accessRole: collab?.accessRole });
    }
  }
  
  return Array.from(processMap.values());
}

export async function getPublicProcesses(options?: {
  categoryId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<BuilderProcess[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(builderProcesses.visibility, 'public'),
    eq(builderProcesses.status, 'published')
  ];
  
  if (options?.categoryId) {
    conditions.push(eq(builderProcesses.categoryId, options.categoryId));
  }
  
  if (options?.search) {
    conditions.push(
      or(
        like(builderProcesses.name, `%${options.search}%`),
        like(builderProcesses.description, `%${options.search}%`)
      ) as any
    );
  }
  
  let query = db.select().from(builderProcesses)
    .where(and(...conditions))
    .orderBy(desc(builderProcesses.viewCount));
  
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }
  
  return await query;
}

export async function updateBuilderProcess(id: number, data: Partial<InsertBuilderProcess>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderProcesses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(builderProcesses.id, id));
}

export async function deleteBuilderProcess(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related data first (cascading should handle this, but being explicit)
  await db.delete(processVersions).where(eq(processVersions.processId, id));
  await db.delete(processCollaborators).where(eq(processCollaborators.processId, id));
  await db.delete(processComments).where(eq(processComments.processId, id));
  
  // Delete the process
  await db.delete(builderProcesses).where(eq(builderProcesses.id, id));
}

export async function incrementProcessViewCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(builderProcesses)
    .set({ viewCount: sql`${builderProcesses.viewCount} + 1` })
    .where(eq(builderProcesses.id, id));
}

// ==================== Process Versions ====================

export async function createProcessVersion(data: InsertProcessVersion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processVersions).values(data).returning({ id: processVersions.id });
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

export async function getProcessVersion(processId: number, version: number): Promise<ProcessVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(processVersions)
    .where(and(
      eq(processVersions.processId, processId),
      eq(processVersions.version, version)
    ))
    .limit(1);
  
  return result[0];
}

export async function getLatestVersion(processId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ version: processVersions.version })
    .from(processVersions)
    .where(eq(processVersions.processId, processId))
    .orderBy(desc(processVersions.version))
    .limit(1);
  
  return result[0]?.version || 0;
}

// ==================== Process Collaborators ====================

export async function addCollaborator(data: InsertProcessCollaborator): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already exists
  const existing = await db.select()
    .from(processCollaborators)
    .where(and(
      eq(processCollaborators.processId, data.processId),
      eq(processCollaborators.userId, data.userId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing
    await db.update(processCollaborators)
      .set({ accessRole: data.accessRole, updatedAt: new Date() })
      .where(eq(processCollaborators.id, existing[0].id));
    return existing[0].id;
  }
  
  const result = await db.insert(processCollaborators).values(data).returning({ id: processCollaborators.id });
  return result[0].id;
}

export async function getProcessCollaborators(processId: number): Promise<(ProcessCollaborator & { user?: { id: number; name: string | null; email: string | null } })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const collaborators = await db.select({
    id: processCollaborators.id,
    processId: processCollaborators.processId,
    userId: processCollaborators.userId,
    accessRole: processCollaborators.accessRole,
    invitedBy: processCollaborators.invitedBy,
    createdAt: processCollaborators.createdAt,
    updatedAt: processCollaborators.updatedAt,
    userName: users.name,
    userEmail: users.email,
  })
  .from(processCollaborators)
  .leftJoin(users, eq(processCollaborators.userId, users.id))
  .where(eq(processCollaborators.processId, processId));
  
  return collaborators.map(c => ({
    ...c,
    user: { id: c.userId, name: c.userName, email: c.userEmail }
  }));
}

export async function removeCollaborator(processId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(processCollaborators)
    .where(and(
      eq(processCollaborators.processId, processId),
      eq(processCollaborators.userId, userId)
    ));
}

export async function getUserAccessRole(processId: number, userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Check if owner
  const process = await getBuilderProcessById(processId);
  if (process?.userId === userId) return 'owner';
  
  // Check collaborator role
  const result = await db.select({ accessRole: processCollaborators.accessRole })
    .from(processCollaborators)
    .where(and(
      eq(processCollaborators.processId, processId),
      eq(processCollaborators.userId, userId)
    ))
    .limit(1);
  
  return result[0]?.accessRole || null;
}

// ==================== Process Comments ====================

export async function createProcessComment(data: InsertProcessComment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processComments).values(data).returning({ id: processComments.id });
  return result[0].id;
}

export async function getProcessCommentsList(processId: number, nodeId?: string): Promise<(ProcessComment & { user?: { id: number; name: string | null; email: string | null } })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(processComments.processId, processId)];
  if (nodeId) {
    conditions.push(eq(processComments.nodeId, nodeId));
  }
  
  const comments = await db.select({
    id: processComments.id,
    processId: processComments.processId,
    userId: processComments.userId,
    nodeId: processComments.nodeId,
    parentId: processComments.parentId,
    content: processComments.content,
    isResolved: processComments.isResolved,
    createdAt: processComments.createdAt,
    updatedAt: processComments.updatedAt,
    userName: users.name,
    userEmail: users.email,
  })
  .from(processComments)
  .leftJoin(users, eq(processComments.userId, users.id))
  .where(and(...conditions))
  .orderBy(asc(processComments.createdAt));
  
  return comments.map(c => ({
    ...c,
    user: { id: c.userId, name: c.userName, email: c.userEmail }
  }));
}

export async function updateProcessComment(id: number, data: Partial<InsertProcessComment>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processComments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(processComments.id, id));
}

export async function deleteProcessComment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(processComments).where(eq(processComments.id, id));
}

export async function resolveComment(id: number, resolved: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processComments)
    .set({ isResolved: resolved ? 1 : 0, updatedAt: new Date() })
    .where(eq(processComments.id, id));
}

// ==================== Process Templates ====================

export async function createProcessTemplate(data: InsertProcessTemplate): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processTemplates).values(data).returning({ id: processTemplates.id });
  return result[0].id;
}

export async function getProcessTemplates(options?: {
  categoryId?: number;
  isSystem?: boolean;
  isPublic?: boolean;
  search?: string;
  limit?: number;
}): Promise<ProcessTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [];
  
  if (options?.categoryId) {
    conditions.push(eq(processTemplates.categoryId, options.categoryId));
  }
  
  if (options?.isSystem !== undefined) {
    conditions.push(eq(processTemplates.isSystem, options.isSystem ? 1 : 0));
  }
  
  if (options?.isPublic !== undefined) {
    conditions.push(eq(processTemplates.isPublic, options.isPublic ? 1 : 0));
  }
  
  if (options?.search) {
    conditions.push(
      or(
        like(processTemplates.name, `%${options.search}%`),
        like(processTemplates.description, `%${options.search}%`)
      )
    );
  }
  
  let query = db.select().from(processTemplates);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(processTemplates.useCount)) as any;
  
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  
  return await query;
}

export async function getProcessTemplateById(id: number): Promise<ProcessTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(processTemplates).where(eq(processTemplates.id, id)).limit(1);
  return result[0];
}

export async function incrementTemplateUseCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processTemplates)
    .set({ useCount: sql`${processTemplates.useCount} + 1` })
    .where(eq(processTemplates.id, id));
}

export async function deleteProcessTemplate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(processTemplates).where(eq(processTemplates.id, id));
}

// ==================== Process Categories ====================

export async function createProcessCategory(data: InsertProcessCategory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(processCategories).values(data).returning({ id: processCategories.id });
  return result[0].id;
}

export async function getProcessCategoriesList(): Promise<ProcessCategory[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(processCategories)
    .orderBy(asc(processCategories.order), asc(processCategories.name));
}

export async function updateProcessCategory(id: number, data: Partial<InsertProcessCategory>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(processCategories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(processCategories.id, id));
}

export async function deleteProcessCategory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(processCategories).where(eq(processCategories.id, id));
}

// ==================== Notifications ====================

export async function createNotification(data: InsertNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(notifications).values(data).returning({ id: notifications.id });
  return result[0].id;
}

export async function getUserNotifications(userId: number, options?: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(notifications.userId, userId)];
  
  if (options?.unreadOnly) {
    conditions.push(eq(notifications.isRead, 0));
  }
  
  let query = db.select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));
  
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }
  
  return await query;
}

export async function markNotificationAsRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications)
    .set({ isRead: 1 })
    .where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications)
    .set({ isRead: 1 })
    .where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select()
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, 0)
    ));
  
  return result.length;
}

export async function deleteNotification(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(notifications).where(eq(notifications.id, id));
}

// ==================== Saved Filters ====================

export async function createSavedFilter(data: InsertSavedFilter): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(savedFilters).values(data).returning({ id: savedFilters.id });
  return result[0].id;
}

export async function getUserSavedFilters(userId: number): Promise<SavedFilter[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(savedFilters)
    .where(eq(savedFilters.userId, userId))
    .orderBy(asc(savedFilters.name));
}

export async function deleteSavedFilter(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(savedFilters).where(eq(savedFilters.id, id));
}

// ==================== Analytics ====================

export async function getUserProcessStats(userId: number): Promise<{
  totalProcesses: number;
  draftCount: number;
  publishedCount: number;
  totalViews: number;
  recentActivity: { date: string; count: number }[];
}> {
  const db = await getDb();
  if (!db) return {
    totalProcesses: 0,
    draftCount: 0,
    publishedCount: 0,
    totalViews: 0,
    recentActivity: []
  };
  
  const processes = await db.select()
    .from(builderProcesses)
    .where(eq(builderProcesses.userId, userId));
  
  const totalProcesses = processes.length;
  const draftCount = processes.filter(p => p.status === 'draft').length;
  const publishedCount = processes.filter(p => p.status === 'published').length;
  const totalViews = processes.reduce((sum, p) => sum + (p.viewCount || 0), 0);
  
  // Get activity for last 30 days (simplified - just count updates)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Group by date (simplified approach)
  const activityMap = new Map<string, number>();
  for (const p of processes) {
    if (p.updatedAt >= thirtyDaysAgo) {
      const dateStr = p.updatedAt.toISOString().split('T')[0];
      activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
    }
  }
  
  const recentActivity = Array.from(activityMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    totalProcesses,
    draftCount,
    publishedCount,
    totalViews,
    recentActivity
  };
}

export async function getProcessAnalytics(processId: number): Promise<{
  nodeCount: number;
  edgeCount: number;
  complexity: number;
  versionCount: number;
  commentCount: number;
  collaboratorCount: number;
}> {
  const db = await getDb();
  if (!db) return {
    nodeCount: 0,
    edgeCount: 0,
    complexity: 0,
    versionCount: 0,
    commentCount: 0,
    collaboratorCount: 0
  };
  
  const process = await getBuilderProcessById(processId);
  if (!process) return {
    nodeCount: 0,
    edgeCount: 0,
    complexity: 0,
    versionCount: 0,
    commentCount: 0,
    collaboratorCount: 0
  };
  
  const nodes = process.nodes ? JSON.parse(process.nodes) : [];
  const edges = process.edges ? JSON.parse(process.edges) : [];
  
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  
  // Calculate complexity (simple formula: nodes + edges * 1.5)
  const complexity = Math.round(nodeCount + edgeCount * 1.5);
  
  const versions = await getProcessVersions(processId);
  const versionCount = versions.length;
  
  const comments = await getProcessCommentsList(processId);
  const commentCount = comments.length;
  
  const collaborators = await getProcessCollaborators(processId);
  const collaboratorCount = collaborators.length;
  
  return {
    nodeCount,
    edgeCount,
    complexity,
    versionCount,
    commentCount,
    collaboratorCount
  };
}
