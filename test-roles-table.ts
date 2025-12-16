/**
 * Простой тест для проверки что вопрос D28 имеет тип roles_table
 */

import { FULL_QUESTIONS, SHORT_QUESTIONS } from './server/questions';

// Проверяем что вопрос D28 есть в списке
const questionD28Full = FULL_QUESTIONS.find(q => q.id === 'D28');
const questionD28Short = SHORT_QUESTIONS.find(q => q.id === 'D28');

console.log('=== Проверка вопроса D28 ===');
console.log('В полной анкете:', questionD28Full ? 'найден' : 'НЕ НАЙДЕН');
console.log('В сокращенной анкете:', questionD28Short ? 'найден' : 'НЕ НАЙДЕН');

if (questionD28Full) {
  console.log('\nПолная анкета - вопрос D28:');
  console.log('  ID:', questionD28Full.id);
  console.log('  Текст:', questionD28Full.text);
  console.log('  Тип:', questionD28Full.type);
  console.log('  Обязательный:', questionD28Full.required);
  console.log('  Ключевой вопрос:', questionD28Full.isKeyQuestion);
}

if (questionD28Short) {
  console.log('\nСокращенная анкета - вопрос D28:');
  console.log('  ID:', questionD28Short.id);
  console.log('  Текст:', questionD28Short.text);
  console.log('  Тип:', questionD28Short.type);
  console.log('  Обязательный:', questionD28Short.required);
  console.log('  Ключевой вопрос:', questionD28Short.isKeyQuestion);
}

// Проверяем что тип roles_table есть в TypeScript типе
type QuestionType = typeof questionD28Full extends { type: infer T } ? T : never;
console.log('\n=== Проверка типа ===');
console.log('TypeScript тип вопроса D28 включает roles_table:', 
  questionD28Full?.type === 'roles_table' ? 'ДА' : 'НЕТ');

console.log('\n✅ Тест завершен');
