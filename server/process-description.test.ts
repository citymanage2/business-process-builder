import { describe, it, expect } from 'vitest';

/**
 * Тесты для проверки структуры данных ProcessDescription
 * Компонент ProcessDescription отображает полное текстовое описание бизнес-процесса
 */

// Тестовые данные процесса
const mockProcess = {
  id: 1,
  title: "Процесс продаж B2B",
  description: "Полный цикл продаж для корпоративных клиентов",
  startEvent: "Получение заявки от клиента",
  endEvent: "Подписание договора",
  roles: [
    { id: "role-1", name: "Менеджер по продажам", description: "Ведение клиента" },
    { id: "role-2", name: "Руководитель отдела", description: "Согласование условий" },
  ],
  stages: [
    { id: "stage-1", name: "Квалификация", order: 1, description: "Оценка потенциала клиента" },
    { id: "stage-2", name: "Презентация", order: 2, description: "Демонстрация решения" },
    { id: "stage-3", name: "Закрытие", order: 3, description: "Финальные переговоры" },
  ],
  steps: [
    { id: "step-1", name: "Первичный контакт", roleId: "role-1", stageId: "stage-1", order: 1, duration: "30 мин" },
    { id: "step-2", name: "Анализ потребностей", roleId: "role-1", stageId: "stage-1", order: 2, duration: "1 час" },
    { id: "step-3", name: "Подготовка КП", roleId: "role-1", stageId: "stage-2", order: 3, duration: "2 часа" },
    { id: "step-4", name: "Согласование условий", roleId: "role-2", stageId: "stage-3", order: 4, duration: "1 день" },
  ],
  branches: [
    { id: "branch-1", name: "Отказ клиента", condition: "Клиент не заинтересован", fromStepId: "step-2", toStepId: "end" },
  ],
  documents: [
    { id: "doc-1", name: "Коммерческое предложение", type: "Исходящий" },
    { id: "doc-2", name: "Договор", type: "Юридический" },
  ],
  itIntegration: {
    systems: ["CRM Bitrix24", "1C:Предприятие"],
    automations: ["Автоматическое создание задач", "Email-уведомления"],
  },
  totalTime: "5 дней",
  totalCost: "150 000 руб",
};

