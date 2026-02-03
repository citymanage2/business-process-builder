import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Download, RotateCcw } from "lucide-react";

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
  condition?: string;
  targetStepId: string;
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

interface ProcessDiagramSwimlaneProps {
  roles: Role[];
  stages: Stage[];
  steps: Step[];
  title: string;
}

export default function ProcessDiagramSwimlane({ roles, stages, steps, title }: ProcessDiagramSwimlaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Константы для вертикальной ориентации (как в PDF)
  const ROLE_HEADER_HEIGHT = 60;
  const STAGE_LABEL_HEIGHT = 40;
  const LANE_WIDTH = 200;
  const BLOCK_WIDTH = 140;
  const BLOCK_HEIGHT = 50;
  const BLOCK_MARGIN_X = 30;
  const BLOCK_MARGIN_Y = 25;
  const PARAMETER_WIDTH = 60;
  const PARAMETER_HEIGHT = 25;

  // Пастельная палитра для дорожек (как в PDF)
  const ROLE_COLORS = [
    "#B3E5FC", // Голубой
    "#F8BBD9", // Розовый
    "#C8E6C9", // Зелёный
    "#FFF9C4", // Жёлтый
    "#E1BEE7", // Сиреневый
    "#FFECB3", // Оранжевый
    "#B2DFDB", // Бирюзовый
    "#D7CCC8", // Бежевый
    "#CFD8DC", // Серо-голубой
    "#DCEDC8", // Лаймовый
  ];

  // Функция для переноса текста
  const wrapText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number => {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    let lineCount = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[i] + " ";
        currentY += lineHeight;
        lineCount++;
        if (lineCount >= 3) {
          ctx.fillText(line.trim() + "...", x, currentY);
          return currentY + lineHeight;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    return currentY + lineHeight;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Сортируем роли и этапы
    const sortedRoles = [...roles];
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    // Группируем шаги по ролям
    const stepsByRole: Record<string, Step[]> = {};
    steps.forEach(step => {
      if (!stepsByRole[step.roleId]) {
        stepsByRole[step.roleId] = [];
      }
      stepsByRole[step.roleId].push(step);
    });

    // Сортируем шаги внутри каждой роли по order
    Object.keys(stepsByRole).forEach(roleId => {
      stepsByRole[roleId].sort((a, b) => a.order - b.order);
    });

    // Вычисляем максимальное количество шагов в любой роли
    let maxStepsInRole = 0;
    Object.values(stepsByRole).forEach(roleSteps => {
      maxStepsInRole = Math.max(maxStepsInRole, roleSteps.length);
    });

    // Рассчитываем размеры canvas
    const canvasWidth = sortedRoles.length * LANE_WIDTH + 100;
    const canvasHeight = ROLE_HEADER_HEIGHT + maxStepsInRole * (BLOCK_HEIGHT + BLOCK_MARGIN_Y * 2) + 200;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Очищаем canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Позиции блоков для рисования связей
    const stepPositions: Record<string, { x: number; y: number; width: number; height: number; roleIndex: number }> = {};

    // Рисуем вертикальные дорожки ролей
    sortedRoles.forEach((role, roleIndex) => {
      const x = roleIndex * LANE_WIDTH;
      const color = role.color || ROLE_COLORS[roleIndex % ROLE_COLORS.length];

      // Фон дорожки
      ctx.fillStyle = color;
      ctx.fillRect(x, 0, LANE_WIDTH, canvasHeight);

      // Граница дорожки
      ctx.strokeStyle = "#999";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + LANE_WIDTH, 0);
      ctx.lineTo(x + LANE_WIDTH, canvasHeight);
      ctx.stroke();

      // Заголовок роли сверху
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, 0, LANE_WIDTH, ROLE_HEADER_HEIGHT);
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 0, LANE_WIDTH, ROLE_HEADER_HEIGHT);

      // Текст заголовка роли
      ctx.fillStyle = "#333";
      ctx.font = "bold 12px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Перенос длинных названий ролей
      const roleWords = role.name.split(" ");
      let roleLine = "";
      let roleLineY = ROLE_HEADER_HEIGHT / 2 - 8;
      const maxRoleWidth = LANE_WIDTH - 20;
      
      roleWords.forEach((word, i) => {
        const testLine = roleLine + word + " ";
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxRoleWidth && i > 0) {
          ctx.fillText(roleLine.trim(), x + LANE_WIDTH / 2, roleLineY);
          roleLine = word + " ";
          roleLineY += 14;
        } else {
          roleLine = testLine;
        }
      });
      ctx.fillText(roleLine.trim(), x + LANE_WIDTH / 2, roleLineY);

      // Рисуем блоки для этой роли
      const roleSteps = stepsByRole[role.id] || [];
      
      roleSteps.forEach((step, stepIndex) => {
        const blockX = x + (LANE_WIDTH - BLOCK_WIDTH) / 2;
        const blockY = ROLE_HEADER_HEIGHT + 20 + stepIndex * (BLOCK_HEIGHT + BLOCK_MARGIN_Y * 2);

        // Сохраняем позицию для связей
        stepPositions[step.id] = {
          x: blockX,
          y: blockY,
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          roleIndex: roleIndex
        };

        // Рисуем блок в зависимости от типа
        switch (step.type) {
          case "Start":
            drawStartBlock(ctx, blockX, blockY, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
            break;
          case "Action":
            drawActionBlock(ctx, blockX, blockY, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
            // Рисуем параметры справа от блока
            if (step.parameters && step.parameters.length > 0) {
              drawParameters(ctx, blockX + BLOCK_WIDTH + 5, blockY, step.parameters);
            }
            break;
          case "Product":
            drawProductBlock(ctx, blockX, blockY, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
            break;
          case "Decision":
            drawDecisionBlock(ctx, blockX, blockY, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
            break;
          case "Split":
            drawSplitBlock(ctx, blockX + BLOCK_WIDTH / 2 - 15, blockY, 30, BLOCK_HEIGHT);
            break;
          case "End":
            drawEndBlock(ctx, blockX, blockY, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
            break;
          default:
            drawActionBlock(ctx, blockX, blockY, BLOCK_WIDTH, BLOCK_HEIGHT, step.name);
        }
      });
    });

    // Рисуем связи между блоками
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    steps.forEach(step => {
      const fromPos = stepPositions[step.id];
      if (!fromPos) return;

      // Обрабатываем ветвления
      if (step.branches && step.branches.length > 0) {
        step.branches.forEach((branch) => {
          const toPos = stepPositions[branch.targetStepId];
          if (!toPos) return;
          drawConnection(fromPos, toPos, branch.condition);
        });
      } else if (step.nextSteps && step.nextSteps.length > 0) {
        step.nextSteps.forEach(nextStepId => {
          const toPos = stepPositions[nextStepId];
          if (!toPos) return;
          drawConnection(fromPos, toPos);
        });
      }
    });

    // Функция для рисования блока "Запуск" (зелёная пилюля)
    function drawStartBlock(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) {
      const radius = height / 2;
      
      ctx.fillStyle = "#C8E6C9";
      ctx.strokeStyle = "#4CAF50";
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
      
      ctx.fillStyle = "#1B5E20";
      ctx.font = "bold 10px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapText(ctx, text, x + width / 2, y + height / 2, width - 20, 12);
    }

    // Функция для рисования блока "Действие" (шестиугольник)
    function drawActionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) {
      const indent = 12;
      
      ctx.fillStyle = "#E0E0E0";
      ctx.strokeStyle = "#424242";
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
      
      ctx.fillStyle = "#212121";
      ctx.font = "bold 10px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapText(ctx, text, x + width / 2, y + height / 2, width - 30, 12);
    }

    // Функция для рисования блока "Продукт" (скруглённый прямоугольник)
    function drawProductBlock(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) {
      const radius = 8;
      
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#1976D2";
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
      
      ctx.fillStyle = "#0D47A1";
      ctx.font = "10px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapText(ctx, text, x + width / 2, y + height / 2, width - 16, 12);
    }

    // Функция для рисования блока "Условие/Решение" (ромб)
    function drawDecisionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      
      ctx.fillStyle = "#FFF9C4";
      ctx.strokeStyle = "#F57F17";
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + width, centerY);
      ctx.lineTo(centerX, y + height);
      ctx.lineTo(x, centerY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Знак вопроса
      ctx.fillStyle = "#E65100";
      ctx.font = "bold 10px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", centerX, centerY - 8);
      
      // Текст условия (сокращённый)
      ctx.font = "9px Arial, sans-serif";
      const shortText = text.length > 20 ? text.substring(0, 17) + "..." : text;
      ctx.fillText(shortText, centerX, centerY + 8);
    }

    // Функция для рисования блока "Разделение" (треугольник)
    function drawSplitBlock(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
      ctx.fillStyle = "#E3F2FD";
      ctx.strokeStyle = "#1565C0";
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Функция для рисования блока "Завершение" (двойные линии)
    function drawEndBlock(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) {
      ctx.fillStyle = "#FFCDD2";
      ctx.strokeStyle = "#C62828";
      ctx.lineWidth = 2;
      
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
      
      // Двойные вертикальные линии
      ctx.beginPath();
      ctx.moveTo(x + 5, y);
      ctx.lineTo(x + 5, y + height);
      ctx.moveTo(x + width - 5, y);
      ctx.lineTo(x + width - 5, y + height);
      ctx.stroke();
      
      ctx.fillStyle = "#B71C1C";
      ctx.font = "bold 10px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapText(ctx, text, x + width / 2, y + height / 2, width - 20, 12);
    }

    // Функция для рисования параметров действия
    function drawParameters(ctx: CanvasRenderingContext2D, x: number, y: number, parameters: ActionParameter[]) {
      parameters.slice(0, 3).forEach((param, index) => {
        const paramY = y + index * (PARAMETER_HEIGHT + 3);
        
        switch (param.type) {
          case "time":
            // Жёлтая плашка с часами
            ctx.fillStyle = "#FFF59D";
            ctx.strokeStyle = "#F9A825";
            ctx.lineWidth = 1;
            ctx.fillRect(x, paramY, PARAMETER_WIDTH - 10, PARAMETER_HEIGHT - 5);
            ctx.strokeRect(x, paramY, PARAMETER_WIDTH - 10, PARAMETER_HEIGHT - 5);
            
            ctx.fillStyle = "#5D4037";
            ctx.font = "8px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("⏱ " + param.value, x + (PARAMETER_WIDTH - 10) / 2, paramY + (PARAMETER_HEIGHT - 5) / 2);
            break;
            
          case "document":
            // Документ (лист)
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#666";
            ctx.lineWidth = 1;
            
            const docW = PARAMETER_WIDTH - 15;
            const docH = PARAMETER_HEIGHT - 5;
            
            ctx.beginPath();
            ctx.moveTo(x, paramY);
            ctx.lineTo(x + docW - 5, paramY);
            ctx.lineTo(x + docW, paramY + 5);
            ctx.lineTo(x + docW, paramY + docH);
            ctx.lineTo(x, paramY + docH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Уголок
            ctx.beginPath();
            ctx.moveTo(x + docW - 5, paramY);
            ctx.lineTo(x + docW - 5, paramY + 5);
            ctx.lineTo(x + docW, paramY + 5);
            ctx.stroke();
            
            ctx.fillStyle = "#333";
            ctx.font = "7px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const shortDoc = param.value.length > 8 ? param.value.substring(0, 6) + ".." : param.value;
            ctx.fillText(shortDoc, x + docW / 2, paramY + docH / 2 + 2);
            break;
            
          case "database":
            // Цилиндр (БД)
            const dbW = PARAMETER_WIDTH - 20;
            const dbH = PARAMETER_HEIGHT - 8;
            const dbX = x + 5;
            const dbY = paramY + 2;
            const ellipseH = 4;
            
            ctx.fillStyle = "#E3F2FD";
            ctx.strokeStyle = "#1976D2";
            ctx.lineWidth = 1;
            
            // Верхний эллипс
            ctx.beginPath();
            ctx.ellipse(dbX + dbW / 2, dbY + ellipseH, dbW / 2, ellipseH, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Тело цилиндра
            ctx.fillRect(dbX, dbY + ellipseH, dbW, dbH - ellipseH * 2);
            ctx.beginPath();
            ctx.moveTo(dbX, dbY + ellipseH);
            ctx.lineTo(dbX, dbY + dbH - ellipseH);
            ctx.moveTo(dbX + dbW, dbY + ellipseH);
            ctx.lineTo(dbX + dbW, dbY + dbH - ellipseH);
            ctx.stroke();
            
            // Нижний эллипс
            ctx.beginPath();
            ctx.ellipse(dbX + dbW / 2, dbY + dbH - ellipseH, dbW / 2, ellipseH, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = "#0D47A1";
            ctx.font = "7px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const shortDb = param.value.length > 6 ? param.value.substring(0, 4) + ".." : param.value;
            ctx.fillText(shortDb, dbX + dbW / 2, dbY + dbH / 2);
            break;
            
          case "stage":
            // Синяя трапеция (этап)
            ctx.fillStyle = "#BBDEFB";
            ctx.strokeStyle = "#1565C0";
            ctx.lineWidth = 1;
            
            const trapW = PARAMETER_WIDTH - 10;
            const trapH = PARAMETER_HEIGHT - 8;
            const indent = 5;
            
            ctx.beginPath();
            ctx.moveTo(x + indent, paramY);
            ctx.lineTo(x + trapW - indent, paramY);
            ctx.lineTo(x + trapW, paramY + trapH);
            ctx.lineTo(x, paramY + trapH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = "#0D47A1";
            ctx.font = "7px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const shortStage = param.value.length > 8 ? param.value.substring(0, 6) + ".." : param.value;
            ctx.fillText(shortStage, x + trapW / 2, paramY + trapH / 2);
            break;
        }
      });
    }

    // Функция для рисования ортогональной связи
    function drawConnection(
      from: { x: number; y: number; width: number; height: number; roleIndex: number },
      to: { x: number; y: number; width: number; height: number; roleIndex: number },
      label?: string
    ) {
      if (!ctx) return;
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      
      const sameColumn = from.roleIndex === to.roleIndex;
      const goingRight = to.roleIndex > from.roleIndex;
      const goingDown = to.y > from.y;
      
      let fromX: number, fromY: number, toX: number, toY: number;
      
      if (sameColumn) {
        // Вертикальная связь в той же колонке
        fromX = from.x + from.width / 2;
        fromY = from.y + from.height;
        toX = to.x + to.width / 2;
        toY = to.y;
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // Стрелка вниз
        drawArrow(ctx, toX, toY, "down");
      } else {
        // Горизонтальная связь между колонками
        if (goingRight) {
          fromX = from.x + from.width;
          fromY = from.y + from.height / 2;
          toX = to.x;
          toY = to.y + to.height / 2;
        } else {
          fromX = from.x;
          fromY = from.y + from.height / 2;
          toX = to.x + to.width;
          toY = to.y + to.height / 2;
        }
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        
        if (Math.abs(fromY - toY) < 10) {
          // Прямая горизонтальная линия
          ctx.lineTo(toX, toY);
        } else {
          // Ломаная линия
          const midX = (fromX + toX) / 2;
          ctx.lineTo(midX, fromY);
          ctx.lineTo(midX, toY);
          ctx.lineTo(toX, toY);
        }
        
        ctx.stroke();
        
        // Стрелка
        drawArrow(ctx, toX, toY, goingRight ? "right" : "left");
      }
      
      // Подпись условия
      if (label) {
        ctx.fillStyle = "#1976D2";
        ctx.font = "bold 9px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const labelX = (fromX + toX) / 2;
        const labelY = (fromY + toY) / 2 - 8;
        
        // Фон для подписи
        const labelWidth = ctx.measureText(label).width + 6;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(labelX - labelWidth / 2, labelY - 6, labelWidth, 12);
        
        ctx.fillStyle = "#1976D2";
        ctx.fillText(label, labelX, labelY);
      }
    }
    
    // Функция для рисования стрелки
    function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, direction: "up" | "down" | "left" | "right") {
      ctx.fillStyle = "#333";
      ctx.beginPath();
      
      const size = 6;
      
      switch (direction) {
        case "down":
          ctx.moveTo(x, y);
          ctx.lineTo(x - size, y - size);
          ctx.lineTo(x + size, y - size);
          break;
        case "up":
          ctx.moveTo(x, y);
          ctx.lineTo(x - size, y + size);
          ctx.lineTo(x + size, y + size);
          break;
        case "right":
          ctx.moveTo(x, y);
          ctx.lineTo(x - size, y - size);
          ctx.lineTo(x - size, y + size);
          break;
        case "left":
          ctx.moveTo(x, y);
          ctx.lineTo(x + size, y - size);
          ctx.lineTo(x + size, y + size);
          break;
      }
      
      ctx.closePath();
      ctx.fill();
    }

  }, [roles, stages, steps, zoom, wrapText]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
  const handleFitToScreen = () => {
    setZoom(0.8);
    setPan({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = `${title.replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Обработчики для перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} title="Уменьшить">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="flex items-center text-sm text-gray-500 min-w-[50px] justify-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} title="Увеличить">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleFitToScreen} title="Сбросить">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            PNG
          </Button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="overflow-auto border rounded-lg bg-gray-100 cursor-grab active:cursor-grabbing"
        style={{ maxHeight: "75vh" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          style={{ 
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, 
            transformOrigin: "top left",
            transition: isDragging ? "none" : "transform 0.1s ease-out"
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
      
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-full bg-green-200 border border-green-500"></div>
          <span>Запуск</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 bg-gray-200 border border-gray-600" style={{ clipPath: "polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)" }}></div>
          <span>Действие</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded bg-white border-2 border-blue-500"></div>
          <span>Продукт</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-100 border border-orange-500 rotate-45"></div>
          <span>Условие</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 bg-red-100 border border-red-600"></div>
          <span>Завершение</span>
        </div>
      </div>
    </Card>
  );
}
