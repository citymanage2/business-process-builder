import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Import modular routers
import { authRouter } from "./routers/auth";
import { companiesRouter } from "./routers/companies";
import { interviewsRouter } from "./routers/interviews";
import { processesRouter } from "./routers/processes";
import { recommendationsRouter } from "./routers/recommendations";
import { commentsRouter } from "./routers/comments";
import { documentsRouter } from "./routers/documents";
import { draftsRouter } from "./routers/drafts";
import { adminRouter } from "./routers/admin";
import { supportRouter } from "./routers/support";
import { faqRouter } from "./routers/faq";
import { changeRequestsRouter } from "./routers/changeRequests";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  companies: companiesRouter,
  interviews: interviewsRouter,
  processes: processesRouter,
  recommendations: recommendationsRouter,
  comments: commentsRouter,
  documents: documentsRouter,
  drafts: draftsRouter,
  admin: adminRouter,
  support: supportRouter,
  faq: faqRouter,
  changeRequests: changeRequestsRouter,
});

export type AppRouter = typeof appRouter;