describe('ProcessDescription Data Structure', () => {
  describe('Общая информация', () => {
    it('должен содержать заголовок процесса', () => {
      expect(mockProcess.title).toBeDefined();
      expect(mockProcess.title.length).toBeGreaterThan(0);
    });

    it('должен содержать описание процесса', () => {
      expect(mockProcess.description).toBeDefined();
      expect(mockProcess.description.length).toBeGreaterThan(0);
    });

    it('должен содержать начальное и конечное события', () => {
      expect(mockProcess.startEvent).toBeDefined();
      expect(mockProcess.endEvent).toBeDefined();
    });

    it('должен содержать метрики процесса', () => {
      expect(mockProcess.totalTime).toBeDefined();
      expect(mockProcess.totalCost).toBeDefined();
    });
  });

  describe('Роли участников', () => {
    it('должен содержать массив ролей', () => {
      expect(Array.isArray(mockProcess.roles)).toBe(true);
      expect(mockProcess.roles.length).toBeGreaterThan(0);
    });

    it('каждая роль должна иметь id и name', () => {
      mockProcess.roles.forEach(role => {
        expect(role.id).toBeDefined();
        expect(role.name).toBeDefined();
      });
    });
  });

  describe('Этапы процесса', () => {
    it('должен содержать массив этапов', () => {
      expect(Array.isArray(mockProcess.stages)).toBe(true);
      expect(mockProcess.stages.length).toBeGreaterThan(0);
    });

    it('этапы должны быть отсортированы по order', () => {
      const sortedStages = [...mockProcess.stages].sort((a, b) => a.order - b.order);
      expect(sortedStages[0].order).toBe(1);
      expect(sortedStages[sortedStages.length - 1].order).toBe(mockProcess.stages.length);
    });

    it('каждый этап должен иметь id, name и order', () => {
      mockProcess.stages.forEach(stage => {
        expect(stage.id).toBeDefined();
        expect(stage.name).toBeDefined();
        expect(typeof stage.order).toBe('number');
      });
    });
  });

  describe('Шаги процесса', () => {
    it('должен содержать массив шагов', () => {
      expect(Array.isArray(mockProcess.steps)).toBe(true);
      expect(mockProcess.steps.length).toBeGreaterThan(0);
    });

    it('каждый шаг должен быть привязан к роли и этапу', () => {
      mockProcess.steps.forEach(step => {
        expect(step.roleId).toBeDefined();
        expect(step.stageId).toBeDefined();
      });
    });

    it('все roleId должны ссылаться на существующие роли', () => {
      const roleIds = mockProcess.roles.map(r => r.id);
      mockProcess.steps.forEach(step => {
        expect(roleIds).toContain(step.roleId);
      });
    });

    it('все stageId должны ссылаться на существующие этапы', () => {
      const stageIds = mockProcess.stages.map(s => s.id);
      mockProcess.steps.forEach(step => {
        expect(stageIds).toContain(step.stageId);
      });
    });
  });

  describe('Условные переходы (ветвления)', () => {
    it('должен содержать массив ветвлений', () => {
      expect(Array.isArray(mockProcess.branches)).toBe(true);
    });

    it('каждое ветвление должно иметь условие', () => {
      mockProcess.branches.forEach(branch => {
        expect(branch.condition).toBeDefined();
        expect(branch.condition.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Документы', () => {
    it('должен содержать массив документов', () => {
      expect(Array.isArray(mockProcess.documents)).toBe(true);
    });

    it('каждый документ должен иметь name и type', () => {
      mockProcess.documents.forEach(doc => {
        expect(doc.name).toBeDefined();
        expect(doc.type).toBeDefined();
      });
    });
  });

  describe('IT-интеграция', () => {
    it('должен содержать объект itIntegration', () => {
      expect(mockProcess.itIntegration).toBeDefined();
    });

    it('должен содержать список систем', () => {
      expect(Array.isArray(mockProcess.itIntegration.systems)).toBe(true);
      expect(mockProcess.itIntegration.systems.length).toBeGreaterThan(0);
    });

    it('должен содержать список автоматизаций', () => {
      expect(Array.isArray(mockProcess.itIntegration.automations)).toBe(true);
    });
  });
});

describe('ProcessDescription Helper Functions', () => {
  // Функция для получения имени роли по ID
  const getRoleName = (roleId: string) => {
    const role = mockProcess.roles.find(r => r.id === roleId);
    return role?.name || "Не указана";
  };

  // Функция для группировки шагов по этапам
  const getStepsByStage = () => {
    return mockProcess.stages.map(stage => ({
      stage,
      steps: mockProcess.steps.filter(step => step.stageId === stage.id)
    }));
  };

  it('getRoleName должен возвращать имя роли по ID', () => {
    expect(getRoleName('role-1')).toBe('Менеджер по продажам');
    expect(getRoleName('role-2')).toBe('Руководитель отдела');
    expect(getRoleName('unknown')).toBe('Не указана');
  });

  it('getStepsByStage должен группировать шаги по этапам', () => {
    const grouped = getStepsByStage();
    expect(grouped.length).toBe(mockProcess.stages.length);
    
    // Проверяем, что все шаги распределены по этапам
    const totalSteps = grouped.reduce((sum, g) => sum + g.steps.length, 0);
    expect(totalSteps).toBe(mockProcess.steps.length);
  });

  it('шаги первого этапа должны содержать правильные данные', () => {
    const grouped = getStepsByStage();
    const firstStageSteps = grouped.find(g => g.stage.id === 'stage-1')?.steps || [];
    
    expect(firstStageSteps.length).toBe(2);
    expect(firstStageSteps[0].name).toBe('Первичный контакт');
  });
});
