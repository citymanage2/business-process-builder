import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

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

interface Step {
  id: string;
  stageId: string;
  roleId: string;
  type: string;
  name: string;
  description?: string;
  order: number;
  duration?: string;
  actions?: string[];
  previousSteps?: string[];
  nextSteps?: string[];
}

interface ProcessDiagramSwimlaneProps {
  roles: Role[];
  stages: Stage[];
  steps: Step[];
  title: string;
}

export default function ProcessDiagramSwimlane({ roles, stages, steps, title }: ProcessDiagramSwimlaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);

  // Константы для размеров
  const STAGE_HEADER_HEIGHT = 60;
  const ROLE_LABEL_WIDTH = 180;
  const STEP_WIDTH = 200;
  const STEP_HEIGHT = 120;
  const STEP_MARGIN = 40;
  const LANE_HEIGHT = STEP_HEIGHT + STEP_MARGIN * 2;

  // Цветовая палитра для ролей
  const ROLE_COLORS = [
    "#E3F2FD", // Светло-голубой
    "#F3E5F5", // Светло-фиолетовый
    "#E8F5E9", // Светло-зеленый
    "#FFF3E0", // Светло-оранжевый
    "#FCE4EC", // Светло-розовый
    "#F1F8E9", // Светло-лаймовый
    "#E0F2F1", // Светло-бирюзовый
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Рассчитываем размеры canvas
    const stagesCount = stages.length;
    const canvasWidth = ROLE_LABEL_WIDTH + stagesCount * (STEP_WIDTH + STEP_MARGIN * 2) + 100;
    const canvasHeight = STAGE_HEADER_HEIGHT + roles.length * LANE_HEIGHT + 50;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Очищаем canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Рисуем заголовки этапов сверху
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    stages.forEach((stage, index) => {
      const x = ROLE_LABEL_WIDTH + index * (STEP_WIDTH + STEP_MARGIN * 2) + (STEP_WIDTH + STEP_MARGIN * 2) / 2;
      const y = STAGE_HEADER_HEIGHT / 2;
      
      // Фон заголовка этапа
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(
        ROLE_LABEL_WIDTH + index * (STEP_WIDTH + STEP_MARGIN * 2),
        0,
        STEP_WIDTH + STEP_MARGIN * 2,
        STAGE_HEADER_HEIGHT
      );
      
      // Текст заголовка
      ctx.fillStyle = "#333";
      ctx.fillText(stage.name, x, y);
    });

    // Рисуем дорожки ролей
    roles.forEach((role, roleIndex) => {
      const y = STAGE_HEADER_HEIGHT + roleIndex * LANE_HEIGHT;
      const color = role.color || ROLE_COLORS[roleIndex % ROLE_COLORS.length];
      
      // Фон дорожки
      ctx.fillStyle = color;
      ctx.fillRect(0, y, canvasWidth, LANE_HEIGHT);
      
      // Граница дорожки
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y, canvasWidth, LANE_HEIGHT);
      
      // Метка роли слева
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, y, ROLE_LABEL_WIDTH, LANE_HEIGHT);
      ctx.strokeRect(0, y, ROLE_LABEL_WIDTH, LANE_HEIGHT);
      
      ctx.fillStyle = "#333";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      
      // Перенос текста роли если длинный
      const words = role.name.split(" ");
      let line = "";
      let lineY = y + LANE_HEIGHT / 2 - 10;
      
      words.forEach((word, i) => {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > ROLE_LABEL_WIDTH - 20 && i > 0) {
          ctx.fillText(line, 10, lineY);
          line = word + " ";
          lineY += 16;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, 10, lineY);
    });

    // Группируем шаги по этапам и ролям
    const stepsByStageAndRole: Record<string, Record<string, Step[]>> = {};
    
    steps.forEach(step => {
      if (!stepsByStageAndRole[step.stageId]) {
        stepsByStageAndRole[step.stageId] = {};
      }
      if (!stepsByStageAndRole[step.stageId][step.roleId]) {
        stepsByStageAndRole[step.stageId][step.roleId] = [];
      }
      stepsByStageAndRole[step.stageId][step.roleId].push(step);
    });

    // Позиции блоков для рисования связей
    const stepPositions: Record<string, { x: number; y: number; width: number; height: number }> = {};

    // Рисуем блоки шагов
    stages.forEach((stage, stageIndex) => {
      roles.forEach((role, roleIndex) => {
        const stepsInCell = stepsByStageAndRole[stage.id]?.[role.id] || [];
        
        stepsInCell.forEach((step, stepIndexInCell) => {
          const x = ROLE_LABEL_WIDTH + stageIndex * (STEP_WIDTH + STEP_MARGIN * 2) + STEP_MARGIN;
          const y = STAGE_HEADER_HEIGHT + roleIndex * LANE_HEIGHT + STEP_MARGIN + stepIndexInCell * (STEP_HEIGHT + 10);
          
          // Сохраняем позицию для рисования связей
          stepPositions[step.id] = { x, y, width: STEP_WIDTH, height: STEP_HEIGHT };
          
          // Цвет блока в зависимости от типа
          let blockColor = "#ffffff";
          let borderColor = "#333";
          
          switch (step.type) {
            case "Start":
              blockColor = "#4CAF50";
              borderColor = "#2E7D32";
              break;
            case "End":
              blockColor = "#F44336";
              borderColor = "#C62828";
              break;
            case "Decision":
              blockColor = "#FFC107";
              borderColor = "#F57C00";
              break;
            case "Action":
              blockColor = "#2196F3";
              borderColor = "#1565C0";
              break;
            default:
              blockColor = "#E0E0E0";
              borderColor = "#757575";
          }
          
          // Рисуем блок
          ctx.fillStyle = blockColor;
          ctx.fillRect(x, y, STEP_WIDTH, STEP_HEIGHT);
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, STEP_WIDTH, STEP_HEIGHT);
          
          // Текст внутри блока
          ctx.fillStyle = step.type === "Start" || step.type === "End" ? "#ffffff" : "#000000";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          
          // ID шага
          ctx.fillText(step.id, x + STEP_WIDTH / 2, y + 8);
          
          // Название шага (перенос по словам)
          ctx.font = "11px sans-serif";
          const nameWords = (step.name || "").split(" ");
          let nameLine = "";
          let nameY = y + 28;
          const maxWidth = STEP_WIDTH - 16;
          
          nameWords.forEach((word, i) => {
            const testLine = nameLine + word + " ";
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
              ctx.fillText(nameLine, x + STEP_WIDTH / 2, nameY);
              nameLine = word + " ";
              nameY += 14;
            } else {
              nameLine = testLine;
            }
          });
          if (nameLine) {
            ctx.fillText(nameLine, x + STEP_WIDTH / 2, nameY);
          }
          
          // Длительность внизу
          if (step.duration) {
            ctx.font = "10px sans-serif";
            ctx.fillStyle = "#666";
            ctx.fillText(step.duration, x + STEP_WIDTH / 2, y + STEP_HEIGHT - 12);
          }
        });
      });
    });

    // Рисуем связи между блоками
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    
    steps.forEach(step => {
      const fromPos = stepPositions[step.id];
      if (!fromPos || !step.nextSteps) return;
      
      step.nextSteps.forEach(nextStepId => {
        const toPos = stepPositions[nextStepId];
        if (!toPos) return;
        
        // Рисуем стрелку от правого края текущего блока к левому краю следующего
        const fromX = fromPos.x + fromPos.width;
        const fromY = fromPos.y + fromPos.height / 2;
        const toX = toPos.x;
        const toY = toPos.y + toPos.height / 2;
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        
        // Если блоки на одной линии - прямая стрелка
        if (Math.abs(fromY - toY) < 10) {
          ctx.lineTo(toX, toY);
        } else {
          // Иначе - ломаная линия
          const midX = (fromX + toX) / 2;
          ctx.lineTo(midX, fromY);
          ctx.lineTo(midX, toY);
          ctx.lineTo(toX, toY);
        }
        
        ctx.stroke();
        
        // Стрелка
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 8, toY - 5);
        ctx.lineTo(toX - 8, toY + 5);
        ctx.closePath();
        ctx.fillStyle = "#666";
        ctx.fill();
        ctx.setLineDash([5, 3]);
      });
    });

  }, [roles, stages, steps, zoom]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleFitToScreen = () => {
    setZoom(1);
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleFitToScreen}>
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="overflow-auto border rounded-lg bg-white"
        style={{ maxHeight: "800px" }}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <canvas ref={canvasRef} />
        </div>
      </div>

      {selectedStep && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">{selectedStep.name}</h4>
          <p className="text-sm text-muted-foreground mb-2">{selectedStep.description}</p>
          {selectedStep.actions && selectedStep.actions.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1">Действия:</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                {selectedStep.actions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
