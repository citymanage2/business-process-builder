/**
 * Test script for business process generation with structured outputs
 */

import { invokeLLM } from './server/_core/llm';
import { buildProcessPrompt } from './server/prompts';
import { businessProcessSchema } from './server/schemas';

// Test company context
const context = `
Компания: Тестовая IT-компания
Отрасль: Разработка ПО
Регион: Москва
Формат: B2B
Средний чек: 500000 руб
Продукты/услуги: Разработка веб-приложений
ИТ-системы: Jira, Confluence, GitLab
`;

// Test interview data
const interviewData = `
Ответы на вопросы анкеты:
process_name: Продажа проекта разработки веб-приложения
process_start: Входящая заявка от клиента
process_steps: Квалификация лида -> Встреча с клиентом -> Подготовка коммерческого предложения -> Согласование условий -> Подписание договора
roles: Менеджер по продажам, Технический директор, Руководитель проекта, Юрист
systems: CRM (Битрикс24), Email, Zoom
duration: 2-4 недели
`;

async function testProcessGeneration() {
  console.log('=== Testing Business Process Generation with Structured Outputs ===\n');
  
  try {
    const prompt = buildProcessPrompt(context, interviewData);
    
    console.log('Sending request to Claude API...\n');
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Ты эксперт по бизнес-процессам. Создавай детальные структурированные процессы в формате JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "business_process",
          schema: businessProcessSchema,
        },
      },
    });
    
    const content = typeof response.choices[0].message.content === 'string' 
      ? response.choices[0].message.content 
      : JSON.stringify(response.choices[0].message.content);
    
    console.log('Response received. Parsing JSON...\n');
    
    const processData = JSON.parse(content);
    
    console.log('✅ SUCCESS! Process data parsed successfully.\n');
    console.log('Process Title:', processData.title);
    console.log('Number of Stages:', processData.stages?.length || 0);
    console.log('Number of Roles:', processData.roles?.length || 0);
    console.log('Number of Steps:', processData.steps?.length || 0);
    console.log('Number of Branches:', processData.branches?.length || 0);
    
    // Validate required fields
    const requiredFields = ['title', 'stages', 'roles', 'steps'];
    const missingFields = requiredFields.filter(field => !processData[field]);
    
    if (missingFields.length > 0) {
      console.log('\n❌ VALIDATION ERROR: Missing required fields:', missingFields);
      process.exit(1);
    }
    
    console.log('\n✅ All required fields present!');
    console.log('\nFirst stage:', JSON.stringify(processData.stages[0], null, 2));
    console.log('\nFirst role:', JSON.stringify(processData.roles[0], null, 2));
    console.log('\nFirst step:', JSON.stringify(processData.steps[0], null, 2));
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

testProcessGeneration();
