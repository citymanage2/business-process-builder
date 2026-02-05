import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Layers,
  ListChecks,
  GitBranch,
  FileText,
  Monitor,
  Clock,
  DollarSign,
  Target,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  description?: string;
  responsibilities?: string[];
}

interface Stage {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface Step {
  id: string;
  name: string;
  description?: string;
  roleId: string;
  stageId: string;
  order: number;
  duration?: string;
  inputs?: string[];
  outputs?: string[];
  tools?: string[];
}

interface Branch {
  id: string;
  name: string;
  condition: string;
  fromStepId: string;
  toStepId: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  description?: string;
  stage?: string;
}

interface ITIntegration {
  systems?: string[];
  automations?: string[];
  integrations?: string[];
}

interface ProcessDescriptionProps {
  process: {
    id: number;
    title: string;
    description?: string;
    startEvent?: string;
    endEvent?: string;
    roles: Role[];
    stages: Stage[];
    steps: Step[];
    branches?: Branch[];
    documents?: Document[];
    itIntegration?: ITIntegration;
    totalTime?: string;
    totalCost?: string;
    stageDetails?: any[];
    crmFunnels?: any[];
    requiredDocuments?: any[];
    salaryData?: any[];
  };
}

export default function ProcessDescription({ process }: ProcessDescriptionProps) {
  const sortedStages = [...(process.stages || [])].sort((a, b) => a.order - b.order);
  const sortedSteps = [...(process.steps || [])].sort((a, b) => a.order - b.order);

  // Группируем шаги по этапам
  const stepsByStage = sortedStages.map(stage => ({
    stage,
    steps: sortedSteps.filter(step => step.stageId === stage.id)
  }));

  // Находим роль по ID
  const getRoleName = (roleId: string) => {
    const role = process.roles?.find(r => r.id === roleId);
    return role?.name || "Не указана";
  };

  return (
    <div className="space-y-6">
      {/* Общая информация */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <CardTitle>Общая информация о процессе</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">{process.title}</h3>
            {process.description && (
              <p className="text-muted-foreground">{process.description}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-green-800 dark:text-green-200">Начало процесса</p>
                <p className="text-green-700 dark:text-green-300">{process.startEvent || "Не указано"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Target className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-blue-800 dark:text-blue-200">Завершение процесса</p>
                <p className="text-blue-700 dark:text-blue-300">{process.endEvent || "Не указано"}</p>
              </div>
            </div>
          </div>

          {(process.totalTime || process.totalCost) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {process.totalTime && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Общее время выполнения</p>
                    <p className="text-muted-foreground">{process.totalTime}</p>
                  </div>
                </div>
              )}
              {process.totalCost && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Стоимость процесса</p>
                    <p className="text-muted-foreground">{process.totalCost}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Участники процесса (Роли) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle>Участники процесса</CardTitle>
          </div>
          <CardDescription>
            Роли и ответственные лица, задействованные в бизнес-процессе
          </CardDescription>
        </CardHeader>
        <CardContent>
          {process.roles && process.roles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {process.roles.map((role, index) => (
                <div
                  key={role.id}
                  className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>
                    <h4 className="font-semibold">{role.name}</h4>
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  )}
                  {role.responsibilities && role.responsibilities.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Обязанности:</p>
                      <ul className="text-sm space-y-1">
                        {role.responsibilities.map((resp, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-primary">•</span>
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Роли не определены</p>
          )}
        </CardContent>
      </Card>

      {/* Этапы процесса */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <CardTitle>Этапы процесса</CardTitle>
          </div>
          <CardDescription>
            Последовательность этапов выполнения бизнес-процесса
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedStages.length > 0 ? (
            <div className="space-y-4">
              {sortedStages.map((stage, index) => (
                <div key={stage.id} className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      {index < sortedStages.length - 1 && (
                        <div className="w-0.5 h-full min-h-[20px] bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <h4 className="font-semibold text-lg">{stage.name}</h4>
                      {stage.description && (
                        <p className="text-muted-foreground mt-1">{stage.description}</p>
                      )}
                      
                      {/* Детали этапа из stageDetails */}
                      {process.stageDetails && process.stageDetails.length > 0 && (
                        (() => {
                          const detail = process.stageDetails.find(d => d.stageId === stage.id || d.stageName === stage.name);
                          if (detail) {
                            return (
                              <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                                {detail.objectives && (
                                  <div>
                                    <p className="text-sm font-medium">Цели:</p>
                                    <p className="text-sm text-muted-foreground">{detail.objectives}</p>
                                  </div>
                                )}
                                {detail.kpis && detail.kpis.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium">KPI:</p>
                                    <ul className="text-sm text-muted-foreground">
                                      {detail.kpis.map((kpi: string, i: number) => (
                                        <li key={i}>• {kpi}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {detail.duration && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4" />
                                    <span>Длительность: {detail.duration}</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Этапы не определены</p>
          )}
        </CardContent>
      </Card>

      {/* Детальное описание шагов по этапам */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            <CardTitle>Детальное описание шагов</CardTitle>
          </div>
          <CardDescription>
            Подробное описание каждого шага процесса с указанием ответственных и ресурсов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stepsByStage.length > 0 ? (
            <div className="space-y-8">
              {stepsByStage.map(({ stage, steps }) => (
                <div key={stage.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-base px-3 py-1">
                      Этап: {stage.name}
                    </Badge>
                  </div>
                  
                  {steps.length > 0 ? (
                    <div className="space-y-4 ml-4">
                      {steps.map((step, stepIndex) => (
                        <div
                          key={step.id}
                          className="border-l-2 border-primary/30 pl-4 py-2"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-primary">
                                  Шаг {stepIndex + 1}
                                </span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                <h5 className="font-semibold">{step.name}</h5>
                              </div>
                              
                              {step.description && (
                                <p className="text-muted-foreground mb-2">{step.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  <Users className="w-3 h-3 mr-1" />
                                  {getRoleName(step.roleId)}
                                </Badge>
                                {step.duration && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {step.duration}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Входы и выходы */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                {step.inputs && step.inputs.length > 0 && (
                                  <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
                                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                                      Входные данные:
                                    </p>
                                    <ul className="text-xs text-amber-700 dark:text-amber-300">
                                      {step.inputs.map((input, i) => (
                                        <li key={i}>• {input}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {step.outputs && step.outputs.length > 0 && (
                                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                                      Результат:
                                    </p>
                                    <ul className="text-xs text-emerald-700 dark:text-emerald-300">
                                      {step.outputs.map((output, i) => (
                                        <li key={i}>• {output}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                              
                              {/* Инструменты */}
                              {step.tools && step.tools.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Инструменты и системы:
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {step.tools.map((tool, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        <Monitor className="w-3 h-3 mr-1" />
                                        {tool}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm ml-4">
                      Шаги для этого этапа не определены
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Шаги не определены</p>
          )}
        </CardContent>
      </Card>

      {/* Условные переходы (Ветвления) */}
      {process.branches && process.branches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <CardTitle>Условные переходы</CardTitle>
            </div>
            <CardDescription>
              Точки принятия решений и альтернативные пути в процессе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {process.branches.map((branch, index) => {
                const fromStep = sortedSteps.find(s => s.id === branch.fromStepId);
                const toStep = sortedSteps.find(s => s.id === branch.toStepId);
                
                return (
                  <div
                    key={branch.id}
                    className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <h4 className="font-semibold text-orange-800 dark:text-orange-200">
                        {branch.name}
                      </h4>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                      <strong>Условие:</strong> {branch.condition}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{fromStep?.name || "Начало"}</Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge variant="outline">{toStep?.name || "Конец"}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Документы */}
      {((process.documents && process.documents.length > 0) || 
        (process.requiredDocuments && process.requiredDocuments.length > 0)) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle>Документы процесса</CardTitle>
            </div>
            <CardDescription>
              Документация, используемая и создаваемая в рамках процесса
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(process.requiredDocuments || process.documents || []).map((doc: any, index: number) => (
                <div
                  key={doc.id || index}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">{doc.name || doc.title}</h4>
                      {doc.type && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {doc.type}
                        </Badge>
                      )}
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {doc.description}
                        </p>
                      )}
                      {doc.stage && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Этап: {doc.stage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IT-интеграция */}
      {process.itIntegration && (
        (process.itIntegration.systems?.length || 
         process.itIntegration.automations?.length || 
         process.itIntegration.integrations?.length) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              <CardTitle>IT-системы и интеграции</CardTitle>
            </div>
            <CardDescription>
              Программное обеспечение и автоматизация, используемые в процессе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {process.itIntegration.systems && process.itIntegration.systems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Используемые системы
                  </h4>
                  <div className="space-y-2">
                    {process.itIntegration.systems.map((system, i) => (
                      <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                        {system}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {process.itIntegration.automations && process.itIntegration.automations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Автоматизация
                  </h4>
                  <div className="space-y-2">
                    {process.itIntegration.automations.map((auto, i) => (
                      <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                        {auto}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {process.itIntegration.integrations && process.itIntegration.integrations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Интеграции
                  </h4>
                  <div className="space-y-2">
                    {process.itIntegration.integrations.map((integ, i) => (
                      <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                        {integ}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* CRM Воронки */}
      {process.crmFunnels && process.crmFunnels.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle>CRM Воронки</CardTitle>
            </div>
            <CardDescription>
              Воронки продаж и конверсии, связанные с процессом
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {process.crmFunnels.map((funnel: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">{funnel.name}</h4>
                  {funnel.stages && (
                    <div className="flex flex-wrap gap-2">
                      {funnel.stages.map((stage: any, i: number) => (
                        <div key={i} className="flex items-center">
                          <Badge variant="outline">{stage.name || stage}</Badge>
                          {i < funnel.stages.length - 1 && (
                            <ArrowRight className="w-4 h-4 mx-1 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
