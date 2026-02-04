import { useRef, useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Download, RotateCcw, Edit3 } from "lucide-react";
import BlockEditor from "./BlockEditor";

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
  editable?: boolean;
  onStepUpdate?: (updatedStep: Step) => void;
  onStepDelete?: (stepId: string) => void;
}

interface BlockPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  roleIndex: number;
  centerX: number;
  centerY: number;
}

export default function ProcessDiagramSwimlane({ 
  roles, 
  stages, 
  steps, 
  title,
  editable = false,
  onStepUpdate,
  onStepDelete
}: ProcessDiagramSwimlaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.35);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  
  const stepPositionsRef = useRef<Record<string, BlockPosition>>({});

  // Компактные размеры блоков для лучшего обзора
  const ROLE_HEADER_HEIGHT = 80;
  const LANE_WIDTH = 220;
  const BLOCK_WIDTH = 180;
  const BLOCK_HEIGHT = 120;
  const BLOCK_MARGIN_X = 20;
  const BLOCK_MARGIN_Y = 40;
  const CONNECTION_OFFSET = 30; // Отступ для обхода блоков

  const ROLE_COLORS = [
    "#B3E5FC", "#F8BBD9", "#C8E6C9", "#FFF9C4", "#E1BEE7",
    "#FFECB3", "#B2DFDB", "#D7CCC8", "#CFD8DC", "#DCEDC8",
  ];

  // Функция для обрезки текста с многоточием
  const truncateText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string => {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;
    
    let truncated = text;
    while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "...";
  }, []);

  // Функция переноса текста
  const wrapText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 2
  ): number => {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    let lineCount = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        lineCount++;
        if (lineCount >= maxLines) {
          ctx.fillText(truncateText(ctx, line.trim(), maxWidth), x, currentY);
          return currentY + lineHeight;
        }
        ctx.fillText(line.trim(), x, currentY);
        line = words[i] + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(truncateText(ctx, line.trim(), maxWidth), x, currentY);
    return currentY + lineHeight;
  }, [truncateText]);

  // ИСПРАВЛЕННЫЙ расчёт координат мыши на canvas
  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Координаты клика относительно canvas элемента
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Преобразуем в координаты canvas с учётом pan и zoom
    const canvasX = (clickX - pan.x) / zoom;
    const canvasY = (clickY - pan.y) / zoom;
    
    return { x: canvasX, y: canvasY };
  }, [pan, zoom]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editable || isDragging) return;
    
    const { x: clickX, y: clickY } = getCanvasCoordinates(e);
    
    // Проверяем попадание в блоки
    for (const [stepId, pos] of Object.entries(stepPositionsRef.current)) {
      if (clickX >= pos.x && clickX <= pos.x + pos.width &&
          clickY >= pos.y && clickY <= pos.y + pos.height) {
        const step = steps.find(s => s.id === stepId);
        if (step) {
          setSelectedStep(step);
          setIsEditorOpen(true);
        }
        return;
      }
    }
  }, [editable, isDragging, getCanvasCoordinates, steps]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editable) return;
    
    const { x: mouseX, y: mouseY } = getCanvasCoordinates(e);
    
    let foundHovered: string | null = null;
    for (const [stepId, pos] of Object.entries(stepPositionsRef.current)) {
      if (mouseX >= pos.x && mouseX <= pos.x + pos.width &&
          mouseY >= pos.y && mouseY <= pos.y + pos.height) {
        foundHovered = stepId;
        break;
      }
    }
    
    if (foundHovered !== hoveredStepId) {
      setHoveredStepId(foundHovered);
    }
  }, [editable, getCanvasCoordinates, hoveredStepId]);

  const handleStepSave = useCallback((updatedStep: Step) => {
    if (onStepUpdate) onStepUpdate(updatedStep);
    setIsEditorOpen(false);
    setSelectedStep(null);
  }, [onStepUpdate]);

  const handleStepDelete = useCallback((stepId: string) => {
    if (onStepDelete) onStepDelete(stepId);
    setIsEditorOpen(false);
    setSelectedStep(null);
  }, [onStepDelete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sortedRoles = [...roles];
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    // Группируем шаги по ролям
    const stepsByRole: Record<string, Step[]> = {};
    steps.forEach(step => {
      if (!stepsByRole[step.roleId]) stepsByRole[step.roleId] = [];
      stepsByRole[step.roleId].push(step);
    });

    // Сортируем шаги внутри каждой роли по order
    Object.keys(stepsByRole).forEach(roleId => {
      stepsByRole[roleId].sort((a, b) => a.order - b.order);
    });

    // Находим максимальное количество шагов в одной роли
    let maxStepsInRole = 0;
    Object.values(stepsByRole).forEach(roleSteps => {
      maxStepsInRole = Math.max(maxStepsInRole, roleSteps.length);
    });

    const canvasWidth = sortedRoles.length * LANE_WIDTH + 100;
    const canvasHeight = ROLE_HEADER_HEIGHT + maxStepsInRole * (BLOCK_HEIGHT + BLOCK_MARGIN_Y) + 200;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Очищаем canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const stepPositions: Record<string, BlockPosition> = {};

    // Рисуем дорожки (swimlanes) и блоки
    sortedRoles.forEach((role, roleIndex) => {
      const laneX = roleIndex * LANE_WIDTH;
      const color = role.color || ROLE_COLORS[roleIndex % ROLE_COLORS.length];

      // Фон дорожки
      ctx.fillStyle = color;
      ctx.fillRect(laneX, 0, LANE_WIDTH, canvasHeight);

      // Граница дорожки
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(laneX + LANE_WIDTH, 0);
      ctx.lineTo(laneX + LANE_WIDTH, canvasHeight);
      ctx.stroke();

      // Заголовок роли
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(laneX, 0, LANE_WIDTH, ROLE_HEADER_HEIGHT);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.strokeRect(laneX, 0, LANE_WIDTH, ROLE_HEADER_HEIGHT);

      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold 14px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      wrapText(ctx, role.name, laneX + LANE_WIDTH / 2, ROLE_HEADER_HEIGHT / 2, LANE_WIDTH - 20, 18, 2);

      // Рисуем блоки для этой роли
      const roleSteps = stepsByRole[role.id] || [];
      
      roleSteps.forEach((step, stepIndex) => {
        const blockX = laneX + (LANE_WIDTH - BLOCK_WIDTH) / 2;
        const blockY = ROLE_HEADER_HEIGHT + BLOCK_MARGIN_Y + stepIndex * (BLOCK_HEIGHT + BLOCK_MARGIN_Y);

        stepPositions[step.id] = {
          x: blockX,
          y: blockY,
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          roleIndex: roleIndex,
          centerX: blockX + BLOCK_WIDTH / 2,
          centerY: blockY + BLOCK_HEIGHT / 2
        };

        const isHovered = hoveredStepId === step.id;
        const isSelected = selectedStep?.id === step.id;
        const highlighted = isHovered || isSelected;

        // Рисуем блок в зависимости от типа
        switch (step.type) {
          case "Start":
            drawStartBlock(ctx, blockX, blockY, step, highlighted);
            break;
          case "Action":
            drawActionBlock(ctx, blockX, blockY, step, highlighted);
            break;
          case "Product":
            drawProductBlock(ctx, blockX, blockY, step, highlighted);
            break;
          case "Decision":
            drawDecisionBlock(ctx, blockX, blockY, step, highlighted);
            break;
          case "Split":
            drawSplitBlock(ctx, blockX, blockY, highlighted);
            break;
          case "End":
            drawEndBlock(ctx, blockX, blockY, step, highlighted);
            break;
          default:
            drawActionBlock(ctx, blockX, blockY, step, highlighted);
        }
        
        // Иконка редактирования при наведении
        if (editable && isHovered) {
          ctx.fillStyle = "#6366F1";
          ctx.beginPath();
          ctx.arc(blockX + BLOCK_WIDTH - 15, blockY + 15, 12, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 12px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✎", blockX + BLOCK_WIDTH - 15, blockY + 15);
        }
      });
    });

    stepPositionsRef.current = stepPositions;

    // ИСПРАВЛЕННАЯ отрисовка связей - обход блоков
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    steps.forEach(step => {
      const fromPos = stepPositions[step.id];
      if (!fromPos) return;

      if (step.branches && step.branches.length > 0) {
        step.branches.forEach((branch) => {
          const toPos = stepPositions[branch.targetStepId];
          if (!toPos) return;
          drawSmartConnection(ctx, fromPos, toPos, stepPositions, branch.condition);
        });
      } else if (step.nextSteps && step.nextSteps.length > 0) {
        step.nextSteps.forEach(nextStepId => {
          const toPos = stepPositions[nextStepId];
          if (!toPos) return;
          drawSmartConnection(ctx, fromPos, toPos, stepPositions);
        });
      }
    });

    // Функция отрисовки параметров внутри блока
    function drawBlockInfo(
      ctx: CanvasRenderingContext2D, 
      step: Step, 
      x: number, 
      startY: number, 
      maxWidth: number,
      textColor: string
    ): void {
      const params = step.parameters || [];
      let currentY = startY;
      
      // Время выполнения
      const timeParam = params.find(p => p.type === "time");
      if (timeParam) {
        ctx.fillStyle = "#D84315";
        ctx.font = "11px Arial, sans-serif";
        ctx.textAlign = "left";
        const timeText = `⏱ ${timeParam.value}`;
        ctx.fillText(truncateText(ctx, timeText, maxWidth), x, currentY);
        currentY += 14;
      }
      
      // Среда выполнения
      const envParam = params.find(p => p.type === "environment");
      if (envParam) {
        ctx.fillStyle = "#00695C";
        ctx.font = "11px Arial, sans-serif";
        const envText = `🖥 ${envParam.value}`;
        ctx.fillText(truncateText(ctx, envText, maxWidth), x, currentY);
        currentY += 14;
      }
      
      // Документы (только первый)
      const docParam = params.find(p => p.type === "document");
      if (docParam) {
        ctx.fillStyle = "#1565C0";
        ctx.font = "11px Arial, sans-serif";
        const docText = `📄 ${docParam.value}`;
        ctx.fillText(truncateText(ctx, docText, maxWidth), x, currentY);
        currentY += 14;
      }
      
      // Системы (только первая)
      const dbParam = params.find(p => p.type === "database");
      if (dbParam) {
        ctx.fillStyle = "#6A1B9A";
        ctx.font = "11px Arial, sans-serif";
        const dbText = `🗄 ${dbParam.value}`;
        ctx.fillText(truncateText(ctx, dbText, maxWidth), x, currentY);
      }
    }

    function drawStartBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      const radius = 20;
      
      ctx.fillStyle = highlighted ? "#A5D6A7" : "#C8E6C9";
      ctx.strokeStyle = highlighted ? "#2E7D32" : "#4CAF50";
      ctx.lineWidth = highlighted ? 3 : 2;
      
      // Овальная форма
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + BLOCK_WIDTH - radius, y);
      ctx.arc(x + BLOCK_WIDTH - radius, y + BLOCK_HEIGHT / 2, BLOCK_HEIGHT / 2, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + radius, y + BLOCK_HEIGHT);
      ctx.arc(x + radius, y + BLOCK_HEIGHT / 2, BLOCK_HEIGHT / 2, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Название
      ctx.fillStyle = "#1B5E20";
      ctx.font = "bold 13px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, step.name, x + BLOCK_WIDTH / 2, y + 15, BLOCK_WIDTH - 50, 16, 2);
      
      // Параметры
      drawBlockInfo(ctx, step, x + 25, y + 55, BLOCK_WIDTH - 50, "#2E7D32");
    }

    function drawActionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      const indent = 25;
      
      ctx.fillStyle = highlighted ? "#BDBDBD" : "#E0E0E0";
      ctx.strokeStyle = highlighted ? "#212121" : "#424242";
      ctx.lineWidth = highlighted ? 3 : 2;
      
      // Шестиугольник
      ctx.beginPath();
      ctx.moveTo(x + indent, y);
      ctx.lineTo(x + BLOCK_WIDTH - indent, y);
      ctx.lineTo(x + BLOCK_WIDTH, y + BLOCK_HEIGHT / 2);
      ctx.lineTo(x + BLOCK_WIDTH - indent, y + BLOCK_HEIGHT);
      ctx.lineTo(x + indent, y + BLOCK_HEIGHT);
      ctx.lineTo(x, y + BLOCK_HEIGHT / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Название
      ctx.fillStyle = "#212121";
      ctx.font = "bold 12px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, step.name, x + BLOCK_WIDTH / 2, y + 12, BLOCK_WIDTH - 60, 14, 2);
      
      // Параметры
      drawBlockInfo(ctx, step, x + 30, y + 50, BLOCK_WIDTH - 60, "#424242");
    }

    function drawProductBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      const radius = 10;
      
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = highlighted ? "#1565C0" : "#1976D2";
      ctx.lineWidth = highlighted ? 3 : 2;
      
      // Прямоугольник со скруглёнными углами
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + BLOCK_WIDTH - radius, y);
      ctx.quadraticCurveTo(x + BLOCK_WIDTH, y, x + BLOCK_WIDTH, y + radius);
      ctx.lineTo(x + BLOCK_WIDTH, y + BLOCK_HEIGHT - radius);
      ctx.quadraticCurveTo(x + BLOCK_WIDTH, y + BLOCK_HEIGHT, x + BLOCK_WIDTH - radius, y + BLOCK_HEIGHT);
      ctx.lineTo(x + radius, y + BLOCK_HEIGHT);
      ctx.quadraticCurveTo(x, y + BLOCK_HEIGHT, x, y + BLOCK_HEIGHT - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Название
      ctx.fillStyle = "#0D47A1";
      ctx.font = "bold 12px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, step.name, x + BLOCK_WIDTH / 2, y + 12, BLOCK_WIDTH - 20, 14, 2);
      
      // Параметры
      drawBlockInfo(ctx, step, x + 10, y + 50, BLOCK_WIDTH - 20, "#1565C0");
    }

    function drawDecisionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      const centerX = x + BLOCK_WIDTH / 2;
      const centerY = y + BLOCK_HEIGHT / 2;
      const halfWidth = BLOCK_WIDTH / 2;
      const halfHeight = BLOCK_HEIGHT / 2;
      
      ctx.fillStyle = highlighted ? "#FFF59D" : "#FFF9C4";
      ctx.strokeStyle = highlighted ? "#E65100" : "#FF9800";
      ctx.lineWidth = highlighted ? 3 : 2;
      
      // Ромб
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + BLOCK_WIDTH, centerY);
      ctx.lineTo(centerX, y + BLOCK_HEIGHT);
      ctx.lineTo(x, centerY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Знак вопроса
      ctx.fillStyle = "#E65100";
      ctx.font = "bold 20px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", centerX, centerY - 20);
      
      // Текст вопроса
      ctx.font = "bold 11px Arial, sans-serif";
      ctx.fillStyle = "#BF360C";
      wrapText(ctx, step.name, centerX, centerY + 5, BLOCK_WIDTH - 60, 13, 2);
    }

    function drawSplitBlock(ctx: CanvasRenderingContext2D, x: number, y: number, highlighted: boolean = false) {
      const width = 60;
      const centerX = x + BLOCK_WIDTH / 2;
      
      ctx.fillStyle = highlighted ? "#E1BEE7" : "#F3E5F5";
      ctx.strokeStyle = highlighted ? "#6A1B9A" : "#9C27B0";
      ctx.lineWidth = highlighted ? 3 : 2;
      
      // Треугольник
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX + width / 2, y + BLOCK_HEIGHT);
      ctx.lineTo(centerX - width / 2, y + BLOCK_HEIGHT);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    function drawEndBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      ctx.fillStyle = highlighted ? "#FFCDD2" : "#FFEBEE";
      ctx.strokeStyle = highlighted ? "#B71C1C" : "#D32F2F";
      ctx.lineWidth = highlighted ? 3 : 2;
      
      // Двойная рамка
      ctx.fillRect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT);
      ctx.strokeRect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT);
      ctx.strokeRect(x + 5, y + 5, BLOCK_WIDTH - 10, BLOCK_HEIGHT - 10);
      
      // Название
      ctx.fillStyle = "#B71C1C";
      ctx.font = "bold 12px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, step.name, x + BLOCK_WIDTH / 2, y + 15, BLOCK_WIDTH - 30, 14, 2);
      
      // Параметры
      drawBlockInfo(ctx, step, x + 15, y + 55, BLOCK_WIDTH - 30, "#C62828");
    }

    // УМНАЯ маршрутизация связей - обход блоков
    function drawSmartConnection(
      ctx: CanvasRenderingContext2D,
      from: BlockPosition,
      to: BlockPosition,
      allPositions: Record<string, BlockPosition>,
      label?: string
    ) {
      const fromCenterX = from.centerX;
      const fromBottomY = from.y + from.height;
      const toCenterX = to.centerX;
      const toTopY = to.y;

      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      // Определяем направление связи
      const goingRight = to.roleIndex > from.roleIndex;
      const goingLeft = to.roleIndex < from.roleIndex;
      const sameColumn = from.roleIndex === to.roleIndex;
      const goingUp = to.y < from.y;

      if (sameColumn && !goingUp) {
        // Простая вертикальная связь вниз в той же колонке
        ctx.beginPath();
        ctx.moveTo(fromCenterX, fromBottomY);
        ctx.lineTo(toCenterX, toTopY);
        ctx.stroke();
        drawArrowHead(ctx, toCenterX, toTopY, Math.PI / 2);
      } else if (sameColumn && goingUp) {
        // Связь вверх в той же колонке - обходим слева
        const offsetX = from.x - CONNECTION_OFFSET;
        ctx.beginPath();
        ctx.moveTo(from.x, from.centerY);
        ctx.lineTo(offsetX, from.centerY);
        ctx.lineTo(offsetX, to.centerY);
        ctx.lineTo(to.x, to.centerY);
        ctx.stroke();
        drawArrowHead(ctx, to.x, to.centerY, 0);
      } else {
        // Связь между разными колонками
        // Выходим из правого или левого края блока
        const exitX = goingRight ? from.x + from.width : from.x;
        const exitY = from.centerY;
        
        // Входим в левый или правый край целевого блока
        const entryX = goingRight ? to.x : to.x + to.width;
        const entryY = to.centerY;
        
        // Промежуточная точка для обхода
        const midX = (exitX + entryX) / 2;
        
        ctx.beginPath();
        ctx.moveTo(exitX, exitY);
        ctx.lineTo(midX, exitY);
        ctx.lineTo(midX, entryY);
        ctx.lineTo(entryX, entryY);
        ctx.stroke();
        
        // Стрелка в направлении входа
        const arrowAngle = goingRight ? 0 : Math.PI;
        drawArrowHead(ctx, entryX, entryY, arrowAngle);
      }

      // Метка на связи
      if (label) {
        const labelX = (fromCenterX + toCenterX) / 2;
        const labelY = sameColumn 
          ? (fromBottomY + toTopY) / 2 
          : from.centerY - 15;
        
        ctx.fillStyle = "#ffffff";
        const labelWidth = ctx.measureText(label).width + 10;
        ctx.fillRect(labelX - labelWidth / 2, labelY - 10, labelWidth, 20);
        ctx.strokeStyle = "#E65100";
        ctx.lineWidth = 1;
        ctx.strokeRect(labelX - labelWidth / 2, labelY - 10, labelWidth, 20);
        
        ctx.fillStyle = "#E65100";
        ctx.font = "bold 11px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, labelX, labelY);
      }
    }

    function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
      const headLength = 10;
      const headAngle = Math.PI / 6;
      
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - headLength * Math.cos(angle - headAngle),
        y - headLength * Math.sin(angle - headAngle)
      );
      ctx.lineTo(
        x - headLength * Math.cos(angle + headAngle),
        y - headLength * Math.sin(angle + headAngle)
      );
      ctx.closePath();
      ctx.fill();
    }

  }, [roles, stages, steps, wrapText, truncateText, hoveredStepId, selectedStep, editable]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1));
  const handleFitToScreen = () => { setZoom(0.35); setPan({ x: 0, y: 0 }); };
  const handleResetView = () => { setZoom(0.35); setPan({ x: 0, y: 0 }); };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = `${title.replace(/\s+/g, "_")}_diagram.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.max(0.1, Math.min(2, prev + delta)));
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} title="Уменьшить">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} title="Увеличить">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleFitToScreen} title="Вписать в экран">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetView} title="Сбросить вид">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPNG} title="Экспорт PNG">
            <Download className="h-4 w-4" />
          </Button>
          {editable && (
            <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-primary/10 rounded text-sm">
              <Edit3 className="h-3 w-3" />
              <span>Режим редактирования</span>
            </div>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden border rounded-lg bg-gray-50"
        style={{ height: "700px", cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left",
            cursor: editable ? "pointer" : isDragging ? "grabbing" : "grab"
          }}
        />
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Легенда:</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded-full bg-green-200 border-2 border-green-500"></div>
            <span>Начало/Конец</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 bg-gray-200 border-2 border-gray-500" style={{ clipPath: "polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)" }}></div>
            <span>Действие</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 bg-white border-2 border-blue-500 rounded"></div>
            <span>Продукт</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-orange-500 rotate-45"></div>
            <span className="ml-1">Решение</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-orange-600">⏱</span>
            <span>Время</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-teal-600">🖥</span>
            <span>Среда</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-600">📄</span>
            <span>Документы</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-600">🗄</span>
            <span>Системы</span>
          </div>
        </div>
      </div>

      <BlockEditor
        step={selectedStep}
        roles={roles}
        stages={stages}
        allSteps={steps}
        isOpen={isEditorOpen}
        onSave={handleStepSave}
        onDelete={handleStepDelete}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedStep(null);
        }}
      />
    </Card>
  );
}
