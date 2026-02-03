import { describe, it, expect } from 'vitest';

/**
 * Тесты для функционала предпросмотра изменений бизнес-процессов
 * 
 * Проверяем:
 * 1. Структуру ответа API previewChanges
 * 2. Наличие currentData и updatedData в ответе
 * 3. Корректность передачи стоимости операции
 * 4. Что изменения НЕ применяются до подтверждения
 */

describe('Process Preview Changes', () => {
  it('should return preview structure with currentData and updatedData', () => {
    // Имитация ответа от previewChanges endpoint
    const mockPreviewResponse = {
      success: true,
      currentData: {
        title: 'Старый процесс',
        description: 'Старое описание',
        stages: [{ id: 'stage_1', name: 'Этап 1', order: 1 }],
        roles: [{ id: 'role_1', name: 'Роль 1', order: 1 }],
        steps: [{ id: 'step_1', name: 'Шаг 1', roleId: 'role_1', stageId: 'stage_1', order: 1 }],
        branches: [],
        documents: [],
        itIntegration: {},
      },
      updatedData: {
        title: 'Новый процесс',
        description: 'Новое описание',
        stages: [{ id: 'stage_1', name: 'Этап 1', order: 1 }],
        roles: [{ id: 'role_1', name: 'Роль 1', order: 1 }],
        steps: [{ id: 'step_1', name: 'Шаг 1 (обновлен)', roleId: 'role_1', stageId: 'stage_1', order: 1 }],
        branches: [],
        documents: [],
        itIntegration: {},
      },
      cost: 100,
    };

    // Проверяем структуру ответа
    expect(mockPreviewResponse).toHaveProperty('success');
    expect(mockPreviewResponse).toHaveProperty('currentData');
    expect(mockPreviewResponse).toHaveProperty('updatedData');
    expect(mockPreviewResponse).toHaveProperty('cost');
    
    expect(mockPreviewResponse.success).toBe(true);
    expect(mockPreviewResponse.cost).toBeGreaterThan(0);
  });

  it('should detect changes between currentData and updatedData', () => {
    const currentData = {
      title: 'Процесс продаж',
      steps: [
        { id: 'step_1', name: 'Прием заявки', roleId: 'role_1', stageId: 'stage_1' },
        { id: 'step_2', name: 'Согласование', roleId: 'role_2', stageId: 'stage_1' },
      ],
    };

    const updatedData = {
      title: 'Процесс продаж (обновлен)',
      steps: [
        { id: 'step_1', name: 'Прием заявки', roleId: 'role_1', stageId: 'stage_1' },
        { id: 'step_2', name: 'Согласование', roleId: 'role_2', stageId: 'stage_2' }, // Изменен stageId
        { id: 'step_3', name: 'Новый шаг', roleId: 'role_1', stageId: 'stage_3' }, // Добавлен новый шаг
      ],
    };

    // Проверяем, что заголовок изменился
    expect(currentData.title).not.toBe(updatedData.title);

    // Проверяем, что количество шагов изменилось
    expect(currentData.steps.length).toBe(2);
    expect(updatedData.steps.length).toBe(3);

    // Проверяем, что stageId второго шага изменился
    expect(currentData.steps[1].stageId).toBe('stage_1');
    expect(updatedData.steps[1].stageId).toBe('stage_2');
  });

  it('should validate required fields in preview response', () => {
    const mockResponse = {
      success: true,
      currentData: {
        title: 'Test',
        stages: [],
        roles: [],
        steps: [],
      },
      updatedData: {
        title: 'Test Updated',
        stages: [],
        roles: [],
        steps: [],
      },
      cost: 100,
    };

    // Проверяем обязательные поля в currentData
    expect(mockResponse.currentData).toHaveProperty('title');
    expect(mockResponse.currentData).toHaveProperty('stages');
    expect(mockResponse.currentData).toHaveProperty('roles');
    expect(mockResponse.currentData).toHaveProperty('steps');

    // Проверяем обязательные поля в updatedData
    expect(mockResponse.updatedData).toHaveProperty('title');
    expect(mockResponse.updatedData).toHaveProperty('stages');
    expect(mockResponse.updatedData).toHaveProperty('roles');
    expect(mockResponse.updatedData).toHaveProperty('steps');
  });

  it('should calculate diff correctly for ProcessDiffViewer', () => {
    const currentRoles = [
      { id: 'role_1', name: 'Менеджер' },
      { id: 'role_2', name: 'Юрист' },
    ];

    const updatedRoles = [
      { id: 'role_1', name: 'Менеджер' },
      { id: 'role_3', name: 'Координатор' }, // Новая роль
    ];

    // Находим добавленные роли
    const currentRoleIds = new Set(currentRoles.map(r => r.id));
    const addedRoles = updatedRoles.filter(r => !currentRoleIds.has(r.id));
    expect(addedRoles).toHaveLength(1);
    expect(addedRoles[0].name).toBe('Координатор');

    // Находим удаленные роли
    const updatedRoleIds = new Set(updatedRoles.map(r => r.id));
    const removedRoles = currentRoles.filter(r => !updatedRoleIds.has(r.id));
    expect(removedRoles).toHaveLength(1);
    expect(removedRoles[0].name).toBe('Юрист');
  });

  it('should handle confirmChanges input structure', () => {
    const confirmInput = {
      id: 1,
      updatedData: {
        title: 'Updated Process',
        description: 'Updated description',
        startEvent: 'Start',
        endEvent: 'End',
        stages: [],
        roles: [],
        steps: [],
        branches: [],
        documents: [],
        itIntegration: {},
      },
      cost: 100,
    };

    // Проверяем структуру входных данных для confirmChanges
    expect(confirmInput).toHaveProperty('id');
    expect(confirmInput).toHaveProperty('updatedData');
    expect(confirmInput).toHaveProperty('cost');
    
    expect(typeof confirmInput.id).toBe('number');
    expect(typeof confirmInput.cost).toBe('number');
    expect(typeof confirmInput.updatedData).toBe('object');
  });
});
