import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getAllUsers,
  updateUserBalance,
  getErrorLogs,
} from "../db";

export const adminRouter = router({
  // Получить метрики пула подключений к БД
  getPoolMetrics: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      const { getPoolMetrics } = await import('../db');
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
});
