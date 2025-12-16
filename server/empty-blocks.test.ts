import { describe, it, expect } from 'vitest';
import { FULL_QUESTIONS, SHORT_QUESTIONS, QUESTION_BLOCKS } from './questions';

describe('Empty blocks filtering', () => {
  it('should filter out blocks with no questions in short questionnaire', () => {
    // Получаем блоки, в которых есть вопросы для сокращённой анкеты
    const availableBlocks = QUESTION_BLOCKS.filter(block => 
      SHORT_QUESTIONS.some(q => q.block === block.id)
    );
    
    // Проверяем что количество блоков меньше общего количества
    expect(availableBlocks.length).toBeLessThan(QUESTION_BLOCKS.length);
    
    // Проверяем что в каждом доступном блоке есть хотя бы один вопрос
    availableBlocks.forEach(block => {
      const questionsInBlock = SHORT_QUESTIONS.filter(q => q.block === block.id);
      expect(questionsInBlock.length).toBeGreaterThan(0);
    });
  });

  it('should include all blocks for full questionnaire', () => {
    // Получаем блоки, в которых есть вопросы для полной анкеты
    const availableBlocks = QUESTION_BLOCKS.filter(block => 
      FULL_QUESTIONS.some(q => q.block === block.id)
    );
    
    // Проверяем что все блоки доступны для полной анкеты
    expect(availableBlocks.length).toBe(QUESTION_BLOCKS.length);
  });

  it('should not include block E in short questionnaire', () => {
    // Получаем блоки для сокращённой анкеты
    const availableBlocks = QUESTION_BLOCKS.filter(block => 
      SHORT_QUESTIONS.some(q => q.block === block.id)
    );
    
    // Проверяем что блок E не включён
    const hasBlockE = availableBlocks.some(block => block.id === 'E');
    expect(hasBlockE).toBe(false);
  });

  it('should have correct number of blocks in short questionnaire', () => {
    // Получаем блоки для сокращённой анкеты
    const availableBlocks = QUESTION_BLOCKS.filter(block => 
      SHORT_QUESTIONS.some(q => q.block === block.id)
    );
    
    // Проверяем что количество блоков равно 5 (A, B, C, D, F, G без E)
    // Или может быть меньше, если в других блоках тоже нет ключевых вопросов
    expect(availableBlocks.length).toBeGreaterThan(0);
    expect(availableBlocks.length).toBeLessThanOrEqual(6);
  });

  it('should maintain correct block order', () => {
    // Получаем блоки для сокращённой анкеты
    const availableBlocks = QUESTION_BLOCKS.filter(block => 
      SHORT_QUESTIONS.some(q => q.block === block.id)
    );
    
    // Проверяем что порядок блоков сохраняется
    for (let i = 1; i < availableBlocks.length; i++) {
      const prevBlockIndex = QUESTION_BLOCKS.findIndex(b => b.id === availableBlocks[i-1].id);
      const currentBlockIndex = QUESTION_BLOCKS.findIndex(b => b.id === availableBlocks[i].id);
      expect(currentBlockIndex).toBeGreaterThan(prevBlockIndex);
    }
  });
});
