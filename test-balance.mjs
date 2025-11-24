import { drizzle } from 'drizzle-orm/mysql2';
import { users } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

// Установить баланс 50 токенов (недостаточно для генерации которая стоит 100)
await db.update(users)
  .set({ tokenBalance: 50 })
  .where(eq(users.openId, process.env.OWNER_OPEN_ID));

console.log('✅ Баланс установлен на 50 токенов для тестирования недостаточного баланса');
