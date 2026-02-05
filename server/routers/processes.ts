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
import { generateBPMNFromDbProcess } from "../bpmnGenerator";

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
        // Генерируем BPMN XML сразу при создании
        bpmnXml: null, // Будет сгенерировано после создания
        // Новые поля
        stageDetails: processData.stageDetails ? JSON.stringify(processData.stageDetails) : null,
        totalTime: processData.metrics?.totalTimeMinutes || null,
        totalCost: processData.metrics?.totalCostRub || null,
        crmFunnels: processData.crmFunnels ? JSON.stringify(processData.crmFunnels) : null,
        requiredDocuments: processData.missingDocuments ? JSON.stringify(processData.missingDocuments) : null,
        salaryData: processData.metrics?.roleWorkload ? JSON.stringify(processData.metrics.roleWorkload) : null,
        status: "draft",
      });

      // Генерируем BPMN XML и сохраняем
      const bpmnXml = generateBPMNFromDbProcess({
        id,
        title: processData.title,
        roles: JSON.stringify(processData.roles),
        stages: JSON.stringify(processData.stages),
        steps: JSON.stringify(processData.steps),
      });
      
      await updateBusinessProcess(id, { bpmnXml });

      // Списываем токены после успешной генерации
      const deducted = await deductTokens(ctx.user.id, cost);
      if (!deducted) {
        console.error(`[Process Generation] Failed to deduct tokens for user ${ctx.user.id}`);
        // Не бросаем ошибку, так как процесс уже создан
      }

      const newBalance = await getUserBalance(ctx.user.id);
      console.log(`[Process Generation] Process created successfully. User ${ctx.user.id} new balance: ${newBalance}`);

      return { id, process: processData, bpmnXml, tokensDeducted: cost, newBalance };
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
        // BPMN XML
        bpmnXml: process.bpmnXml || null,
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
  previewChanges: protectedProcedure
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

      // Возвращаем preview без сохранения в БД
      return {
        success: true,
        currentData,
        updatedData,
        cost, // Передаем стоимость для подтверждения
      };
    }),
  confirmChanges: protectedProcedure
    .input(z.object({
      id: z.number(),
      updatedData: z.any(),
      cost: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Проверяем баланс перед подтверждением
      const currentBalance = await getUserBalance(ctx.user.id);
      if (currentBalance < input.cost) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Недостаточно токенов. Требуется: ${input.cost}, доступно: ${currentBalance}`,
        });
      }

      // Обновляем процесс в БД
      await updateBusinessProcess(input.id, {
        title: input.updatedData.title,
        description: input.updatedData.description,
        startEvent: input.updatedData.startEvent,
        endEvent: input.updatedData.endEvent,
        stages: JSON.stringify(input.updatedData.stages),
        roles: JSON.stringify(input.updatedData.roles),
        steps: JSON.stringify(input.updatedData.steps),
        branches: JSON.stringify(input.updatedData.branches),
        documents: JSON.stringify(input.updatedData.documents),
        itIntegration: JSON.stringify(input.updatedData.itIntegration),
      });

      // Списываем токены
      await deductTokens(ctx.user.id, input.cost);

      return {
        success: true,
      };
    }),

  // Регенерация процесса на основе исходной анкеты
  regenerate: protectedProcedure
    .input(z.object({
      id: z.number(),
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

      // Проверяем наличие interviewId
      if (!process.interviewId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Невозможно регенерировать: отсутствует связанная анкета',
        });
      }

      // Проверяем баланс пользователя
      const currentBalance = await getUserBalance(ctx.user.id);
      const cost = OPERATION_COSTS.GENERATE_PROCESS;

      if (currentBalance < cost) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Недостаточно токенов для регенерации. Требуется: ${cost}, доступно: ${currentBalance}`,
        });
      }

      // Получаем данные компании и анкеты
      const company = await getCompanyById(process.companyId);
      const interview = await getInterviewById(process.interviewId);

      if (!company || !interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Компания или анкета не найдены',
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

      // Обрабатываем данные анкеты
      let interviewData = "";
      
      if (interview.answers) {
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
        interviewData = interview.structuredData || interview.transcript || "Нет данных";
      }

      const prompt = buildProcessPrompt(context, interviewData);

      console.log(`[Process Regenerate] Starting regeneration for process ${input.id}`);

      let response;
      try {
        response = await invokeLLM({
          messages: [
            { role: "system", content: "Ты эксперт по бизнес-процессам. Создавай детальные структурированные процессы в формате JSON." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          maxTokens: 32768,
        });
      } catch (error) {
        console.error("[Process Regenerate] LLM invocation error:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ошибка при обращении к AI-ассистенту. Попробуйте еще раз.',
        });
      }

      const content = typeof response.choices[0].message.content === 'string' 
        ? response.choices[0].message.content 
        : JSON.stringify(response.choices[0].message.content);
      
      let processData;
      try {
        processData = JSON.parse(content);
      } catch (error) {
        console.error("[Process Regenerate] JSON parse error:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось обработать ответ AI. Попробуйте еще раз.',
        });
      }

      // Проверяем обязательные поля
      if (!processData.title || !processData.stages || !processData.roles || !processData.steps) {
        console.error("[Process Regenerate] Missing required fields:", Object.keys(processData));
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Некорректная структура процесса. Попробуйте еще раз.',
        });
      }

      // Обновляем процесс в БД
      await updateBusinessProcess(input.id, {
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
        stageDetails: processData.stageDetails ? JSON.stringify(processData.stageDetails) : null,
        totalTime: processData.metrics?.totalTimeMinutes || null,
        totalCost: processData.metrics?.totalCostRub || null,
        crmFunnels: processData.crmFunnels ? JSON.stringify(processData.crmFunnels) : null,
        requiredDocuments: processData.missingDocuments ? JSON.stringify(processData.missingDocuments) : null,
        salaryData: processData.metrics?.roleWorkload ? JSON.stringify(processData.metrics.roleWorkload) : null,
      });

      // Списываем токены
      const deducted = await deductTokens(ctx.user.id, cost);
      if (!deducted) {
        console.error(`[Process Regenerate] Failed to deduct tokens for user ${ctx.user.id}`);
      }

      const newBalance = await getUserBalance(ctx.user.id);
      console.log(`[Process Regenerate] Process regenerated successfully. User ${ctx.user.id} new balance: ${newBalance}`);

      return {
        success: true,
        process: processData,
        tokensDeducted: cost,
        newBalance,
      };
    }),

  // Обновление отдельного блока (шага) процесса
  updateStep: protectedProcedure
    .input(z.object({
      processId: z.number(),
      step: z.object({
        id: z.string(),
        stageId: z.string(),
        roleId: z.string(),
        type: z.enum(["Start", "Action", "Product", "Decision", "Split", "End"]),
        name: z.string(),
        description: z.string().optional(),
        order: z.number(),
        parameters: z.array(z.object({
          type: z.enum(["time", "document", "database", "stage"]),
          value: z.string(),
        })).optional(),
        checklist: z.array(z.string()).optional(),
        previousSteps: z.array(z.string()).optional(),
        nextSteps: z.array(z.string()).optional(),
        branches: z.array(z.object({
          condition: z.string().optional(),
          targetStepId: z.string(),
        })).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Получаем текущий процесс
      const process = await getProcessById(input.processId);
      if (!process) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Процесс не найден',
        });
      }

      // Парсим текущие шаги
      let steps: any[] = [];
      try {
        steps = process.steps ? JSON.parse(process.steps) : [];
      } catch (e) {
        console.error("Failed to parse steps", e);
        steps = [];
      }

      // Находим и обновляем шаг
      const stepIndex = steps.findIndex((s: any) => s.id === input.step.id);
      if (stepIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Блок не найден в процессе',
        });
      }

      // Обновляем шаг
      steps[stepIndex] = input.step;

      // Сохраняем обновленные шаги
      await updateBusinessProcess(input.processId, {
        steps: JSON.stringify(steps),
      });

      console.log(`[Process] Step ${input.step.id} updated in process ${input.processId}`);

      return {
        success: true,
        step: input.step,
      };
    }),

  // Удаление блока (шага) из процесса
  deleteStep: protectedProcedure
    .input(z.object({
      processId: z.number(),
      stepId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Получаем текущий процесс
      const process = await getProcessById(input.processId);
      if (!process) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Процесс не найден',
        });
      }

      // Парсим текущие шаги
      let steps: any[] = [];
      try {
        steps = process.steps ? JSON.parse(process.steps) : [];
      } catch (e) {
        console.error("Failed to parse steps", e);
        steps = [];
      }

      // Удаляем шаг
      const filteredSteps = steps.filter((s: any) => s.id !== input.stepId);
      
      if (filteredSteps.length === steps.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Блок не найден в процессе',
        });
      }

      // Удаляем ссылки на удаленный шаг из других шагов
      const cleanedSteps = filteredSteps.map((step: any) => ({
        ...step,
        previousSteps: step.previousSteps?.filter((id: string) => id !== input.stepId),
        nextSteps: step.nextSteps?.filter((id: string) => id !== input.stepId),
        branches: step.branches?.filter((b: any) => b.targetStepId !== input.stepId),
      }));

      // Сохраняем обновленные шаги
      await updateBusinessProcess(input.processId, {
        steps: JSON.stringify(cleanedSteps),
      });

      console.log(`[Process] Step ${input.stepId} deleted from process ${input.processId}`);

      return {
        success: true,
      };
    }),

  // Сохранение BPMN XML
  saveBpmnXml: protectedProcedure
    .input(z.object({
      processId: z.number(),
      bpmnXml: z.string(),
    }))
    .mutation(async ({ input }) => {
      const process = await getProcessById(input.processId);
      if (!process) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Процесс не найден',
        });
      }

      await updateBusinessProcess(input.processId, {
        bpmnXml: input.bpmnXml,
      });

      console.log(`[Process] BPMN XML saved for process ${input.processId}`);

      return {
        success: true,
      };
    }),

  // Регенерация BPMN XML из данных процесса
  regenerateBpmnXml: protectedProcedure
    .input(z.object({
      processId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const process = await getProcessById(input.processId);
      if (!process) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Процесс не найден',
        });
      }

      const bpmnXml = generateBPMNFromDbProcess({
        id: process.id,
        title: process.title,
        roles: process.roles,
        stages: process.stages,
        steps: process.steps,
      });

      await updateBusinessProcess(input.processId, { bpmnXml });

      console.log(`[Process] BPMN XML regenerated for process ${input.processId}`);

      return {
        success: true,
        bpmnXml,
      };
    }),
});
