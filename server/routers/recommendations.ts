import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createRecommendation,
  getProcessRecommendations,
  getProcessById,
  getCompanyById,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { buildRecommendationsPrompt } from "../prompts";

export const recommendationsRouter = router({
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
});
