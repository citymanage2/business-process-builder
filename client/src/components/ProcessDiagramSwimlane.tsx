import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";

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

// Параметры действия согласно ТЗ
interface ActionParameter {
  type: "time" | "document" | "database" | "stage";
  value: string;
}

// Ветвление/условие
interface Branch {
  condition?: string; // Для условий типа "Да/Нет"
  targetStepId: string;
}

interface Step {
  id: string;
  stageId: string;
  roleId: string;
  // Типы блоков согласно ТЗ: Start, Action, Product, Decision, Split, End
  type: "Start" | "Action" | "Product" | "Decision" | "Split" | "End";
  name: string;
  description?: string;
  order: number;
  // Параметры действия (только для type === "Action")
  parameters?: ActionParameter[];
  // Чек-лист (подробное описание)
  checklist?: string[];
  // Связи
  previousSteps?: string[];
  nextSteps?: string[];
  // Ветвления (для Decision и Split)
  branches?: Branch[];
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

  // Константы для размеров согласно ТЗ
  const STAGE_HEADER_HEIGHT = 80;
  const ROLE_LABEL_WIDTH = 200;
  const BLOCK_WIDTH = 180;
  const BLOCK_HEIGHT = 80;
  const BLOCK_MARGIN_X = 60;
  const BLOCK_MARGIN_Y = 40;
  const LANE_HEIGHT = BLOCK_HEIGHT + BLOCK_MARGIN_Y * 4;
  const PARAMETER_SIZE = 50;
  const PARAMETER_MARGIN = 10;

  // Пастельная палитра для дорожек согласно ТЗ
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
    const canvasWidth = ROLE_LABEL_WIDTH + stagesCount * (BLOCK_WIDTH + BLOCK_MARGIN_X * 2) + 100;
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
      const x = ROLE_LABEL_WIDTH + index * (BLOCK_WIDTH + BLOCK_MARGIN_X * 2) + (BLOCK_WIDTH + BLOCK_MARGIN_X * 2) / 2;
      const y = STAGE_HEADER_HEIGHT / 2;
      
      // Фон заголовка этапа
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(
        ROLE_LABEL_WIDTH + index * (BLOCK_WIDTH + BLOCK_MARGIN_X * 2),
        0,
        BLOCK_WIDTH + BLOCK_MARGIN_X * 2,
        STAGE_HEADER_HEIGHT
      );
      
      // Граница
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        ROLE_LABEL_WIDTH + index * (BLOCK_WIDTH + BLOCK_MARGIN_X * 2),
        0,
        BLOCK_WIDTH + BLOCK_MARGIN_X * 2,
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
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Перенос текста роли если длинный
      const words = role.name.split(" ");
      let line = "";
      let lineY = y + LANE_HEIGHT / 2 - 10;
      const maxWidth = ROLE_LABEL_WIDTH - 20;
      
      words.forEach((word, i) => {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, ROLE_LABEL_WIDTH / 2, lineY);
          line = word + " ";
          lineY += 16;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, ROLE_LABEL_WIDTH / 2, lineY);
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

