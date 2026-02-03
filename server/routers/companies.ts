import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createCompany,
  getUserCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "../db";

export const companiesRouter = router({
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
});
