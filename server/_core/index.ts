import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import session from "express-session";
import passport from "passport";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setupSocket } from "./socket";
import { configurePassport } from "./auth";
import authRoutes from "./authRoutes";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Initialize database connection at startup with timeout
  console.log('[Startup] Initializing database connection...');
  const { getDb } = await import('../db');
  try {
    const dbPromise = getDb();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout after 5s')), 5000)
    );
    
    const db = await Promise.race([dbPromise, timeoutPromise]);
    if (db) {
      console.log('[Startup] Database connection initialized successfully');
    } else {
      console.warn('[Startup] Database connection not available');
    }
  } catch (error) {
    console.error('[Startup] Failed to initialize database:', error);
    console.log('[Startup] Continuing without database...');
  }
  
  const app = express();
  const server = createServer(app);
  
  // Trust proxy - required for Render.com and other reverse proxies
  // This allows Express to correctly read X-Forwarded-* headers
  app.set('trust proxy', 1);
  
  // CORS configuration - simple approach
  app.use(cors({
    origin: true, // Allow all origins (will be restricted by cookie SameSite in production)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  }));
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  
  // Session configuration
  app.use(
    session({
      secret: ENV.cookieSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: ENV.isProduction,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );
  
  // Initialize Passport (without session - using JWT instead)
  configurePassport();
  app.use(passport.initialize());
  // app.use(passport.session()); // Disabled - using JWT tokens instead
  
  // Test route
  app.get('/api/test', (req, res) => {
    res.json({ message: 'Test route works!' });
  });
  
  // Auth routes under /api/auth
  app.use('/api/auth', authRoutes);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: (opts) => createContext(opts),
    })
  );
  // Setup Socket.IO
  const io = setupSocket(server);
  
  // Make io available in app locals for use in routers
  app.locals.io = io;

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
