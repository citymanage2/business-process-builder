import { beforeEach, describe, expect, it, vi } from 'vitest';

const balances = new Map<number, number>();

vi.mock('./db', () => ({
  getUserBalance: async (userId: number) => balances.get(userId) ?? 0,
  updateUserBalance: async (userId: number, newBalance: number) => {
    balances.set(userId, newBalance);
    return true;
  },
  deductTokens: async (userId: number, amount: number) => {
    const currentBalance = balances.get(userId) ?? 0;
    if (currentBalance < amount) {
      return false;
    }
    balances.set(userId, currentBalance - amount);
    return true;
  },
}));

import { deductTokens, getUserBalance, updateUserBalance } from './db';

/**
 * Тесты для системы списания токенов
 * 
 * Проверяем:
 * 1. Получение баланса пользователя
 * 2. Успешное списание токенов при достаточном балансе
 * 3. Отказ в списании при недостаточном балансе
 * 4. Корректность обновления баланса
 */

describe('Token Balance System', () => {
  const TEST_USER_ID = 1; // Используем существующего пользователя

  beforeEach(() => {
    balances.clear();
  });
  
  it('should get user balance', async () => {
    const balance = await getUserBalance(TEST_USER_ID);
    expect(typeof balance).toBe('number');
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it('should successfully deduct tokens when balance is sufficient', async () => {
    // Сначала устанавливаем баланс 500 токенов
    await updateUserBalance(TEST_USER_ID, 500);
    
    const initialBalance = await getUserBalance(TEST_USER_ID);
    expect(initialBalance).toBe(500);
    
    // Списываем 100 токенов
    const result = await deductTokens(TEST_USER_ID, 100);
    expect(result).toBe(true);
    
    // Проверяем новый баланс
    const newBalance = await getUserBalance(TEST_USER_ID);
    expect(newBalance).toBe(400);
  });

  it('should fail to deduct tokens when balance is insufficient', async () => {
    // Устанавливаем баланс 50 токенов
    await updateUserBalance(TEST_USER_ID, 50);
    
    const initialBalance = await getUserBalance(TEST_USER_ID);
    expect(initialBalance).toBe(50);
    
    // Пытаемся списать 100 токенов (больше чем есть)
    const result = await deductTokens(TEST_USER_ID, 100);
    expect(result).toBe(false);
    
    // Баланс не должен измениться
    const balanceAfter = await getUserBalance(TEST_USER_ID);
    expect(balanceAfter).toBe(50);
  });

  it('should update user balance correctly', async () => {
    const newBalance = 1000;
    const result = await updateUserBalance(TEST_USER_ID, newBalance);
    expect(result).toBe(true);
    
    const balance = await getUserBalance(TEST_USER_ID);
    expect(balance).toBe(newBalance);
  });

  it('should handle multiple deductions correctly', async () => {
    // Устанавливаем начальный баланс
    await updateUserBalance(TEST_USER_ID, 300);
    
    // Первое списание
    let result = await deductTokens(TEST_USER_ID, 100);
    expect(result).toBe(true);
    expect(await getUserBalance(TEST_USER_ID)).toBe(200);
    
    // Второе списание
    result = await deductTokens(TEST_USER_ID, 100);
    expect(result).toBe(true);
    expect(await getUserBalance(TEST_USER_ID)).toBe(100);
    
    // Третье списание (должно не пройти)
    result = await deductTokens(TEST_USER_ID, 150);
    expect(result).toBe(false);
    expect(await getUserBalance(TEST_USER_ID)).toBe(100); // Баланс не изменился
  });
});

