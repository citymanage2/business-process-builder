import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  saveDraftInterview,
  getDraftInterviews,
} from "../db";

export const draftsRouter = router({
  save: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      companyId: z.number(),
      interviewType: z.enum(["voice", "form_full", "form_short"]),
      answers: z.string(), // JSON string
      progress: z.number(),
    }))
    .mutation(async ({ input }) => {
      const id = await saveDraftInterview({
        id: input.id,
        companyId: input.companyId,
        interviewType: input.interviewType,
        status: "draft",
        answers: input.answers,
        progress: input.progress,
      });
      return { id };
    }),
  list: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      return await getDraftInterviews(input.companyId);
    }),
});
