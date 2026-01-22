/**
 * Seed script for Process Builder - creates default categories and templates
 * Run with: node seed-builder.mjs
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seedCategories() {
  const categories = [
    { name: 'HR и управление персоналом', description: 'Процессы найма, адаптации, обучения сотрудников', color: '#3b82f6', icon: 'Users', order: 1 },
    { name: 'Продажи и маркетинг', description: 'Процессы продаж, лидогенерации, маркетинговых кампаний', color: '#22c55e', icon: 'TrendingUp', order: 2 },
    { name: 'Финансы и бухгалтерия', description: 'Финансовые процессы, расчеты, отчетность', color: '#eab308', icon: 'DollarSign', order: 3 },
    { name: 'Производство и логистика', description: 'Производственные процессы, доставка, складирование', color: '#f97316', icon: 'Truck', order: 4 },
    { name: 'IT и техническая поддержка', description: 'IT-процессы, поддержка пользователей, разработка', color: '#8b5cf6', icon: 'Monitor', order: 5 },
    { name: 'Управление проектами', description: 'Проектное управление, планирование, контроль', color: '#06b6d4', icon: 'Target', order: 6 },
    { name: 'Обслуживание клиентов', description: 'Клиентский сервис, обработка обращений', color: '#ec4899', icon: 'HeadphonesIcon', order: 7 },
    { name: 'Документооборот', description: 'Согласование документов, архивирование', color: '#64748b', icon: 'FileText', order: 8 },
  ];

  console.log('Seeding categories...');
  
  for (const cat of categories) {
    try {
      // Check if exists
      const existing = await pool.query(
        'SELECT id FROM process_categories WHERE name = $1',
        [cat.name]
      );
      
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO process_categories (name, description, color, icon, "order", created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [cat.name, cat.description, cat.color, cat.icon, cat.order]
        );
        console.log(`  Created category: ${cat.name}`);
      } else {
        console.log(`  Category already exists: ${cat.name}`);
      }
    } catch (error) {
      console.error(`  Error creating category ${cat.name}:`, error.message);
    }
  }
}

async function seedTemplates() {
  // Get first admin user for template ownership
  const adminResult = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
  );
  
  const userId = adminResult.rows[0]?.id || 1;
  
  // Get category IDs
  const catResult = await pool.query('SELECT id, name FROM process_categories');
  const categories = {};
  catResult.rows.forEach(row => {
    categories[row.name] = row.id;
  });

  const templates = [
    {
      title: 'Процесс найма сотрудника',
      description: 'Стандартный процесс найма нового сотрудника от заявки до оформления',
      category: 'HR и управление персоналом',
      nodes: JSON.stringify([
        { id: 'start_1', type: 'processBlock', position: { x: 300, y: 0 }, data: { label: 'Начало', blockType: 'start', color: '#22c55e', icon: 'PlayCircle' } },
        { id: 'task_1', type: 'processBlock', position: { x: 300, y: 100 }, data: { label: 'Заявка на вакансию', blockType: 'task', color: '#3b82f6', responsible: 'HR-менеджер', duration: 30 } },
        { id: 'task_2', type: 'processBlock', position: { x: 300, y: 220 }, data: { label: 'Публикация вакансии', blockType: 'task', color: '#3b82f6', responsible: 'HR-менеджер', duration: 60 } },
        { id: 'task_3', type: 'processBlock', position: { x: 300, y: 340 }, data: { label: 'Сбор и отбор резюме', blockType: 'task', color: '#3b82f6', responsible: 'HR-менеджер', duration: 480 } },
        { id: 'cond_1', type: 'processBlock', position: { x: 300, y: 460 }, data: { label: 'Есть подходящие кандидаты?', blockType: 'condition', color: '#eab308' } },
        { id: 'task_4', type: 'processBlock', position: { x: 150, y: 580 }, data: { label: 'Проведение собеседования', blockType: 'task', color: '#3b82f6', responsible: 'Руководитель', duration: 60 } },
        { id: 'task_5', type: 'processBlock', position: { x: 450, y: 580 }, data: { label: 'Повторный поиск', blockType: 'task', color: '#f97316', responsible: 'HR-менеджер' } },
        { id: 'cond_2', type: 'processBlock', position: { x: 150, y: 700 }, data: { label: 'Кандидат подходит?', blockType: 'condition', color: '#eab308' } },
        { id: 'task_6', type: 'processBlock', position: { x: 50, y: 820 }, data: { label: 'Оформление оффера', blockType: 'task', color: '#3b82f6', responsible: 'HR-менеджер', duration: 60 } },
        { id: 'task_7', type: 'processBlock', position: { x: 50, y: 940 }, data: { label: 'Оформление сотрудника', blockType: 'task', color: '#3b82f6', responsible: 'HR-менеджер', duration: 120 } },
        { id: 'end_1', type: 'processBlock', position: { x: 50, y: 1060 }, data: { label: 'Конец', blockType: 'end', color: '#ef4444', icon: 'StopCircle' } },
      ]),
      edges: JSON.stringify([
        { id: 'e1', source: 'start_1', target: 'task_1', type: 'smoothstep' },
        { id: 'e2', source: 'task_1', target: 'task_2', type: 'smoothstep' },
        { id: 'e3', source: 'task_2', target: 'task_3', type: 'smoothstep' },
        { id: 'e4', source: 'task_3', target: 'cond_1', type: 'smoothstep' },
        { id: 'e5', source: 'cond_1', target: 'task_4', type: 'smoothstep', label: 'Да' },
        { id: 'e6', source: 'cond_1', target: 'task_5', type: 'smoothstep', label: 'Нет' },
        { id: 'e7', source: 'task_5', target: 'task_2', type: 'smoothstep' },
        { id: 'e8', source: 'task_4', target: 'cond_2', type: 'smoothstep' },
        { id: 'e9', source: 'cond_2', target: 'task_6', type: 'smoothstep', label: 'Да' },
        { id: 'e10', source: 'cond_2', target: 'task_3', type: 'smoothstep', label: 'Нет' },
        { id: 'e11', source: 'task_6', target: 'task_7', type: 'smoothstep' },
        { id: 'e12', source: 'task_7', target: 'end_1', type: 'smoothstep' },
      ]),
    },
    {
      title: 'Обработка заказа',
      description: 'Процесс обработки заказа от получения до доставки клиенту',
      category: 'Продажи и маркетинг',
      nodes: JSON.stringify([
        { id: 'start_1', type: 'processBlock', position: { x: 300, y: 0 }, data: { label: 'Новый заказ', blockType: 'start', color: '#22c55e' } },
        { id: 'data_1', type: 'processBlock', position: { x: 300, y: 100 }, data: { label: 'Получение данных заказа', blockType: 'data_input', color: '#0ea5e9' } },
        { id: 'task_1', type: 'processBlock', position: { x: 300, y: 220 }, data: { label: 'Проверка наличия товара', blockType: 'task', color: '#3b82f6', responsible: 'Менеджер', duration: 15 } },
        { id: 'cond_1', type: 'processBlock', position: { x: 300, y: 340 }, data: { label: 'Товар в наличии?', blockType: 'condition', color: '#eab308' } },
        { id: 'task_2', type: 'processBlock', position: { x: 150, y: 460 }, data: { label: 'Резервирование товара', blockType: 'automated_action', color: '#14b8a6' } },
        { id: 'notify_1', type: 'processBlock', position: { x: 450, y: 460 }, data: { label: 'Уведомление клиента', blockType: 'send_notification', color: '#f59e0b' } },
        { id: 'task_3', type: 'processBlock', position: { x: 150, y: 580 }, data: { label: 'Ожидание оплаты', blockType: 'task', color: '#3b82f6', duration: 1440 } },
        { id: 'task_4', type: 'processBlock', position: { x: 150, y: 700 }, data: { label: 'Сборка и упаковка', blockType: 'manual_action', color: '#06b6d4', responsible: 'Склад', duration: 60 } },
        { id: 'task_5', type: 'processBlock', position: { x: 150, y: 820 }, data: { label: 'Передача в доставку', blockType: 'task', color: '#3b82f6', responsible: 'Логист', duration: 30 } },
        { id: 'notify_2', type: 'processBlock', position: { x: 150, y: 940 }, data: { label: 'Уведомление о доставке', blockType: 'send_notification', color: '#f59e0b' } },
        { id: 'end_1', type: 'processBlock', position: { x: 150, y: 1060 }, data: { label: 'Заказ доставлен', blockType: 'end', color: '#ef4444' } },
      ]),
      edges: JSON.stringify([
        { id: 'e1', source: 'start_1', target: 'data_1', type: 'smoothstep' },
        { id: 'e2', source: 'data_1', target: 'task_1', type: 'smoothstep' },
        { id: 'e3', source: 'task_1', target: 'cond_1', type: 'smoothstep' },
        { id: 'e4', source: 'cond_1', target: 'task_2', type: 'smoothstep', label: 'Да' },
        { id: 'e5', source: 'cond_1', target: 'notify_1', type: 'smoothstep', label: 'Нет' },
        { id: 'e6', source: 'task_2', target: 'task_3', type: 'smoothstep' },
        { id: 'e7', source: 'task_3', target: 'task_4', type: 'smoothstep' },
        { id: 'e8', source: 'task_4', target: 'task_5', type: 'smoothstep' },
        { id: 'e9', source: 'task_5', target: 'notify_2', type: 'smoothstep' },
        { id: 'e10', source: 'notify_2', target: 'end_1', type: 'smoothstep' },
      ]),
    },
    {
      title: 'Согласование документа',
      description: 'Процесс согласования документа с несколькими участниками',
      category: 'Документооборот',
      nodes: JSON.stringify([
        { id: 'start_1', type: 'processBlock', position: { x: 300, y: 0 }, data: { label: 'Документ создан', blockType: 'start', color: '#22c55e' } },
        { id: 'doc_1', type: 'processBlock', position: { x: 300, y: 100 }, data: { label: 'Документ', blockType: 'document', color: '#a855f7' } },
        { id: 'task_1', type: 'processBlock', position: { x: 300, y: 220 }, data: { label: 'Согласование руководителем', blockType: 'task', color: '#3b82f6', responsible: 'Руководитель', duration: 240 } },
        { id: 'cond_1', type: 'processBlock', position: { x: 300, y: 340 }, data: { label: 'Одобрено?', blockType: 'condition', color: '#eab308' } },
        { id: 'task_2', type: 'processBlock', position: { x: 150, y: 460 }, data: { label: 'Согласование юристом', blockType: 'task', color: '#3b82f6', responsible: 'Юрист', duration: 480 } },
        { id: 'task_3', type: 'processBlock', position: { x: 450, y: 460 }, data: { label: 'Возврат на доработку', blockType: 'task', color: '#f97316', responsible: 'Автор' } },
        { id: 'cond_2', type: 'processBlock', position: { x: 150, y: 580 }, data: { label: 'Одобрено?', blockType: 'condition', color: '#eab308' } },
        { id: 'task_4', type: 'processBlock', position: { x: 50, y: 700 }, data: { label: 'Утверждение директором', blockType: 'task', color: '#3b82f6', responsible: 'Директор', duration: 120 } },
        { id: 'task_5', type: 'processBlock', position: { x: 50, y: 820 }, data: { label: 'Регистрация документа', blockType: 'automated_action', color: '#14b8a6' } },
        { id: 'notify_1', type: 'processBlock', position: { x: 50, y: 940 }, data: { label: 'Уведомление заинтересованных', blockType: 'send_notification', color: '#f59e0b' } },
        { id: 'end_1', type: 'processBlock', position: { x: 50, y: 1060 }, data: { label: 'Документ согласован', blockType: 'end', color: '#ef4444' } },
      ]),
      edges: JSON.stringify([
        { id: 'e1', source: 'start_1', target: 'doc_1', type: 'smoothstep' },
        { id: 'e2', source: 'doc_1', target: 'task_1', type: 'smoothstep' },
        { id: 'e3', source: 'task_1', target: 'cond_1', type: 'smoothstep' },
        { id: 'e4', source: 'cond_1', target: 'task_2', type: 'smoothstep', label: 'Да' },
        { id: 'e5', source: 'cond_1', target: 'task_3', type: 'smoothstep', label: 'Нет' },
        { id: 'e6', source: 'task_3', target: 'doc_1', type: 'smoothstep' },
        { id: 'e7', source: 'task_2', target: 'cond_2', type: 'smoothstep' },
        { id: 'e8', source: 'cond_2', target: 'task_4', type: 'smoothstep', label: 'Да' },
        { id: 'e9', source: 'cond_2', target: 'task_3', type: 'smoothstep', label: 'Нет' },
        { id: 'e10', source: 'task_4', target: 'task_5', type: 'smoothstep' },
        { id: 'e11', source: 'task_5', target: 'notify_1', type: 'smoothstep' },
        { id: 'e12', source: 'notify_1', target: 'end_1', type: 'smoothstep' },
      ]),
    },
    {
      title: 'Обработка обращения клиента',
      description: 'Процесс обработки обращения в службу поддержки',
      category: 'Обслуживание клиентов',
      nodes: JSON.stringify([
        { id: 'start_1', type: 'processBlock', position: { x: 300, y: 0 }, data: { label: 'Обращение получено', blockType: 'start', color: '#22c55e' } },
        { id: 'task_1', type: 'processBlock', position: { x: 300, y: 100 }, data: { label: 'Регистрация обращения', blockType: 'automated_action', color: '#14b8a6' } },
        { id: 'task_2', type: 'processBlock', position: { x: 300, y: 220 }, data: { label: 'Классификация обращения', blockType: 'task', color: '#3b82f6', responsible: 'Оператор', duration: 10 } },
        { id: 'cond_1', type: 'processBlock', position: { x: 300, y: 340 }, data: { label: 'Требует эскалации?', blockType: 'condition', color: '#eab308' } },
        { id: 'task_3', type: 'processBlock', position: { x: 150, y: 460 }, data: { label: 'Решение оператором', blockType: 'task', color: '#3b82f6', responsible: 'Оператор', duration: 30 } },
        { id: 'esc_1', type: 'processBlock', position: { x: 450, y: 460 }, data: { label: 'Эскалация', blockType: 'escalation_event', color: '#ea580c' } },
        { id: 'task_4', type: 'processBlock', position: { x: 450, y: 580 }, data: { label: 'Решение специалистом', blockType: 'task', color: '#3b82f6', responsible: 'Специалист', duration: 120 } },
        { id: 'task_5', type: 'processBlock', position: { x: 300, y: 700 }, data: { label: 'Отправка ответа', blockType: 'send_notification', color: '#f59e0b' } },
        { id: 'task_6', type: 'processBlock', position: { x: 300, y: 820 }, data: { label: 'Запрос обратной связи', blockType: 'send_notification', color: '#f59e0b' } },
        { id: 'end_1', type: 'processBlock', position: { x: 300, y: 940 }, data: { label: 'Обращение закрыто', blockType: 'end', color: '#ef4444' } },
      ]),
      edges: JSON.stringify([
        { id: 'e1', source: 'start_1', target: 'task_1', type: 'smoothstep' },
        { id: 'e2', source: 'task_1', target: 'task_2', type: 'smoothstep' },
        { id: 'e3', source: 'task_2', target: 'cond_1', type: 'smoothstep' },
        { id: 'e4', source: 'cond_1', target: 'task_3', type: 'smoothstep', label: 'Нет' },
        { id: 'e5', source: 'cond_1', target: 'esc_1', type: 'smoothstep', label: 'Да' },
        { id: 'e6', source: 'esc_1', target: 'task_4', type: 'smoothstep' },
        { id: 'e7', source: 'task_3', target: 'task_5', type: 'smoothstep' },
        { id: 'e8', source: 'task_4', target: 'task_5', type: 'smoothstep' },
        { id: 'e9', source: 'task_5', target: 'task_6', type: 'smoothstep' },
        { id: 'e10', source: 'task_6', target: 'end_1', type: 'smoothstep' },
      ]),
    },
  ];

  console.log('\nSeeding templates...');
  
  for (const template of templates) {
    try {
      const categoryId = categories[template.category];
      
      // Check if exists
      const existing = await pool.query(
        'SELECT id FROM process_templates WHERE title = $1',
        [template.title]
      );
      
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO process_templates (user_id, category_id, title, description, nodes, edges, is_public, is_approved, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 1, 1, NOW(), NOW())`,
          [userId, categoryId, template.title, template.description, template.nodes, template.edges]
        );
        console.log(`  Created template: ${template.title}`);
      } else {
        console.log(`  Template already exists: ${template.title}`);
      }
    } catch (error) {
      console.error(`  Error creating template ${template.title}:`, error.message);
    }
  }
}

async function main() {
  console.log('Starting Process Builder seed...\n');
  
  try {
    await seedCategories();
    await seedTemplates();
    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await pool.end();
  }
}

main();
