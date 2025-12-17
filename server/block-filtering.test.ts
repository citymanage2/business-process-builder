import { describe, it, expect } from 'vitest';
import { SHORT_QUESTIONS, FULL_QUESTIONS, QUESTION_BLOCKS } from './questions';

describe('Фильтрация пустых блоков', () => {
  it('В сокращённой анкете должно быть 5 блоков (A, B, C, D, G)', () => {
    const availableBlocks = QUESTION_BLOCKS.filter(block => 
      SHORT_QUESTIONS.some(q => q.block === block.id)
    );
    
    expect(availableBlocks.length).toBe(5);
    expect(availableBlocks.map(b => b.id)).toEqual(['A', 'B', 'C', 'D', 'G']);
  });

  it('В сокращённой анкете должны быть скрыты блоки E и F', () => {
    const hiddenBlocks = QUESTION_BLOCKS.filter(block => 
      !SHORT_QUESTIONS.some(q => q.block === block.id)
    );
    
    expect(hiddenBlocks.length).toBe(2);
    expect(hiddenBlocks.map(b => b.id)).toEqual(['E', 'F']);
  });

  it('В полной анкете должны быть все 7 блоков', () => {
    const availableBlocks = QUESTION_BLOCKS.filter(block => 
      FULL_QUESTIONS.some(q => q.block === block.id)
    );
    
    expect(availableBlocks.length).toBe(7);
  });

  it('Каждый блок в сокращённой анкете должен содержать хотя бы 1 вопрос', () => {
    const availableBlocks = QUESTION_BLOCKS.filter(block => 
      SHORT_QUESTIONS.some(q => q.block === block.id)
    );
    
    availableBlocks.forEach(block => {
      const questionsCount = SHORT_QUESTIONS.filter(q => q.block === block.id).length;
      expect(questionsCount).toBeGreaterThan(0);
    });
  });

  it('Блок E не должен содержать ключевых вопросов', () => {
    const blockEQuestions = SHORT_QUESTIONS.filter(q => q.block === 'E');
    expect(blockEQuestions.length).toBe(0);
  });

  it('Блок F не должен содержать ключевых вопросов', () => {
    const blockFQuestions = SHORT_QUESTIONS.filter(q => q.block === 'F');
    expect(blockFQuestions.length).toBe(0);
  });
});
