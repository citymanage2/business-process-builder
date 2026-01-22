import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createBuilderProcess,
  getBuilderProcessById,
  getUserProcesses,
  getAccessibleProcesses,
  getPublicProcesses,
  updateBuilderProcess,
  deleteBuilderProcess,
  incrementProcessViewCount,
  createProcessVersion,
  getProcessVersions,
  getProcessVersion,
  getLatestVersion,
  addCollaborator,
  getProcessCollaborators,
  removeCollaborator,
  getUserAccessRole,
  createProcessComment,
  getProcessCommentsList,
  updateProcessComment,
  deleteProcessComment,
  resolveComment,
  createProcessTemplate,
  getProcessTemplates,
  getProcessTemplateById,
  incrementTemplateUseCount,
  deleteProcessTemplate,
  createProcessCategory,
  getProcessCategoriesList,
  updateProcessCategory,
  deleteProcessCategory,
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification,
  createSavedFilter,
  getUserSavedFilters,
  deleteSavedFilter,
  getUserProcessStats,
  getProcessAnalytics,
} from "./builderDb";
import { getUserByEmail } from "./db";
import { ProcessData, ValidationResult, ValidationError, BLOCK_TYPES } from "@shared/processBuilder";

// Validation helper
function validateProcess(data: ProcessData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  
  // Check for start node
  const startNodes = nodes.filter(n => n.data.type === BLOCK_TYPES.START);
  if (startNodes.length === 0) {
    errors.push({
      type: 'error',
      message: { en: 'Process must have a Start block', ru: 'Процесс должен иметь блок "Начало"' },
      code: 'MISSING_START'
    });
  } else if (startNodes.length > 1) {
    warnings.push({
      type: 'warning',
      message: { en: 'Process has multiple Start blocks', ru: 'Процесс имеет несколько блоков "Начало"' },
      code: 'MULTIPLE_START'
    });
  }
  
  // Check for end node
  const endNodes = nodes.filter(n => n.data.type === BLOCK_TYPES.END);
  if (endNodes.length === 0) {
    errors.push({
      type: 'error',
      message: { en: 'Process must have an End block', ru: 'Процесс должен иметь блок "Завершение"' },
      code: 'MISSING_END'
    });
  }
  
  // Check for isolated nodes (no connections)
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  
  nodes.forEach(node => {
    // Start nodes don't need inputs, end nodes don't need outputs
    if (node.data.type === BLOCK_TYPES.START || node.data.type === BLOCK_TYPES.ENTRY_POINT) {
      if (!edges.some(e => e.source === node.id)) {
        warnings.push({
          type: 'warning',
          nodeId: node.id,
          message: { en: `"${node.data.name}" has no outgoing connections`, ru: `"${node.data.name}" не имеет исходящих связей` },
          code: 'NO_OUTPUTS'
        });
      }
    } else if (node.data.type === BLOCK_TYPES.END || node.data.type === BLOCK_TYPES.EXIT_POINT) {
      if (!edges.some(e => e.target === node.id)) {
        warnings.push({
          type: 'warning',
          nodeId: node.id,
          message: { en: `"${node.data.name}" has no incoming connections`, ru: `"${node.data.name}" не имеет входящих связей` },
          code: 'NO_INPUTS'
        });
      }
    } else if (!connectedNodeIds.has(node.id)) {
      warnings.push({
        type: 'warning',
        nodeId: node.id,
        message: { en: `"${node.data.name}" is isolated (no connections)`, ru: `"${node.data.name}" изолирован (нет связей)` },
        code: 'ISOLATED_NODE'
      });
    }
  });
  
  // Check for required fields
  nodes.forEach(node => {
    if (!node.data.name || node.data.name.trim() === '') {
      errors.push({
        type: 'error',
        nodeId: node.id,
        message: { en: 'Block must have a name', ru: 'Блок должен иметь название' },
        code: 'MISSING_NAME'
      });
    }
  });
  
  // Check conditions in decision blocks
  const decisionTypes = [BLOCK_TYPES.CONDITION, BLOCK_TYPES.MULTIPLE_CHOICE, BLOCK_TYPES.EXCLUSIVE_GATEWAY];
  nodes.filter(n => decisionTypes.includes(n.data.type as any)).forEach(node => {
    const outgoingEdges = edges.filter(e => e.source === node.id);
    if (outgoingEdges.length < 2) {
      warnings.push({
        type: 'warning',
        nodeId: node.id,
        message: { en: `Decision block "${node.data.name}" should have at least 2 outgoing paths`, ru: `Блок решения "${node.data.name}" должен иметь минимум 2 исходящих пути` },
        code: 'INCOMPLETE_DECISION'
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export const builderRouter = router({
  // ==================== Processes ====================
  
  // Create new process
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(500),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      companyId: z.number().optional(),
      tags: z.array(z.string()).optional(),
      nodes: z.string().optional(), // JSON string
      edges: z.string().optional(), // JSON string
      templateId: z.number().optional(), // Create from template
    }))
    .mutation(async ({ ctx, input }) => {
      let nodes = input.nodes || '[]';
      let edges = input.edges || '[]';
      
      // If creating from template
      if (input.templateId) {
        const template = await getProcessTemplateById(input.templateId);
        if (template) {
          nodes = template.nodes;
          edges = template.edges;
          await incrementTemplateUseCount(input.templateId);
        }
      }
      
      const id = await createBuilderProcess({
        userId: ctx.user.id,
        companyId: input.companyId || null,
        categoryId: input.categoryId || null,
        name: input.name,
        description: input.description,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        nodes,
        edges,
        status: 'draft',
        visibility: 'private',
      });
      
      // Create initial version
      await createProcessVersion({
        processId: id,
        userId: ctx.user.id,
        version: 1,
        nodes,
        edges,
        comment: 'Initial version',
      });
      
      return { id };
    }),
  
  // Get process by ID
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const process = await getBuilderProcessById(input.id);
      if (!process) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
      }
      
      // Check access
      const accessRole = await getUserAccessRole(input.id, ctx.user.id);
      const isPublic = process.visibility === 'public' && process.status === 'published';
      
      if (!accessRole && !isPublic) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }
      
      // Increment view count if not owner
      if (process.userId !== ctx.user.id) {
        await incrementProcessViewCount(input.id);
      }
      
      return {
        ...process,
        nodes: process.nodes ? JSON.parse(process.nodes) : [],
        edges: process.edges ? JSON.parse(process.edges) : [],
        viewport: process.viewport ? JSON.parse(process.viewport) : null,
        tags: process.tags ? JSON.parse(process.tags) : [],
        accessRole,
      };
    }),
  
  // List user's processes
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      visibility: z.string().optional(),
      categoryId: z.number().optional(),
      search: z.string().optional(),
      sortBy: z.enum(['created', 'updated', 'name']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const processes = await getUserProcesses(ctx.user.id, input);
      return processes.map(p => ({
        ...p,
        tags: p.tags ? JSON.parse(p.tags) : [],
      }));
    }),
  
  // List accessible processes (owned + shared)
  listAccessible: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const processes = await getAccessibleProcesses(ctx.user.id, input);
      return processes.map(p => ({
        ...p,
        tags: p.tags ? JSON.parse(p.tags) : [],
      }));
    }),
  
  // List public processes
  listPublic: publicProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const processes = await getPublicProcesses(input);
      return processes.map(p => ({
        ...p,
        tags: p.tags ? JSON.parse(p.tags) : [],
      }));
    }),
  
  // Update process
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(500).optional(),
      description: z.string().optional(),
      categoryId: z.number().nullable().optional(),
      tags: z.array(z.string()).optional(),
      nodes: z.string().optional(),
      edges: z.string().optional(),
      viewport: z.string().optional(),
      status: z.enum(['draft', 'in_review', 'approved', 'published', 'archived']).optional(),
      visibility: z.enum(['private', 'public', 'shared']).optional(),
      createVersion: z.boolean().optional(),
      versionComment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const process = await getBuilderProcessById(input.id);
      if (!process) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
      }
      
      const accessRole = await getUserAccessRole(input.id, ctx.user.id);
      if (!accessRole || accessRole === 'viewer' || accessRole === 'commenter') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Edit access required' });
      }
      
      const { id, createVersion, versionComment, tags, ...updateData } = input;
      
      // Prepare update data
      const dataToUpdate: any = { ...updateData };
      if (tags !== undefined) {
        dataToUpdate.tags = JSON.stringify(tags);
      }
      
      await updateBuilderProcess(id, dataToUpdate);
      
      // Create version if requested
      if (createVersion && (input.nodes || input.edges)) {
        const latestVersion = await getLatestVersion(id);
        await createProcessVersion({
          processId: id,
          userId: ctx.user.id,
          version: latestVersion + 1,
          nodes: input.nodes || process.nodes || '[]',
          edges: input.edges || process.edges || '[]',
          viewport: input.viewport || process.viewport,
          comment: versionComment,
        });
        
        await updateBuilderProcess(id, { currentVersion: latestVersion + 1 });
      }
      
      return { success: true };
    }),
  
  // Delete process
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const process = await getBuilderProcessById(input.id);
      if (!process) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
      }
      
      // Only owner can delete
      if (process.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owner can delete process' });
      }
      
      await deleteBuilderProcess(input.id);
      return { success: true };
    }),
  
  // Validate process
  validate: protectedProcedure
    .input(z.object({
      nodes: z.string(),
      edges: z.string(),
    }))
    .mutation(async ({ input }) => {
      const processData: ProcessData = {
        nodes: JSON.parse(input.nodes),
        edges: JSON.parse(input.edges),
      };
      
      return validateProcess(processData);
    }),
  
  // Duplicate process
  duplicate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const process = await getBuilderProcessById(input.id);
      if (!process) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
      }
      
      // Check if user has at least view access
      const accessRole = await getUserAccessRole(input.id, ctx.user.id);
      const isPublic = process.visibility === 'public' && process.status === 'published';
      
      if (!accessRole && !isPublic) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }
      
      const newId = await createBuilderProcess({
        userId: ctx.user.id,
        companyId: process.companyId,
        categoryId: process.categoryId,
        name: input.name || `${process.name} (Copy)`,
        description: process.description,
        tags: process.tags,
        nodes: process.nodes,
        edges: process.edges,
        viewport: process.viewport,
        status: 'draft',
        visibility: 'private',
      });
      
      // Create initial version
      await createProcessVersion({
        processId: newId,
        userId: ctx.user.id,
        version: 1,
        nodes: process.nodes || '[]',
        edges: process.edges || '[]',
        viewport: process.viewport,
        comment: `Duplicated from process #${input.id}`,
      });
      
      return { id: newId };
    }),
  
  // ==================== Versions ====================
  
  versions: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        const accessRole = await getUserAccessRole(input.processId, ctx.user.id);
        if (!accessRole) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return await getProcessVersions(input.processId);
      }),
    
    get: protectedProcedure
      .input(z.object({
        processId: z.number(),
        version: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const accessRole = await getUserAccessRole(input.processId, ctx.user.id);
        if (!accessRole) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        const version = await getProcessVersion(input.processId, input.version);
        if (!version) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
        }
        
        return {
          ...version,
          nodes: JSON.parse(version.nodes),
          edges: JSON.parse(version.edges),
          viewport: version.viewport ? JSON.parse(version.viewport) : null,
        };
      }),
    
    restore: protectedProcedure
      .input(z.object({
        processId: z.number(),
        version: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const accessRole = await getUserAccessRole(input.processId, ctx.user.id);
        if (!accessRole || accessRole === 'viewer' || accessRole === 'commenter') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Edit access required' });
        }
        
        const version = await getProcessVersion(input.processId, input.version);
        if (!version) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
        }
        
        // Create new version with restored data
        const latestVersion = await getLatestVersion(input.processId);
        const newVersion = latestVersion + 1;
        
        await createProcessVersion({
          processId: input.processId,
          userId: ctx.user.id,
          version: newVersion,
          nodes: version.nodes,
          edges: version.edges,
          viewport: version.viewport,
          comment: `Restored from version ${input.version}`,
        });
        
        // Update process with restored data
        await updateBuilderProcess(input.processId, {
          nodes: version.nodes,
          edges: version.edges,
          viewport: version.viewport,
          currentVersion: newVersion,
        });
        
        return { newVersion };
      }),
  }),
  
  // ==================== Collaborators ====================
  
  collaborators: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        const accessRole = await getUserAccessRole(input.processId, ctx.user.id);
        if (!accessRole) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return await getProcessCollaborators(input.processId);
      }),
    
    add: protectedProcedure
      .input(z.object({
        processId: z.number(),
        email: z.string().email(),
        accessRole: z.enum(['editor', 'viewer', 'commenter']),
      }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
        }
        
        // Only owner can add collaborators
        if (process.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owner can add collaborators' });
        }
        
        // Find user by email
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        
        // Can't add yourself
        if (user.id === ctx.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add yourself as collaborator' });
        }
        
        const id = await addCollaborator({
          processId: input.processId,
          userId: user.id,
          accessRole: input.accessRole,
          invitedBy: ctx.user.id,
        });
        
        // Create notification for invited user
        await createNotification({
          userId: user.id,
          type: 'collaboration_invite',
          title: 'Collaboration Invite',
          message: `You have been invited to collaborate on "${process.name}"`,
          processId: input.processId,
          fromUserId: ctx.user.id,
        });
        
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        processId: z.number(),
        userId: z.number(),
        accessRole: z.enum(['editor', 'viewer', 'commenter']),
      }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
        }
        
        if (process.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owner can update collaborators' });
        }
        
        await addCollaborator({
          processId: input.processId,
          userId: input.userId,
          accessRole: input.accessRole,
        });
        
        return { success: true };
      }),
    
    remove: protectedProcedure
      .input(z.object({
        processId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
        }
        
        // Owner can remove anyone, collaborator can remove themselves
        if (process.userId !== ctx.user.id && input.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Permission denied' });
        }
        
        await removeCollaborator(input.processId, input.userId);
        return { success: true };
      }),
  }),
  
  // ==================== Comments ====================
  
  comments: router({
    list: protectedProcedure
      .input(z.object({
        processId: z.number(),
        nodeId: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const accessRole = await getUserAccessRole(input.processId, ctx.user.id);
        if (!accessRole) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return await getProcessCommentsList(input.processId, input.nodeId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        processId: z.number(),
        nodeId: z.string().optional(),
        parentId: z.number().optional(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const accessRole = await getUserAccessRole(input.processId, ctx.user.id);
        if (!accessRole) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        // Viewers can't comment unless they're commenters
        if (accessRole === 'viewer') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Comment access required' });
        }
        
        const id = await createProcessComment({
          processId: input.processId,
          userId: ctx.user.id,
          nodeId: input.nodeId || null,
          parentId: input.parentId || null,
          content: input.content,
        });
        
        // Notify process owner and collaborators
        const process = await getBuilderProcessById(input.processId);
        if (process && process.userId !== ctx.user.id) {
          await createNotification({
            userId: process.userId,
            type: 'new_comment',
            title: 'New Comment',
            message: `New comment on "${process.name}"`,
            processId: input.processId,
            commentId: id,
            fromUserId: ctx.user.id,
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
        // User can only update their own comments
        await updateProcessComment(input.id, { content: input.content });
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // User can delete their own comments, owner can delete any
        await deleteProcessComment(input.id);
        return { success: true };
      }),
    
    resolve: protectedProcedure
      .input(z.object({
        id: z.number(),
        resolved: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await resolveComment(input.id, input.resolved);
        return { success: true };
      }),
  }),
  
  // ==================== Templates ====================
  
  templates: router({
    list: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        isSystem: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        // For public access, show system templates and public user templates
        const templates = await getProcessTemplates({
          ...input,
          isPublic: input?.isSystem ? undefined : true,
        });
        
        return templates.map(t => ({
          ...t,
          nodes: JSON.parse(t.nodes),
          edges: JSON.parse(t.edges),
        }));
      }),
    
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await getProcessTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
        }
        
        return {
          ...template,
          nodes: JSON.parse(template.nodes),
          edges: JSON.parse(template.edges),
        };
      }),
    
    create: protectedProcedure
      .input(z.object({
        processId: z.number().optional(),
        name: z.string().min(1).max(500),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        nodes: z.string(),
        edges: z.string(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // If creating from existing process
        if (input.processId) {
          const accessRole = await getUserAccessRole(input.processId, ctx.user.id);
          if (!accessRole) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }
        
        const id = await createProcessTemplate({
          userId: ctx.user.id,
          categoryId: input.categoryId || null,
          name: input.name,
          description: input.description,
          nodes: input.nodes,
          edges: input.edges,
          isSystem: 0,
          isPublic: input.isPublic ? 1 : 0,
        });
        
        return { id };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const template = await getProcessTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
        }
        
        // Only owner or admin can delete
        if (template.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Permission denied' });
        }
        
        await deleteProcessTemplate(input.id);
        return { success: true };
      }),
  }),
  
  // ==================== Categories ====================
  
  categories: router({
    list: publicProcedure.query(async () => {
      return await getProcessCategoriesList();
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        parentId: z.number().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admin can create categories
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        const id = await createProcessCategory(input);
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        parentId: z.number().nullable().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        const { id, ...data } = input;
        await updateProcessCategory(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        await deleteProcessCategory(input.id);
        return { success: true };
      }),
  }),
  
  // ==================== Notifications ====================
  
  notifications: router({
    list: protectedProcedure
      .input(z.object({
        unreadOnly: z.boolean().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await getUserNotifications(ctx.user.id, input);
      }),
    
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await getUnreadNotificationCount(ctx.user.id);
    }),
    
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationAsRead(input.id);
        return { success: true };
      }),
    
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteNotification(input.id);
        return { success: true };
      }),
  }),
  
  // ==================== Saved Filters ====================
  
  filters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const filters = await getUserSavedFilters(ctx.user.id);
      return filters.map(f => ({
        ...f,
        filters: JSON.parse(f.filters),
      }));
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        filters: z.object({
          status: z.string().optional(),
          visibility: z.string().optional(),
          categoryId: z.number().optional(),
          search: z.string().optional(),
          tags: z.array(z.string()).optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createSavedFilter({
          userId: ctx.user.id,
          name: input.name,
          filters: JSON.stringify(input.filters),
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
    
    processStats: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        const accessRole = await getUserAccessRole(input.processId, ctx.user.id);
        if (!accessRole) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return await getProcessAnalytics(input.processId);
      }),
  }),
});

export type BuilderRouter = typeof builderRouter;
