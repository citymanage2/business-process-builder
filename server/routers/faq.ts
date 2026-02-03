import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getAllFaqArticles,
  searchFaqByKeywords,
  getFaqArticleById,
  createFaqArticle,
  updateFaqArticle,
  deleteFaqArticle,
} from "../db";

export const faqRouter = router({
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
});