    // Функция для рисования блока "Запуск процесса" (пилюля)
    const drawStartBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) => {
      const radius = height / 2;
      
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#4CAF50"; // Зелёная обводка
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + radius, y + height);
      ctx.arc(x + radius, y + radius, radius, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Текст
      ctx.fillStyle = "#333";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapText(ctx, text, x + width / 2, y + height / 2, width - 20, 14);
    };

    // Функция для рисования блока "Действие" (шестиугольник)
    const drawActionBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) => {
      const indent = 15;
      
      ctx.fillStyle = "#E0E0E0"; // Светло-серая заливка
      ctx.strokeStyle = "#000000"; // Чёрная обводка
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(x + indent, y);
      ctx.lineTo(x + width - indent, y);
      ctx.lineTo(x + width, y + height / 2);
      ctx.lineTo(x + width - indent, y + height);
      ctx.lineTo(x + indent, y + height);
      ctx.lineTo(x, y + height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Текст
      ctx.fillStyle = "#000000";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapText(ctx, text, x + width / 2, y + height / 2, width - 40, 14);
    };

    // Функция для рисования блока "Продукт" (скруглённый прямоугольник)
    const drawProductBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) => {
      const radius = 8;
      
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
      ctx.lineTo(x + radius, y + height);
      ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
      ctx.lineTo(x, y + radius);
      ctx.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Текст
      ctx.fillStyle = "#000000";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapText(ctx, text, x + width / 2, y + height / 2, width - 20, 14);
    };

    // Функция для рисования блока "Завершение" (прямоугольник с двойными линиями)
    const drawEndBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      
      // Основной прямоугольник
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
      
      // Двойные вертикальные линии по краям
      ctx.beginPath();
      ctx.moveTo(x + 5, y);
      ctx.lineTo(x + 5, y + height);
      ctx.moveTo(x + width - 5, y);
      ctx.lineTo(x + width - 5, y + height);
      ctx.stroke();
      
      // Текст
      ctx.fillStyle = "#000000";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapText(ctx, text, x + width / 2, y + height / 2, width - 30, 14);
    };

    // Функция для рисования блока "Разделение" (перевёрнутый треугольник)
    const drawSplitBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2196F3"; // Синяя обводка
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y + height);
      ctx.lineTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    // Функция для рисования условия/ИЛИ (маркер)
    const drawDecisionMarker = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2196F3";
      ctx.lineWidth = 2;
      
      // Шестиугольник маркер
      const indent = size / 4;
      ctx.beginPath();
      ctx.moveTo(x + indent, y);
      ctx.lineTo(x + size - indent, y);
      ctx.lineTo(x + size, y + size / 2);
      ctx.lineTo(x + size - indent, y + size);
      ctx.lineTo(x + indent, y + size);
      ctx.lineTo(x, y + size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Символ "ИЛИ" внутри
      ctx.fillStyle = "#2196F3";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", x + size / 2, y + size / 2);
    };

    // Функция для рисования параметра действия
    const drawParameter = (ctx: CanvasRenderingContext2D, x: number, y: number, parameter: ActionParameter) => {
      const width = PARAMETER_SIZE;
      const height = PARAMETER_SIZE;
      
      ctx.fillStyle = "#FFF9C4"; // Светло-жёлтая заливка
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      
      switch (parameter.type) {
        case "time":
          // Плашка
          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
          ctx.fillStyle = "#000000";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⏱", x + width / 2, y + height / 2 - 8);
          ctx.font = "9px sans-serif";
          wrapText(ctx, parameter.value, x + width / 2, y + height / 2 + 8, width - 8, 10);
          break;
          
        case "document":
          // Лист с волнистым низом
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y + height - 10);
          // Волнистый низ
          ctx.quadraticCurveTo(x + width * 0.75, y + height - 5, x + width / 2, y + height - 10);
          ctx.quadraticCurveTo(x + width * 0.25, y + height - 15, x, y + height - 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#000000";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText("📄", x + width / 2, y + 5);
          ctx.font = "8px sans-serif";
          wrapText(ctx, parameter.value, x + width / 2, y + 22, width - 8, 9);
          break;
          
        case "database":
          // Цилиндр
          const ellipseHeight = 10;
          ctx.beginPath();
          ctx.ellipse(x + width / 2, y + ellipseHeight / 2, width / 2, ellipseHeight / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.fillRect(x, y + ellipseHeight / 2, width, height - ellipseHeight);
          ctx.strokeRect(x, y + ellipseHeight / 2, width, height - ellipseHeight);
          
          ctx.beginPath();
          ctx.ellipse(x + width / 2, y + height - ellipseHeight / 2, width / 2, ellipseHeight / 2, 0, 0, Math.PI);
          ctx.stroke();
          
          ctx.fillStyle = "#000000";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🗄", x + width / 2, y + height / 2 - 5);
          ctx.font = "8px sans-serif";
          wrapText(ctx, parameter.value, x + width / 2, y + height / 2 + 8, width - 8, 9);
          break;
          
        case "stage":
          // Синяя трапеция
          ctx.fillStyle = "#2196F3";
          ctx.beginPath();
          ctx.moveTo(x + 10, y);
          ctx.lineTo(x + width - 10, y);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x, y + height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.font = "9px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          wrapText(ctx, parameter.value, x + width / 2, y + height / 2, width - 12, 10);
          break;
      }
    };

    // Вспомогательная функция для переноса текста
    const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const words = text.split(" ");
      let line = "";
      let currentY = y - (Math.ceil(words.length / 2) * lineHeight) / 2;
      
      words.forEach((word, i) => {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, x, currentY);
          line = word + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, x, currentY);
    };

    // Рисуем блоки шагов
    stages.forEach((stage, stageIndex) => {
      roles.forEach((role, roleIndex) => {
        const stepsInCell = stepsByStageAndRole[stage.id]?.[role.id] || [];
        
        stepsInCell.forEach((step, stepIndexInCell) => {
          const x = ROLE_LABEL_WIDTH + stageIndex * (BLOCK_WIDTH + BLOCK_MARGIN_X * 2) + BLOCK_MARGIN_X;
          const y = STAGE_HEADER_HEIGHT + roleIndex * LANE_HEIGHT + BLOCK_MARGIN_Y + stepIndexInCell * (BLOCK_HEIGHT + BLOCK_MARGIN_Y);
          
          // Сохраняем позицию для рисования связей
          stepPositions[step.id] = { x, y, width: BLOCK_WIDTH, height: BLOCK_HEIGHT };
          
          // Рисуем блок в зависимости от типа
          switch (step.type) {
            case "Start":
              drawStartBlock(ctx, x, y, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
              break;
            case "Action":
              drawActionBlock(ctx, x, y, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
              // Рисуем параметры действия слева от блока
              if (step.parameters && step.parameters.length > 0) {
                step.parameters.forEach((param, paramIndex) => {
                  const paramX = x - PARAMETER_SIZE - PARAMETER_MARGIN;
                  const paramY = y + paramIndex * (PARAMETER_SIZE + 5);
                  drawParameter(ctx, paramX, paramY, param);
                  
                  // Пунктирная линия к блоку
                  ctx.setLineDash([3, 3]);
                  ctx.strokeStyle = "#999";
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(paramX + PARAMETER_SIZE, paramY + PARAMETER_SIZE / 2);
                  ctx.lineTo(x, y + BLOCK_HEIGHT / 2);
                  ctx.stroke();
                  ctx.setLineDash([]);
                });
              }
              break;
            case "Product":
              drawProductBlock(ctx, x, y, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
              break;
            case "Split":
              drawSplitBlock(ctx, x, y, BLOCK_WIDTH, BLOCK_HEIGHT);
              break;
            case "Decision":
              drawDecisionMarker(ctx, x + BLOCK_WIDTH / 2 - 20, y, 40);
              break;
            case "End":
              drawEndBlock(ctx, x, y, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
              break;
          }
          
          // Рисуем чек-лист справа от блока (если есть)
          if (step.checklist && step.checklist.length > 0) {
            const checklistX = x + BLOCK_WIDTH + 20;
            const checklistY = y;
            
            // Фигурная скобка
            ctx.strokeStyle = "#666";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(checklistX, checklistY);
            ctx.quadraticCurveTo(checklistX + 10, checklistY + BLOCK_HEIGHT / 2, checklistX, checklistY + BLOCK_HEIGHT);
            ctx.stroke();
            
            // Текст чек-листа
            ctx.fillStyle = "#333";
            ctx.font = "10px sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            
            step.checklist.forEach((item, itemIndex) => {
              const itemY = checklistY + itemIndex * 14;
              ctx.fillText(`• ${item}`, checklistX + 15, itemY);
            });
          }
        });
      });
    });

    // Рисуем связи между блоками (ортогональные стрелки)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    
    steps.forEach(step => {
      const fromPos = stepPositions[step.id];
      if (!fromPos) return;
      
      // Обрабатываем ветвления
      if (step.branches && step.branches.length > 0) {
        step.branches.forEach((branch, branchIndex) => {
          const toPos = stepPositions[branch.targetStepId];
          if (!toPos) return;
          
          drawConnection(ctx, fromPos, toPos, branch.condition);
        });
      } else if (step.nextSteps && step.nextSteps.length > 0) {
        // Обычные связи
        step.nextSteps.forEach(nextStepId => {
          const toPos = stepPositions[nextStepId];
          if (!toPos) return;
          
          drawConnection(ctx, fromPos, toPos);
        });
      }
    });

    // Функция для рисования ортогональной связи
    function drawConnection(
      ctx: CanvasRenderingContext2D,
      from: { x: number; y: number; width: number; height: number },
      to: { x: number; y: number; width: number; height: number },
      label?: string
    ) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      let fromX, fromY, toX, toY;
      
      // Определяем направление
      const sameRow = Math.abs(from.y - to.y) < 10;
      const goingRight = to.x > from.x;
      const goingDown = to.y > from.y;
      
      if (sameRow) {
        // Горизонтальная связь
        fromX = from.x + from.width;
        fromY = from.y + from.height / 2;
        toX = to.x;
        toY = to.y + to.height / 2;
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // Стрелка
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 8, toY - 5);
        ctx.lineTo(toX - 8, toY + 5);
        ctx.closePath();
        ctx.fillStyle = "#000000";
        ctx.fill();
      } else if (goingDown) {
        // Вертикальная связь вниз
        fromX = from.x + from.width / 2;
        fromY = from.y + from.height;
        toX = to.x + to.width / 2;
        toY = to.y;
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        
        if (Math.abs(fromX - toX) < 10) {
          // Прямая вертикальная линия
          ctx.lineTo(toX, toY);
        } else {
          // Ломаная линия
          const midY = (fromY + toY) / 2;
          ctx.lineTo(fromX, midY);
          ctx.lineTo(toX, midY);
          ctx.lineTo(toX, toY);
        }
        
        ctx.stroke();
        
        // Стрелка
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 5, toY - 8);
        ctx.lineTo(toX + 5, toY - 8);
        ctx.closePath();
        ctx.fillStyle = "#000000";
        ctx.fill();
      } else {
        // Диагональная связь
        if (goingRight) {
          fromX = from.x + from.width;
          fromY = from.y + from.height / 2;
        } else {
          fromX = from.x;
          fromY = from.y + from.height / 2;
        }
        
        toX = to.x + to.width / 2;
        toY = to.y;
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(fromX + (goingRight ? 30 : -30), fromY);
        ctx.lineTo(fromX + (goingRight ? 30 : -30), toY - 30);
        ctx.lineTo(toX, toY - 30);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // Стрелка
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 5, toY - 8);
        ctx.lineTo(toX + 5, toY - 8);
        ctx.closePath();
        ctx.fillStyle = "#000000";
        ctx.fill();
      }
      
      // Подпись условия (если есть)
      if (label) {
        ctx.fillStyle = "#2196F3";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const labelX = (fromX + toX) / 2;
        const labelY = (fromY + toY) / 2;
        ctx.fillText(label, labelX, labelY - 10);
      }
    }

  }, [roles, stages, steps, zoom]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleFitToScreen = () => {
    setZoom(1);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = `${title.replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
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
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Скачать PNG
          </Button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="overflow-auto border rounded-lg bg-gray-50"
        style={{ maxHeight: "70vh" }}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
      
      {selectedStep && (
        <div className="mt-4 p-4 border rounded-lg bg-white">
          <h4 className="font-semibold mb-2">{selectedStep.name}</h4>
          {selectedStep.description && (
            <p className="text-sm text-gray-600 mb-2">{selectedStep.description}</p>
          )}
          {selectedStep.checklist && selectedStep.checklist.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Чек-лист:</p>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {selectedStep.checklist.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
