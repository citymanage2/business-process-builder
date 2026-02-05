import { useEffect, useRef, useState, useCallback } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import { Button } from "@/components/ui/button";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Download, 
  Upload, 
  Save,
  Undo,
  Redo,
  FileCode,
  Image
} from "lucide-react";
import { toast } from "sonner";

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

interface BpmnEditorProps {
  process: ProcessData;
  onSave?: (xml: string) => void;
  editable?: boolean;
  height?: string;
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
function generateBPMNXML(process: ProcessData): string {
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
  const totalWidth = process.roles.length * LANE_WIDTH + 200;

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
  process.roles.forEach((role, index) => {
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

  // Добавляем edges для Sequence Flows
  sequenceFlows.forEach(flow => {
    xml += `      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">
      </bpmndi:BPMNEdge>
`;
  });

  xml += `    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  return xml;
}

export default function BpmnEditor({ 
  process, 
  onSave, 
  editable = true,
  height = "600px" 
}: BpmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentXml, setCurrentXml] = useState<string>("");

  // Инициализация редактора
  useEffect(() => {
    if (!containerRef.current) return;

    const modeler = new BpmnModeler({
      container: containerRef.current,
      keyboard: {
        bindTo: document
      }
    });

    modelerRef.current = modeler;

    // Генерируем XML из данных процесса
    const xml = generateBPMNXML(process);
    setCurrentXml(xml);

    // Импортируем XML в редактор
    modeler.importXML(xml).then(({ warnings }) => {
      if (warnings.length) {
        console.warn("BPMN import warnings:", warnings);
      }
      setIsLoaded(true);
      
      // Центрируем диаграмму
      const canvas = modeler.get("canvas") as any;
      canvas.zoom("fit-viewport");
    }).catch((err: Error) => {
      console.error("BPMN import error:", err);
      toast.error("Ошибка загрузки диаграммы");
    });

    // Слушаем изменения
    modeler.on("commandStack.changed", () => {
      modeler.saveXML({ format: true }).then(({ xml }) => {
        if (xml) {
          setCurrentXml(xml);
        }
      });
    });

    return () => {
      modeler.destroy();
    };
  }, [process]);

  // Zoom In
  const handleZoomIn = useCallback(() => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get("canvas") as any;
    const currentZoom = canvas.zoom();
    canvas.zoom(currentZoom * 1.2);
  }, []);

  // Zoom Out
  const handleZoomOut = useCallback(() => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get("canvas") as any;
    const currentZoom = canvas.zoom();
    canvas.zoom(currentZoom / 1.2);
  }, []);

  // Fit to viewport
  const handleFitViewport = useCallback(() => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get("canvas") as any;
    canvas.zoom("fit-viewport");
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (!modelerRef.current) return;
    const commandStack = modelerRef.current.get("commandStack") as any;
    commandStack.undo();
  }, []);

  // Redo
  const handleRedo = useCallback(() => {
    if (!modelerRef.current) return;
    const commandStack = modelerRef.current.get("commandStack") as any;
    commandStack.redo();
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    if (!modelerRef.current) return;
    
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      if (xml && onSave) {
        onSave(xml);
        toast.success("Диаграмма сохранена");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Ошибка сохранения");
    }
  }, [onSave]);

  // Export as BPMN XML
  const handleExportXML = useCallback(async () => {
    if (!modelerRef.current) return;
    
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      if (xml) {
        const blob = new Blob([xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${process.title.replace(/[^a-zA-Z0-9а-яА-Я]/g, "_")}.bpmn`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("BPMN XML экспортирован");
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Ошибка экспорта");
    }
  }, [process.title]);

  // Export as SVG
  const handleExportSVG = useCallback(async () => {
    if (!modelerRef.current) return;
    
    try {
      const { svg } = await modelerRef.current.saveSVG();
      if (svg) {
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${process.title.replace(/[^a-zA-Z0-9а-яА-Я]/g, "_")}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("SVG экспортирован");
      }
    } catch (err) {
      console.error("SVG export error:", err);
      toast.error("Ошибка экспорта SVG");
    }
  }, [process.title]);

  // Import BPMN file
  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".bpmn,.xml";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !modelerRef.current) return;
      
      try {
        const xml = await file.text();
        await modelerRef.current.importXML(xml);
        setCurrentXml(xml);
        
        const canvas = modelerRef.current.get("canvas") as any;
        canvas.zoom("fit-viewport");
        
        toast.success("Диаграмма импортирована");
      } catch (err) {
        console.error("Import error:", err);
        toast.error("Ошибка импорта файла");
      }
    };
    input.click();
  }, []);

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap">
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            title="Увеличить"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            title="Уменьшить"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFitViewport}
            title="По размеру"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        {editable && (
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              title="Отменить"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              title="Повторить"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportXML}
            title="Экспорт BPMN XML"
          >
            <FileCode className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportSVG}
            title="Экспорт SVG"
          >
            <Image className="w-4 h-4" />
          </Button>
          {editable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleImport}
              title="Импорт BPMN"
            >
              <Upload className="w-4 h-4" />
            </Button>
          )}
        </div>

        {editable && onSave && (
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Сохранить
          </Button>
        )}

        <div className="flex-1" />
        
        <span className="text-xs text-muted-foreground">
          Powered by bpmn.io
        </span>
      </div>

      {/* Editor container */}
      <div 
        ref={containerRef} 
        style={{ height }}
        className="relative"
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Загрузка редактора...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
