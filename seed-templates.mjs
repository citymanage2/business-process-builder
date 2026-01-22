// Seed script for process templates
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Template data
const templates = [
  {
    name: "Процесс найма сотрудника",
    description: "Стандартный процесс найма нового сотрудника: от заявки до выхода на работу",
    categoryId: null,
    isSystem: 1,
    isPublic: 1,
    nodes: JSON.stringify([
      {
        id: "start-1",
        type: "processBlock",
        position: { x: 250, y: 50 },
        data: {
          id: "start-1",
          type: "start",
          name: "Начало найма",
          description: "Получена заявка на найм",
          color: "#22c55e",
          icon: "Play"
        }
      },
      {
        id: "task-1",
        type: "processBlock",
        position: { x: 250, y: 150 },
        data: {
          id: "task-1",
          type: "task",
          name: "Создание вакансии",
          description: "Описание позиции и требований",
          responsible: "HR-менеджер",
          duration: "1 день",
          color: "#3b82f6",
          icon: "CheckSquare"
        }
      },
      {
        id: "task-2",
        type: "processBlock",
        position: { x: 250, y: 270 },
        data: {
          id: "task-2",
          type: "task",
          name: "Размещение вакансии",
          description: "Публикация на job-порталах",
          responsible: "HR-менеджер",
          duration: "30 мин",
          color: "#3b82f6",
          icon: "CheckSquare"
        }
      },
      {
        id: "task-3",
        type: "processBlock",
        position: { x: 250, y: 390 },
        data: {
          id: "task-3",
          type: "task",
          name: "Сбор откликов",
          description: "Получение и фильтрация резюме",
          responsible: "HR-менеджер",
          duration: "1-2 недели",
          color: "#3b82f6",
          icon: "CheckSquare"
        }
      },
      {
        id: "condition-1",
        type: "processBlock",
        position: { x: 250, y: 510 },
        data: {
          id: "condition-1",
          type: "condition",
          name: "Подходящий кандидат?",
          color: "#f59e0b",
          icon: "HelpCircle",
          conditions: [
            { id: "c1", label: "Да" },
            { id: "c2", label: "Нет" }
          ]
        }
      },
      {
        id: "task-4",
        type: "processBlock",
        position: { x: 400, y: 630 },
        data: {
          id: "task-4",
          type: "task",
          name: "Собеседование",
          description: "Проведение интервью с кандидатом",
          responsible: "Руководитель отдела",
          duration: "1 час",
          color: "#3b82f6",
          icon: "CheckSquare"
        }
      },
      {
        id: "condition-2",
        type: "processBlock",
        position: { x: 400, y: 750 },
        data: {
          id: "condition-2",
          type: "condition",
          name: "Кандидат подходит?",
          color: "#f59e0b",
          icon: "HelpCircle"
        }
      },
      {
        id: "task-5",
        type: "processBlock",
        position: { x: 550, y: 870 },
        data: {
          id: "task-5",
          type: "task",
          name: "Отправка оффера",
          description: "Подготовка и отправка предложения",
          responsible: "HR-менеджер",
          duration: "1 день",
          color: "#3b82f6",
          icon: "CheckSquare"
        }
      },
      {
        id: "task-6",
        type: "processBlock",
        position: { x: 550, y: 990 },
        data: {
          id: "task-6",
          type: "task",
          name: "Оформление документов",
          description: "Заключение трудового договора",
          responsible: "HR-менеджер",
          duration: "1 день",
          color: "#3b82f6",
          icon: "CheckSquare"
        }
      },
      {
        id: "end-1",
        type: "processBlock",
        position: { x: 550, y: 1110 },
        data: {
          id: "end-1",
          type: "end",
          name: "Сотрудник нанят",
          color: "#ef4444",
          icon: "Square"
        }
      }
    ]),
    edges: JSON.stringify([
      { id: "e1", source: "start-1", target: "task-1", type: "processEdge" },
      { id: "e2", source: "task-1", target: "task-2", type: "processEdge" },
      { id: "e3", source: "task-2", target: "task-3", type: "processEdge" },
      { id: "e4", source: "task-3", target: "condition-1", type: "processEdge" },
      { id: "e5", source: "condition-1", target: "task-4", type: "processEdge", data: { label: "Да" } },
      { id: "e6", source: "condition-1", target: "task-3", type: "processEdge", data: { label: "Нет" } },
      { id: "e7", source: "task-4", target: "condition-2", type: "processEdge" },
      { id: "e8", source: "condition-2", target: "task-5", type: "processEdge", data: { label: "Да" } },
      { id: "e9", source: "condition-2", target: "task-3", type: "processEdge", data: { label: "Нет" } },
      { id: "e10", source: "task-5", target: "task-6", type: "processEdge" },
      { id: "e11", source: "task-6", target: "end-1", type: "processEdge" }
    ])
  },
  {
    name: "Обработка заказа",
    description: "Процесс обработки заказа от получения до доставки клиенту",
    categoryId: null,
    isSystem: 1,
    isPublic: 1,
    nodes: JSON.stringify([
      {
        id: "start-1",
        type: "processBlock",
        position: { x: 250, y: 50 },
        data: { id: "start-1", type: "start", name: "Заказ получен", color: "#22c55e", icon: "Play" }
      },
      {
        id: "task-1",
        type: "processBlock",
        position: { x: 250, y: 150 },
        data: { id: "task-1", type: "task", name: "Проверка наличия", responsible: "Менеджер склада", duration: "15 мин", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "condition-1",
        type: "processBlock",
        position: { x: 250, y: 270 },
        data: { id: "condition-1", type: "condition", name: "Товар в наличии?", color: "#f59e0b", icon: "HelpCircle" }
      },
      {
        id: "task-2",
        type: "processBlock",
        position: { x: 400, y: 390 },
        data: { id: "task-2", type: "task", name: "Комплектация заказа", responsible: "Сборщик", duration: "30 мин", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-3",
        type: "processBlock",
        position: { x: 100, y: 390 },
        data: { id: "task-3", type: "task", name: "Заказ товара у поставщика", responsible: "Менеджер закупок", duration: "1 день", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-4",
        type: "processBlock",
        position: { x: 400, y: 510 },
        data: { id: "task-4", type: "task", name: "Оплата заказа", responsible: "Клиент", duration: "10 мин", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-5",
        type: "processBlock",
        position: { x: 400, y: 630 },
        data: { id: "task-5", type: "task", name: "Отправка заказа", responsible: "Логист", duration: "1 час", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "end-1",
        type: "processBlock",
        position: { x: 400, y: 750 },
        data: { id: "end-1", type: "end", name: "Заказ доставлен", color: "#ef4444", icon: "Square" }
      }
    ]),
    edges: JSON.stringify([
      { id: "e1", source: "start-1", target: "task-1", type: "processEdge" },
      { id: "e2", source: "task-1", target: "condition-1", type: "processEdge" },
      { id: "e3", source: "condition-1", target: "task-2", type: "processEdge", data: { label: "Да" } },
      { id: "e4", source: "condition-1", target: "task-3", type: "processEdge", data: { label: "Нет" } },
      { id: "e5", source: "task-3", target: "task-1", type: "processEdge" },
      { id: "e6", source: "task-2", target: "task-4", type: "processEdge" },
      { id: "e7", source: "task-4", target: "task-5", type: "processEdge" },
      { id: "e8", source: "task-5", target: "end-1", type: "processEdge" }
    ])
  },
  {
    name: "Согласование документа",
    description: "Процесс согласования документа с несколькими уровнями утверждения",
    categoryId: null,
    isSystem: 1,
    isPublic: 1,
    nodes: JSON.stringify([
      {
        id: "start-1",
        type: "processBlock",
        position: { x: 250, y: 50 },
        data: { id: "start-1", type: "start", name: "Документ создан", color: "#22c55e", icon: "Play" }
      },
      {
        id: "task-1",
        type: "processBlock",
        position: { x: 250, y: 150 },
        data: { id: "task-1", type: "task", name: "Проверка юристом", responsible: "Юрист", duration: "2 дня", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "condition-1",
        type: "processBlock",
        position: { x: 250, y: 270 },
        data: { id: "condition-1", type: "condition", name: "Одобрено?", color: "#f59e0b", icon: "HelpCircle" }
      },
      {
        id: "task-2",
        type: "processBlock",
        position: { x: 100, y: 390 },
        data: { id: "task-2", type: "task", name: "Доработка документа", responsible: "Инициатор", duration: "1 день", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-3",
        type: "processBlock",
        position: { x: 400, y: 390 },
        data: { id: "task-3", type: "task", name: "Согласование руководителем", responsible: "Руководитель", duration: "1 день", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "condition-2",
        type: "processBlock",
        position: { x: 400, y: 510 },
        data: { id: "condition-2", type: "condition", name: "Подписано?", color: "#f59e0b", icon: "HelpCircle" }
      },
      {
        id: "task-4",
        type: "processBlock",
        position: { x: 550, y: 630 },
        data: { id: "task-4", type: "task", name: "Регистрация документа", responsible: "Секретарь", duration: "30 мин", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "end-1",
        type: "processBlock",
        position: { x: 550, y: 750 },
        data: { id: "end-1", type: "end", name: "Документ согласован", color: "#ef4444", icon: "Square" }
      },
      {
        id: "end-2",
        type: "processBlock",
        position: { x: 250, y: 630 },
        data: { id: "end-2", type: "end", name: "Документ отклонен", color: "#ef4444", icon: "Square" }
      }
    ]),
    edges: JSON.stringify([
      { id: "e1", source: "start-1", target: "task-1", type: "processEdge" },
      { id: "e2", source: "task-1", target: "condition-1", type: "processEdge" },
      { id: "e3", source: "condition-1", target: "task-2", type: "processEdge", data: { label: "Нет" } },
      { id: "e4", source: "condition-1", target: "task-3", type: "processEdge", data: { label: "Да" } },
      { id: "e5", source: "task-2", target: "task-1", type: "processEdge" },
      { id: "e6", source: "task-3", target: "condition-2", type: "processEdge" },
      { id: "e7", source: "condition-2", target: "task-4", type: "processEdge", data: { label: "Да" } },
      { id: "e8", source: "condition-2", target: "end-2", type: "processEdge", data: { label: "Нет" } },
      { id: "e9", source: "task-4", target: "end-1", type: "processEdge" }
    ])
  },
  {
    name: "Обработка обращения клиента",
    description: "Процесс обработки заявки или жалобы клиента",
    categoryId: null,
    isSystem: 1,
    isPublic: 1,
    nodes: JSON.stringify([
      {
        id: "start-1",
        type: "processBlock",
        position: { x: 250, y: 50 },
        data: { id: "start-1", type: "start", name: "Обращение получено", color: "#22c55e", icon: "Play" }
      },
      {
        id: "task-1",
        type: "processBlock",
        position: { x: 250, y: 150 },
        data: { id: "task-1", type: "task", name: "Регистрация обращения", responsible: "Оператор", duration: "5 мин", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-2",
        type: "processBlock",
        position: { x: 250, y: 270 },
        data: { id: "task-2", type: "task", name: "Классификация", responsible: "Оператор", duration: "10 мин", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-3",
        type: "processBlock",
        position: { x: 250, y: 390 },
        data: { id: "task-3", type: "task", name: "Назначение исполнителя", responsible: "Менеджер", duration: "15 мин", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-4",
        type: "processBlock",
        position: { x: 250, y: 510 },
        data: { id: "task-4", type: "task", name: "Решение проблемы", responsible: "Специалист", duration: "1-2 дня", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-5",
        type: "processBlock",
        position: { x: 250, y: 630 },
        data: { id: "task-5", type: "task", name: "Уведомление клиента", responsible: "Оператор", duration: "10 мин", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "end-1",
        type: "processBlock",
        position: { x: 250, y: 750 },
        data: { id: "end-1", type: "end", name: "Обращение закрыто", color: "#ef4444", icon: "Square" }
      }
    ]),
    edges: JSON.stringify([
      { id: "e1", source: "start-1", target: "task-1", type: "processEdge" },
      { id: "e2", source: "task-1", target: "task-2", type: "processEdge" },
      { id: "e3", source: "task-2", target: "task-3", type: "processEdge" },
      { id: "e4", source: "task-3", target: "task-4", type: "processEdge" },
      { id: "e5", source: "task-4", target: "task-5", type: "processEdge" },
      { id: "e6", source: "task-5", target: "end-1", type: "processEdge" }
    ])
  },
  {
    name: "Процесс закупки",
    description: "Стандартный процесс закупки товаров или услуг",
    categoryId: null,
    isSystem: 1,
    isPublic: 1,
    nodes: JSON.stringify([
      {
        id: "start-1",
        type: "processBlock",
        position: { x: 250, y: 50 },
        data: { id: "start-1", type: "start", name: "Потребность в закупке", color: "#22c55e", icon: "Play" }
      },
      {
        id: "task-1",
        type: "processBlock",
        position: { x: 250, y: 150 },
        data: { id: "task-1", type: "task", name: "Создание заявки на закупку", responsible: "Инициатор", duration: "30 мин", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-2",
        type: "processBlock",
        position: { x: 250, y: 270 },
        data: { id: "task-2", type: "task", name: "Согласование бюджета", responsible: "Финансовый директор", duration: "1 день", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "condition-1",
        type: "processBlock",
        position: { x: 250, y: 390 },
        data: { id: "condition-1", type: "condition", name: "Бюджет утвержден?", color: "#f59e0b", icon: "HelpCircle" }
      },
      {
        id: "task-3",
        type: "processBlock",
        position: { x: 400, y: 510 },
        data: { id: "task-3", type: "task", name: "Выбор поставщика", responsible: "Менеджер закупок", duration: "2 дня", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-4",
        type: "processBlock",
        position: { x: 400, y: 630 },
        data: { id: "task-4", type: "task", name: "Заключение договора", responsible: "Юрист", duration: "3 дня", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-5",
        type: "processBlock",
        position: { x: 400, y: 750 },
        data: { id: "task-5", type: "task", name: "Оплата", responsible: "Бухгалтер", duration: "1 день", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-6",
        type: "processBlock",
        position: { x: 400, y: 870 },
        data: { id: "task-6", type: "task", name: "Получение товара", responsible: "Менеджер склада", duration: "1-5 дней", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "end-1",
        type: "processBlock",
        position: { x: 400, y: 990 },
        data: { id: "end-1", type: "end", name: "Закупка завершена", color: "#ef4444", icon: "Square" }
      },
      {
        id: "end-2",
        type: "processBlock",
        position: { x: 100, y: 510 },
        data: { id: "end-2", type: "end", name: "Закупка отменена", color: "#ef4444", icon: "Square" }
      }
    ]),
    edges: JSON.stringify([
      { id: "e1", source: "start-1", target: "task-1", type: "processEdge" },
      { id: "e2", source: "task-1", target: "task-2", type: "processEdge" },
      { id: "e3", source: "task-2", target: "condition-1", type: "processEdge" },
      { id: "e4", source: "condition-1", target: "task-3", type: "processEdge", data: { label: "Да" } },
      { id: "e5", source: "condition-1", target: "end-2", type: "processEdge", data: { label: "Нет" } },
      { id: "e6", source: "task-3", target: "task-4", type: "processEdge" },
      { id: "e7", source: "task-4", target: "task-5", type: "processEdge" },
      { id: "e8", source: "task-5", target: "task-6", type: "processEdge" },
      { id: "e9", source: "task-6", target: "end-1", type: "processEdge" }
    ])
  },
  {
    name: "Процесс разработки продукта",
    description: "Итеративный процесс разработки нового продукта",
    categoryId: null,
    isSystem: 1,
    isPublic: 1,
    nodes: JSON.stringify([
      {
        id: "start-1",
        type: "processBlock",
        position: { x: 250, y: 50 },
        data: { id: "start-1", type: "start", name: "Идея продукта", color: "#22c55e", icon: "Play" }
      },
      {
        id: "task-1",
        type: "processBlock",
        position: { x: 250, y: 150 },
        data: { id: "task-1", type: "task", name: "Исследование рынка", responsible: "Продакт-менеджер", duration: "2 недели", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-2",
        type: "processBlock",
        position: { x: 250, y: 270 },
        data: { id: "task-2", type: "task", name: "Создание концепции", responsible: "Продакт-менеджер", duration: "1 неделя", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-3",
        type: "processBlock",
        position: { x: 250, y: 390 },
        data: { id: "task-3", type: "task", name: "Прототипирование", responsible: "Дизайнер", duration: "2 недели", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-4",
        type: "processBlock",
        position: { x: 250, y: 510 },
        data: { id: "task-4", type: "task", name: "Разработка MVP", responsible: "Команда разработки", duration: "1 месяц", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "task-5",
        type: "processBlock",
        position: { x: 250, y: 630 },
        data: { id: "task-5", type: "task", name: "Тестирование", responsible: "QA", duration: "2 недели", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "condition-1",
        type: "processBlock",
        position: { x: 250, y: 750 },
        data: { id: "condition-1", type: "condition", name: "Готов к запуску?", color: "#f59e0b", icon: "HelpCircle" }
      },
      {
        id: "task-6",
        type: "processBlock",
        position: { x: 400, y: 870 },
        data: { id: "task-6", type: "task", name: "Запуск продукта", responsible: "Маркетинг", duration: "1 неделя", color: "#3b82f6", icon: "CheckSquare" }
      },
      {
        id: "end-1",
        type: "processBlock",
        position: { x: 400, y: 990 },
        data: { id: "end-1", type: "end", name: "Продукт запущен", color: "#ef4444", icon: "Square" }
      }
    ]),
    edges: JSON.stringify([
      { id: "e1", source: "start-1", target: "task-1", type: "processEdge" },
      { id: "e2", source: "task-1", target: "task-2", type: "processEdge" },
      { id: "e3", source: "task-2", target: "task-3", type: "processEdge" },
      { id: "e4", source: "task-3", target: "task-4", type: "processEdge" },
      { id: "e5", source: "task-4", target: "task-5", type: "processEdge" },
      { id: "e6", source: "task-5", target: "condition-1", type: "processEdge" },
      { id: "e7", source: "condition-1", target: "task-6", type: "processEdge", data: { label: "Да" } },
      { id: "e8", source: "condition-1", target: "task-4", type: "processEdge", data: { label: "Нет" } },
      { id: "e9", source: "task-6", target: "end-1", type: "processEdge" }
    ])
  }
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('Connected to database');

    // Check if templates table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'process_templates'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('process_templates table does not exist. Run migrations first.');
      client.release();
      await pool.end();
      return;
    }

    // Insert templates
    for (const template of templates) {
      const existing = await client.query(
        'SELECT id FROM process_templates WHERE name = $1 AND is_system = 1',
        [template.name]
      );

      if (existing.rows.length > 0) {
        console.log(`Template "${template.name}" already exists, skipping...`);
        continue;
      }

      await client.query(
        `INSERT INTO process_templates (name, description, category_id, is_system, is_public, nodes, edges, use_count, rating, rating_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, NOW(), NOW())`,
        [template.name, template.description, template.categoryId, template.isSystem, template.isPublic, template.nodes, template.edges]
      );

      console.log(`Created template: ${template.name}`);
    }

    console.log('Seeding completed!');
    client.release();
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await pool.end();
  }
}

seed();
