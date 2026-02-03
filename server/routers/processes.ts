import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createBusinessProcess,
  getCompanyProcesses,
  getProcessById,
  updateBusinessProcess,
  deleteBusinessProcess,
  getCompanyById,
  getInterviewById,
  getUserBalance,
  deductTokens,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { OPERATION_COSTS } from "@shared/costs";
import { buildProcessPrompt } from "../prompts";

export const processesRouter = router({
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
  applyChanges: protectedProcedure
    .input(z.object({
      id: z.number(),
      changeDescription: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Получаем текущий процесс
      const process = await getProcessById(input.id);
      if (!process) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Процесс не найден',
        });
      }

      // Проверяем баланс пользователя
      const currentBalance = await getUserBalance(ctx.user.id);
      const cost = OPERATION_COSTS.GENERATE_PROCESS; // Используем ту же стоимость

      if (currentBalance < cost) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Недостаточно токенов для применения изменений. Требуется: ${cost}, доступно: ${currentBalance}`,
        });
      }

      // Формируем промпт для LLM
      const currentData = {
        title: process.title,
        description: process.description,
        startEvent: process.startEvent,
        endEvent: process.endEvent,
        stages: process.stages ? JSON.parse(process.stages) : [],
        roles: process.roles ? JSON.parse(process.roles) : [],
        steps: process.steps ? JSON.parse(process.steps) : [],
        branches: process.branches ? JSON.parse(process.branches) : [],
        documents: process.documents ? JSON.parse(process.documents) : [],
        itIntegration: process.itIntegration ? JSON.parse(process.itIntegration) : {},
      };

      const prompt = `Ты эксперт по бизнес-процессам. У тебя есть текущая структура процесса в JSON формате.

Текущая структура процесса:
${JSON.stringify(currentData, null, 2)}

Пользователь хочет внести следующие изменения:
"${input.changeDescription}"

Примени эти изменения к структуре процесса и верни ПОЛНУЮ обновленную структуру в JSON формате.
Сохрани все существующие поля и добавь/измени/удали только то, что указано в описании изменений.
Ответ должен содержать ВСЕ поля: title, description, startEvent, endEvent, stages, roles, steps, branches, documents, itIntegration.

Важно:
- Сохраняй существующие ID для ролей, этапов и шагов
- Если добавляешь новые элементы, генерируй для них уникальные ID (строки)
- Все ID должны быть строками
- Сохраняй порядок (order) элементов
- Если перемещаешь блок, измени его roleId и stageId на соответствующие ID из структуры`;

      let response;
      try {
        response = await invokeLLM({
          messages: [
            { role: "system", content: "Ты эксперт по бизнес-процессам. Применяешь изменения к структуре процессов в формате JSON." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 16384,
        });
      } catch (error) {
        console.error("[Apply Changes] LLM invocation error:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ошибка при обращении к AI-ассистенту. Попробуйте еще раз.',
        });
      }

      const content = typeof response.choices[0].message.content === 'string' 
        ? response.choices[0].message.content 
        : JSON.stringify(response.choices[0].message.content);
      
      let updatedData;
      try {
        updatedData = JSON.parse(content);
        
        // Проверяем наличие обязательных полей
        if (!updatedData.title || !updatedData.stages || !updatedData.roles || !updatedData.steps) {
          console.error("[Apply Changes] Missing required fields in LLM response");
          throw new Error("Отсутствуют обязательные поля");
        }
      } catch (error) {
        console.error("[Apply Changes] JSON parse error:", error);
        console.error("[Apply Changes] LLM response content:", content);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось обработать изменения. Попробуйте еще раз.',
        });
      }

      // Обновляем процесс в БД
      await updateBusinessProcess(input.id, {
        title: updatedData.title,
        description: updatedData.description,
        startEvent: updatedData.startEvent,
        endEvent: updatedData.endEvent,
        stages: JSON.stringify(updatedData.stages),
        roles: JSON.stringify(updatedData.roles),
        steps: JSON.stringify(updatedData.steps),
        branches: JSON.stringify(updatedData.branches),
        documents: JSON.stringify(updatedData.documents),
        itIntegration: JSON.stringify(updatedData.itIntegration),
      });

      // Списываем токены
      await deductTokens(ctx.user.id, cost);

      return {
        success: true,
        updatedProcess: updatedData,
      };
    }),
});
