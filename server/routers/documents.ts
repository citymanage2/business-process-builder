import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createDocument,
  getDocumentsByCompanyId,
  deleteDocument,
} from "../db";
import { storagePut } from "../storage";

export const documentsRouter = router({
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
});
