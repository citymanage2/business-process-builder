import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { changeRequests, processVersions, businessProcesses } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// Типы для изменений
interface ProposedChange {
  type: "add" | "modify" | "delete" | "reorder";
  stepId?: string;
  stepName?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  description: string;
}

interface ProposedChanges {
  changes: ProposedChange[];
  newSteps?: string; // JSON строка с новыми шагами
  newRoles?: string;
  newStages?: string;
  summary: string;
}

export const changeRequestsRouter = router({
  // Создать запрос на изменение
  create: protectedProcedure
    .input(z.object({
      businessProcessId: z.number(),
      requestText: z.string().min(10, "Опишите изменения подробнее (минимум 10 символов)"),
      requestType: z.enum(["add_step", "modify_step", "delete_step", "change_flow", "optimize"]).optional(),
      targetStepId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Проверяем существование процесса
      const process = await db.select().from(businessProcesses)
        .where(eq(businessProcesses.id, input.businessProcessId))
        .limit(1);
      
      if (process.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Бизнес-процесс не найден" });
      }

      // Создаём запрос
      const [newRequest] = await db.insert(changeRequests).values({
        businessProcessId: input.businessProcessId,
        userId: ctx.user.id,
        requestText: input.requestText,
        requestType: input.requestType || "modify_step",
        targetStepId: input.targetStepId,
        status: "pending",
        progress: 0,
        progressMessage: "Запрос создан, ожидает обработки",
      }).returning();

      // Запускаем асинхронную обработку
      processChangeRequest(newRequest.id).catch(console.error);

      return newRequest;
    }),

  // Получить список запросов для процесса
  list: protectedProcedure
    .input(z.object({
      businessProcessId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const requests = await db.select()
        .from(changeRequests)
        .where(eq(changeRequests.businessProcessId, input.businessProcessId))
        .orderBy(desc(changeRequests.createdAt));

      return requests;
    }),

  // Получить статус запроса
  getStatus: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [request] = await db.select()
        .from(changeRequests)
        .where(eq(changeRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Запрос не найден" });
      }

      return request;
    }),

  // Получить предпросмотр изменений
  getPreview: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [request] = await db.select()
        .from(changeRequests)
        .where(eq(changeRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Запрос не найден" });
      }

      if (request.status !== "preview") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Изменения ещё не готовы к предпросмотру" });
      }

      // Получаем текущий процесс
      const [process] = await db.select()
        .from(businessProcesses)
        .where(eq(businessProcesses.id, request.businessProcessId))
        .limit(1);

      const proposedChanges = request.proposedChanges ? JSON.parse(request.proposedChanges) as ProposedChanges : null;

      return {
        request,
        currentProcess: process,
        proposedChanges,
        summary: request.changesSummary,
      };
    }),

  // Применить изменения
  applyChanges: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [request] = await db.select()
        .from(changeRequests)
        .where(eq(changeRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Запрос не найден" });
      }

      if (request.status !== "preview") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Изменения не готовы к применению" });
      }

      // Получаем текущий процесс
      const [process] = await db.select()
        .from(businessProcesses)
        .where(eq(businessProcesses.id, request.businessProcessId))
        .limit(1);

      // Сохраняем текущую версию перед изменениями
      const [previousVersion] = await db.insert(processVersions).values({
        businessProcessId: process.id,
        versionNumber: process.version,
        title: process.title,
        description: process.description,
        stages: process.stages,
        roles: process.roles,
        steps: process.steps,
        branches: process.branches,
        documents: process.documents,
        itIntegration: process.itIntegration,
        diagramData: process.diagramData,
        stageDetails: process.stageDetails,
        totalTime: process.totalTime,
        totalCost: process.totalCost,
        changeRequestId: null,
        changeSummary: "Версия до изменений",
        createdById: ctx.user.id,
        isActive: 0,
      }).returning();

      // Применяем изменения
      const proposedChanges = request.proposedChanges ? JSON.parse(request.proposedChanges) as ProposedChanges : null;
      
      if (proposedChanges) {
        await db.update(businessProcesses)
          .set({
            steps: proposedChanges.newSteps || process.steps,
            roles: proposedChanges.newRoles || process.roles,
            stages: proposedChanges.newStages || process.stages,
            version: process.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(businessProcesses.id, process.id));
      }

      // Создаём новую версию
      const [newVersion] = await db.insert(processVersions).values({
        businessProcessId: process.id,
        versionNumber: process.version + 1,
        title: process.title,
        description: process.description,
        stages: proposedChanges?.newStages || process.stages,
        roles: proposedChanges?.newRoles || process.roles,
        steps: proposedChanges?.newSteps || process.steps,
        branches: process.branches,
        documents: process.documents,
        itIntegration: process.itIntegration,
        diagramData: process.diagramData,
        stageDetails: process.stageDetails,
        totalTime: process.totalTime,
        totalCost: process.totalCost,
        changeRequestId: request.id,
        changeSummary: request.changesSummary,
        createdById: ctx.user.id,
        isActive: 1,
      }).returning();

      // Обновляем статус запроса
      await db.update(changeRequests)
        .set({
          status: "applied",
          previousVersionId: previousVersion.id,
          newVersionId: newVersion.id,
          appliedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(changeRequests.id, request.id));

      return { success: true, newVersion };
    }),

  // Отклонить изменения
  reject: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(changeRequests)
        .set({
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(eq(changeRequests.id, input.requestId));

      return { success: true };
    }),

  // Откатить изменения
  rollback: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [request] = await db.select()
        .from(changeRequests)
        .where(eq(changeRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Запрос не найден" });
      }

      if (request.status !== "applied") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Можно откатить только применённые изменения" });
      }

      if (!request.previousVersionId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Нет предыдущей версии для отката" });
      }

      // Получаем предыдущую версию
      const [previousVersion] = await db.select()
        .from(processVersions)
        .where(eq(processVersions.id, request.previousVersionId))
        .limit(1);

      if (!previousVersion) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Предыдущая версия не найдена" });
      }

      // Восстанавливаем предыдущую версию
      await db.update(businessProcesses)
        .set({
          title: previousVersion.title,
          description: previousVersion.description,
          stages: previousVersion.stages,
          roles: previousVersion.roles,
          steps: previousVersion.steps,
          branches: previousVersion.branches,
          documents: previousVersion.documents,
          itIntegration: previousVersion.itIntegration,
          diagramData: previousVersion.diagramData,
          stageDetails: previousVersion.stageDetails,
          totalTime: previousVersion.totalTime,
          totalCost: previousVersion.totalCost,
          version: previousVersion.versionNumber,
          updatedAt: new Date(),
        })
        .where(eq(businessProcesses.id, request.businessProcessId));

      // Обновляем статус запроса
      await db.update(changeRequests)
        .set({
          status: "rolled_back",
          rolledBackAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(changeRequests.id, request.id));

      return { success: true };
    }),

  // Получить историю версий
  getVersionHistory: protectedProcedure
    .input(z.object({
      businessProcessId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const versions = await db.select()
        .from(processVersions)
        .where(eq(processVersions.businessProcessId, input.businessProcessId))
        .orderBy(desc(processVersions.versionNumber));

      return versions;
    }),

  // Откатить к конкретной версии
  rollbackToVersion: protectedProcedure
    .input(z.object({
      businessProcessId: z.number(),
      versionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Получаем версию для отката
      const [targetVersion] = await db.select()
        .from(processVersions)
        .where(and(
          eq(processVersions.id, input.versionId),
          eq(processVersions.businessProcessId, input.businessProcessId)
        ))
        .limit(1);

      if (!targetVersion) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Версия не найдена" });
      }

      // Получаем текущий процесс для сохранения
      const [currentProcess] = await db.select()
        .from(businessProcesses)
        .where(eq(businessProcesses.id, input.businessProcessId))
        .limit(1);

      // Сохраняем текущую версию перед откатом
      await db.insert(processVersions).values({
        businessProcessId: currentProcess.id,
        versionNumber: currentProcess.version,
        title: currentProcess.title,
        description: currentProcess.description,
        stages: currentProcess.stages,
        roles: currentProcess.roles,
        steps: currentProcess.steps,
        branches: currentProcess.branches,
        documents: currentProcess.documents,
        itIntegration: currentProcess.itIntegration,
        diagramData: currentProcess.diagramData,
        stageDetails: currentProcess.stageDetails,
        totalTime: currentProcess.totalTime,
        totalCost: currentProcess.totalCost,
        changeSummary: "Автосохранение перед откатом",
        createdById: ctx.user.id,
        isActive: 0,
      });

      // Восстанавливаем выбранную версию
      await db.update(businessProcesses)
        .set({
          title: targetVersion.title,
          description: targetVersion.description,
          stages: targetVersion.stages,
          roles: targetVersion.roles,
          steps: targetVersion.steps,
          branches: targetVersion.branches,
          documents: targetVersion.documents,
          itIntegration: targetVersion.itIntegration,
          diagramData: targetVersion.diagramData,
          stageDetails: targetVersion.stageDetails,
          totalTime: targetVersion.totalTime,
          totalCost: targetVersion.totalCost,
          version: currentProcess.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(businessProcesses.id, input.businessProcessId));

      return { success: true };
    }),
});

