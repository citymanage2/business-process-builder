/**
 * Стоимость операций в токенах
 */
export const OPERATION_COSTS = {
  /** Стоимость генерации одного бизнес-процесса */
  GENERATE_PROCESS: 100,
  /** Стоимость генерации рекомендаций */
  GENERATE_RECOMMENDATIONS: 20,
} as const;

/**
 * Начальный баланс токенов для новых пользователей
 */
export const INITIAL_TOKEN_BALANCE = 1000;
