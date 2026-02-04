/**
 * BPMN 2.0 XML Export Utility
 * Генерирует валидный BPMN 2.0 XML для интеграции с Camunda, Bizagi, и другими системами
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
  id: string;
  name: string;
  roles: Role[];
  stages: Stage[];
  steps: Step[];
}

// Маппинг типов блоков на BPMN элементы
function mapStepTypeToBPMN(type: Step["type"]): string {
  switch (type) {
    case "Start":
      return "startEvent";
    case "End":
      return "endEvent";
    case "Decision":
      return "exclusiveGateway";
    case "Split":
      return "parallelGateway";
    case "Action":
    case "Product":
    default:
      return "task";
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
  const processId = generateBpmnId("Process", process.id);
  const collaborationId = generateBpmnId("Collaboration", process.id);
  
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
        sequenceFlows.push({
          id: generateFlowId(step.id, nextStepId),
          sourceRef: sourceId,
          targetRef: generateBpmnId("Activity", nextStepId),
        });
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

  <bpmn:collaboration id="${collaborationId}">
`;

  // Добавляем участников (Lanes/Roles)
  process.roles.forEach((role, index) => {
    const participantId = generateBpmnId("Participant", role.id);
    xml += `    <bpmn:participant id="${participantId}" name="${escapeXml(role.name)}" processRef="${processId}_${role.id}" />\n`;
  });

  xml += `  </bpmn:collaboration>\n\n`;

  // Генерируем процесс для каждой роли
  process.roles.forEach(role => {
    const roleProcessId = `${processId}_${role.id}`;
    const roleSteps = process.steps.filter(s => s.roleId === role.id);
    
    xml += `  <bpmn:process id="${roleProcessId}" name="${escapeXml(role.name)}" isExecutable="true">\n`;
    
    // Добавляем Lane Set
    xml += `    <bpmn:laneSet id="LaneSet_${role.id}">\n`;
    xml += `      <bpmn:lane id="Lane_${role.id}" name="${escapeXml(role.name)}">\n`;
    
    roleSteps.forEach(step => {
      xml += `        <bpmn:flowNodeRef>${generateBpmnId("Activity", step.id)}</bpmn:flowNodeRef>\n`;
    });
    
    xml += `      </bpmn:lane>\n`;
    xml += `    </bpmn:laneSet>\n`;
    
    // Добавляем элементы процесса
    roleSteps.forEach(step => {
      const elementId = generateBpmnId("Activity", step.id);
      const bpmnType = mapStepTypeToBPMN(step.type);
      
      // Собираем входящие и исходящие потоки
      const incoming = sequenceFlows.filter(f => f.targetRef === elementId);
      const outgoing = sequenceFlows.filter(f => f.sourceRef === elementId);
      
      // Находим default flow для Gateway
      const defaultFlow = step.branches?.find(b => b.isDefault);
      const defaultAttr = defaultFlow ? ` default="${generateFlowId(step.id, defaultFlow.targetStepId)}"` : "";
      
      xml += `    <bpmn:${bpmnType} id="${elementId}" name="${escapeXml(step.name)}"${defaultAttr}>\n`;
      
      // Добавляем документацию с описанием и параметрами
      if (step.description || (step.parameters && step.parameters.length > 0)) {
        xml += `      <bpmn:documentation>\n`;
        if (step.description) {
          xml += `        ${escapeXml(step.description)}\n`;
        }
        if (step.parameters && step.parameters.length > 0) {
          xml += `        \nПараметры:\n`;
          step.parameters.forEach(param => {
            const typeLabel = {
              time: "Время",
              document: "Документ",
              database: "Система",
              stage: "Этап",
              environment: "Среда"
            }[param.type] || param.type;
            xml += `        - ${typeLabel}: ${escapeXml(param.value)}\n`;
          });
        }
        xml += `      </bpmn:documentation>\n`;
      }
      
      // Входящие потоки
      incoming.forEach(flow => {
        xml += `      <bpmn:incoming>${flow.id}</bpmn:incoming>\n`;
      });
      
      // Исходящие потоки
      outgoing.forEach(flow => {
        xml += `      <bpmn:outgoing>${flow.id}</bpmn:outgoing>\n`;
      });
      
      xml += `    </bpmn:${bpmnType}>\n`;
    });
    
    // Добавляем Sequence Flows для этой роли
    const roleFlows = sequenceFlows.filter(flow => {
      const sourceStep = process.steps.find(s => generateBpmnId("Activity", s.id) === flow.sourceRef);
      return sourceStep && sourceStep.roleId === role.id;
    });
    
    roleFlows.forEach(flow => {
      const nameAttr = flow.name ? ` name="${escapeXml(flow.name)}"` : "";
      xml += `    <bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}"${nameAttr}`;
      
      // Добавляем условие для условных переходов
      if (flow.name && !flow.isDefault) {
        xml += `>\n`;
        xml += `      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(flow.name)}</bpmn:conditionExpression>\n`;
        xml += `    </bpmn:sequenceFlow>\n`;
      } else {
        xml += ` />\n`;
      }
    });
    
    xml += `  </bpmn:process>\n\n`;
  });

  // Добавляем BPMNDiagram для визуализации
  xml += `  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${collaborationId}">
`;

  // Добавляем shapes для участников
  const LANE_WIDTH = 350;
  const LANE_HEIGHT = 800;
  
  process.roles.forEach((role, index) => {
    const participantId = generateBpmnId("Participant", role.id);
    const x = 160 + index * LANE_WIDTH;
    
    xml += `      <bpmndi:BPMNShape id="${participantId}_di" bpmnElement="${participantId}" isHorizontal="false">
        <dc:Bounds x="${x}" y="80" width="${LANE_WIDTH}" height="${LANE_HEIGHT}" />
      </bpmndi:BPMNShape>\n`;
  });

  // Добавляем shapes для элементов
  const BLOCK_WIDTH = 100;
  const BLOCK_HEIGHT = 80;
  const VERTICAL_GAP = 120;
  
  process.roles.forEach((role, roleIndex) => {
    const roleSteps = process.steps
      .filter(s => s.roleId === role.id)
      .sort((a, b) => a.order - b.order);
    
    roleSteps.forEach((step, stepIndex) => {
      const elementId = generateBpmnId("Activity", step.id);
      const x = 185 + roleIndex * LANE_WIDTH;
      const y = 120 + stepIndex * VERTICAL_GAP;
      
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
      </bpmndi:BPMNShape>\n`;
    });
  });

  // Добавляем edges для Sequence Flows
  sequenceFlows.forEach(flow => {
    xml += `      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">
      </bpmndi:BPMNEdge>\n`;
  });

  xml += `    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  return xml;
}

/**
 * Скачивает BPMN XML как файл
 */
export function downloadBPMNFile(process: ProcessData, filename?: string): void {
  const xml = generateBPMNXML(process);
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${process.name.replace(/[^a-zA-Z0-9]/g, "_")}.bpmn`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
