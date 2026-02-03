import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getOrCreateUserSupportChat,
  sendSupportMessage,
  getSupportChatMessages,
  getAllSupportChats,
  markMessagesAsRead,
  getUnreadMessagesCount,
} from "../db";

export const supportRouter = router({
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
      const { notifyOwner } = await import("../_core/notification");
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
});
