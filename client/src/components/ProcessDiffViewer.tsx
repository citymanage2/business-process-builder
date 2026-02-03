import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Edit } from "lucide-react";

interface DiffItem {
  type: "added" | "removed" | "modified";
  category: string;
  label: string;
  oldValue?: string;
  newValue?: string;
}

interface Props {
  currentData: any;
  updatedData: any;
}

export default function ProcessDiffViewer({ currentData, updatedData }: Props) {
  const changes: DiffItem[] = [];

  // Сравнение заголовка
  if (currentData.title !== updatedData.title) {
    changes.push({
      type: "modified",
      category: "Основное",
      label: "Название процесса",
      oldValue: currentData.title,
      newValue: updatedData.title,
    });
  }

  // Сравнение описания
  if (currentData.description !== updatedData.description) {
    changes.push({
      type: "modified",
      category: "Основное",
      label: "Описание",
      oldValue: currentData.description,
      newValue: updatedData.description,
    });
  }

  // Сравнение ролей
  const currentRoles = currentData.roles || [];
  const updatedRoles = updatedData.roles || [];
  
  const currentRoleIds = new Set(currentRoles.map((r: any) => r.id));
  const updatedRoleIds = new Set(updatedRoles.map((r: any) => r.id));

  updatedRoles.forEach((role: any) => {
    if (!currentRoleIds.has(role.id)) {
      changes.push({
        type: "added",
        category: "Роли",
        label: role.name,
      });
    } else {
      const currentRole = currentRoles.find((r: any) => r.id === role.id);
      if (currentRole && currentRole.name !== role.name) {
        changes.push({
          type: "modified",
          category: "Роли",
          label: "Название роли",
          oldValue: currentRole.name,
          newValue: role.name,
        });
      }
    }
  });

  currentRoles.forEach((role: any) => {
    if (!updatedRoleIds.has(role.id)) {
      changes.push({
        type: "removed",
        category: "Роли",
        label: role.name,
      });
    }
  });

  // Сравнение этапов
  const currentStages = currentData.stages || [];
  const updatedStages = updatedData.stages || [];
  
  const currentStageIds = new Set(currentStages.map((s: any) => s.id));
  const updatedStageIds = new Set(updatedStages.map((s: any) => s.id));

  updatedStages.forEach((stage: any) => {
    if (!currentStageIds.has(stage.id)) {
      changes.push({
        type: "added",
        category: "Этапы",
        label: stage.name,
      });
    } else {
      const currentStage = currentStages.find((s: any) => s.id === stage.id);
      if (currentStage && currentStage.name !== stage.name) {
        changes.push({
          type: "modified",
          category: "Этапы",
          label: "Название этапа",
          oldValue: currentStage.name,
          newValue: stage.name,
        });
      }
    }
  });

  currentStages.forEach((stage: any) => {
    if (!updatedStageIds.has(stage.id)) {
      changes.push({
        type: "removed",
        category: "Этапы",
        label: stage.name,
      });
    }
  });

  // Сравнение шагов (блоков)
  const currentSteps = currentData.steps || [];
  const updatedSteps = updatedData.steps || [];
  
  const currentStepIds = new Set(currentSteps.map((s: any) => s.id));
  const updatedStepIds = new Set(updatedSteps.map((s: any) => s.id));

  updatedSteps.forEach((step: any) => {
    if (!currentStepIds.has(step.id)) {
      changes.push({
        type: "added",
        category: "Блоки",
        label: step.name,
      });
    } else {
      const currentStep = currentSteps.find((s: any) => s.id === step.id);
      if (currentStep) {
        if (currentStep.name !== step.name) {
          changes.push({
            type: "modified",
            category: "Блоки",
            label: "Название блока",
            oldValue: currentStep.name,
            newValue: step.name,
          });
        }
        if (currentStep.roleId !== step.roleId || currentStep.stageId !== step.stageId) {
          const oldRole = currentRoles.find((r: any) => r.id === currentStep.roleId)?.name || "Неизвестно";
          const newRole = updatedRoles.find((r: any) => r.id === step.roleId)?.name || "Неизвестно";
          const oldStage = currentStages.find((s: any) => s.id === currentStep.stageId)?.name || "Неизвестно";
          const newStage = updatedStages.find((s: any) => s.id === step.stageId)?.name || "Неизвестно";
          
          changes.push({
            type: "modified",
            category: "Блоки",
            label: `Перемещение блока "${step.name}"`,
            oldValue: `${oldRole} → ${oldStage}`,
            newValue: `${newRole} → ${newStage}`,
          });
        }
      }
    }
  });

  currentSteps.forEach((step: any) => {
    if (!updatedStepIds.has(step.id)) {
      changes.push({
        type: "removed",
        category: "Блоки",
        label: step.name,
      });
    }
  });

  const typeIcons = {
    added: Plus,
    removed: Minus,
    modified: Edit,
  };

  const typeColors = {
    added: "text-green-600 bg-green-50 border-green-200",
    removed: "text-red-600 bg-red-50 border-red-200",
    modified: "text-blue-600 bg-blue-50 border-blue-200",
  };

  const typeLabels = {
    added: "Добавлено",
    removed: "Удалено",
    modified: "Изменено",
  };

  // Группируем изменения по категориям
  const groupedChanges = changes.reduce((acc, change) => {
    if (!acc[change.category]) {
      acc[change.category] = [];
    }
    acc[change.category].push(change);
    return acc;
  }, {} as Record<string, DiffItem[]>);

  if (changes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Изменений не обнаружено
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{changes.length} изменений</Badge>
      </div>

      {Object.entries(groupedChanges).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((change, index) => {
              const Icon = typeIcons[change.type];
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${typeColors[change.type]}`}
                >
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[change.type]}
                      </Badge>
                      <span className="font-medium">{change.label}</span>
                    </div>
                    {change.type === "modified" && change.oldValue && change.newValue && (
                      <div className="text-sm space-y-1">
                        <div className="line-through opacity-70">{change.oldValue}</div>
                        <div className="font-medium">{change.newValue}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
