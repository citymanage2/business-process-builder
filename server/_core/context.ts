import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // ✅ ИСПРАВЛЕНО: Читаем JWT токен из cookie
    const token = opts.req.cookies?.token;

    if (token) {
      // Декодируем токен
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      
      // ✅ ИСПРАВЛЕНО: Получаем db через getDb()
      const db = await getDb();
      
      if (db) {
        // Получаем пользователя из БД
        const [foundUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

        if (foundUser) {
          user = foundUser;
          console.log('✅ User authenticated via JWT:', user.email);
        }
      } else {
        console.log('❌ Database not available');
      }
    } else {
      console.log('❌ No token in cookies');
    }
  } catch (error) {
    console.error('Context auth error:', error);
    // Если токен невалидный, просто продолжаем с user = null
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