// Асинхронная обработка запроса изменений через AI
async function processChangeRequest(requestId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // Обновляем статус на "processing"
    await db.update(changeRequests)
      .set({
        status: "processing",
        progress: 10,
        progressMessage: "Анализ текущего процесса...",
        updatedAt: new Date(),
      })
      .where(eq(changeRequests.id, requestId));

    // Получаем запрос и процесс
    const [request] = await db.select()
      .from(changeRequests)
      .where(eq(changeRequests.id, requestId))
      .limit(1);

    const [process] = await db.select()
      .from(businessProcesses)
      .where(eq(businessProcesses.id, request.businessProcessId))
      .limit(1);

    // Обновляем прогресс
    await db.update(changeRequests)
      .set({
        progress: 30,
        progressMessage: "Генерация изменений...",
        updatedAt: new Date(),
      })
      .where(eq(changeRequests.id, requestId));

    // Вызываем AI для генерации изменений
    const prompt = `Ты - эксперт по оптимизации бизнес-процессов. 
    
Текущий бизнес-процесс:
Название: ${process.title}
Описание: ${process.description}
Этапы: ${process.stages}
Роли: ${process.roles}
Шаги: ${process.steps}

Запрос пользователя на изменение:
"${request.requestText}"

Тип изменения: ${request.requestType}
${request.targetStepId ? `Целевой шаг: ${request.targetStepId}` : ""}

Проанализируй запрос и предложи конкретные изменения в формате JSON:
{
  "changes": [
    {
      "type": "add|modify|delete|reorder",
      "stepId": "id шага (если применимо)",
      "stepName": "название шага",
      "description": "описание изменения"
    }
  ],
  "newSteps": "обновлённый JSON массив шагов (если есть изменения в шагах)",
  "summary": "краткое описание всех изменений для пользователя на русском языке"
}

Верни только JSON без дополнительного текста.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Ты - эксперт по бизнес-процессам. Отвечай только валидным JSON." },
        { role: "user", content: prompt },
      ],
    });

    // Обновляем прогресс
    await db.update(changeRequests)
      .set({
        progress: 70,
        progressMessage: "Формирование предпросмотра...",
        updatedAt: new Date(),
      })
      .where(eq(changeRequests.id, requestId));

    // Парсим ответ AI
    let proposedChanges: ProposedChanges;
    try {
      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
      // Извлекаем JSON из ответа
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      proposedChanges = jsonMatch ? JSON.parse(jsonMatch[0]) : { changes: [], summary: "Не удалось сгенерировать изменения" };
    } catch {
      proposedChanges = { changes: [], summary: "Ошибка при обработке ответа AI" };
    }

    // Сохраняем результат
    await db.update(changeRequests)
      .set({
        status: "preview",
        progress: 100,
        progressMessage: "Изменения готовы к просмотру",
        proposedChanges: JSON.stringify(proposedChanges),
        changesSummary: proposedChanges.summary,
        updatedAt: new Date(),
      })
      .where(eq(changeRequests.id, requestId));

  } catch (error) {
    console.error("Error processing change request:", error);
    await db.update(changeRequests)
      .set({
        status: "rejected",
        progress: 0,
        progressMessage: "Ошибка при обработке запроса",
        updatedAt: new Date(),
      })
      .where(eq(changeRequests.id, requestId));
  }
}
