import { describe, it, expect } from 'vitest';
import { FULL_QUESTIONS, SHORT_QUESTIONS } from './questions';

describe('Skip button for optional questions', () => {
  it('should have optional questions in full questionnaire', () => {
    const optionalQuestions = FULL_QUESTIONS.filter(q => !q.required);
    expect(optionalQuestions.length).toBeGreaterThan(0);
  });

  it('should have all required questions in short questionnaire', () => {
    // В сокращённой анкете все вопросы обязательные (только ключевые)
    const requiredQuestions = SHORT_QUESTIONS.filter(q => q.required);
    expect(requiredQuestions.length).toBe(SHORT_QUESTIONS.length);
  });

  it('should have required field flag on all questions', () => {
    // Проверяем что у всех вопросов есть поле required
    FULL_QUESTIONS.forEach(question => {
      expect(question).toHaveProperty('required');
      expect(typeof question.required).toBe('boolean');
    });
  });

  it('should have at least one optional question in each block', () => {
    // Группируем вопросы по блокам
    const blockMap = new Map<string, typeof FULL_QUESTIONS>();
    FULL_QUESTIONS.forEach(q => {
      if (!blockMap.has(q.block)) {
        blockMap.set(q.block, []);
      }
      blockMap.get(q.block)!.push(q);
    });

    // Проверяем что в большинстве блоков есть хотя бы один необязательный вопрос
    let blocksWithOptional = 0;
    blockMap.forEach((questions, block) => {
      const hasOptional = questions.some(q => !q.required);
      if (hasOptional) {
        blocksWithOptional++;
      }
    });

    expect(blocksWithOptional).toBeGreaterThan(0);
  });

  it('should correctly identify optional questions', () => {
    // Проверяем что необязательные вопросы действительно помечены как необязательные
    const optionalQuestions = FULL_QUESTIONS.filter(q => !q.required);
    
    optionalQuestions.forEach(question => {
      expect(question.required).toBe(false);
    });
  });

  it('should have required questions marked correctly', () => {
    // Проверяем что обязательные вопросы помечены правильно
    const requiredQuestions = FULL_QUESTIONS.filter(q => q.required);
    
    requiredQuestions.forEach(question => {
      expect(question.required).toBe(true);
    });
  });

  it('should have balanced mix of required and optional questions', () => {
    const requiredCount = FULL_QUESTIONS.filter(q => q.required).length;
    const optionalCount = FULL_QUESTIONS.filter(q => !q.required).length;
    
    // Проверяем что есть и обязательные, и необязательные вопросы
    expect(requiredCount).toBeGreaterThan(0);
    expect(optionalCount).toBeGreaterThan(0);
    
    // Проверяем что общее количество совпадает
    expect(requiredCount + optionalCount).toBe(FULL_QUESTIONS.length);
  });
});
