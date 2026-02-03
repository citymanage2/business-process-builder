import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Step {
  id: string;
  stageId: string;
  roleId: string;
  type: string;
  name: string;
  description?: string;
  order: number;
  duration?: string;
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
}

export default function ProcessDiagramView({ steps, roles, stages }: Props) {
  const getStepsByRoleAndStage = (roleId: string, stageId: string) => {
    return steps.filter((step) => step.roleId === roleId && step.stageId === stageId);
  };

  const getStepTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      start: "bg-green-100 border-green-300 text-green-800",
      end: "bg-red-100 border-red-300 text-red-800",
      task: "bg-blue-100 border-blue-300 text-blue-800",
      decision: "bg-yellow-100 border-yellow-300 text-yellow-800",
      subprocess: "bg-purple-100 border-purple-300 text-purple-800",
      document: "bg-gray-100 border-gray-300 text-gray-800",
    };
    return colors[type] || "bg-gray-100 border-gray-300 text-gray-800";
  };

  const getStepTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      start: "Начало",
      end: "Конец",
      task: "Задача",
      decision: "Решение",
      subprocess: "Подпроцесс",
      document: "Документ",
    };
    return labels[type] || type;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Заголовок с этапами */}
        <div className="flex border-b-2 border-gray-300">
          <div className="w-48 flex-shrink-0 p-4 bg-gray-50 font-semibold border-r-2 border-gray-300">
            Роли / Этапы
          </div>
          {stages
            .sort((a, b) => a.order - b.order)
            .map((stage) => (
              <div
                key={stage.id}
                className="flex-1 min-w-[200px] p-4 bg-gray-50 font-semibold text-center border-r border-gray-200"
              >
                <div>{stage.name}</div>
                {stage.description && (
                  <div className="text-xs text-muted-foreground mt-1">{stage.description}</div>
                )}
              </div>
            ))}
        </div>

        {/* Строки с ролями и ячейками */}
        {roles.map((role) => (
          <div key={role.id} className="flex border-b border-gray-200">
            {/* Колонка с названием роли */}
            <div className="w-48 flex-shrink-0 p-4 bg-gray-50 border-r-2 border-gray-300">
              <div className="font-medium">{role.name}</div>
              {role.description && (
                <div className="text-xs text-muted-foreground mt-1">{role.description}</div>
              )}
            </div>

            {/* Ячейки для каждого этапа */}
            {stages
              .sort((a, b) => a.order - b.order)
              .map((stage) => {
                const cellSteps = getStepsByRoleAndStage(role.id, stage.id);

                return (
                  <div
                    key={`${role.id}-${stage.id}`}
                    className="flex-1 min-w-[200px] p-3 border-r border-gray-200 bg-white min-h-[120px]"
                  >
                    <div className="space-y-2">
                      {cellSteps
                        .sort((a, b) => a.order - b.order)
                        .map((step) => (
                          <Card
                            key={step.id}
                            className={`p-3 ${getStepTypeColor(step.type)} border-2`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-medium text-sm flex-1">{step.name}</div>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {getStepTypeLabel(step.type)}
                                </Badge>
                              </div>
                              {step.description && (
                                <div className="text-xs opacity-80">{step.description}</div>
                              )}
                              {step.duration && (
                                <div className="text-xs opacity-60">⏱ {step.duration}</div>
                              )}
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
