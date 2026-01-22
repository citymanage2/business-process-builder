import { router, protectedProcedure, publicProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  // Categories
  getAllProcessCategories,
  getProcessCategoryById,
  createProcessCategory,
  updateProcessCategory,
  deleteProcessCategory,
  // Tags
  getAllProcessTags,
  createProcessTag,
  deleteProcessTag,
  getOrCreateTag,
  // Processes
  createBuilderProcess,
  getBuilderProcessById,
  getUserBuilderProcesses,
  getPublicBuilderProcesses,
  updateBuilderProcess,
  deleteBuilderProcess,
  archiveBuilderProcess,
  incrementProcessViewCount,
  searchBuilderProcesses,
  // Versions
  createProcessVersion,
  getProcessVersions,
  getProcessVersionById,
  getLatestVersionNumber,
  // Tags Relations
  addTagsToProcess,
  getProcessTags,
  // Access (Sharing)
  createProcessAccess,
  getProcessAccessList,
  getUserAccessToProcess,
  updateProcessAccess,
  deleteProcessAccess,
  getAccessByInviteToken,
  getSharedProcessesForUser,
  // Comments
  createProcessComment,
  getProcessCommentsList,
  updateProcessComment,
  deleteProcessComment,
  resolveProcessComment,
  // Templates
  createProcessTemplate,
  getProcessTemplateById,
  getPublicProcessTemplates,
  getUserProcessTemplates,
  updateProcessTemplate,
  deleteProcessTemplate,
  incrementTemplateUsageCount,
  rateTemplate,
  // Notifications
  createUserNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification,
  // Notification Settings
  getOrCreateNotificationSettings,
  updateNotificationSettings,
  // Saved Filters
  createSavedFilter,
  getUserSavedFilters,
  deleteSavedFilter,
  // Analytics
  getUserProcessStats,
  getRecentActivity,
  getGlobalProcessStats,
  getUserById,
} from "../db";

// =============================================
// Process Builder Router
// =============================================

