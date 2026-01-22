import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  // Categories
  createBuilderCategory,
  getAllBuilderCategories,
  updateBuilderCategory,
  deleteBuilderCategory,
  // Processes
  createBuilderProcess,
  getBuilderProcessById,
  getUserBuilderProcesses,
  getPublicBuilderProcesses,
  getCollaboratorProcesses,
  updateBuilderProcess,
  softDeleteBuilderProcess,
  hardDeleteBuilderProcess,
  restoreBuilderProcess,
  incrementProcessViewCount,
  // Versions
  createBuilderVersion,
  getProcessVersions,
  getVersionById,
  getLatestVersionNumber,
  // Collaborators
  addCollaborator,
  getProcessCollaborators,
  getCollaboratorByToken,
  updateCollaborator,
  removeCollaborator,
  getUserAccessToProcess,
  // Comments
  createBuilderComment,
  getProcessCommentsList,
  updateBuilderComment,
  deleteBuilderComment,
  // Templates
  createBuilderTemplate,
  getBuilderTemplates,
  getTemplateById,
  updateBuilderTemplate,
  incrementTemplateUsage,
  deleteBuilderTemplate,
  // Notifications
  createBuilderNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  // Stats
  getUserBuilderStats,
  getUserById,
} from "../db";
import { nanoid } from "nanoid";

// Validation schemas
const blockSchema = z.object({
  id: z.string(),
  type: z.enum([
    "start", "end", "entry_point", "exit_point",
    "task", "subprocess", "manual_action", "automated_action", "send_notification", "api_call",
    "condition", "multiple_choice", "parallel_gateway", "exclusive_gateway",
    "data_input", "data_output", "data_store", "document",
    "timer_event", "signal_event", "error_event", "escalation_event",
    "role", "department", "external_system"
  ]),
  name: z.string(),
  description: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  data: z.record(z.string(), z.any()).optional(),
  style: z.object({
    color: z.string().optional(),
    icon: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  }).optional()
});

const connectionSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.enum(["sequence_flow", "data_flow", "conditional_flow"]),
  label: z.string().optional(),
  data: z.record(z.string(), z.any()).optional()
});

// Helper function to check process access
async function checkProcessAccess(processId: number, userId: number, requiredRoles: string[]): Promise<void> {
  const access = await getUserAccessToProcess(processId, userId);
  
  if (!access || !requiredRoles.includes(access)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to perform this action"
    });
  }
}

