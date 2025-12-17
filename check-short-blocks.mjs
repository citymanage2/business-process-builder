import { SHORT_QUESTIONS, QUESTION_BLOCKS } from './server/questions.ts';

const availableBlocks = QUESTION_BLOCKS.filter(block => 
  SHORT_QUESTIONS.some(q => q.block === block.id)
);

console.log('Блоки в сокращённой анкете:');
availableBlocks.forEach((block, index) => {
  const questionsCount = SHORT_QUESTIONS.filter(q => q.block === block.id).length;
  console.log(`${index + 1}. ${block.id} - ${block.title} (${questionsCount} вопросов)`);
});

console.log(`\nВсего блоков: ${availableBlocks.length} из ${QUESTION_BLOCKS.length}`);
console.log(`Скрыто блоков: ${QUESTION_BLOCKS.length - availableBlocks.length}`);

const hiddenBlocks = QUESTION_BLOCKS.filter(block => 
  !SHORT_QUESTIONS.some(q => q.block === block.id)
);

console.log('\nСкрытые блоки:');
hiddenBlocks.forEach(block => {
  console.log(`- ${block.id} - ${block.title}`);
});