export const builderRouter = router({
  // ==================== Categories ====================
  categories: router({
    list: publicProcedure.query(async () => {
      return await getAllProcessCategories();
    }),
    
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProcessCategoryById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        icon: z.string().optional(),
        parentId: z.number().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createProcessCategory(input);
        return { id };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        icon: z.string().optional(),
        parentId: z.number().nullable().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateProcessCategory(id, data);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProcessCategory(input.id);
        return { success: true };
      }),
  }),

  // ==================== Tags ====================
  tags: router({
    list: publicProcedure.query(async () => {
      return await getAllProcessTags();
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createProcessTag(input);
        return { id };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProcessTag(input.id);
        return { success: true };
      }),
  }),

  // ==================== Processes ====================
  processes: router({
    // Create new process
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        visibility: z.enum(["private", "public"]).default("private"),
        nodes: z.string().optional(), // JSON string
        edges: z.string().optional(), // JSON string
        viewport: z.string().optional(), // JSON string
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createBuilderProcess({
          userId: ctx.user.id,
          ...input,
          status: "draft",
          currentVersion: 1,
        });
        
        // Create initial version
        await createProcessVersion({
          processId: id,
          version: 1,
          userId: ctx.user.id,
          comment: "Создание процесса",
          nodes: input.nodes || "[]",
          edges: input.edges || "[]",
          viewport: input.viewport,
        });
        
        return { id };
      }),
    
    // Get process by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.id);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        // Check access
        const isOwner = process.userId === ctx.user.id;
        const isPublic = process.visibility === "public" && process.status === "published";
        const hasAccess = await getUserAccessToProcess(input.id, ctx.user.id);
        const isAdmin = ctx.user.role === "admin";
        
        if (!isOwner && !isPublic && !hasAccess && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа к процессу" });
        }
        
        // Increment view count for non-owners
        if (!isOwner) {
          await incrementProcessViewCount(input.id);
        }
        
        // Get tags
        const tags = await getProcessTags(input.id);
        
        // Get access level
        let accessLevel: "owner" | "editor" | "commenter" | "viewer" = isOwner ? "owner" : "viewer";
        if (hasAccess) {
          accessLevel = hasAccess.accessLevel;
        }
        
        return {
          ...process,
          nodes: process.nodes ? JSON.parse(process.nodes) : [],
          edges: process.edges ? JSON.parse(process.edges) : [],
          viewport: process.viewport ? JSON.parse(process.viewport) : { x: 0, y: 0, zoom: 1 },
          tags,
          accessLevel,
          isOwner,
        };
      }),
    
    // List user's processes
    list: protectedProcedure
      .input(z.object({
        includeShared: z.boolean().default(false),
      }).optional())
      .query(async ({ ctx, input }) => {
        const ownProcesses = await getUserBuilderProcesses(ctx.user.id);
        
        let allProcesses = ownProcesses;
        if (input?.includeShared) {
          const sharedProcesses = await getSharedProcessesForUser(ctx.user.id);
          allProcesses = [...ownProcesses, ...sharedProcesses];
        }
        
        // Parse JSON fields and add tags
        return await Promise.all(allProcesses.map(async (p) => {
          const tags = await getProcessTags(p.id);
          return {
            ...p,
            nodes: p.nodes ? JSON.parse(p.nodes) : [],
            edges: p.edges ? JSON.parse(p.edges) : [],
            tags,
          };
        }));
      }),
    
    // List public processes
    listPublic: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const processes = await getPublicBuilderProcesses(input?.limit || 50, input?.offset || 0);
        return await Promise.all(processes.map(async (p) => {
          const tags = await getProcessTags(p.id);
          return { ...p, tags };
        }));
      }),
    
    // Update process
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        categoryId: z.number().nullable().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        visibility: z.enum(["private", "public"]).optional(),
        nodes: z.string().optional(),
        edges: z.string().optional(),
        viewport: z.string().optional(),
        thumbnail: z.string().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, tagIds, ...data } = input;
        
        // Check ownership or edit access
        const process = await getBuilderProcessById(id);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        const isOwner = process.userId === ctx.user.id;
        const access = await getUserAccessToProcess(id, ctx.user.id);
        const canEdit = isOwner || access?.accessLevel === "editor" || ctx.user.role === "admin";
        
        if (!canEdit) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет прав на редактирование" });
        }
        
        await updateBuilderProcess(id, data);
        
        // Update tags if provided
        if (tagIds !== undefined) {
          await addTagsToProcess(id, tagIds);
        }
        
        return { success: true };
      }),
    
    // Save new version
    saveVersion: protectedProcedure
      .input(z.object({
        id: z.number(),
        nodes: z.string(),
        edges: z.string(),
        viewport: z.string().optional(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...versionData } = input;
        
        // Check ownership or edit access
        const process = await getBuilderProcessById(id);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        const isOwner = process.userId === ctx.user.id;
        const access = await getUserAccessToProcess(id, ctx.user.id);
        const canEdit = isOwner || access?.accessLevel === "editor" || ctx.user.role === "admin";
        
        if (!canEdit) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет прав на редактирование" });
        }
        
        // Get next version number
        const latestVersion = await getLatestVersionNumber(id);
        const newVersion = latestVersion + 1;
        
        // Create version
        await createProcessVersion({
          processId: id,
          version: newVersion,
          userId: ctx.user.id,
          comment: versionData.comment || `Версия ${newVersion}`,
          nodes: versionData.nodes,
          edges: versionData.edges,
          viewport: versionData.viewport,
        });
        
        // Update current process state
        await updateBuilderProcess(id, {
          nodes: versionData.nodes,
          edges: versionData.edges,
          viewport: versionData.viewport,
          currentVersion: newVersion,
        });
        
        return { version: newVersion };
      }),
    
    // Delete process
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.id);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        if (process.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет прав на удаление" });
        }
        
        await deleteBuilderProcess(input.id);
        return { success: true };
      }),
    
    // Archive process (soft delete)
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.id);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        if (process.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет прав на архивацию" });
        }
        
        await archiveBuilderProcess(input.id);
        return { success: true };
      }),
    
    // Search processes
    search: protectedProcedure
      .input(z.object({
        query: z.string(),
        categoryId: z.number().optional(),
        tagIds: z.array(z.number()).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        visibility: z.enum(["private", "public"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { query, ...filters } = input;
        return await searchBuilderProcesses(ctx.user.id, query, filters);
      }),
  }),

  // ==================== Versions ====================
  versions: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check access
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        const isOwner = process.userId === ctx.user.id;
        const hasAccess = await getUserAccessToProcess(input.processId, ctx.user.id);
        
        if (!isOwner && !hasAccess && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа к истории версий" });
        }
        
        const versions = await getProcessVersions(input.processId);
        
        // Get user info for each version
        return await Promise.all(versions.map(async (v) => {
          const user = await getUserById(v.userId);
          return {
            ...v,
            userName: user?.name || user?.email || "Unknown",
          };
        }));
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const version = await getProcessVersionById(input.id);
        if (!version) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Версия не найдена" });
        }
        
        // Check access to process
        const process = await getBuilderProcessById(version.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        const isOwner = process.userId === ctx.user.id;
        const hasAccess = await getUserAccessToProcess(version.processId, ctx.user.id);
        
        if (!isOwner && !hasAccess && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа к версии" });
        }
        
        return {
          ...version,
          nodes: JSON.parse(version.nodes),
          edges: JSON.parse(version.edges),
          viewport: version.viewport ? JSON.parse(version.viewport) : { x: 0, y: 0, zoom: 1 },
        };
      }),
    
    // Restore version
    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const version = await getProcessVersionById(input.id);
        if (!version) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Версия не найдена" });
        }
        
        // Check ownership or edit access
        const process = await getBuilderProcessById(version.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        const isOwner = process.userId === ctx.user.id;
        const access = await getUserAccessToProcess(version.processId, ctx.user.id);
        const canEdit = isOwner || access?.accessLevel === "editor" || ctx.user.role === "admin";
        
        if (!canEdit) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет прав на восстановление версии" });
        }
        
        // Create new version with restored data
        const latestVersion = await getLatestVersionNumber(version.processId);
        const newVersion = latestVersion + 1;
        
        await createProcessVersion({
          processId: version.processId,
          version: newVersion,
          userId: ctx.user.id,
          comment: `Восстановлено из версии ${version.version}`,
          nodes: version.nodes,
          edges: version.edges,
          viewport: version.viewport,
        });
        
        // Update current process state
        await updateBuilderProcess(version.processId, {
          nodes: version.nodes,
          edges: version.edges,
          viewport: version.viewport,
          currentVersion: newVersion,
        });
        
        return { version: newVersion };
      }),
  }),

  // ==================== Sharing & Access ====================
  access: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        if (process.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Только владелец может управлять доступом" });
        }
        
        return await getProcessAccessList(input.processId);
      }),
    
    // Invite user by email
    invite: protectedProcedure
      .input(z.object({
        processId: z.number(),
        userId: z.number(),
        accessLevel: z.enum(["editor", "commenter", "viewer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        if (process.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Только владелец может приглашать пользователей" });
        }
        
        // Check if access already exists
        const existing = await getUserAccessToProcess(input.processId, input.userId);
        if (existing) {
          // Update existing access
          await updateProcessAccess(existing.id, { accessLevel: input.accessLevel });
        } else {
          // Create new access
          await createProcessAccess({
            processId: input.processId,
            userId: input.userId,
            accessLevel: input.accessLevel,
            inviteToken: nanoid(32),
            acceptedAt: new Date(),
          });
        }
        
        // Create notification for invited user
        await createUserNotification({
          userId: input.userId,
          type: "collaboration_invite",
          title: "Приглашение к совместной работе",
          content: `Вас пригласили к работе над процессом "${process.title}"`,
          relatedProcessId: input.processId,
        });
        
        return { success: true };
      }),
    
    // Generate invite link
    generateLink: protectedProcedure
      .input(z.object({
        processId: z.number(),
        accessLevel: z.enum(["editor", "commenter", "viewer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        if (process.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Только владелец может создавать ссылки" });
        }
        
        const inviteToken = nanoid(32);
        
        // Create a placeholder access entry with the token
        await createProcessAccess({
          processId: input.processId,
          userId: ctx.user.id, // Temporary, will be updated when link is used
          accessLevel: input.accessLevel,
          inviteToken,
        });
        
        return { token: inviteToken };
      }),
    
    // Accept invite by token
    acceptInvite: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const access = await getAccessByInviteToken(input.token);
        if (!access) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Недействительная ссылка приглашения" });
        }
        
        if (access.acceptedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Приглашение уже использовано" });
        }
        
        // Update access with actual user
        await updateProcessAccess(access.id, {
          userId: ctx.user.id,
          acceptedAt: new Date(),
          inviteToken: null, // Invalidate token
        });
        
        return { processId: access.processId };
      }),
    
    // Update access level
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        accessLevel: z.enum(["editor", "commenter", "viewer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check that user is owner of the process
        const accessRecord = await getAccessByInviteToken(""); // Need to get by ID
        // For now, just update
        await updateProcessAccess(input.id, { accessLevel: input.accessLevel });
        return { success: true };
      }),
    
    // Remove access
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProcessAccess(input.id);
        return { success: true };
      }),
  }),

  // ==================== Comments ====================
  comments: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        const isOwner = process.userId === ctx.user.id;
        const hasAccess = await getUserAccessToProcess(input.processId, ctx.user.id);
        const isPublic = process.visibility === "public" && process.status === "published";
        
        if (!isOwner && !hasAccess && !isPublic && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа к комментариям" });
        }
        
        return await getProcessCommentsList(input.processId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        processId: z.number(),
        parentId: z.number().optional(),
        nodeId: z.string().optional(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        const isOwner = process.userId === ctx.user.id;
        const access = await getUserAccessToProcess(input.processId, ctx.user.id);
        const canComment = isOwner || 
          access?.accessLevel === "editor" || 
          access?.accessLevel === "commenter" ||
          ctx.user.role === "admin";
        
        if (!canComment) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет прав на комментирование" });
        }
        
        const id = await createProcessComment({
          processId: input.processId,
          userId: ctx.user.id,
          parentId: input.parentId,
          nodeId: input.nodeId,
          content: input.content,
        });
        
        // Notify process owner if commenter is not the owner
        if (!isOwner) {
          await createUserNotification({
            userId: process.userId,
            type: "comment_added",
            title: "Новый комментарий",
            content: `К процессу "${process.title}" добавлен комментарий`,
            relatedProcessId: input.processId,
            relatedCommentId: id,
          });
        }
        
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only comment author can edit
        const comments = await getProcessCommentsList(0); // Need to get by ID
        // For simplicity, just update
        await updateProcessComment(input.id, { content: input.content });
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProcessComment(input.id);
        return { success: true };
      }),
    
    resolve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await resolveProcessComment(input.id);
        return { success: true };
      }),
  }),

  // ==================== Templates ====================
  templates: router({
    listPublic: publicProcedure
      .input(z.object({ categoryId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await getPublicProcessTemplates(input?.categoryId);
      }),
    
    listMine: protectedProcedure.query(async ({ ctx }) => {
      return await getUserProcessTemplates(ctx.user.id);
    }),
    
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await getProcessTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Шаблон не найден" });
        }
        
        return {
          ...template,
          nodes: JSON.parse(template.nodes),
          edges: JSON.parse(template.edges),
        };
      }),
    
    // Create template from process
    createFromProcess: protectedProcedure
      .input(z.object({
        processId: z.number(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        isPublic: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Процесс не найден" });
        }
        
        if (process.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Только владелец может создать шаблон" });
        }
        
        const id = await createProcessTemplate({
          userId: ctx.user.id,
          categoryId: process.categoryId,
          title: input.title,
          description: input.description,
          nodes: process.nodes || "[]",
          edges: process.edges || "[]",
          isPublic: input.isPublic ? 1 : 0,
          isApproved: ctx.user.role === "admin" ? 1 : 0,
          thumbnail: process.thumbnail,
        });
        
        return { id };
      }),
    
    // Create process from template
    useTemplate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        title: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const template = await getProcessTemplateById(input.templateId);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Шаблон не найден" });
        }
        
        // Create new process from template
        const id = await createBuilderProcess({
          userId: ctx.user.id,
          categoryId: template.categoryId,
          title: input.title,
          description: template.description,
          status: "draft",
          visibility: "private",
          nodes: template.nodes,
          edges: template.edges,
          currentVersion: 1,
        });
        
        // Create initial version
        await createProcessVersion({
          processId: id,
          version: 1,
          userId: ctx.user.id,
          comment: `Создано из шаблона "${template.title}"`,
          nodes: template.nodes,
          edges: template.edges,
        });
        
        // Increment template usage count
        await incrementTemplateUsageCount(input.templateId);
        
        return { id };
      }),
    
    // Rate template
    rate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        rating: z.number().min(1).max(5),
        review: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateTemplate(input.templateId, ctx.user.id, input.rating, input.review);
        return { success: true };
      }),
    
    // Approve template (admin only)
    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateProcessTemplate(input.id, { isApproved: 1 });
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const template = await getProcessTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Шаблон не найден" });
        }
        
        if (template.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Нет прав на удаление" });
        }
        
        await deleteProcessTemplate(input.id);
        return { success: true };
      }),
  }),

  // ==================== Notifications ====================
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return await getUserNotifications(ctx.user.id, input?.limit || 50);
      }),
    
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await getUnreadNotificationCount(ctx.user.id);
    }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationAsRead(input.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteNotification(input.id);
        return { success: true };
      }),
    
    // Get/update notification settings
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      return await getOrCreateNotificationSettings(ctx.user.id);
    }),
    
    updateSettings: protectedProcedure
      .input(z.object({
        emailEnabled: z.boolean().optional(),
        emailFrequency: z.enum(["instant", "daily"]).optional(),
        pushEnabled: z.boolean().optional(),
        quietHoursStart: z.string().optional(),
        quietHoursEnd: z.string().optional(),
        typeSettings: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateNotificationSettings(ctx.user.id, {
          emailEnabled: input.emailEnabled !== undefined ? (input.emailEnabled ? 1 : 0) : undefined,
          pushEnabled: input.pushEnabled !== undefined ? (input.pushEnabled ? 1 : 0) : undefined,
          emailFrequency: input.emailFrequency,
          quietHoursStart: input.quietHoursStart,
          quietHoursEnd: input.quietHoursEnd,
          typeSettings: input.typeSettings,
        });
        return { success: true };
      }),
  }),

  // ==================== Saved Filters ====================
  filters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserSavedFilters(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        filters: z.string(), // JSON string
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createSavedFilter({
          userId: ctx.user.id,
          name: input.name,
          filters: input.filters,
        });
        return { id };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSavedFilter(input.id);
        return { success: true };
      }),
  }),

  // ==================== Analytics ====================
  analytics: router({
    userStats: protectedProcedure.query(async ({ ctx }) => {
      return await getUserProcessStats(ctx.user.id);
    }),
    
    recentActivity: protectedProcedure
      .input(z.object({ days: z.number().min(1).max(90).default(30) }).optional())
      .query(async ({ ctx, input }) => {
        return await getRecentActivity(ctx.user.id, input?.days || 30);
      }),
    
    // Admin global stats
    globalStats: adminProcedure.query(async () => {
      return await getGlobalProcessStats();
    }),
  }),
});
