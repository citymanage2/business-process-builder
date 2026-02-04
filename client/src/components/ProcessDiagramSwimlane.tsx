import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Download, RotateCcw, Edit3, FileCode } from "lucide-react";
import { downloadBPMNFile } from "@/lib/bpmnExport";
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
  step: Step;
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
  const [zoom, setZoom] = useState(0.25);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  
  const stepPositionsRef = useRef<Record<string, BlockPosition>>({});

  // Размеры блоков
  const ROLE_HEADER_HEIGHT = 100;
  const LANE_WIDTH = 420;
  const BLOCK_WIDTH = 380;
  const BLOCK_HEIGHT = 280;
  const BLOCK_MARGIN_X = 20;
  const BLOCK_MARGIN_Y = 80;
  const CONNECTION_OFFSET = 50; // Отступ для стрелок от блоков

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

  // Функция переноса текста с возвратом количества строк
  const wrapText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 3
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

  // Расчёт координат мыши на canvas
  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    const canvasX = (clickX - pan.x) / zoom;
    const canvasY = (clickY - pan.y) / zoom;
    
    return { x: canvasX, y: canvasY };
  }, [pan, zoom]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editable || isDragging) return;
    
    const { x: clickX, y: clickY } = getCanvasCoordinates(e);
    
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
    const canvasHeight = ROLE_HEADER_HEIGHT + maxStepsInRole * (BLOCK_HEIGHT + BLOCK_MARGIN_Y) + 300;

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
      ctx.font = "bold 18px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      wrapText(ctx, role.name, laneX + LANE_WIDTH / 2, ROLE_HEADER_HEIGHT / 2, LANE_WIDTH - 30, 22, 2);

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
          centerY: blockY + BLOCK_HEIGHT / 2,
          step: step
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
        }
      });
    });

    stepPositionsRef.current = stepPositions;

    // ========== BPMN 2.0 SEQUENCE FLOW ==========
    // Рисуем связи ПОСЛЕ всех блоков
    const allBlocks = Object.values(stepPositions);
    
    // Находим глобальные границы всех блоков для маршрутизации
    let globalMinY = Infinity;
    let globalMaxY = 0;
    let globalMinX = Infinity;
    let globalMaxX = 0;
    
    allBlocks.forEach(b => {
      globalMinY = Math.min(globalMinY, b.y);
      globalMaxY = Math.max(globalMaxY, b.y + b.height);
      globalMinX = Math.min(globalMinX, b.x);
      globalMaxX = Math.max(globalMaxX, b.x + b.width);
    });

    // Счётчик для смещения параллельных линий
    let connectionIndex = 0;

    steps.forEach(step => {
      const fromPos = stepPositions[step.id];
      if (!fromPos) return;

      // Обычные связи nextSteps (Sequence Flow)
      if (step.nextSteps) {
        step.nextSteps.forEach(nextStepId => {
          const toPos = stepPositions[nextStepId];
          if (toPos) {
            drawBPMNSequenceFlow(ctx, fromPos, toPos, allBlocks, globalMinY, globalMaxY, connectionIndex++);
          }
        });
      }

      // Связи из веток решений (XOR Gateway)
      if (step.branches) {
        step.branches.forEach((branch, branchIndex) => {
          const toPos = stepPositions[branch.targetStepId];
          if (toPos) {
            const label = branch.condition ? `[${branch.condition}]` : undefined;
            const isDefault = branch.isDefault || false;
            drawBPMNSequenceFlow(ctx, fromPos, toPos, allBlocks, globalMinY, globalMaxY, connectionIndex++, label, isDefault);
          }
        });
      }
    });

    // ========== ФУНКЦИИ РИСОВАНИЯ BPMN SEQUENCE FLOW ==========
    
    function drawBPMNSequenceFlow(
      ctx: CanvasRenderingContext2D,
      from: BlockPosition,
      to: BlockPosition,
      allBlocks: BlockPosition[],
      globalMinY: number,
      globalMaxY: number,
      index: number,
      label?: string,
      isDefault: boolean = false
    ) {
      // Стиль линии - сплошная для Sequence Flow
      ctx.strokeStyle = label ? "#E65100" : "#333333";
      ctx.lineWidth = label ? 3 : 2;
      ctx.setLineDash([]); // Сплошная линия

      const sameColumn = from.roleIndex === to.roleIndex;
      const goingDown = to.y > from.y;
      const goingRight = to.roleIndex > from.roleIndex;

      // Смещение для параллельных линий
      const lineOffset = (index % 5) * 8;

      if (sameColumn) {
        // Связь в одной колонке
        if (goingDown) {
          // Прямая связь вниз
          const startX = from.centerX;
          const startY = from.y + from.height;
          const endX = to.centerX;
          const endY = to.y;

          // Проверяем есть ли блоки между
          let hasBlockBetween = false;
          for (const block of allBlocks) {
            if (block.step.id === from.step.id || block.step.id === to.step.id) continue;
            if (block.roleIndex === from.roleIndex && 
                block.y + block.height > startY && 
                block.y < endY) {
              hasBlockBetween = true;
              break;
            }
          }

          if (!hasBlockBetween) {
            // Прямая вертикальная линия
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            drawArrowHead(ctx, endX, endY, Math.PI / 2);
            
            if (isDefault) {
              drawDefaultMarker(ctx, startX, startY + 20);
            }
            if (label) {
              drawConditionLabel(ctx, startX + 50, startY + 30, label);
            }
          } else {
            // Обход слева
            const offsetX = from.x - CONNECTION_OFFSET - lineOffset;
            
            ctx.beginPath();
            ctx.moveTo(from.x, from.centerY);
            ctx.lineTo(offsetX, from.centerY);
            ctx.lineTo(offsetX, to.centerY);
            ctx.lineTo(to.x, to.centerY);
            ctx.stroke();
            drawArrowHead(ctx, to.x, to.centerY, Math.PI);
            
            if (isDefault) {
              drawDefaultMarker(ctx, from.x - 20, from.centerY);
            }
            if (label) {
              drawConditionLabel(ctx, offsetX - 40, (from.centerY + to.centerY) / 2, label);
            }
          }
        } else {
          // Связь вверх - обход слева
          const offsetX = from.x - CONNECTION_OFFSET - lineOffset;
          
          ctx.beginPath();
          ctx.moveTo(from.x, from.centerY);
          ctx.lineTo(offsetX, from.centerY);
          ctx.lineTo(offsetX, to.centerY);
          ctx.lineTo(to.x, to.centerY);
          ctx.stroke();
          drawArrowHead(ctx, to.x, to.centerY, Math.PI);
          
          if (isDefault) {
            drawDefaultMarker(ctx, from.x - 20, from.centerY);
          }
          if (label) {
            drawConditionLabel(ctx, offsetX - 40, (from.centerY + to.centerY) / 2, label);
          }
        }
      } else {
        // Связь между разными колонками
        // Горизонтальная связь с обходом блоков
        
        // Определяем точки выхода и входа
        const startX = goingRight ? from.x + from.width : from.x;
        const startY = from.centerY;
        const endX = goingRight ? to.x : to.x + to.width;
        const endY = to.centerY;
        
        // Находим промежуточную точку между колонками
        const midX = (startX + endX) / 2;
        
        // Рисуем ортогональный путь: горизонтально -> вертикально -> горизонтально
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX, startY);
        ctx.lineTo(midX, endY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Стрелка
        const arrowAngle = goingRight ? 0 : Math.PI;
        drawArrowHead(ctx, endX, endY, arrowAngle);
        
        if (isDefault) {
          drawDefaultMarker(ctx, startX + (goingRight ? 20 : -20), startY);
        }
        if (label) {
          const labelX = midX;
          const labelY = (startY + endY) / 2 - 15;
          drawConditionLabel(ctx, labelX, labelY, label);
        }
      }
    }

    // Рисование стрелки (заполненный треугольник по BPMN)
    function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
      const headLength = 14;
      const headAngle = Math.PI / 6;
      
      ctx.fillStyle = ctx.strokeStyle as string;
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

    // Маркер default ветки (косая черта по BPMN)
    function drawDefaultMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 8);
      ctx.lineTo(x + 8, y + 8);
      ctx.stroke();
    }

    // Подпись условия в квадратных скобках
    function drawConditionLabel(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
      ctx.font = "bold 14px Arial, sans-serif";
      const labelWidth = ctx.measureText(label).width + 16;
      
      // Фон
      ctx.fillStyle = "#FFF8E1";
      ctx.fillRect(x - labelWidth / 2, y - 12, labelWidth, 24);
      ctx.strokeStyle = "#E65100";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - labelWidth / 2, y - 12, labelWidth, 24);
      
      // Текст
      ctx.fillStyle = "#E65100";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y);
    }

    // ========== ФУНКЦИИ РИСОВАНИЯ БЛОКОВ ==========
    
    function drawBlockInfo(
      ctx: CanvasRenderingContext2D, 
      step: Step, 
      x: number, 
      startY: number, 
      maxWidth: number,
      textColor: string
    ) {
      let currentY = startY;
      const lineHeight = 18;
      
      ctx.font = "13px Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = textColor;

      // Описание
      if (step.description) {
        ctx.font = "italic 13px Arial, sans-serif";
        ctx.fillStyle = "#555";
        currentY = wrapText(ctx, step.description, x, currentY, maxWidth, lineHeight, 4);
        currentY += 8;
      }

      ctx.font = "13px Arial, sans-serif";
      ctx.fillStyle = textColor;

      // Параметры
      if (step.parameters && step.parameters.length > 0) {
        const timeParams = step.parameters.filter(p => p.type === "time");
        const envParams = step.parameters.filter(p => p.type === "environment");
        const docParams = step.parameters.filter(p => p.type === "document");
        const dbParams = step.parameters.filter(p => p.type === "database");

        if (timeParams.length > 0) {
          ctx.fillText(`⏱ ${timeParams[0].value}`, x, currentY);
          currentY += lineHeight;
        }
        if (envParams.length > 0) {
          ctx.fillText(`🖥 ${envParams[0].value}`, x, currentY);
          currentY += lineHeight;
        }
        if (docParams.length > 0) {
          const docs = docParams.slice(0, 2).map(p => p.value).join(", ");
          ctx.fillText(`📄 ${truncateText(ctx, docs, maxWidth - 20)}`, x, currentY);
          currentY += lineHeight;
        }
        if (dbParams.length > 0) {
          const dbs = dbParams.slice(0, 2).map(p => p.value).join(", ");
          ctx.fillText(`🗄 ${truncateText(ctx, dbs, maxWidth - 20)}`, x, currentY);
          currentY += lineHeight;
        }
      }
    }

    function drawStartBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      const radius = 30;
      const centerX = x + BLOCK_WIDTH / 2;
      const centerY = y + 50;
      
      ctx.fillStyle = highlighted ? "#A5D6A7" : "#C8E6C9";
      ctx.strokeStyle = highlighted ? "#1B5E20" : "#4CAF50";
      ctx.lineWidth = highlighted ? 4 : 3;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = "#1B5E20";
      ctx.font = "bold 18px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, step.name, centerX, y + 90, BLOCK_WIDTH - 40, 22, 2);
      
      drawBlockInfo(ctx, step, x + 20, y + 140, BLOCK_WIDTH - 40, "#2E7D32");
    }

    function drawActionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      ctx.fillStyle = highlighted ? "#E0E0E0" : "#F5F5F5";
      ctx.strokeStyle = highlighted ? "#424242" : "#757575";
      ctx.lineWidth = highlighted ? 4 : 3;
      
      // Шестиугольник
      const h = BLOCK_HEIGHT;
      const w = BLOCK_WIDTH;
      const indent = 30;
      
      ctx.beginPath();
      ctx.moveTo(x + indent, y);
      ctx.lineTo(x + w - indent, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w - indent, y + h);
      ctx.lineTo(x + indent, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = "#212121";
      ctx.font = "bold 18px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, step.name, x + w / 2, y + 15, w - 80, 22, 2);
      
      drawBlockInfo(ctx, step, x + 35, y + 70, w - 70, "#424242");
    }

    function drawProductBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      const radius = 10;
      
      ctx.fillStyle = highlighted ? "#90CAF9" : "#BBDEFB";
      ctx.strokeStyle = highlighted ? "#0D47A1" : "#1976D2";
      ctx.lineWidth = highlighted ? 4 : 3;
      
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
      
      ctx.fillStyle = "#0D47A1";
      ctx.font = "bold 18px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, step.name, x + BLOCK_WIDTH / 2, y + 15, BLOCK_WIDTH - 30, 22, 2);
      
      drawBlockInfo(ctx, step, x + 15, y + 70, BLOCK_WIDTH - 30, "#1565C0");
    }

    function drawDecisionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      const centerX = x + BLOCK_WIDTH / 2;
      const centerY = y + BLOCK_HEIGHT / 2;
      const halfWidth = BLOCK_WIDTH / 2;
      const halfHeight = BLOCK_HEIGHT / 2;
      
      ctx.fillStyle = highlighted ? "#FFF59D" : "#FFF9C4";
      ctx.strokeStyle = highlighted ? "#E65100" : "#FF9800";
      ctx.lineWidth = highlighted ? 4 : 3;
      
      // Ромб (XOR Gateway)
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + BLOCK_WIDTH, centerY);
      ctx.lineTo(centerX, y + BLOCK_HEIGHT);
      ctx.lineTo(x, centerY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // X внутри ромба (XOR символ)
      ctx.strokeStyle = "#E65100";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX - 20, centerY - 20);
      ctx.lineTo(centerX + 20, centerY + 20);
      ctx.moveTo(centerX + 20, centerY - 20);
      ctx.lineTo(centerX - 20, centerY + 20);
      ctx.stroke();
      
      // Текст вопроса
      ctx.fillStyle = "#BF360C";
      ctx.font = "bold 16px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapText(ctx, step.name, centerX, centerY + 50, BLOCK_WIDTH - 100, 20, 2);
    }

    function drawSplitBlock(ctx: CanvasRenderingContext2D, x: number, y: number, highlighted: boolean = false) {
      const width = 80;
      const centerX = x + BLOCK_WIDTH / 2;
      
      ctx.fillStyle = highlighted ? "#E1BEE7" : "#F3E5F5";
      ctx.strokeStyle = highlighted ? "#6A1B9A" : "#9C27B0";
      ctx.lineWidth = highlighted ? 4 : 3;
      
      // Parallel Gateway (+)
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX + width / 2, y + BLOCK_HEIGHT / 2);
      ctx.lineTo(centerX, y + BLOCK_HEIGHT);
      ctx.lineTo(centerX - width / 2, y + BLOCK_HEIGHT / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // + внутри
      ctx.strokeStyle = "#6A1B9A";
      ctx.lineWidth = 3;
      const cy = y + BLOCK_HEIGHT / 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 15, cy);
      ctx.lineTo(centerX + 15, cy);
      ctx.moveTo(centerX, cy - 15);
      ctx.lineTo(centerX, cy + 15);
      ctx.stroke();
    }

    function drawEndBlock(ctx: CanvasRenderingContext2D, x: number, y: number, step: Step, highlighted: boolean = false) {
      const radius = 30;
      const centerX = x + BLOCK_WIDTH / 2;
      const centerY = y + 50;
      
      ctx.fillStyle = highlighted ? "#FFCDD2" : "#FFEBEE";
      ctx.strokeStyle = highlighted ? "#B71C1C" : "#D32F2F";
      ctx.lineWidth = highlighted ? 6 : 5;
      
      // Двойной круг (End Event)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = "#B71C1C";
      ctx.font = "bold 18px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, step.name, centerX, y + 90, BLOCK_WIDTH - 40, 22, 2);
      
      drawBlockInfo(ctx, step, x + 20, y + 140, BLOCK_WIDTH - 40, "#C62828");
    }

    // Легенда
    function drawLegend(ctx: CanvasRenderingContext2D, x: number, y: number) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, 900, 100);
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, 900, 100);

      ctx.font = "bold 16px Arial, sans-serif";
      ctx.fillStyle = "#333";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("Легенда BPMN:", x + 15, y + 20);

      ctx.font = "14px Arial, sans-serif";
      const items = [
        { icon: "○", label: "Start Event" },
        { icon: "◎", label: "End Event" },
        { icon: "⬡", label: "Task" },
        { icon: "◇", label: "XOR Gateway" },
        { icon: "◇+", label: "AND Gateway" },
      ];

      let itemX = x + 15;
      items.forEach(item => {
        ctx.fillText(`${item.icon} ${item.label}`, itemX, y + 50);
        itemX += 160;
      });

      ctx.fillText("→ Sequence Flow    [условие] Conditional Flow    / Default Flow", x + 15, y + 80);
    }

    drawLegend(ctx, 20, canvasHeight - 120);

  }, [roles, stages, steps, zoom, pan, hoveredStepId, selectedStep, wrapText, truncateText, BLOCK_HEIGHT, BLOCK_MARGIN_Y, BLOCK_WIDTH, CONNECTION_OFFSET, LANE_WIDTH, ROLE_COLORS, ROLE_HEADER_HEIGHT]);

  // Обработчики масштабирования и перемещения
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.1));
  const handleFitToScreen = () => {
    setZoom(0.25);
    setPan({ x: 0, y: 0 });
  };
  const handleResetView = () => {
    setZoom(0.25);
    setPan({ x: 0, y: 0 });
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
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.1, Math.min(2, z * delta)));
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = `${title || "diagram"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleExportBPMN = () => {
    const processData = {
      id: title.replace(/[^a-zA-Z0-9]/g, "_") || "process",
      name: title || "Бизнес-процесс",
      roles,
      stages,
      steps,
    };
    downloadBPMNFile(processData, `${title || "process"}.bpmn`);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut} title="Уменьшить">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={handleZoomIn} title="Увеличить">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleFitToScreen} title="Вписать в экран">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleResetView} title="Сбросить вид">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportPNG} title="Экспорт PNG">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportBPMN} title="Экспорт BPMN XML">
            <FileCode className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative overflow-hidden border rounded-lg bg-gray-50"
        style={{ height: "600px", cursor: isDragging ? "grabbing" : "grab" }}
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
            transformOrigin: "0 0",
            cursor: editable && hoveredStepId ? "pointer" : undefined,
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-semibold">BPMN 2.0:</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-green-200 border-2 border-green-500"></span>
          <span>Start Event</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-red-200 border-4 border-red-500"></span>
          <span>End Event</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-gray-200 border border-gray-500" style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)" }}></span>
          <span>Task</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-yellow-200 border border-orange-500" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}></span>
          <span>XOR Gateway</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span>→ Sequence Flow</span>
          <span className="text-orange-600">[условие]</span>
          <span>/ Default</span>
        </div>
      </div>

      {selectedStep && (
        <BlockEditor
          step={selectedStep}
          roles={roles}
          stages={stages}
          allSteps={steps}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setSelectedStep(null);
          }}
          onSave={handleStepSave}
          onDelete={handleStepDelete}
        />
      )}
    </Card>
  );
}
