import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface Step {
  id: string;
  stageId: string;
  roleId: string;
  type: string;
  name: string;
  description?: string;
  order: number;
  duration?: string;
  x?: number;
  y?: number;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface Stage {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface Props {
  steps: Step[];
  roles: Role[];
  stages: Stage[];
  onSave: (steps: Step[]) => void;
}

export default function ProcessDiagramEditable({ steps: initialSteps, roles, stages, onSave }: Props) {
  const [steps, setSteps] = useState(initialSteps);
  const [activeId, setActiveId] = useState<string | null>(null);
  const previousInitialStepsRef = useRef(initialSteps);

  // Синхронизируем steps с initialSteps только если последний действительно изменился
  useEffect(() => {
    // Сравниваем длину и IDs для определения реального изменения
    const hasRealChange = 
      initialSteps.length !== previousInitialStepsRef.current.length ||
      initialSteps.some((step, idx) => 
        step.id !== previousInitialStepsRef.current[idx]?.id ||
        step.roleId !== previousInitialStepsRef.current[idx]?.roleId ||
        step.stageId !== previousInitialStepsRef.current[idx]?.stageId
      );

    if (hasRealChange) {
      console.log("[ProcessDiagramEditable] Detected real change in initialSteps, syncing local state");
      setSteps(initialSteps);
      previousInitialStepsRef.current = initialSteps;
    }
  }, [initialSteps]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    // Парсим ID для определения новой позиции
    const overId = over.id as string;
    // Парсим ID цели (формат: "role_X_stage_Y")
    const roleMatch = overId.match(/role_([^_]+)/);
    const stageMatch = overId.match(/stage_([^_]+)/);
    
    if (!roleMatch || !stageMatch) {
      console.error("Invalid drop target ID:", overId);
      setActiveId(null);
      return;
    }
    
    const newRoleId = roleMatch[1];
    const newStageId = stageMatch[1];
    
    // Логирование для диагностики
    const draggedStep = steps.find(s => s.id === active.id);
    
    if (!draggedStep) {
      console.error("Step not found:", active.id);
      setActiveId(null);
      return;
    }

    console.log("[DRAG] Dragged step:", draggedStep);
    console.log("[DRAG] Old roleId/stageId:", draggedStep.roleId, draggedStep.stageId);
    console.log("[DRAG] New roleId/stageId:", newRoleId, newStageId);
    console.log("[DRAG] All steps before update:", steps.length);

    // Если шаг уже находится в нужной ячейке, не обновляем
    if (draggedStep.roleId === newRoleId && draggedStep.stageId === newStageId) {
      console.log("[DRAG] Step is already in target cell, no update needed");
      setActiveId(null);
      return;
    }

    // Обновляем шаг локально (без сохранения в БД)
    const updatedSteps = steps.map((step) =>
      step.id === active.id
        ? { ...step, roleId: newRoleId, stageId: newStageId }
        : step
    );
    console.log("Steps updated:", updatedSteps);
    console.log("Steps length after update:", updatedSteps.length);
    
    // Обновляем локальное состояние, но не сохраняем в БД автоматически
    setSteps(updatedSteps);

    setActiveId(null);
    toast.info("Элемент перемещен. Нажмите 'Сохранить изменения' для сохранения");
  };

  const handleSave = () => {
    // Сохраняем текущее состояние в БД
    onSave(steps);
    toast.success("Изменения сохранены");
  };

  const getStepsByRoleAndStage = (roleId: string, stageId: string) => {
    return steps.filter((step) => step.roleId === roleId && step.stageId === stageId);
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case "Start":
        return "bg-green-100 border-green-500";
      case "End":
        return "bg-red-100 border-red-500";
      case "Decision":
        return "bg-yellow-100 border-yellow-500";
      case "Action":
        return "bg-blue-100 border-blue-500";
      default:
        return "bg-gray-100 border-gray-500";
    }
  };

  const activeStep = steps.find((step) => step.id === activeId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Редактируемая диаграмма процесса</h3>
        <Button onClick={handleSave} size="sm">
          <Save className="w-4 h-4 mr-2" />
          Сохранить изменения
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto overflow-y-visible border rounded-lg">
          <div className="inline-block min-w-max">
            {/* Заголовки этапов */}
            <div className="flex border-b-2 border-gray-300">
              <div className="w-48 flex-shrink-0 bg-gray-50 p-4 font-semibold">Роли</div>
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className="min-w-[300px] flex-shrink-0 bg-indigo-50 p-4 text-center border-l border-gray-300"
                >
                  <div className="font-semibold">{stage.name}</div>
                  {stage.description && (
                    <div className="text-xs text-gray-600 mt-1">{stage.description}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Дорожки ролей */}
            {roles.map((role) => (
              <div key={role.id} className="flex border-b border-gray-200">
                {/* Название роли */}
                <div
                  className="w-48 flex-shrink-0 p-4 font-medium border-r border-gray-300"
                  style={{ backgroundColor: role.color || "#f9fafb" }}
                >
                  <div>{role.name}</div>
                  {role.description && (
                    <div className="text-xs text-gray-600 mt-1">{role.description}</div>
                  )}
                </div>

                {/* Ячейки для каждого этапа */}
                {stages.map((stage) => {
                  const cellSteps = getStepsByRoleAndStage(role.id, stage.id);
                  const dropId = `role_${role.id}_stage_${stage.id}`;

                  return (
                    <DroppableCell
                      key={dropId}
                      id={dropId}
                      steps={cellSteps}
                      getStepColor={getStepColor}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeStep && (
            <div
              className={`p-4 rounded-lg border-2 shadow-lg ${getStepColor(activeStep.type)} cursor-grabbing`}
              style={{ width: "260px" }}
            >
              <div className="font-semibold text-sm mb-2">{activeStep.name}</div>
              <div className="text-xs text-gray-700">
                {activeStep.description?.substring(0, 100)}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// Компонент для drop-зоны
function DroppableCell({
  id,
  steps,
  getStepColor,
}: {
  id: string;
  steps: Step[];
  getStepColor: (type: string) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[300px] min-h-[150px] flex-shrink-0 p-2 border-l border-gray-300 transition-colors ${
        isOver ? "bg-blue-100 border-blue-400" : "bg-white"
      }`}
    >
      <div className="space-y-2">
        {steps.map((step) => (
          <DraggableStep key={step.id} step={step} getStepColor={getStepColor} />
        ))}
      </div>
    </div>
  );
}

// Компонент для перетаскиваемого шага
function DraggableStep({
  step,
  getStepColor,
}: {
  step: Step;
  getStepColor: (type: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: step.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const truncatedDescription = step.description && step.description.length > 80 
    ? step.description.substring(0, 80) + "..." 
    : step.description;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`p-3 rounded-lg border-2 ${getStepColor(step.type)} cursor-grab ${
            isDragging ? "opacity-50" : ""
          }`}
        >
          <div className="font-semibold text-sm mb-1">{step.name}</div>
          {step.description && (
            <div className="text-xs text-gray-700 mb-2">{truncatedDescription}</div>
          )}
          {step.duration && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <span>⏱</span> {step.duration}
            </div>
          )}
        </div>
      </TooltipTrigger>
      {step.description && step.description.length > 80 && (
        <TooltipContent className="max-w-md p-4">
          <div className="space-y-2">
            <div className="font-semibold">{step.name}</div>
            <div className="text-sm">{step.description}</div>
            {step.duration && (
              <div className="text-xs text-muted-foreground">Длительность: {step.duration}</div>
            )}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
}


