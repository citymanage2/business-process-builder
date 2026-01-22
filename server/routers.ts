
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
  deleteBusinessProcess,
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
  getAllUsers,
  updateUserBalance,
  getErrorLogs,
  createErrorLog,
  getUserBalance,
  deductTokens,
  getOrCreateUserSupportChat,
  sendSupportMessage,
  getSupportChatMessages,
  getAllSupportChats,
  markMessagesAsRead,
  getUnreadMessagesCount,
  getAllFaqArticles,
  searchFaqByKeywords,
  createFaqArticle,
  updateFaqArticle,
  deleteFaqArticle,
  getFaqArticleById,
  // Process Builder additions
  createProcessTemplate,
  getPublicTemplates,
  getUserTemplates,
  getTemplateById,
  updateProcessTemplate,
  deleteProcessTemplate,
  incrementTemplateUsage,
  createProcessVersion,
  getProcessVersions,
  getProcessVersion,
  getLatestVersionNumber,
  createProcessPermission,
  getProcessPermissions,
  getUserProcessPermission,
  updateProcessPermission,
  deleteProcessPermission,
  getSharedProcesses,
  createUserCategory,
  getUserCategories,
  updateUserCategory,
  deleteUserCategory,
  createNotification,
  getUserNotifications,
  getUnreadNotificationsCount as getUnreadNotificationsCountDb,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getAllUserProcesses,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { buildProcessPrompt, buildQuestionsPrompt, buildRecommendationsPrompt } from "./prompts";
