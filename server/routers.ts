import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createCompany,
  getUserCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  createInterview,
  getInterviewById,
  updateInterview,
  createBusinessProcess,
  getCompanyProcesses,
  getProcessById,
  updateBusinessProcess,
  createRecommendation,
  getProcessRecommendations,
  createComment,
  getProcessComments,
  deleteComment,
  createDocument,
  getDocumentsByCompanyId,
  deleteDocument,
  saveDraftInterview,
  getDraftInterviews,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { buildProcessPrompt, buildQuestionsPrompt, buildRecommendationsPrompt } from "./prompts";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  companies: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserCompanies(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        industry: z.string().optional(),
        region: z.string().optional(),
        format: z.enum(["B2B", "B2C", "mixed"]).optional(),
        averageCheck: z.string().optional(),
        productsServices: z.string().optional(),
        itSystems: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createCompany({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getCompanyById(input.id);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        industry: z.string().optional(),
        region: z.string().optional(),
        format: z.enum(["B2B", "B2C", "mixed"]).optional(),
        averageCheck: z.string().optional(),
        productsServices: z.string().optional(),
        itSystems: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCompany(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCompany(input.id);
        return { success: true };
      }),
  }),

  interviews: router({
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
  }),

  processes: router({
    generate: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        interviewId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const company = await getCompanyById(input.companyId);
        const interview = await getInterviewById(input.interviewId);

        if (!company || !interview) {
          throw new Error("Company or interview not found");
        }

        // Формируем контекст компании
        const context = `
Компания: ${company.name}
Отрасль: ${company.industry || "Не указано"}
Регион: ${company.region || "Не указано"}
Формат: ${company.format || "Не указано"}
Средний чек: ${company.averageCheck || "Не указано"}
Продукты/услуги: ${company.productsServices || "Не указано"}
ИТ-системы: ${company.itSystems || "Не указано"}
        `;

        // Обрабатываем данные интервью
        let interviewData = "";
        
        if (interview.answers) {
          // Если есть ответы из анкеты
          try {
            const answers = JSON.parse(interview.answers);
            interviewData = "Ответы на вопросы анкеты:\n";
            for (const [questionId, answer] of Object.entries(answers)) {
              interviewData += `${questionId}: ${answer}\n`;
            }
          } catch (e) {
            console.error("Failed to parse interview answers", e);
            interviewData = interview.structuredData || interview.transcript || "Нет данных";
          }
        } else {
          // Иначе используем транскрипцию голосового интервью
          interviewData = interview.structuredData || interview.transcript || "Нет данных";
        }

        const prompt = buildProcessPrompt(context, interviewData);

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Ты эксперт по бизнес-процессам. Создавай детальные структурированные процессы в формате JSON." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const content = typeof response.choices[0].message.content === 'string' 
          ? response.choices[0].message.content 
          : JSON.stringify(response.choices[0].message.content);
        
        let processData;
        try {
          processData = JSON.parse(content);
        } catch (error) {
          console.error("[Process Generation] JSON parse error:", error);
          console.error("[Process Generation] Content length:", content.length);
          console.error("[Process Generation] Content preview:", content.substring(0, 500));
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to parse LLM response. Please try again.',
          });
        }

        // Validate required fields
        if (!processData.title || !processData.stages || !processData.roles || !processData.steps) {
          console.error("[Process Generation] Missing required fields in processData:", Object.keys(processData));
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid process data structure. Please try again.',
          });
        }

        const id = await createBusinessProcess({
          companyId: input.companyId,
          interviewId: input.interviewId,
          title: processData.title,
          description: processData.description,
          startEvent: processData.startEvent,
          endEvent: processData.endEvent,
          stages: JSON.stringify(processData.stages),
          roles: JSON.stringify(processData.roles),
          steps: JSON.stringify(processData.steps),
          branches: JSON.stringify(processData.branches),
          documents: JSON.stringify(processData.documents),
          itIntegration: JSON.stringify(processData.itIntegration),
          diagramData: JSON.stringify(processData),
          // Новые поля
          stageDetails: processData.stageDetails ? JSON.stringify(processData.stageDetails) : null,
          totalTime: processData.metrics?.totalTimeMinutes || null,
          totalCost: processData.metrics?.totalCostRub || null,
          crmFunnels: processData.crmFunnels ? JSON.stringify(processData.crmFunnels) : null,
          requiredDocuments: processData.missingDocuments ? JSON.stringify(processData.missingDocuments) : null,
          salaryData: processData.metrics?.roleWorkload ? JSON.stringify(processData.metrics.roleWorkload) : null,
          status: "draft",
        });

        return { id, process: processData };
      }),
    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        return await getCompanyProcesses(input.companyId);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const process = await getProcessById(input.id);
        if (!process) return null;

        return {
          ...process,
          stages: process.stages ? JSON.parse(process.stages) : [],
          roles: process.roles ? JSON.parse(process.roles) : [],
          steps: process.steps ? JSON.parse(process.steps) : [],
          branches: process.branches ? JSON.parse(process.branches) : [],
          documents: process.documents ? JSON.parse(process.documents) : [],
          itIntegration: process.itIntegration ? JSON.parse(process.itIntegration) : {},
          diagramData: process.diagramData ? JSON.parse(process.diagramData) : null,
          // Новые поля
          stageDetails: (process.stageDetails && process.stageDetails !== 'null') ? JSON.parse(process.stageDetails) : [],
          crmFunnels: (process.crmFunnels && process.crmFunnels !== 'null') ? JSON.parse(process.crmFunnels) : [],
          requiredDocuments: (process.requiredDocuments && process.requiredDocuments !== 'null') ? JSON.parse(process.requiredDocuments) : [],
          salaryData: (process.salaryData && process.salaryData !== 'null') ? JSON.parse(process.salaryData) : [],
        };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "in_review", "approved"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateBusinessProcess(id, data);
        return { success: true };
      }),
  }),

  recommendations: router({
    generate: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .mutation(async ({ input }) => {
        const process = await getProcessById(input.processId);
        if (!process) throw new Error("Process not found");

        const company = await getCompanyById(process.companyId);
        if (!company) throw new Error("Company not found");

        const processData = JSON.stringify({
          title: process.title,
          description: process.description,
          stages: process.stages,
          steps: process.steps,
        });

        const prompt = buildRecommendationsPrompt(processData);

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Ты эксперт по оптимизации бизнес-процессов. Давай конкретные рекомендации в формате JSON." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const content = typeof response.choices[0].message.content === 'string' 
          ? response.choices[0].message.content 
          : JSON.stringify(response.choices[0].message.content);
        
        let recommendations;
        try {
          recommendations = JSON.parse(content);
        } catch (error) {
          console.error("[Recommendations] JSON parse error:", error);
          console.error("[Recommendations] Content:", content.substring(0, 500));
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to parse recommendations. Please try again.',
          });
        }

        // Save recommendations to DB
        const savedRecs = [];
        if (Array.isArray(recommendations.recommendations)) {
          for (const rec of recommendations.recommendations) {
            try {
              const id = await createRecommendation({
                businessProcessId: input.processId,
                category: rec.category || 'optimization',
                priority: rec.priority || 'medium',
                title: rec.title || 'Рекомендация',
                description: rec.description || '',
                toolsSuggested: JSON.stringify(rec.tools || []),
              });
              savedRecs.push({ id, ...rec });
            } catch (error) {
              console.error("[Recommendations] Failed to save recommendation:", error);
            }
          }
        }

        console.log(`[Recommendations] Saved ${savedRecs.length} recommendations for process ${input.processId}`);
        return { recommendations: savedRecs };
      }),
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ input }) => {
        const recs = await getProcessRecommendations(input.processId);
        return recs.map(r => ({
          ...r,
          toolsSuggested: r.toolsSuggested ? JSON.parse(r.toolsSuggested) : [],
        }));
      }),
  }),

  comments: router({
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
  }),

  documents: router({
    upload: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // base64
        mimeType: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Конвертируем base64 в Buffer
        const buffer = Buffer.from(input.fileContent, 'base64');
        const fileSize = buffer.length;
        
        // Генерируем уникальный ключ файла
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `company-${input.companyId}/documents/${timestamp}-${randomSuffix}-${input.fileName}`;
        
        // Загружаем в S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Сохраняем в БД
        await createDocument({
          companyId: input.companyId,
          userId: ctx.user.id,
          fileName: input.fileName,
          fileUrl: url,
          fileKey: fileKey,
          fileSize: fileSize,
          mimeType: input.mimeType,
          description: input.description,
        });
        
        return { url, fileKey };
      }),
    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        return await getDocumentsByCompanyId(input.companyId);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDocument(input.id);
        return { success: true };
      }),
  }),

  drafts: router({
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
  }),
});

export type AppRouter = typeof appRouter;
