import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createComment,
  getProcessComments,
  deleteComment,
} from "../db";

export const commentsRouter = router({
  create: protectedProcedure
    .input(z.object({
      processId: z.number(),
      stepId: z.string().optional(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createComment({
        businessProcessId: input.processId,
        userId: ctx.user.id,
        stepId: input.stepId,
        content: input.content,
      });
      return { id };
    }),
  list: protectedProcedure
    .input(z.object({ processId: z.number() }))
    .query(async ({ input }) => {
      return await getProcessComments(input.processId);
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteComment(input.id);
      return { success: true };
    }),
});