import { OPERATION_COSTS } from "@shared/costs";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
      .mutation(async ({ ctx, input }) => {
        // Проверяем баланс пользователя перед генерацией
        const currentBalance = await getUserBalance(ctx.user.id);
        const cost = OPERATION_COSTS.GENERATE_PROCESS;

        if (currentBalance < cost) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Недостаточно токенов для генерации процесса. Требуется: ${cost}, доступно: ${currentBalance}`,
          });
        }

        const company = await getCompanyById(input.companyId);
        const interview = await getInterviewById(input.interviewId);

        if (!company || !interview) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Компания или интервью не найдены',
          });
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
          maxTokens: 32768, // Increased to 32K to handle very detailed process definitions
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

        // Списываем токены после успешной генерации
        const deducted = await deductTokens(ctx.user.id, cost);
        if (!deducted) {
          console.error(`[Process Generation] Failed to deduct tokens for user ${ctx.user.id}`);
          // Не бросаем ошибку, так как процесс уже создан
        }

        const newBalance = await getUserBalance(ctx.user.id);
        console.log(`[Process Generation] Process created successfully. User ${ctx.user.id} new balance: ${newBalance}`);

        return { id, process: processData, tokensDeducted: cost, newBalance };
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
        steps: z.array(z.any()).optional(), // Массив шагов процесса
      }))
      .mutation(async ({ input }) => {
        const { id, steps, ...data } = input;
        
        // Если есть steps, сериализуем их в JSON
        if (steps) {
          await updateBusinessProcess(id, {
            ...data,
            steps: JSON.stringify(steps),
          });
        } else {
          await updateBusinessProcess(id, data);
        }
        
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBusinessProcess(input.id);
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

  // Admin router - только для администраторов
  admin: router({
    // Получить метрики пула подключений к БД
    getPoolMetrics: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const { getPoolMetrics } = await import('./db');
        return getPoolMetrics();
      }),

    // Получить список всех пользователей
    getAllUsers: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await getAllUsers();
      }),

    // Обновить баланс пользователя
    updateUserBalance: protectedProcedure
      .input(z.object({
        userId: z.number(),
        newBalance: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const success = await updateUserBalance(input.userId, input.newBalance);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update balance' });
        }
        return { success: true };
      }),

    // Получить логи ошибок
    getErrorLogs: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(100),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await getErrorLogs(input.limit);
      }),
  }),

  // Support chat endpoints
  support: router({
    // Получить или создать чат пользователя
    getOrCreateChat: protectedProcedure
      .query(async ({ ctx }) => {
        const chat = await getOrCreateUserSupportChat(ctx.user.id);
        
        // Если чат только что создан, отправляем приветственное сообщение
        const messages = await getSupportChatMessages(chat.id);
        if (messages.length === 0) {
          await sendSupportMessage(
            chat.id,
            1, // System user ID
            "admin",
            "Здравствуйте! Добро пожаловать в службу поддержки Business Process Builder. Чем мы можем вам помочь?"
          );
        }
        
        return chat;
      }),

    // Получить сообщения чата
    getMessages: protectedProcedure
      .input(z.object({ chatId: z.number() }))
      .query(async ({ input }) => {
        return await getSupportChatMessages(input.chatId);
      }),

    // Отправить сообщение
    sendMessage: protectedProcedure
      .input(z.object({
        chatId: z.number(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const message = await sendSupportMessage(
          input.chatId,
          ctx.user.id,
          "user",
          input.message
        );
        
        // Отправить Socket.IO событие о новом сообщении
        const io = ctx.req.app?.locals?.io;
        if (io) {
          io.to(`chat_${input.chatId}`).emit("new_message", message);
        }
        
        // Отправить уведомление администратору
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `Новое сообщение в чате поддержки от ${ctx.user.name || 'пользователя'}`,
          content: `Пользователь: ${ctx.user.name || 'Неизвестно'} (${ctx.user.email || 'нет email'})\n\nСообщение: ${input.message}\n\nОтветьте в админ-панели: /admin/support`,
        }).catch(err => {
          console.error('[Support] Failed to send notification:', err);
        });
        
        return { success: true };
      }),

    // Отметить сообщения как прочитанные
    markAsRead: protectedProcedure
      .input(z.object({ chatId: z.number() }))
      .mutation(async ({ input }) => {
        await markMessagesAsRead(input.chatId, "user");
        return { success: true };
      }),

    // Получить количество непрочитанных сообщений
    getUnreadCount: protectedProcedure
      .input(z.object({ chatId: z.number() }))
      .query(async ({ input }) => {
        return await getUnreadMessagesCount(input.chatId, "user");
      }),

    // Админ: получить все чаты
    getAllChats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await getAllSupportChats();
      }),

    // Админ: отправить ответ
    adminSendMessage: protectedProcedure
      .input(z.object({
        chatId: z.number(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await sendSupportMessage(
          input.chatId,
          ctx.user.id,
          "admin",
          input.message
        );
        return { success: true };
      }),

    // Админ: отметить сообщения как прочитанные
    adminMarkAsRead: protectedProcedure
      .input(z.object({ chatId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await markMessagesAsRead(input.chatId, "admin");
        return { success: true };
      }),
  }),

  // FAQ (База знаний)
  faq: router({
    // Получить все опубликованные статьи FAQ
    getAll: publicProcedure
      .query(async () => {
        return await getAllFaqArticles();
      }),

    // Поиск по ключевым словам
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await searchFaqByKeywords(input.query);
      }),

    // Получить статью по ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getFaqArticleById(input.id);
      }),

    // Админ: создать статью
    create: protectedProcedure
      .input(z.object({
        question: z.string(),
        answer: z.string(),
        keywords: z.string(),
        category: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const id = await createFaqArticle(input);
        return { id };
      }),

    // Админ: обновить статью
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        question: z.string().optional(),
        answer: z.string().optional(),
        keywords: z.string().optional(),
        category: z.string().optional(),
        order: z.number().optional(),
        isPublished: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const { id, ...data } = input;
        await updateFaqArticle(id, data);
        return { success: true };
      }),

    // Админ: удалить статью
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        await deleteFaqArticle(input.id);
        return { success: true };
      }),
  }),

  // Process Templates
  templates: router({
    // Get all public and built-in templates
    getPublic: publicProcedure.query(async () => {
      return await getPublicTemplates();
    }),

    // Get user's own templates
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return await getUserTemplates(ctx.user.id);
    }),

    // Get template by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getTemplateById(input.id);
      }),

    // Create new template
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
        diagramData: z.string(),
        isPublic: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createProcessTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          category: input.category,
          tags: input.tags,
          diagramData: input.diagramData,
          isPublic: input.isPublic || 0,
        });
        return { id };
      }),

    // Update template
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
        diagramData: z.string().optional(),
        isPublic: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const template = await getTemplateById(input.id);
        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to update this template' });
        }
        const { id, ...data } = input;
        await updateProcessTemplate(id, data);
        return { success: true };
      }),

    // Delete template
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const template = await getTemplateById(input.id);
        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to delete this template' });
        }
        await deleteProcessTemplate(input.id);
        return { success: true };
      }),

    // Record template usage
    recordUsage: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await incrementTemplateUsage(input.id);
        return { success: true };
      }),
  }),

  // Process Versions
  versions: router({
    // Get all versions for a process
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ input }) => {
        return await getProcessVersions(input.processId);
      }),

    // Get specific version
    get: protectedProcedure
      .input(z.object({ processId: z.number(), version: z.number() }))
      .query(async ({ input }) => {
        return await getProcessVersion(input.processId, input.version);
      }),

    // Create new version (snapshot)
    create: protectedProcedure
      .input(z.object({
        processId: z.number(),
        snapshotData: z.string(),
        changeDescription: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const latestVersion = await getLatestVersionNumber(input.processId);
        const id = await createProcessVersion({
          processId: input.processId,
          version: latestVersion + 1,
          snapshotData: input.snapshotData,
          changeDescription: input.changeDescription,
          createdBy: ctx.user.id,
        });
        return { id, version: latestVersion + 1 };
      }),

    // Revert to a specific version
    revert: protectedProcedure
      .input(z.object({ processId: z.number(), version: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const versionData = await getProcessVersion(input.processId, input.version);
        if (!versionData) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
        }
        
        // Create a new version with the old data
        const latestVersion = await getLatestVersionNumber(input.processId);
        await createProcessVersion({
          processId: input.processId,
          version: latestVersion + 1,
          snapshotData: versionData.snapshotData,
          changeDescription: `Reverted to version ${input.version}`,
          createdBy: ctx.user.id,
        });
        
        // Update the process with the old data
        const snapshot = JSON.parse(versionData.snapshotData);
        await updateBusinessProcess(input.processId, {
          diagramData: versionData.snapshotData,
          title: snapshot.title,
          description: snapshot.description,
        });
        
        return { success: true };
      }),
  }),

  // Process Permissions (Collaboration)
  permissions: router({
    // Get permissions for a process
    list: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ input }) => {
        return await getProcessPermissions(input.processId);
      }),

    // Add permission
    add: protectedProcedure
      .input(z.object({
        processId: z.number(),
        userId: z.number(),
        permissionLevel: z.enum(['editor', 'viewer', 'commenter']),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user has permission to add permissions
        const existingPerm = await getUserProcessPermission(input.processId, ctx.user.id);
        if (!existingPerm || existingPerm.permissionLevel !== 'owner') {
          // Check if process belongs to user's company
          const process = await getProcessById(input.processId);
          if (!process) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
          }
          const company = await getCompanyById(process.companyId);
          if (!company || company.userId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
          }
        }
        
        const id = await createProcessPermission({
          processId: input.processId,
          userId: input.userId,
          permissionLevel: input.permissionLevel,
          invitedBy: ctx.user.id,
        });
        
        // Create notification for the invited user
        await createNotification({
          userId: input.userId,
          type: 'invite',
          title: 'Приглашение к совместной работе',
          content: `Вас пригласили работать над процессом`,
          relatedProcessId: input.processId,
        });
        
        return { id };
      }),

    // Update permission level
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        permissionLevel: z.enum(['editor', 'viewer', 'commenter']),
      }))
      .mutation(async ({ input }) => {
        await updateProcessPermission(input.id, input.permissionLevel);
        return { success: true };
      }),

    // Remove permission
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProcessPermission(input.id);
        return { success: true };
      }),

    // Get processes shared with user
    sharedWithMe: protectedProcedure.query(async ({ ctx }) => {
      return await getSharedProcesses(ctx.user.id);
    }),
  }),

  // User Categories
  categories: router({
    // Get user's categories
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserCategories(ctx.user.id);
    }),

    // Create category
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        parentId: z.number().optional(),
        color: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createUserCategory({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),

    // Update category
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        parentId: z.number().optional(),
        color: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateUserCategory(id, data);
        return { success: true };
      }),

    // Delete category
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteUserCategory(input.id);
        return { success: true };
      }),
  }),

  // Notifications
  notifications: router({
    // Get user's notifications
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await getUserNotifications(ctx.user.id, input.limit || 50);
      }),

    // Get unread count
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await getUnreadNotificationsCountDb(ctx.user.id);
    }),

    // Mark as read
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationAsRead(input.id);
        return { success: true };
      }),

    // Mark all as read
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),

    // Delete notification
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteNotification(input.id);
        return { success: true };
      }),
  }),

  // Extended process operations
  processBuilder: router({
    // Get all user's processes across all companies
    getAllMy: protectedProcedure.query(async ({ ctx }) => {
      const processes = await getAllUserProcesses(ctx.user.id);
      return processes.map(p => ({
        ...p,
        stages: p.stages ? JSON.parse(p.stages) : [],
        roles: p.roles ? JSON.parse(p.roles) : [],
        steps: p.steps ? JSON.parse(p.steps) : [],
        diagramData: p.diagramData ? JSON.parse(p.diagramData) : null,
      }));
    }),

    // Create new process from builder
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        diagramData: z.string(),
        category: z.string().optional(),
        tags: z.string().optional(),
        visibility: z.enum(['private', 'public']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify company belongs to user
        const company = await getCompanyById(input.companyId);
        if (!company || company.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to create process in this company' });
        }

        // Parse diagram data to extract process info
        let diagramObj;
        try {
          diagramObj = JSON.parse(input.diagramData);
        } catch (e) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid diagram data' });
        }

        const id = await createBusinessProcess({
          companyId: input.companyId,
          title: input.title,
          description: input.description,
          diagramData: input.diagramData,
          stages: diagramObj.stages ? JSON.stringify(diagramObj.stages) : null,
          roles: diagramObj.roles ? JSON.stringify(diagramObj.roles) : null,
          steps: JSON.stringify(diagramObj.blocks || []),
          branches: diagramObj.connections ? JSON.stringify(diagramObj.connections) : null,
          status: 'draft',
        });

        // Create initial version
        await createProcessVersion({
          processId: id,
          version: 1,
          snapshotData: input.diagramData,
          changeDescription: 'Initial version',
          createdBy: ctx.user.id,
        });

        return { id };
      }),

    // Save process with version control
    saveWithVersion: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        diagramData: z.string(),
        changeDescription: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const process = await getProcessById(input.id);
        if (!process) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
        }

        // Parse diagram data
        let diagramObj;
        try {
          diagramObj = JSON.parse(input.diagramData);
        } catch (e) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid diagram data' });
        }

        // Update process
        await updateBusinessProcess(input.id, {
          title: input.title,
          description: input.description,
          diagramData: input.diagramData,
          stages: diagramObj.stages ? JSON.stringify(diagramObj.stages) : null,
          roles: diagramObj.roles ? JSON.stringify(diagramObj.roles) : null,
          steps: JSON.stringify(diagramObj.blocks || []),
          branches: diagramObj.connections ? JSON.stringify(diagramObj.connections) : null,
        });

        // Create new version
        const latestVersion = await getLatestVersionNumber(input.id);
        await createProcessVersion({
          processId: input.id,
          version: latestVersion + 1,
          snapshotData: input.diagramData,
          changeDescription: input.changeDescription || `Saved at ${new Date().toLocaleString()}`,
          createdBy: ctx.user.id,
        });

        return { success: true, version: latestVersion + 1 };
      }),

    // Duplicate process
    duplicate: protectedProcedure
      .input(z.object({
        id: z.number(),
        newTitle: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const original = await getProcessById(input.id);
        if (!original) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found' });
        }

        // Verify user has access (owner or editor)
        const company = await getCompanyById(original.companyId);
        if (!company || company.userId !== ctx.user.id) {
          const permission = await getUserProcessPermission(input.id, ctx.user.id);
          if (!permission || permission.permissionLevel === 'viewer') {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to duplicate this process' });
          }
        }

        // Create duplicate
        const newTitle = input.newTitle || `${original.title} (копия)`;
        const id = await createBusinessProcess({
          ...original,
          id: undefined,
          title: newTitle,
          status: 'draft',
          createdAt: undefined,
          updatedAt: undefined,
        });

        // Create initial version for duplicate
        if (original.diagramData) {
          await createProcessVersion({
            processId: id,
            version: 1,
            snapshotData: original.diagramData,
            changeDescription: `Duplicated from "${original.title}"`,
            createdBy: ctx.user.id,
          });
        }

        return { id };
      }),

    // Save as template
    saveAsTemplate: protectedProcedure
      .input(z.object({
        processId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const process = await getProcessById(input.processId);
        if (!process || !process.diagramData) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Process not found or has no diagram data' });
        }

        const id = await createProcessTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          category: input.category,
          diagramData: process.diagramData,
          isPublic: input.isPublic ? 1 : 0,
        });

        return { id };
      }),
  }),
});

export type AppRouter = typeof appRouter;
