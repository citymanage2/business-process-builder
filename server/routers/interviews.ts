import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createInterview,
  getInterviewById,
  updateInterview,
  getCompanyById,
} from "../db";
import { storagePut } from "../storage";
import { transcribeAudio } from "../_core/voiceTranscription";

export const interviewsRouter = router({
  start: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input }) => {
      const company = await getCompanyById(input.companyId);
      if (!company) throw new Error("Company not found");

      const id = await createInterview({
        companyId: input.companyId,
        status: "in_progress",
      });

      return { id };
    }),
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getInterviewById(input.id);
    }),
  uploadAudio: protectedProcedure
    .input(z.object({
      interviewId: z.number(),
      audioData: z.string(), // base64
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.audioData, 'base64');
      const fileName = `interview-${input.interviewId}-${Date.now()}.webm`;
      const { url } = await storagePut(fileName, buffer, input.mimeType);
      
      await updateInterview(input.interviewId, { audioUrl: url });
      return { url };
    }),
  transcribe: protectedProcedure
    .input(z.object({ interviewId: z.number() }))
    .mutation(async ({ input }) => {
      const interview = await getInterviewById(input.interviewId);
      if (!interview || !interview.audioUrl) {
        throw new Error("Interview or audio not found");
      }

      const result = await transcribeAudio({
        audioUrl: interview.audioUrl,
        language: "ru",
      });

      if ('error' in result) {
        throw new Error(`Transcription failed: ${result.error}`);
      }

      await updateInterview(input.interviewId, {
        transcript: result.text,
      });

      return { transcript: result.text };
    }),
  saveAnswers: protectedProcedure
    .input(z.object({
      interviewId: z.number(),
      answers: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input }) => {
      await updateInterview(input.interviewId, {
        structuredData: JSON.stringify(input.answers),
        status: "completed",
      });
      return { success: true };
    }),
});
