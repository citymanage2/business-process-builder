/**
 * BPMN 2.0 XML Generator for Business Process Builder
 * Генерирует валидный BPMN 2.0 XML из данных процесса
 */

interface Role {
  id: string;
  name: string;
  color?: string;
}

interface Stage {
  id: string;
  name: string;
  order: number;
}

interface ActionParameter {
  type: "time" | "document" | "database" | "stage" | "environment";
  value: string;
}

interface Branch {
  condition?: string;
  targetStepId: string;
  isDefault?: boolean;
}

interface Step {
  id: string;
  stageId: string;
  roleId: string;
  type: "Start" | "Action" | "Product" | "Decision" | "Split" | "End";
  name: string;
  description?: string;
  order: number;
  parameters?: ActionParameter[];
  checklist?: string[];
  previousSteps?: string[];
  nextSteps?: string[];
  branches?: Branch[];
}

interface ProcessData {
  id: number;
  title: string;
  roles: Role[];
  stages: Stage[];
  steps: Step[];
}

// Маппинг типов блоков на BPMN элементы
function mapStepTypeToBPMN(type: Step["type"]): string {
  switch (type) {
    case "Start":
      return "bpmn:StartEvent";
    case "End":
      return "bpmn:EndEvent";
    case "Decision":
      return "bpmn:ExclusiveGateway";
    case "Split":
      return "bpmn:ParallelGateway";
    case "Action":
    case "Product":
    default:
      return "bpmn:Task";
  }
}

