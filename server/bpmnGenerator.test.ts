import { describe, it, expect } from "vitest";
import { generateBPMNXML, generateBPMNFromDbProcess } from "./bpmnGenerator";

describe("BPMN Generator", () => {
  const mockProcess = {
    id: 1,
    title: "Тестовый процесс",
    roles: [
      { id: "role_1", name: "Менеджер", color: "#E3F2FD" },
      { id: "role_2", name: "Клиент", color: "#FFF3E0" },
    ],
    stages: [
      { id: "stage_1", name: "Начало", order: 1 },
      { id: "stage_2", name: "Завершение", order: 2 },
    ],
    steps: [
      {
        id: "S1",
        stageId: "stage_1",
        roleId: "role_1",
        type: "Start" as const,
        name: "Начало процесса",
        description: "Старт бизнес-процесса",
        order: 1,
        nextSteps: ["S2"],
      },
      {
        id: "S2",
        stageId: "stage_1",
        roleId: "role_1",
        type: "Action" as const,
        name: "Обработка заявки",
        description: "Менеджер обрабатывает заявку",
        order: 2,
        parameters: [
          { type: "time" as const, value: "30 мин" },
          { type: "document" as const, value: "Заявка" },
        ],
        previousSteps: ["S1"],
        nextSteps: ["S3"],
      },
      {
        id: "S3",
        stageId: "stage_1",
        roleId: "role_1",
        type: "Decision" as const,
        name: "Проверка данных",
        description: "Проверка корректности данных",
        order: 3,
        previousSteps: ["S2"],
        branches: [
          { condition: "Данные корректны", targetStepId: "S4" },
          { condition: "Ошибка в данных", targetStepId: "S5", isDefault: true },
        ],
      },
      {
        id: "S4",
        stageId: "stage_2",
        roleId: "role_2",
        type: "End" as const,
        name: "Успешное завершение",
        description: "Процесс завершён успешно",
        order: 4,
        previousSteps: ["S3"],
      },
      {
        id: "S5",
        stageId: "stage_2",
        roleId: "role_1",
        type: "End" as const,
        name: "Отклонение",
        description: "Заявка отклонена",
        order: 5,
        previousSteps: ["S3"],
      },
    ],
  };

  describe("generateBPMNXML", () => {
    it("should generate valid BPMN XML structure", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<bpmn:definitions');
      expect(xml).toContain('xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"');
      expect(xml).toContain('</bpmn:definitions>');
    });

    it("should include process title", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('name="Тестовый процесс"');
    });

    it("should create lanes for each role", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('<bpmn:lane');
      expect(xml).toContain('name="Менеджер"');
      expect(xml).toContain('name="Клиент"');
    });

    it("should create StartEvent for Start type", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('<bpmn:StartEvent');
      expect(xml).toContain('name="Начало процесса"');
    });

    it("should create EndEvent for End type", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('<bpmn:EndEvent');
      expect(xml).toContain('name="Успешное завершение"');
      expect(xml).toContain('name="Отклонение"');
    });

    it("should create Task for Action type", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('<bpmn:Task');
      expect(xml).toContain('name="Обработка заявки"');
    });

    it("should create ExclusiveGateway for Decision type", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('<bpmn:ExclusiveGateway');
      expect(xml).toContain('name="Проверка данных"');
    });

    it("should include documentation with description and parameters", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('<bpmn:documentation>');
      expect(xml).toContain('Менеджер обрабатывает заявку');
      expect(xml).toContain('Время: 30 мин');
      expect(xml).toContain('Документ: Заявка');
    });

    it("should create sequence flows between steps", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('<bpmn:sequenceFlow');
      expect(xml).toContain('Flow_S1_to_S2');
      expect(xml).toContain('Flow_S2_to_S3');
    });

    it("should create conditional flows for branches", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('name="Данные корректны"');
      expect(xml).toContain('name="Ошибка в данных"');
      expect(xml).toContain('<bpmn:conditionExpression');
    });

    it("should include BPMN diagram information", () => {
      const xml = generateBPMNXML(mockProcess);
      
      expect(xml).toContain('<bpmndi:BPMNDiagram');
      expect(xml).toContain('<bpmndi:BPMNPlane');
      expect(xml).toContain('<bpmndi:BPMNShape');
      expect(xml).toContain('<bpmndi:BPMNEdge');
    });

    it("should escape XML special characters", () => {
      const processWithSpecialChars = {
        ...mockProcess,
        title: "Процесс <тест> & \"кавычки\"",
        steps: [
          {
            ...mockProcess.steps[0],
            name: "Шаг <с> & спецсимволами",
          },
        ],
      };
      
      const xml = generateBPMNXML(processWithSpecialChars);
      
      expect(xml).toContain("&lt;тест&gt;");
      expect(xml).toContain("&amp;");
      expect(xml).toContain("&quot;кавычки&quot;");
    });
  });

  describe("generateBPMNFromDbProcess", () => {
    it("should parse JSON strings and generate BPMN XML", () => {
      const dbProcess = {
        id: 1,
        title: "Тестовый процесс",
        roles: JSON.stringify(mockProcess.roles),
        stages: JSON.stringify(mockProcess.stages),
        steps: JSON.stringify(mockProcess.steps),
      };
      
      const xml = generateBPMNFromDbProcess(dbProcess);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('name="Тестовый процесс"');
      expect(xml).toContain('name="Менеджер"');
    });

    it("should handle null values gracefully", () => {
      const dbProcess = {
        id: 1,
        title: "Пустой процесс",
        roles: null,
        stages: null,
        steps: null,
      };
      
      const xml = generateBPMNFromDbProcess(dbProcess);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('name="Пустой процесс"');
    });
  });

  describe("BPMN element IDs", () => {
    it("should generate valid IDs without special characters", () => {
      const xml = generateBPMNXML(mockProcess);
      
      // IDs should not contain XML-breaking characters like < > &
      // Note: quotes are allowed inside attribute values when properly escaped
      expect(xml).not.toMatch(/id="[^"]*[<>&]/);
    });

    it("should generate unique IDs for each element", () => {
      const xml = generateBPMNXML(mockProcess);
      
      // Extract all IDs
      const idMatches = xml.match(/id="([^"]+)"/g) || [];
      const ids = idMatches.map(m => m.replace(/id="|"/g, ''));
      
      // Check for uniqueness
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
