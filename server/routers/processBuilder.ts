import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createBpCategory,
  createBpComment,
  createBpNotification,
  createBpProcess,
  createBpProcessCollaborator,
  createBpProcessConnection,
  createBpProcessTag,
  createBpProcessVersion,
  createBpTag,
  createBpTemplate,
  createBpProcessBlock,
  deleteBpCategory,
  deleteBpComment,
  deleteBpNotification,
  deleteBpProcessCollaborator,
  deleteBpProcessConnection,
  deleteBpProcessTag,
  deleteBpProcessBlock,
  getBpProcessById,
  getBpProcessVersionById,
  getBpTemplateById,
  getBpUserSettings,
  hardDeleteBpProcess,
  incrementBpProcessViewCount,
  listBpCategories,
  listBpComments,
  listBpNotifications,
  listBpProcessBlocks,
  listBpProcessCollaborators,
  listBpProcessConnections,
  listBpProcesses,
  listBpProcessVersions,
  listBpTags,
  listBpTemplates,
  markAllBpNotificationsRead,
  markBpNotificationRead,
  restoreBpProcess,
  searchBpTags,
  softDeleteBpProcess,
  updateBpCategory,
  updateBpComment,
  updateBpProcess,
  updateBpProcessBlock,
  updateBpProcessCollaborator,
  updateBpProcessConnection,
  updateBpTemplate,
  upsertBpUserSettings,
  replaceBpProcessBlocks,
  replaceBpProcessConnections,
} from "../db";

const processVisibilitySchema = z.enum(["private", "public"]);
const processStatusSchema = z.enum(["draft", "published", "archived"]);

const processContentSchema = z.any();

const safeParseJson = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("[ProcessBuilder] Failed to parse JSON content:", error);
    return null;
  }
};

const normalizeContent = (content: unknown) => {
  if (content === undefined) return undefined;
  if (content === null) return null;
  if (typeof content === "string") return content;
  return JSON.stringify(content);
};

const ensureProcessOwner = async (processId: number, userId: number, userRole: string) => {
  const process = await getBpProcessById(processId);
  if (!process) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Process not found" });
  }
  if (process.ownerId !== userId && userRole !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }
  return process;
};

