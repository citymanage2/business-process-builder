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
  type: "time" | "document" | "database" | "stage";
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
  const [zoom, setZoom] = useState(0.28);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  
  const stepPositionsRef = useRef<Record<string, { x: number; y: number; width: number; height: number; roleIndex: number }>>({});

  // МАКСИМАЛЬНЫЕ размеры для полной читаемости
  const ROLE_HEADER_HEIGHT = 160;
  const LANE_WIDTH = 780;
  const BLOCK_WIDTH = 700;
  const BLOCK_HEIGHT = 500;
  const BLOCK_MARGIN_Y = 120;

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

  // Улучшенная функция переноса текста с ограничением строк
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

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editable || isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = ((e.clientX - rect.left) * scaleX - pan.x) / zoom;
    const clickY = ((e.clientY - rect.top) * scaleY - pan.y) / zoom;
    
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
  }, [editable, isDragging, pan, zoom, steps]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editable) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = ((e.clientX - rect.left) * scaleX - pan.x) / zoom;
    const mouseY = ((e.clientY - rect.top) * scaleY - pan.y) / zoom;
    
    let foundHovered = false;
    for (const [stepId, pos] of Object.entries(stepPositionsRef.current)) {
      if (mouseX >= pos.x && mouseX <= pos.x + pos.width &&
          mouseY >= pos.y && mouseY <= pos.y + pos.height) {
        if (hoveredStepId !== stepId) setHoveredStepId(stepId);
        foundHovered = true;
        break;
      }
    }
    
    if (!foundHovered && hoveredStepId) setHoveredStepId(null);
  }, [editable, pan, zoom, hoveredStepId]);

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

    const stepsByRole: Record<string, Step[]> = {};
    steps.forEach(step => {
      if (!stepsByRole[step.roleId]) stepsByRole[step.roleId] = [];
      stepsByRole[step.roleId].push(step);
    });

    Object.keys(stepsByRole).forEach(roleId => {
      stepsByRole[roleId].sort((a, b) => a.order - b.order);
    });

    let maxStepsInRole = 0;
    Object.values(stepsByRole).forEach(roleSteps => {
      maxStepsInRole = Math.max(maxStepsInRole, roleSteps.length);
    });

    const canvasWidth = sortedRoles.length * LANE_WIDTH + 200;
    const canvasHeight = ROLE_HEADER_HEIGHT + maxStepsInRole * (BLOCK_HEIGHT + BLOCK_MARGIN_Y * 2) + 800;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const stepPositions: Record<string, { x: number; y: number; width: number; height: number; roleIndex: number }> = {};

    sortedRoles.forEach((role, roleIndex) => {
      const x = roleIndex * LANE_WIDTH;
      const color = role.color || ROLE_COLORS[roleIndex % ROLE_COLORS.length];

      ctx.fillStyle = color;
      ctx.fillRect(x, 0, LANE_WIDTH, canvasHeight);

      ctx.strokeStyle = "#666";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + LANE_WIDTH, 0);
      ctx.lineTo(x + LANE_WIDTH, canvasHeight);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, 0, LANE_WIDTH, ROLE_HEADER_HEIGHT);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, 0, LANE_WIDTH, ROLE_HEADER_HEIGHT);

      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold 32px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const maxRoleWidth = LANE_WIDTH - 80;
      wrapText(ctx, role.name, x + LANE_WIDTH / 2, ROLE_HEADER_HEIGHT / 2, maxRoleWidth, 40, 3);

      const roleSteps = stepsByRole[role.id] || [];
      
      roleSteps.forEach((step, stepIndex) => {
        const blockX = x + (LANE_WIDTH - BLOCK_WIDTH) / 2;
        const blockY = ROLE_HEADER_HEIGHT + 100 + stepIndex * (BLOCK_HEIGHT + BLOCK_MARGIN_Y * 2);

        stepPositions[step.id] = {
          x: blockX,
          y: blockY,
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          roleIndex: roleIndex
        };

        const isHovered = hoveredStepId === step.id;
        const isSelected = selectedStep?.id === step.id;
        const highlighted = isHovered || isSelected;

        switch (step.type) {
          case "Start":
            drawStartBlock(ctx, blockX, blockY, step.name, step.description, step.parameters, highlighted);
            break;
          case "Action":
            drawActionBlock(ctx, blockX, blockY, step.name, step.description, step.parameters, highlighted);
            break;
          case "Product":
            drawProductBlock(ctx, blockX, blockY, step.name, step.description, step.parameters, highlighted);
            break;
          case "Decision":
            drawDecisionBlock(ctx, blockX, blockY, step.name, step.description, highlighted);
            break;
          case "Split":
            drawSplitBlock(ctx, blockX + BLOCK_WIDTH / 2 - 80, blockY, highlighted);
            break;
          case "End":
            drawEndBlock(ctx, blockX, blockY, step.name, step.description, step.parameters, highlighted);
            break;
          default:
            drawActionBlock(ctx, blockX, blockY, step.name, step.description, step.parameters, highlighted);
        }
        
        if (editable && isHovered) {
          ctx.fillStyle = "#6366F1";
          ctx.beginPath();
          ctx.arc(blockX + BLOCK_WIDTH - 40, blockY + 40, 30, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 28px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✎", blockX + BLOCK_WIDTH - 40, blockY + 40);
        }
      });
    });

    stepPositionsRef.current = stepPositions;

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 4;
    ctx.setLineDash([]);

    steps.forEach(step => {
      const fromPos = stepPositions[step.id];
      if (!fromPos) return;

      if (step.branches && step.branches.length > 0) {
        step.branches.forEach((branch) => {
          const toPos = stepPositions[branch.targetStepId];
          if (!toPos) return;
          drawConnection(ctx, fromPos, toPos, branch.condition);
        });
      } else if (step.nextSteps && step.nextSteps.length > 0) {
        step.nextSteps.forEach(nextStepId => {
          const toPos = stepPositions[nextStepId];
          if (!toPos) return;
          drawConnection(ctx, fromPos, toPos);
        });
      }
    });

    // Функция отрисовки параметров внутри блока
    function drawParameters(
      ctx: CanvasRenderingContext2D, 
      parameters: ActionParameter[] | undefined, 
      x: number, 
      startY: number, 
      maxWidth: number,
      textColor: string,
      maxHeight: number,
      indent: number = 50
    ): number {
      if (!parameters || parameters.length === 0) return startY;
      
      let currentY = startY;
      const endY = startY + maxHeight;
      
      // Группируем параметры по типу - ограничиваем количество
      const timeParams = parameters.filter(p => p.type === "time").slice(0, 1);
      const docParams = parameters.filter(p => p.type === "document").slice(0, 2);
      const dbParams = parameters.filter(p => p.type === "database").slice(0, 2);
      const stageParams = parameters.filter(p => p.type === "stage").slice(0, 1);
      
      const leftX = x + indent;
      const valueMaxWidth = maxWidth - indent * 2;
      
      // Время
      if (timeParams.length > 0 && currentY < endY - 40) {
        ctx.fillStyle = "#D84315";
        ctx.font = "bold 22px Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("⏱ Время:", leftX, currentY);
        currentY += 32;
        
        ctx.font = "20px Arial, sans-serif";
        ctx.fillStyle = textColor;
        timeParams.forEach(param => {
          if (currentY < endY - 30) {
            const truncated = truncateText(ctx, param.value, valueMaxWidth);
            ctx.fillText(`   ${truncated}`, leftX, currentY);
            currentY += 30;
          }
        });
        currentY += 15;
      }
      
      // Документы
      if (docParams.length > 0 && currentY < endY - 40) {
        ctx.fillStyle = "#1565C0";
        ctx.font = "bold 22px Arial, sans-serif";
        ctx.fillText("📄 Документы:", leftX, currentY);
        currentY += 32;
        
        ctx.font = "20px Arial, sans-serif";
        ctx.fillStyle = textColor;
        docParams.forEach(param => {
          if (currentY < endY - 30) {
            const truncated = truncateText(ctx, param.value, valueMaxWidth);
            ctx.fillText(`   ${truncated}`, leftX, currentY);
            currentY += 30;
          }
        });
        currentY += 15;
      }
      
      // Системы/БД
      if (dbParams.length > 0 && currentY < endY - 40) {
        ctx.fillStyle = "#6A1B9A";
        ctx.font = "bold 22px Arial, sans-serif";
        ctx.fillText("🗄 Системы:", leftX, currentY);
        currentY += 32;
        
        ctx.font = "20px Arial, sans-serif";
        ctx.fillStyle = textColor;
        dbParams.forEach(param => {
          if (currentY < endY - 30) {
            const truncated = truncateText(ctx, param.value, valueMaxWidth);
            ctx.fillText(`   ${truncated}`, leftX, currentY);
            currentY += 30;
          }
        });
        currentY += 15;
      }
      
      // Этап
      if (stageParams.length > 0 && currentY < endY - 40) {
        ctx.fillStyle = "#00695C";
        ctx.font = "bold 22px Arial, sans-serif";
        ctx.fillText("📍 Этап:", leftX, currentY);
        currentY += 32;
        
        ctx.font = "20px Arial, sans-serif";
        ctx.fillStyle = textColor;
        stageParams.forEach(param => {
          if (currentY < endY - 30) {
            const truncated = truncateText(ctx, param.value, valueMaxWidth);
            ctx.fillText(`   ${truncated}`, leftX, currentY);
            currentY += 30;
          }
        });
      }
      
      return currentY;
    }

    function drawStartBlock(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, description?: string, parameters?: ActionParameter[], highlighted: boolean = false) {
      const radius = 60;
      
      ctx.fillStyle = highlighted ? "#A5D6A7" : "#C8E6C9";
      ctx.strokeStyle = highlighted ? "#2E7D32" : "#4CAF50";
      ctx.lineWidth = highlighted ? 6 : 4;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + BLOCK_WIDTH - radius, y);
      ctx.arc(x + BLOCK_WIDTH - radius, y + BLOCK_HEIGHT / 2, BLOCK_HEIGHT / 2, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + radius, y + BLOCK_HEIGHT);
      ctx.arc(x + radius, y + BLOCK_HEIGHT / 2, BLOCK_HEIGHT / 2, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Заголовок - крупный шрифт
      ctx.fillStyle = "#1B5E20";
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, text, x + BLOCK_WIDTH / 2, y + 50, BLOCK_WIDTH - 180, 36, 2);
      
      // Описание
      let descEndY = y + 140;
      if (description) {
        ctx.font = "22px Arial, sans-serif";
        ctx.fillStyle = "#2E7D32";
        descEndY = wrapText(ctx, description, x + BLOCK_WIDTH / 2, y + 140, BLOCK_WIDTH - 180, 30, 3);
      }
      
      // Параметры
      if (parameters && parameters.length > 0) {
        ctx.textAlign = "left";
        drawParameters(ctx, parameters, x, descEndY + 25, BLOCK_WIDTH - 100, "#2E7D32", BLOCK_HEIGHT - descEndY + y - 60, 80);
      }
    }

    function drawActionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, description?: string, parameters?: ActionParameter[], highlighted: boolean = false) {
      const indent = 70;
      
      ctx.fillStyle = highlighted ? "#BDBDBD" : "#E0E0E0";
      ctx.strokeStyle = highlighted ? "#212121" : "#424242";
      ctx.lineWidth = highlighted ? 6 : 4;
      
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
      
      // Заголовок
      ctx.fillStyle = "#212121";
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, text, x + BLOCK_WIDTH / 2, y + 40, BLOCK_WIDTH - 200, 36, 2);
      
      // Описание
      let descEndY = y + 130;
      if (description) {
        ctx.font = "20px Arial, sans-serif";
        ctx.fillStyle = "#424242";
        descEndY = wrapText(ctx, description, x + BLOCK_WIDTH / 2, y + 130, BLOCK_WIDTH - 200, 28, 3);
      }
      
      // Параметры
      if (parameters && parameters.length > 0) {
        ctx.textAlign = "left";
        drawParameters(ctx, parameters, x + 60, descEndY + 25, BLOCK_WIDTH - 180, "#424242", BLOCK_HEIGHT - descEndY + y - 60, 60);
      }
    }

    function drawProductBlock(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, description?: string, parameters?: ActionParameter[], highlighted: boolean = false) {
      const radius = 30;
      
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = highlighted ? "#1565C0" : "#1976D2";
      ctx.lineWidth = highlighted ? 6 : 4;
      
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
      
      // Заголовок
      ctx.fillStyle = "#0D47A1";
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, text, x + BLOCK_WIDTH / 2, y + 40, BLOCK_WIDTH - 120, 36, 2);
      
      // Описание
      let descEndY = y + 130;
      if (description) {
        ctx.font = "20px Arial, sans-serif";
        ctx.fillStyle = "#1565C0";
        descEndY = wrapText(ctx, description, x + BLOCK_WIDTH / 2, y + 130, BLOCK_WIDTH - 120, 28, 3);
      }
      
      // Параметры
      if (parameters && parameters.length > 0) {
        ctx.textAlign = "left";
        drawParameters(ctx, parameters, x, descEndY + 25, BLOCK_WIDTH - 60, "#1565C0", BLOCK_HEIGHT - descEndY + y - 60, 50);
      }
    }

    function drawDecisionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, description?: string, highlighted: boolean = false) {
      const centerX = x + BLOCK_WIDTH / 2;
      const centerY = y + BLOCK_HEIGHT / 2;
      
      ctx.fillStyle = highlighted ? "#FFF59D" : "#FFF9C4";
      ctx.strokeStyle = highlighted ? "#E65100" : "#FF9800";
      ctx.lineWidth = highlighted ? 6 : 4;
      
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
      ctx.font = "bold 56px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", centerX, centerY - 80);
      
      // Текст вопроса
      ctx.font = "bold 26px Arial, sans-serif";
      ctx.fillStyle = "#BF360C";
      wrapText(ctx, text, centerX, centerY - 10, BLOCK_WIDTH - 250, 34, 3);
      
      // Описание
      if (description) {
        ctx.font = "20px Arial, sans-serif";
        ctx.fillStyle = "#E65100";
        wrapText(ctx, description, centerX, centerY + 100, BLOCK_WIDTH - 250, 26, 2);
      }
    }

    function drawSplitBlock(ctx: CanvasRenderingContext2D, x: number, y: number, highlighted: boolean = false) {
      const width = 160;
      
      ctx.fillStyle = highlighted ? "#E1BEE7" : "#F3E5F5";
      ctx.strokeStyle = highlighted ? "#6A1B9A" : "#9C27B0";
      ctx.lineWidth = highlighted ? 6 : 4;
      
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + BLOCK_HEIGHT);
      ctx.lineTo(x, y + BLOCK_HEIGHT);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Текст
      ctx.fillStyle = "#6A1B9A";
      ctx.font = "bold 26px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Развилка", x + width / 2, y + BLOCK_HEIGHT / 2 + 60);
    }

    function drawEndBlock(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, description?: string, parameters?: ActionParameter[], highlighted: boolean = false) {
      ctx.fillStyle = highlighted ? "#FFCDD2" : "#FFEBEE";
      ctx.strokeStyle = highlighted ? "#B71C1C" : "#D32F2F";
      ctx.lineWidth = highlighted ? 6 : 4;
      
      ctx.strokeRect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT);
      ctx.fillRect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT);
      
      ctx.strokeRect(x + 20, y + 20, BLOCK_WIDTH - 40, BLOCK_HEIGHT - 40);
      
      // Заголовок
      ctx.fillStyle = "#B71C1C";
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      wrapText(ctx, text, x + BLOCK_WIDTH / 2, y + 60, BLOCK_WIDTH - 120, 36, 2);
      
      // Описание
      let descEndY = y + 150;
      if (description) {
        ctx.font = "20px Arial, sans-serif";
        ctx.fillStyle = "#C62828";
        descEndY = wrapText(ctx, description, x + BLOCK_WIDTH / 2, y + 150, BLOCK_WIDTH - 120, 28, 4);
      }
      
      // Параметры
      if (parameters && parameters.length > 0) {
        ctx.textAlign = "left";
        drawParameters(ctx, parameters, x, descEndY + 25, BLOCK_WIDTH - 60, "#C62828", BLOCK_HEIGHT - descEndY + y - 60, 50);
      }
    }

    function drawConnection(
      ctx: CanvasRenderingContext2D,
      from: { x: number; y: number; width: number; height: number; roleIndex: number },
      to: { x: number; y: number; width: number; height: number; roleIndex: number },
      label?: string
    ) {
      const fromCenterX = from.x + from.width / 2;
      const fromBottomY = from.y + from.height;
      const toCenterX = to.x + to.width / 2;
      const toTopY = to.y;

      ctx.strokeStyle = "#333";
      ctx.lineWidth = 4;
      ctx.setLineDash([]);

      if (from.roleIndex === to.roleIndex) {
        ctx.beginPath();
        ctx.moveTo(fromCenterX, fromBottomY);
        ctx.lineTo(toCenterX, toTopY);
        ctx.stroke();
        
        drawArrowHead(ctx, toCenterX, toTopY, Math.PI / 2);
      } else {
        const midY = fromBottomY + (toTopY - fromBottomY) / 2;
        
        ctx.beginPath();
        ctx.moveTo(fromCenterX, fromBottomY);
        ctx.lineTo(fromCenterX, midY);
        ctx.lineTo(toCenterX, midY);
        ctx.lineTo(toCenterX, toTopY);
        ctx.stroke();
        
        drawArrowHead(ctx, toCenterX, toTopY, Math.PI / 2);
      }

      if (label) {
        const labelX = (fromCenterX + toCenterX) / 2;
        const labelY = from.roleIndex === to.roleIndex 
          ? (fromBottomY + toTopY) / 2 
          : fromBottomY + (toTopY - fromBottomY) / 2 - 25;
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(labelX - 70, labelY - 22, 140, 44);
        ctx.strokeStyle = "#E65100";
        ctx.lineWidth = 3;
        ctx.strokeRect(labelX - 70, labelY - 22, 140, 44);
        
        ctx.fillStyle = "#E65100";
        ctx.font = "bold 22px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, labelX, labelY);
      }
    }

    function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
      const headLength = 25;
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

  }, [roles, stages, steps, zoom, pan, wrapText, truncateText, hoveredStepId, selectedStep, editable]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1));
  const handleFitToScreen = () => { setZoom(0.25); setPan({ x: 0, y: 0 }); };
  const handleResetView = () => { setZoom(0.28); setPan({ x: 0, y: 0 }); };

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
        style={{ height: "900px", cursor: isDragging ? "grabbing" : "grab" }}
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

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold mb-3">Легенда:</h4>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-5 rounded-full bg-green-200 border-2 border-green-500"></div>
            <span>Начало/Конец</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-5 bg-gray-200 border-2 border-gray-500" style={{ clipPath: "polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)" }}></div>
            <span>Действие</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-5 bg-white border-2 border-blue-500 rounded"></div>
            <span>Продукт/Результат</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-yellow-100 border-2 border-orange-500 rotate-45"></div>
            <span className="ml-1">Решение</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[15px] border-l-transparent border-r-transparent border-b-purple-300"></div>
            <span>Развилка</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-orange-600">⏱</span>
            <span>Время выполнения</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-600">📄</span>
            <span>Документы</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-600">🗄</span>
            <span>Системы/БД</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-teal-600">📍</span>
            <span>Этап процесса</span>
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