// Экранирование XML спецсимволов
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Генерация уникального ID для BPMN элементов
function generateBpmnId(prefix: string, id: string): string {
  return `${prefix}_${id.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

// Генерация Sequence Flow ID
function generateFlowId(sourceId: string, targetId: string): string {
  return `Flow_${sourceId.replace(/[^a-zA-Z0-9]/g, "_")}_to_${targetId.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

/**
 * Генерирует BPMN 2.0 XML из данных процесса
 */
export function generateBPMNXML(process: ProcessData): string {
  const processId = generateBpmnId("Process", String(process.id));
  
  // Собираем все Sequence Flows
  const sequenceFlows: Array<{
    id: string;
    sourceRef: string;
    targetRef: string;
    name?: string;
    isDefault?: boolean;
  }> = [];

  process.steps.forEach(step => {
    const sourceId = generateBpmnId("Activity", step.id);
    
    // Обычные связи nextSteps
    if (step.nextSteps) {
      step.nextSteps.forEach(nextStepId => {
        // Проверяем, что связь не дублируется через branches
        const hasBranch = step.branches?.some(b => b.targetStepId === nextStepId);
        if (!hasBranch) {
          sequenceFlows.push({
            id: generateFlowId(step.id, nextStepId),
            sourceRef: sourceId,
            targetRef: generateBpmnId("Activity", nextStepId),
          });
        }
      });
    }
    
    // Связи из веток (Decision)
    if (step.branches) {
      step.branches.forEach(branch => {
        sequenceFlows.push({
          id: generateFlowId(step.id, branch.targetStepId),
          sourceRef: sourceId,
          targetRef: generateBpmnId("Activity", branch.targetStepId),
          name: branch.condition,
          isDefault: branch.isDefault,
        });
      });
    }
  });

  // Расчёт позиций элементов
  const LANE_WIDTH = 200;
  const LANE_HEADER = 30;
  const BLOCK_WIDTH = 100;
  const BLOCK_HEIGHT = 80;
  const VERTICAL_GAP = 120;
  const START_X = 200;
  const START_Y = 100;
  
  // Группируем шаги по ролям
  const stepsByRole: Map<string, Step[]> = new Map();
  process.roles.forEach(role => {
    stepsByRole.set(role.id, process.steps.filter(s => s.roleId === role.id).sort((a, b) => a.order - b.order));
  });
  
  // Вычисляем максимальное количество шагов в роли
  let maxSteps = 0;
  stepsByRole.forEach(steps => {
    if (steps.length > maxSteps) maxSteps = steps.length;
  });
  
  const totalHeight = Math.max(400, maxSteps * VERTICAL_GAP + 200);

  // Генерируем XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="Definitions_${process.id}"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="Business Process Builder"
  exporterVersion="1.0">

  <bpmn:process id="${processId}" name="${escapeXml(process.title)}" isExecutable="true">
    <bpmn:laneSet id="LaneSet_1">
`;

  // Добавляем Lanes для каждой роли
  process.roles.forEach((role) => {
    const laneId = generateBpmnId("Lane", role.id);
    const roleSteps = stepsByRole.get(role.id) || [];
    
    xml += `      <bpmn:lane id="${laneId}" name="${escapeXml(role.name)}">
`;
    roleSteps.forEach(step => {
      xml += `        <bpmn:flowNodeRef>${generateBpmnId("Activity", step.id)}</bpmn:flowNodeRef>
`;
    });
    xml += `      </bpmn:lane>
`;
  });

  xml += `    </bpmn:laneSet>
`;

  // Добавляем элементы процесса
  process.steps.forEach(step => {
    const elementId = generateBpmnId("Activity", step.id);
    const bpmnType = mapStepTypeToBPMN(step.type);
    const tagName = bpmnType.replace("bpmn:", "");
    
    // Собираем входящие и исходящие потоки
    const incoming = sequenceFlows.filter(f => f.targetRef === elementId);
    const outgoing = sequenceFlows.filter(f => f.sourceRef === elementId);
    
    // Находим default flow для Gateway
    const defaultFlow = step.branches?.find(b => b.isDefault);
    const defaultAttr = defaultFlow ? ` default="${generateFlowId(step.id, defaultFlow.targetStepId)}"` : "";
    
    xml += `    <bpmn:${tagName} id="${elementId}" name="${escapeXml(step.name)}"${defaultAttr}>
`;
    
    // Добавляем документацию с описанием и параметрами
    if (step.description || (step.parameters && step.parameters.length > 0)) {
      xml += `      <bpmn:documentation>`;
      if (step.description) {
        xml += escapeXml(step.description);
      }
      if (step.parameters && step.parameters.length > 0) {
        xml += `\nПараметры:\n`;
        step.parameters.forEach(param => {
          const typeLabel = {
            time: "Время",
            document: "Документ",
            database: "Система",
            stage: "Этап",
            environment: "Среда"
          }[param.type] || param.type;
          xml += `- ${typeLabel}: ${escapeXml(param.value)}\n`;
        });
      }
      xml += `</bpmn:documentation>
`;
    }
    
    // Входящие потоки
    incoming.forEach(flow => {
      xml += `      <bpmn:incoming>${flow.id}</bpmn:incoming>
`;
    });
    
    // Исходящие потоки
    outgoing.forEach(flow => {
      xml += `      <bpmn:outgoing>${flow.id}</bpmn:outgoing>
`;
    });
    
    xml += `    </bpmn:${tagName}>
`;
  });

  // Добавляем Sequence Flows
  sequenceFlows.forEach(flow => {
    const nameAttr = flow.name ? ` name="${escapeXml(flow.name)}"` : "";
    xml += `    <bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}"${nameAttr}`;
    
    // Добавляем условие для условных переходов
    if (flow.name && !flow.isDefault) {
      xml += `>
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(flow.name)}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
`;
    } else {
      xml += ` />
`;
    }
  });

  xml += `  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
`;

  // Добавляем shapes для Lanes
  process.roles.forEach((role, index) => {
    const laneId = generateBpmnId("Lane", role.id);
    const x = START_X + index * LANE_WIDTH;
    
    xml += `      <bpmndi:BPMNShape id="${laneId}_di" bpmnElement="${laneId}" isHorizontal="false">
        <dc:Bounds x="${x}" y="${START_Y}" width="${LANE_WIDTH}" height="${totalHeight}" />
      </bpmndi:BPMNShape>
`;
  });

  // Добавляем shapes для элементов
  process.roles.forEach((role, roleIndex) => {
    const roleSteps = stepsByRole.get(role.id) || [];
    
    roleSteps.forEach((step, stepIndex) => {
      const elementId = generateBpmnId("Activity", step.id);
      const x = START_X + roleIndex * LANE_WIDTH + (LANE_WIDTH - BLOCK_WIDTH) / 2;
      const y = START_Y + LANE_HEADER + stepIndex * VERTICAL_GAP + 20;
      
      let width = BLOCK_WIDTH;
      let height = BLOCK_HEIGHT;
      
      // Для Gateway используем ромб
      if (step.type === "Decision" || step.type === "Split") {
        width = 50;
        height = 50;
      }
      // Для Start/End используем круг
      if (step.type === "Start" || step.type === "End") {
        width = 36;
        height = 36;
      }
      
      xml += `      <bpmndi:BPMNShape id="${elementId}_di" bpmnElement="${elementId}">
        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="${x - 10}" y="${y + height + 5}" width="${width + 20}" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
`;
    });
  });

  // Добавляем edges для Sequence Flows (простые прямые линии)
  sequenceFlows.forEach(flow => {
    const sourceStep = process.steps.find(s => generateBpmnId("Activity", s.id) === flow.sourceRef);
    const targetStep = process.steps.find(s => generateBpmnId("Activity", s.id) === flow.targetRef);
    
    if (sourceStep && targetStep) {
      const sourceRoleIndex = process.roles.findIndex(r => r.id === sourceStep.roleId);
      const targetRoleIndex = process.roles.findIndex(r => r.id === targetStep.roleId);
      
      const sourceSteps = stepsByRole.get(sourceStep.roleId) || [];
      const targetSteps = stepsByRole.get(targetStep.roleId) || [];
      const sourceStepIndex = sourceSteps.findIndex(s => s.id === sourceStep.id);
      const targetStepIndex = targetSteps.findIndex(s => s.id === targetStep.id);
      
      const sourceX = START_X + sourceRoleIndex * LANE_WIDTH + LANE_WIDTH / 2;
      const sourceY = START_Y + LANE_HEADER + sourceStepIndex * VERTICAL_GAP + 20 + BLOCK_HEIGHT / 2;
      const targetX = START_X + targetRoleIndex * LANE_WIDTH + LANE_WIDTH / 2;
      const targetY = START_Y + LANE_HEADER + targetStepIndex * VERTICAL_GAP + 20 + BLOCK_HEIGHT / 2;
      
      xml += `      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">
        <di:waypoint x="${sourceX}" y="${sourceY}" />
        <di:waypoint x="${targetX}" y="${targetY}" />
      </bpmndi:BPMNEdge>
`;
    }
  });

  xml += `    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  return xml;
}

/**
 * Генерирует BPMN XML из данных процесса, полученных из БД
 */
export function generateBPMNFromDbProcess(dbProcess: {
  id: number;
  title: string;
  roles: string | null;
  stages: string | null;
  steps: string | null;
}): string {
  const processData: ProcessData = {
    id: dbProcess.id,
    title: dbProcess.title,
    roles: dbProcess.roles ? JSON.parse(dbProcess.roles) : [],
    stages: dbProcess.stages ? JSON.parse(dbProcess.stages) : [],
    steps: dbProcess.steps ? JSON.parse(dbProcess.steps) : [],
  };
  
  return generateBPMNXML(processData);
}