export const processBuilderRouter = router({
  processes: router({
    publicList: publicProcedure
      .input(
        z.object({
          status: processStatusSchema.optional(),
          categoryId: z.number().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        }),
      )
      .query(async ({ input }) => {
        return await listBpProcesses({
          visibility: "public",
          status: input.status,
          categoryId: input.categoryId,
          search: input.search,
          limit: input.limit,
          offset: input.offset,
        });
      }),
    list: protectedProcedure
      .input(
        z.object({
          scope: z.enum(["mine", "public"]).default("mine"),
          status: processStatusSchema.optional(),
          categoryId: z.number().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const filters = {
          ownerId: input.scope === "mine" ? ctx.user.id : undefined,
          visibility: input.scope === "public" ? "public" : undefined,
          status: input.status,
          categoryId: input.categoryId,
          search: input.search,
          limit: input.limit,
          offset: input.offset,
        };
        return await listBpProcesses(filters);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const process = await getBpProcessById(input.id);
        if (!process) return null;
        if (process.visibility === "private" && process.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return { ...process, content: safeParseJson(process.content) };
      }),
    publicGet: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const process = await getBpProcessById(input.id);
        if (!process || process.visibility !== "public") return null;
        return { ...process, content: safeParseJson(process.content) };
      }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          categoryId: z.number().optional(),
          visibility: processVisibilitySchema.optional(),
          status: processStatusSchema.optional(),
          thumbnail: z.string().optional(),
          content: processContentSchema.optional(),
          versionComment: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const content = normalizeContent(input.content);
        const id = await createBpProcess({
          ownerId: ctx.user.id,
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          visibility: input.visibility ?? "private",
          status: input.status ?? "draft",
          thumbnail: input.thumbnail,
          content,
        });

        if (content) {
          await createBpProcessVersion({
            processId: id,
            versionNumber: 1,
            content,
            comment: input.versionComment,
            createdBy: ctx.user.id,
          });
        }

        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          categoryId: z.number().nullable().optional(),
          visibility: processVisibilitySchema.optional(),
          status: processStatusSchema.optional(),
          thumbnail: z.string().nullable().optional(),
          content: processContentSchema.optional(),
          versionComment: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const process = await ensureProcessOwner(input.id, ctx.user.id, ctx.user.role);
        const content = normalizeContent(input.content);
        const nextVersion = content ? process.version + 1 : process.version;

        await updateBpProcess(input.id, {
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          visibility: input.visibility,
          status: input.status,
          thumbnail: input.thumbnail,
          content: content ?? undefined,
          version: nextVersion,
        });

        if (content) {
          await createBpProcessVersion({
            processId: input.id,
            versionNumber: nextVersion,
            content,
            comment: input.versionComment,
            createdBy: ctx.user.id,
          });
        }

        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number(), hard: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.id, ctx.user.id, ctx.user.role);
        if (input.hard && ctx.user.role === "admin") {
          await hardDeleteBpProcess(input.id);
        } else {
          await softDeleteBpProcess(input.id);
        }
        return { success: true };
      }),
    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.id, ctx.user.id, ctx.user.role);
        await restoreBpProcess(input.id);
        return { success: true };
      }),
    duplicate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const process = await getBpProcessById(input.id);
        if (!process) throw new TRPCError({ code: "NOT_FOUND", message: "Process not found" });
        if (process.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const id = await createBpProcess({
          ownerId: ctx.user.id,
          title: `${process.title} (Copy)`,
          description: process.description ?? undefined,
          categoryId: process.categoryId ?? undefined,
          visibility: "private",
          status: "draft",
          content: process.content,
        });

        if (process.content) {
          await createBpProcessVersion({
            processId: id,
            versionNumber: 1,
            content: process.content,
            comment: "Duplicated from process",
            createdBy: ctx.user.id,
          });
        }

        return { id };
      }),
    incrementViewCount: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await incrementBpProcessViewCount(input.id);
        return { success: true };
      }),
  }),

  processVersions: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        return await listBpProcessVersions(input.processId);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const version = await getBpProcessVersionById(input.id);
        if (!version) return null;
        await ensureProcessOwner(version.processId, ctx.user.id, ctx.user.role);
        return { ...version, content: safeParseJson(version.content) };
      }),
    compare: protectedProcedure
      .input(z.object({ leftId: z.number(), rightId: z.number() }))
      .query(async ({ ctx, input }) => {
        const left = await getBpProcessVersionById(input.leftId);
        const right = await getBpProcessVersionById(input.rightId);
        if (!left || !right) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
        }
        await ensureProcessOwner(left.processId, ctx.user.id, ctx.user.role);
        await ensureProcessOwner(right.processId, ctx.user.id, ctx.user.role);
        return {
          left: { ...left, content: safeParseJson(left.content) },
          right: { ...right, content: safeParseJson(right.content) },
        };
      }),
    restore: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const version = await getBpProcessVersionById(input.versionId);
        if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
        const process = await ensureProcessOwner(version.processId, ctx.user.id, ctx.user.role);
        const nextVersion = process.version + 1;
        await updateBpProcess(process.id, {
          content: version.content,
          version: nextVersion,
        });
        await createBpProcessVersion({
          processId: process.id,
          versionNumber: nextVersion,
          content: version.content,
          comment: `Restored from version ${version.versionNumber}`,
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),
  }),

  blocks: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        return await listBpProcessBlocks(input.processId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          processId: z.number(),
          blockId: z.string().min(1),
          type: z.string().min(1),
          title: z.string().min(1),
          description: z.string().optional(),
          properties: z.any().optional(),
          positionX: z.number().optional(),
          positionY: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        const id = await createBpProcessBlock({
          processId: input.processId,
          blockId: input.blockId,
          type: input.type,
          title: input.title,
          description: input.description,
          properties: normalizeContent(input.properties),
          positionX: input.positionX,
          positionY: input.positionY,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          processId: z.number(),
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          properties: z.any().optional(),
          positionX: z.number().optional(),
          positionY: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await updateBpProcessBlock(input.id, {
          title: input.title,
          description: input.description,
          properties: normalizeContent(input.properties),
          positionX: input.positionX,
          positionY: input.positionY,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ processId: z.number(), id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await deleteBpProcessBlock(input.id);
        return { success: true };
      }),
    bulkUpdate: protectedProcedure
      .input(
        z.object({
          processId: z.number(),
          blocks: z.array(
            z.object({
              blockId: z.string().min(1),
              type: z.string().min(1),
              title: z.string().min(1),
              description: z.string().optional(),
              properties: z.any().optional(),
              positionX: z.number().optional(),
              positionY: z.number().optional(),
            }),
          ),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await replaceBpProcessBlocks(
          input.processId,
          input.blocks.map(block => ({
            processId: input.processId,
            blockId: block.blockId,
            type: block.type,
            title: block.title,
            description: block.description,
            properties: normalizeContent(block.properties),
            positionX: block.positionX,
            positionY: block.positionY,
          })),
        );
        return { success: true };
      }),
  }),

  connections: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        return await listBpProcessConnections(input.processId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          processId: z.number(),
          sourceBlockId: z.string().min(1),
          targetBlockId: z.string().min(1),
          type: z.enum(["sequence", "data", "conditional"]),
          label: z.string().optional(),
          properties: z.any().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        const id = await createBpProcessConnection({
          processId: input.processId,
          sourceBlockId: input.sourceBlockId,
          targetBlockId: input.targetBlockId,
          type: input.type,
          label: input.label,
          properties: normalizeContent(input.properties),
        });
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          processId: z.number(),
          id: z.number(),
          label: z.string().optional(),
          properties: z.any().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await updateBpProcessConnection(input.id, {
          label: input.label,
          properties: normalizeContent(input.properties),
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ processId: z.number(), id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await deleteBpProcessConnection(input.id);
        return { success: true };
      }),
    bulkUpdate: protectedProcedure
      .input(
        z.object({
          processId: z.number(),
          connections: z.array(
            z.object({
              sourceBlockId: z.string().min(1),
              targetBlockId: z.string().min(1),
              type: z.enum(["sequence", "data", "conditional"]),
              label: z.string().optional(),
              properties: z.any().optional(),
            }),
          ),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await replaceBpProcessConnections(
          input.processId,
          input.connections.map(connection => ({
            processId: input.processId,
            sourceBlockId: connection.sourceBlockId,
            targetBlockId: connection.targetBlockId,
            type: connection.type,
            label: connection.label,
            properties: normalizeContent(connection.properties),
          })),
        );
        return { success: true };
      }),
  }),

  categories: router({
    list: publicProcedure.query(async () => await listBpCategories()),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          parentId: z.number().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const id = await createBpCategory(input);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          parentId: z.number().nullable().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { id, ...data } = input;
        await updateBpCategory(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        await deleteBpCategory(input.id);
        return { success: true };
      }),
  }),

  tags: router({
    list: publicProcedure.query(async () => await listBpTags()),
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => await searchBpTags(input.query)),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const id = await createBpTag({ name: input.name });
        return { id };
      }),
    attachToProcess: protectedProcedure
      .input(z.object({ processId: z.number(), tagId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await createBpProcessTag({ processId: input.processId, tagId: input.tagId });
        return { success: true };
      }),
    detachFromProcess: protectedProcedure
      .input(z.object({ processId: z.number(), tagId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await deleteBpProcessTag(input.processId, input.tagId);
        return { success: true };
      }),
  }),

  collaborators: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        return await listBpProcessCollaborators(input.processId);
      }),
    invite: protectedProcedure
      .input(
        z.object({
          processId: z.number(),
          userId: z.number(),
          role: z.enum(["owner", "editor", "viewer", "commenter"]).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        const id = await createBpProcessCollaborator({
          processId: input.processId,
          userId: input.userId,
          role: input.role ?? "viewer",
          invitedBy: ctx.user.id,
        });
        await createBpNotification({
          userId: input.userId,
          type: "collaboration_invite",
          title: "Process collaboration invitation",
          content: "You have been granted access to a process.",
          relatedProcessId: input.processId,
        });
        return { id };
      }),
    updateRole: protectedProcedure
      .input(
        z.object({
          processId: z.number(),
          id: z.number(),
          role: z.enum(["owner", "editor", "viewer", "commenter"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await updateBpProcessCollaborator(input.id, { role: input.role });
        return { success: true };
      }),
    remove: protectedProcedure
      .input(z.object({ processId: z.number(), id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        await deleteBpProcessCollaborator(input.id);
        return { success: true };
      }),
  }),

  comments: router({
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        return await listBpComments(input.processId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          processId: z.number(),
          blockId: z.string().optional(),
          content: z.string().min(1),
          parentId: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createBpComment({
          processId: input.processId,
          blockId: input.blockId,
          userId: ctx.user.id,
          content: input.content,
          parentId: input.parentId,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), content: z.string().min(1) }))
      .mutation(async ({ input }) => {
        await updateBpComment(input.id, { content: input.content });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBpComment(input.id);
        return { success: true };
      }),
  }),

  templates: router({
    list: publicProcedure
      .input(
        z
          .object({
            isPublic: z.boolean().optional(),
            categoryId: z.number().optional(),
          })
          .optional(),
      )
      .query(async ({ input }) => await listBpTemplates(input ?? {})),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const template = await getBpTemplateById(input.id);
      if (!template) return null;
      return { ...template, content: safeParseJson(template.content) };
    }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          categoryId: z.number().optional(),
          content: processContentSchema,
          isPublic: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createBpTemplate({
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          content: normalizeContent(input.content) ?? "{}",
          authorId: ctx.user.id,
          isPublic: input.isPublic ?? false,
        });
        return { id };
      }),
    createFromProcess: protectedProcedure
      .input(z.object({ processId: z.number(), isPublic: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const process = await ensureProcessOwner(input.processId, ctx.user.id, ctx.user.role);
        const id = await createBpTemplate({
          title: process.title,
          description: process.description ?? undefined,
          categoryId: process.categoryId ?? undefined,
          content: process.content ?? "{}",
          authorId: ctx.user.id,
          isPublic: input.isPublic ?? false,
        });
        return { id };
      }),
    rate: protectedProcedure
      .input(z.object({ id: z.number(), rating: z.number().min(1).max(5) }))
      .mutation(async ({ input }) => {
        await updateBpTemplate(input.id, { rating: input.rating.toFixed(2) });
        return { success: true };
      }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => await listBpNotifications(ctx.user.id)),
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markBpNotificationRead(input.id);
        return { success: true };
      }),
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllBpNotificationsRead(ctx.user.id);
      return { success: true };
    }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBpNotification(input.id);
        return { success: true };
      }),
  }),

  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => await getBpUserSettings(ctx.user.id)),
    update: protectedProcedure
      .input(
        z.object({
          language: z.string().optional(),
          theme: z.enum(["light", "dark", "auto"]).optional(),
          emailNotifications: z.boolean().optional(),
          pushNotifications: z.boolean().optional(),
          notificationFrequency: z.enum(["instant", "daily", "weekly"]).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await upsertBpUserSettings(ctx.user.id, input);
        return { success: true };
      }),
  }),
});