export const builderRouter = router({
  // ==================== Categories ====================
  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getAllBuilderCategories(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        icon: z.string().max(50).optional(),
        parentId: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createBuilderCategory({
          ...input,
          userId: ctx.user.id
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        icon: z.string().max(50).optional(),
        parentId: z.number().nullable().optional()
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateBuilderCategory(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBuilderCategory(input.id);
        return { success: true };
      })
  }),

  // ==================== Processes ====================
  processes: router({
    // Get user's own processes
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["draft", "published", "archived"]).optional(),
        categoryId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional()
      }).optional())
      .query(async ({ ctx, input }) => {
        return await getUserBuilderProcesses(ctx.user.id, input);
      }),

    // Get public processes
    public: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional()
      }).optional())
      .query(async ({ input }) => {
        return await getPublicBuilderProcesses(input);
      }),

    // Get processes shared with user
    shared: protectedProcedure.query(async ({ ctx }) => {
      return await getCollaboratorProcesses(ctx.user.id);
    }),

    // Get single process by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.id);
        
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Process not found" });
        }

        // Check access
        const access = await getUserAccessToProcess(input.id, ctx.user.id);
        if (!access) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this process" });
        }

        // Increment view count if not owner
        if (process.ownerId !== ctx.user.id) {
          await incrementProcessViewCount(input.id);
        }

        return {
          ...process,
          blocksData: process.blocksData ? JSON.parse(process.blocksData) : [],
          connectionsData: process.connectionsData ? JSON.parse(process.connectionsData) : [],
          canvasSettings: process.canvasSettings ? JSON.parse(process.canvasSettings) : null,
          tags: process.tags ? JSON.parse(process.tags) : [],
          accessRole: access
        };
      }),

    // Create new process
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(500),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        visibility: z.enum(["private", "public"]).optional(),
        tags: z.array(z.string()).optional(),
        templateId: z.number().optional() // Create from template
      }))
      .mutation(async ({ ctx, input }) => {
        let blocksData: string | undefined;
        let connectionsData: string | undefined;

        // If creating from template
        if (input.templateId) {
          const template = await getTemplateById(input.templateId);
          if (template) {
            const processData = JSON.parse(template.processData);
            blocksData = JSON.stringify(processData.blocks || []);
            connectionsData = JSON.stringify(processData.connections || []);
            await incrementTemplateUsage(input.templateId);
          }
        }

        const id = await createBuilderProcess({
          name: input.name,
          description: input.description,
          ownerId: ctx.user.id,
          categoryId: input.categoryId,
          visibility: input.visibility || "private",
          tags: input.tags ? JSON.stringify(input.tags) : null,
          blocksData,
          connectionsData,
          status: "draft"
        });

        // Create initial version
        await createBuilderVersion({
          processId: id,
          versionNumber: 1,
          authorId: ctx.user.id,
          comment: "Initial version",
          snapshot: JSON.stringify({
            blocks: blocksData ? JSON.parse(blocksData) : [],
            connections: connectionsData ? JSON.parse(connectionsData) : []
          })
        });

        return { id };
      }),

    // Update process metadata
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        categoryId: z.number().nullable().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        visibility: z.enum(["private", "public"]).optional(),
        tags: z.array(z.string()).optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await checkProcessAccess(input.id, ctx.user.id, ["owner", "editor"]);

        const { id, tags, ...data } = input;
        await updateBuilderProcess(id, {
          ...data,
          tags: tags ? JSON.stringify(tags) : undefined
        });

        return { success: true };
      }),

    // Save process diagram (blocks and connections)
    saveDiagram: protectedProcedure
      .input(z.object({
        id: z.number(),
        blocks: z.array(blockSchema),
        connections: z.array(connectionSchema),
        canvasSettings: z.object({
          zoom: z.number().optional(),
          panX: z.number().optional(),
          panY: z.number().optional(),
          gridEnabled: z.boolean().optional()
        }).optional(),
        createVersion: z.boolean().optional(),
        versionComment: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await checkProcessAccess(input.id, ctx.user.id, ["owner", "editor"]);

        const updateData: any = {
          blocksData: JSON.stringify(input.blocks),
          connectionsData: JSON.stringify(input.connections)
        };

        if (input.canvasSettings) {
          updateData.canvasSettings = JSON.stringify(input.canvasSettings);
        }

        // Create new version if requested
        if (input.createVersion) {
          const latestVersion = await getLatestVersionNumber(input.id);
          const newVersionNumber = latestVersion + 1;

          await createBuilderVersion({
            processId: input.id,
            versionNumber: newVersionNumber,
            authorId: ctx.user.id,
            comment: input.versionComment || `Version ${newVersionNumber}`,
            snapshot: JSON.stringify({
              blocks: input.blocks,
              connections: input.connections
            })
          });

          updateData.currentVersion = newVersionNumber;
        }

        await updateBuilderProcess(input.id, updateData);

        return { success: true };
      }),

    // Soft delete process
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await checkProcessAccess(input.id, ctx.user.id, ["owner"]);
        await softDeleteBuilderProcess(input.id);
        return { success: true };
      }),

    // Hard delete process (admin or owner)
    permanentDelete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBuilderProcessById(input.id);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (process.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await hardDeleteBuilderProcess(input.id);
        return { success: true };
      }),

    // Restore soft-deleted process
    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await checkProcessAccess(input.id, ctx.user.id, ["owner"]);
        await restoreBuilderProcess(input.id);
        return { success: true };
      }),

    // Duplicate process
    duplicate: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        name: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const original = await getBuilderProcessById(input.id);
        if (!original) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Check at least viewer access
        const access = await getUserAccessToProcess(input.id, ctx.user.id);
        if (!access) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const newId = await createBuilderProcess({
          name: input.name || `${original.name} (Copy)`,
          description: original.description,
          ownerId: ctx.user.id,
          categoryId: original.categoryId,
          visibility: "private",
          tags: original.tags,
          blocksData: original.blocksData,
          connectionsData: original.connectionsData,
          canvasSettings: original.canvasSettings,
          status: "draft"
        });

        return { id: newId };
      })
  }),

  // ==================== Versions ====================
  versions: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        await checkProcessAccess(input.processId, ctx.user.id, ["owner", "editor", "viewer", "commenter"]);
        return await getProcessVersions(input.processId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const version = await getVersionById(input.id);
        if (!version) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await checkProcessAccess(version.processId, ctx.user.id, ["owner", "editor", "viewer", "commenter"]);

        return {
          ...version,
          snapshot: JSON.parse(version.snapshot)
        };
      }),

    restore: protectedProcedure
      .input(z.object({ 
        processId: z.number(),
        versionId: z.number()
      }))
      .mutation(async ({ ctx, input }) => {
        await checkProcessAccess(input.processId, ctx.user.id, ["owner", "editor"]);

        const version = await getVersionById(input.versionId);
        if (!version || version.processId !== input.processId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const snapshot = JSON.parse(version.snapshot);
        const latestVersion = await getLatestVersionNumber(input.processId);

        // Create a new version from the restored data
        await createBuilderVersion({
          processId: input.processId,
          versionNumber: latestVersion + 1,
          authorId: ctx.user.id,
          comment: `Restored from version ${version.versionNumber}`,
          snapshot: version.snapshot
        });

        // Update process with restored data
        await updateBuilderProcess(input.processId, {
          blocksData: JSON.stringify(snapshot.blocks || []),
          connectionsData: JSON.stringify(snapshot.connections || []),
          currentVersion: latestVersion + 1
        });

        return { success: true, newVersion: latestVersion + 1 };
      })
  }),

  // ==================== Collaborators ====================
  collaborators: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        await checkProcessAccess(input.processId, ctx.user.id, ["owner", "editor"]);
        return await getProcessCollaborators(input.processId);
      }),

    invite: protectedProcedure
      .input(z.object({
        processId: z.number(),
        userId: z.number(),
        role: z.enum(["editor", "viewer", "commenter"])
      }))
      .mutation(async ({ ctx, input }) => {
        await checkProcessAccess(input.processId, ctx.user.id, ["owner"]);

        // Check if user exists
        const invitedUser = await getUserById(input.userId);
        if (!invitedUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        // Check if already collaborator
        const existing = await getProcessCollaborators(input.processId);
        if (existing.some(c => c.userId === input.userId)) {
          throw new TRPCError({ code: "CONFLICT", message: "User is already a collaborator" });
        }

        const inviteToken = nanoid(32);

        const id = await addCollaborator({
          processId: input.processId,
          userId: input.userId,
          role: input.role,
          inviteToken,
          acceptedAt: new Date() // Auto-accept for now
        });

        // Create notification for invited user
        const process = await getBuilderProcessById(input.processId);
        await createBuilderNotification({
          userId: input.userId,
          type: "invite",
          title: "Process Invitation",
          message: `${ctx.user.name || ctx.user.email} invited you to collaborate on "${process?.name}"`,
          processId: input.processId,
          fromUserId: ctx.user.id
        });

        return { id, inviteToken };
      }),

    updateRole: protectedProcedure
      .input(z.object({
        collaboratorId: z.number(),
        role: z.enum(["editor", "viewer", "commenter"])
      }))
      .mutation(async ({ input }) => {
        await updateCollaborator(input.collaboratorId, { role: input.role });
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({
        processId: z.number(),
        collaboratorId: z.number()
      }))
      .mutation(async ({ ctx, input }) => {
        await checkProcessAccess(input.processId, ctx.user.id, ["owner"]);
        await removeCollaborator(input.collaboratorId);
        return { success: true };
      }),

    // Accept invite via token
    acceptInvite: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const collab = await getCollaboratorByToken(input.token);
        if (!collab) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired invitation" });
        }

        if (collab.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This invitation is for another user" });
        }

        await updateCollaborator(collab.id, {
          acceptedAt: new Date(),
          inviteToken: null
        });

        return { success: true, processId: collab.processId };
      })
  }),

  // ==================== Comments ====================
  comments: router({
    list: protectedProcedure
      .input(z.object({
        processId: z.number(),
        blockId: z.string().optional()
      }))
      .query(async ({ ctx, input }) => {
        await checkProcessAccess(input.processId, ctx.user.id, ["owner", "editor", "viewer", "commenter"]);
        return await getProcessCommentsList(input.processId, input.blockId);
      }),

    create: protectedProcedure
      .input(z.object({
        processId: z.number(),
        blockId: z.string().optional(),
        parentId: z.number().optional(),
        content: z.string().min(1)
      }))
      .mutation(async ({ ctx, input }) => {
        await checkProcessAccess(input.processId, ctx.user.id, ["owner", "editor", "commenter"]);

        const id = await createBuilderComment({
          processId: input.processId,
          blockId: input.blockId,
          parentId: input.parentId,
          userId: ctx.user.id,
          content: input.content
        });

        // Notify process owner
        const process = await getBuilderProcessById(input.processId);
        if (process && process.ownerId !== ctx.user.id) {
          await createBuilderNotification({
            userId: process.ownerId,
            type: "comment",
            title: "New Comment",
            message: `${ctx.user.name || ctx.user.email} commented on your process "${process.name}"`,
            processId: input.processId,
            commentId: id,
            fromUserId: ctx.user.id
          });
        }

        // Check for @mentions
        const mentions = input.content.match(/@(\w+)/g);
        if (mentions) {
          // TODO: Implement mention notifications
        }

        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().min(1).optional(),
        resolved: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateBuilderComment(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBuilderComment(input.id);
        return { success: true };
      })
  }),

  // ==================== Templates ====================
  templates: router({
    list: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        systemOnly: z.boolean().optional(),
        search: z.string().optional()
      }).optional())
      .query(async ({ input }) => {
        return await getBuilderTemplates(input);
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await getTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return {
          ...template,
          processData: JSON.parse(template.processData),
          tags: template.tags ? JSON.parse(template.tags) : []
        };
      }),

    // Save process as template
    createFromProcess: protectedProcedure
      .input(z.object({
        processId: z.number(),
        name: z.string().min(1).max(500),
        description: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await checkProcessAccess(input.processId, ctx.user.id, ["owner"]);

        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const id = await createBuilderTemplate({
          name: input.name,
          description: input.description,
          categoryId: process.categoryId,
          authorId: ctx.user.id,
          isSystem: 0,
          isPublished: 0, // Requires approval
          thumbnail: process.thumbnail,
          processData: JSON.stringify({
            blocks: process.blocksData ? JSON.parse(process.blocksData) : [],
            connections: process.connectionsData ? JSON.parse(process.connectionsData) : []
          }),
          tags: process.tags
        });

        return { id };
      }),

    // Admin: Create system template
    createSystem: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(500),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        processData: z.object({
          blocks: z.array(blockSchema),
          connections: z.array(connectionSchema)
        }),
        tags: z.array(z.string()).optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const id = await createBuilderTemplate({
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          authorId: ctx.user.id,
          isSystem: 1,
          isPublished: 1,
          processData: JSON.stringify(input.processData),
          tags: input.tags ? JSON.stringify(input.tags) : null
        });

        return { id };
      }),

    // Admin: Publish user template
    publish: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await updateBuilderTemplate(input.id, { isPublished: 1 });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const template = await getTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (template.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await deleteBuilderTemplate(input.id);
        return { success: true };
      })
  }),

  // ==================== Notifications ====================
  notifications: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await getUserNotifications(ctx.user.id, input?.unreadOnly);
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
    })
  }),

  // ==================== Stats & Dashboard ====================
  stats: router({
    user: protectedProcedure.query(async ({ ctx }) => {
      return await getUserBuilderStats(ctx.user.id);
    })
  }),

  // ==================== Export/Import ====================
  export: router({
    json: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        await checkProcessAccess(input.processId, ctx.user.id, ["owner", "editor", "viewer"]);

        const process = await getBuilderProcessById(input.processId);
        if (!process) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return {
          version: "1.0",
          exportedAt: new Date().toISOString(),
          process: {
            name: process.name,
            description: process.description,
            tags: process.tags ? JSON.parse(process.tags) : [],
            blocks: process.blocksData ? JSON.parse(process.blocksData) : [],
            connections: process.connectionsData ? JSON.parse(process.connectionsData) : []
          }
        };
      })
  }),

  import: router({
    json: protectedProcedure
      .input(z.object({
        name: z.string(),
        data: z.object({
          version: z.string(),
          process: z.object({
            name: z.string(),
            description: z.string().optional(),
            tags: z.array(z.string()).optional(),
            blocks: z.array(z.any()),
            connections: z.array(z.any())
          })
        })
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createBuilderProcess({
          name: input.name || input.data.process.name,
          description: input.data.process.description,
          ownerId: ctx.user.id,
          tags: input.data.process.tags ? JSON.stringify(input.data.process.tags) : null,
          blocksData: JSON.stringify(input.data.process.blocks),
          connectionsData: JSON.stringify(input.data.process.connections),
          status: "draft",
          visibility: "private"
        });

        // Create initial version
        await createBuilderVersion({
          processId: id,
          versionNumber: 1,
          authorId: ctx.user.id,
          comment: "Imported",
          snapshot: JSON.stringify({
            blocks: input.data.process.blocks,
            connections: input.data.process.connections
          })
        });

        return { id };
      })
  })
});

export type BuilderRouter = typeof builderRouter;
