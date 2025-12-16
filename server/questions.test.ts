import { describe, it, expect } from 'vitest';
import { FULL_QUESTIONS, SHORT_QUESTIONS } from './questions';

describe('FormInterview - roles_table type', () => {
  it('should have question D28 with type roles_table in full questions', () => {
    const questionD28 = FULL_QUESTIONS.find(q => q.id === 'D28');
    
    expect(questionD28).toBeDefined();
    expect(questionD28?.type).toBe('roles_table');
    expect(questionD28?.required).toBe(true);
    expect(questionD28?.isKeyQuestion).toBe(true);
  });

  it('should have question D28 with type roles_table in short questions', () => {
    const questionD28 = SHORT_QUESTIONS.find(q => q.id === 'D28');
    
    expect(questionD28).toBeDefined();
    expect(questionD28?.type).toBe('roles_table');
    expect(questionD28?.required).toBe(true);
    expect(questionD28?.isKeyQuestion).toBe(true);
  });

  it('should have correct text for question D28', () => {
    const questionD28 = FULL_QUESTIONS.find(q => q.id === 'D28');
    
    expect(questionD28?.text).toBe('Перечислите все ключевые роли и их зарплаты');
  });

  it('should be in block D', () => {
    const questionD28 = FULL_QUESTIONS.find(q => q.id === 'D28');
    
    expect(questionD28?.block).toBe('D');
  });

  it('should have placeholder text', () => {
    const questionD28 = FULL_QUESTIONS.find(q => q.id === 'D28');
    
    expect(questionD28?.placeholder).toBeDefined();
    expect(questionD28?.placeholder).toContain('Добавьте роли');
  });
});
