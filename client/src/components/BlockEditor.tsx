import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Clock, FileText, Database, Layers, Trash2, Save, Link2 } from "lucide-react";
import { toast } from "sonner";

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

interface Role {
  id: string;
  name: string;
}

interface Stage {
  id: string;
  name: string;
  order: number;
}

interface BlockEditorProps {
  step: Step | null;
  roles: Role[];
  stages: Stage[];
  allSteps: Step[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStep: Step) => void;
  onDelete?: (stepId: string) => void;
}

const BLOCK_TYPES = [
  { value: "Start", label: "Запуск", icon: "🟢" },
  { value: "Action", label: "Действие", icon: "⬡" },
  { value: "Product", label: "Продукт", icon: "📦" },
  { value: "Decision", label: "Условие", icon: "◇" },
  { value: "Split", label: "Разделение", icon: "▽" },
  { value: "End", label: "Завершение", icon: "🔴" },
];

const PARAMETER_TYPES = [
  { value: "time", label: "Время", icon: Clock },
  { value: "document", label: "Документ", icon: FileText },
  { value: "database", label: "База данных", icon: Database },
  { value: "stage", label: "Этап", icon: Layers },
];

export default function BlockEditor({
  step,
  roles,
  stages,
  allSteps,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: BlockEditorProps) {
  const [editedStep, setEditedStep] = useState<Step | null>(null);
  const [newParamType, setNewParamType] = useState<string>("time");
  const [newParamValue, setNewParamValue] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newConnectionId, setNewConnectionId] = useState("");
  const [newBranchCondition, setNewBranchCondition] = useState("");
  const [newBranchTargetId, setNewBranchTargetId] = useState("");

  useEffect(() => {
    if (step) {
      setEditedStep({ ...step });
    }
  }, [step]);

  if (!editedStep) return null;

  const handleSave = () => {
    if (!editedStep.name.trim()) {
      toast.error("Название блока не может быть пустым");
      return;
    }
    onSave(editedStep);
    toast.success("Блок сохранён");
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && editedStep) {
      onDelete(editedStep.id);
      onClose();
    }
  };

  const addParameter = () => {
    if (!newParamValue.trim()) {
      toast.error("Введите значение параметра");
      return;
    }
    const newParam: ActionParameter = {
      type: newParamType as ActionParameter["type"],
      value: newParamValue,
    };
    setEditedStep({
      ...editedStep,
      parameters: [...(editedStep.parameters || []), newParam],
    });
    setNewParamValue("");
  };

  const removeParameter = (index: number) => {
    setEditedStep({
      ...editedStep,
      parameters: editedStep.parameters?.filter((_, i) => i !== index),
    });
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) {
      toast.error("Введите пункт чек-листа");
      return;
    }
    setEditedStep({
      ...editedStep,
      checklist: [...(editedStep.checklist || []), newChecklistItem],
    });
    setNewChecklistItem("");
  };

  const removeChecklistItem = (index: number) => {
    setEditedStep({
      ...editedStep,
      checklist: editedStep.checklist?.filter((_, i) => i !== index),
    });
  };

  const addConnection = () => {
    if (!newConnectionId) {
      toast.error("Выберите блок для связи");
      return;
    }
    setEditedStep({
      ...editedStep,
      nextSteps: [...(editedStep.nextSteps || []), newConnectionId],
    });
    setNewConnectionId("");
  };

  const removeConnection = (stepId: string) => {
    setEditedStep({
      ...editedStep,
      nextSteps: editedStep.nextSteps?.filter((id) => id !== stepId),
    });
  };

  const addBranch = () => {
    if (!newBranchTargetId) {
      toast.error("Выберите целевой блок для ветвления");
      return;
    }
    const newBranch: Branch = {
      condition: newBranchCondition || undefined,
      targetStepId: newBranchTargetId,
    };
    setEditedStep({
      ...editedStep,
      branches: [...(editedStep.branches || []), newBranch],
    });
    setNewBranchCondition("");
    setNewBranchTargetId("");
  };

  const removeBranch = (index: number) => {
    setEditedStep({
      ...editedStep,
      branches: editedStep.branches?.filter((_, i) => i !== index),
    });
  };

  const getStepName = (stepId: string) => {
    const found = allSteps.find((s) => s.id === stepId);
    return found ? found.name : stepId;
  };

  const availableStepsForConnection = allSteps.filter(
    (s) =>
      s.id !== editedStep.id &&
      !editedStep.nextSteps?.includes(s.id) &&
      !editedStep.branches?.some((b) => b.targetStepId === s.id)
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-2xl">
              {BLOCK_TYPES.find((t) => t.value === editedStep.type)?.icon}
            </span>
            Редактирование блока
          </SheetTitle>
          <SheetDescription>
            Измените параметры блока и нажмите "Сохранить"
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Название блока */}
          <div className="space-y-2">
            <Label htmlFor="name">Название блока</Label>
            <Input
              id="name"
              value={editedStep.name}
              onChange={(e) =>
                setEditedStep({ ...editedStep, name: e.target.value })
              }
              placeholder="Введите название"
            />
          </div>

          {/* Тип блока */}
          <div className="space-y-2">
            <Label>Тип блока</Label>
            <Select
              value={editedStep.type}
              onValueChange={(value) =>
                setEditedStep({
                  ...editedStep,
                  type: value as Step["type"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Роль */}
          <div className="space-y-2">
            <Label>Роль (исполнитель)</Label>
            <Select
              value={editedStep.roleId}
              onValueChange={(value) =>
                setEditedStep({ ...editedStep, roleId: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Этап */}
          <div className="space-y-2">
            <Label>Этап процесса</Label>
            <Select
              value={editedStep.stageId}
              onValueChange={(value) =>
                setEditedStep({ ...editedStep, stageId: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={editedStep.description || ""}
              onChange={(e) =>
                setEditedStep({ ...editedStep, description: e.target.value })
              }
              placeholder="Опишите действие подробнее..."
              rows={3}
            />
          </div>

          {/* Параметры действия */}
          <div className="space-y-3">
            <Label>Параметры действия</Label>
            <div className="flex flex-wrap gap-2">
              {editedStep.parameters?.map((param, index) => {
                const paramType = PARAMETER_TYPES.find(
                  (t) => t.value === param.type
                );
                const Icon = paramType?.icon || Clock;
                return (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 py-1 px-2"
                  >
                    <Icon className="w-3 h-3" />
                    <span>{param.value}</span>
                    <button
                      onClick={() => removeParameter(index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Select value={newParamType} onValueChange={setNewParamType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARAMETER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newParamValue}
                onChange={(e) => setNewParamValue(e.target.value)}
                placeholder="Значение..."
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={addParameter}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Чек-лист */}
          <div className="space-y-3">
            <Label>Чек-лист</Label>
            <div className="space-y-1">
              {editedStep.checklist?.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1"
                >
                  <span className="flex-1">• {item}</span>
                  <button
                    onClick={() => removeChecklistItem(index)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Добавить пункт..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
              />
              <Button variant="outline" size="icon" onClick={addChecklistItem}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Связи (nextSteps) */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Связи с другими блоками
            </Label>
            <div className="space-y-1">
              {editedStep.nextSteps?.map((stepId) => (
                <div
                  key={stepId}
                  className="flex items-center gap-2 text-sm bg-blue-50 rounded px-2 py-1"
                >
                  <span className="flex-1">→ {getStepName(stepId)}</span>
                  <button
                    onClick={() => removeConnection(stepId)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newConnectionId} onValueChange={setNewConnectionId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Выберите блок..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStepsForConnection.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={addConnection}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Ветвления (для Decision блоков) */}
          {editedStep.type === "Decision" && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <span className="text-lg">◇</span>
                Ветвления (условия)
              </Label>
              <div className="space-y-2">
                {editedStep.branches?.map((branch, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm bg-yellow-50 rounded px-2 py-1"
                  >
                    <span className="flex-1">
                      {branch.condition ? `[${branch.condition}]` : "[без условия]"} →{" "}
                      {getStepName(branch.targetStepId)}
                    </span>
                    <button
                      onClick={() => removeBranch(index)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Input
                  value={newBranchCondition}
                  onChange={(e) => setNewBranchCondition(e.target.value)}
                  placeholder="Условие (например: Да, Нет, >100)"
                />
                <div className="flex gap-2">
                  <Select
                    value={newBranchTargetId}
                    onValueChange={setNewBranchTargetId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Целевой блок..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStepsForConnection.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={addBranch}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Порядок */}
          <div className="space-y-2">
            <Label htmlFor="order">Порядок (позиция в дорожке)</Label>
            <Input
              id="order"
              type="number"
              min={1}
              value={editedStep.order}
              onChange={(e) =>
                setEditedStep({
                  ...editedStep,
                  order: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          {onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Сохранить
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
