import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ProcessDiagram from "@/components/ProcessDiagram";
import ProcessDiagramSwimlane from "@/components/ProcessDiagramSwimlane";
import ProcessDiagramEditable from "@/components/ProcessDiagramEditable";
import ProcessBuilder from "@/components/ProcessBuilder/ProcessBuilder";
import { convertStepsToFlow } from "@/components/ProcessBuilder/utils";
import ProcessModificationDialog from "@/components/ProcessModificationDialog";
import ProcessMetrics from "@/components/ProcessMetrics";
import CRMFunnels from "@/components/CRMFunnels";
import RequiredDocuments from "@/components/RequiredDocuments";
import StageDetails from "@/components/StageDetails";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, TrendingUp, AlertTriangle, Target, Edit, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { exportProcessToPDF } from "@/lib/pdfExport";

export default function ProcessView() {
  const [, params] = useRoute("/process/:id");
  const processId = params?.id ? parseInt(params.id) : 0;
  const [editMode, setEditMode] = useState(false);

  const { data: process, isLoading, refetch } = trpc.processes.get.useQuery({ id: processId });
  
  const updateProcessMutation = trpc.processes.update.useMutation({
    onSuccess: () => {
      toast.success("Изменения сохранены");
      refetch();
    },
    onError: (error) => {
      toast.error(`Ошибка сохранения: ${error.message}`);
    },
  });

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (process?.diagramData) {
      try {
        const parsed = JSON.parse(process.diagramData);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
            return { nodes: parsed.nodes, edges: parsed.edges };
        }
      } catch (e) {
        console.error("Failed to parse diagram data", e);
      }
    }
    
    if (process?.steps && process.steps.length > 0) {
        return convertStepsToFlow(process.steps, process.roles || [], process.stages || []);
    }

    return { nodes: [], edges: [] };
  }, [process?.diagramData, process?.steps, process?.roles, process?.stages]);

  const handleSaveProcess = (nodes: any[], edges: any[]) => {
      const diagramData = JSON.stringify({ nodes, edges });
      updateProcessMutation.mutate({
          id: processId,
          diagramData,
      });
  };

  const recommendationsQuery = trpc.recommendations.list.useQuery({ processId });

  const generateRecommendationsMutation = trpc.recommendations.generate.useMutation({
    onSuccess: () => {
      toast.success("Рекомендации сгенерированы");
      recommendationsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  const handleGenerateRecommendations = () => {
    generateRecommendationsMutation.mutate({ processId });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!process) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Процесс не найден</CardTitle>
            <CardDescription>Проверьте правильность ссылки</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const categoryIcons: Record<string, any> = {
    optimization: TrendingUp,
    automation: Sparkles,
    risk: AlertTriangle,
    metric: Target,
  };

  const categoryLabels: Record<string, string> = {
    optimization: "Оптимизация",
    automation: "Автоматизация",
    risk: "Риски",
    metric: "Метрики",
  };

  const priorityColors: Record<string, string> = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{process.title}</h1>
              <p className="text-muted-foreground mb-3 break-words">{process.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="whitespace-nowrap">{process.startEvent}</Badge>
                <Badge variant="outline" className="whitespace-nowrap">{process.endEvent}</Badge>
              </div>
            </div>
            {(!recommendationsQuery.data || recommendationsQuery.data.length === 0) && (
              <Button
                onClick={handleGenerateRecommendations}
                disabled={generateRecommendationsMutation.isPending}
                className="gap-2 flex-shrink-0 whitespace-nowrap"
              >
                {generateRecommendationsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Сгенерировать рекомендации
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="diagram" className="w-full">
          <TabsList className="grid w-full grid-cols-6 max-w-4xl">
            <TabsTrigger value="diagram">Диаграмма</TabsTrigger>
            <TabsTrigger value="stages">Этапы</TabsTrigger>
            <TabsTrigger value="metrics">Метрики</TabsTrigger>
            <TabsTrigger value="funnels">CRM</TabsTrigger>
            <TabsTrigger value="documents">Документы</TabsTrigger>
            <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
          </TabsList>

          <TabsContent value="diagram" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="mb-2">Визуализация процесса</CardTitle>
                    <CardDescription className="break-words">
                      Интерактивная BPMN-диаграмма бизнес-процесса
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ProcessModificationDialog
                      processId={processId}
                      onSubmit={(request) => {
                        console.log("Запрос на изменение:", request);
                        toast.info("Функция в разработке");
                        // TODO: Добавить mutation для обработки запроса
                      }}
                    />
                    <Button
                      variant={editMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Просмотр
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Редактировать
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.promise(exportProcessToPDF(process), {
                          loading: "Генерация PDF...",
                          success: "PDF успешно создан",
                          error: "Ошибка при создании PDF",
                        });
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[700px] border rounded-lg overflow-hidden bg-gray-50">
                  {editMode ? (
                    <ProcessBuilder
                        initialNodes={initialNodes}
                        initialEdges={initialEdges}
                        onSave={handleSaveProcess}
                    />
                  ) : (
                    initialNodes.length > 0 ? (
                        <ProcessBuilder
                            initialNodes={initialNodes}
                            initialEdges={initialEdges}
                            readOnly={true}
                        />
                    ) : (
                        <ProcessDiagramSwimlane
                            steps={process.steps || []}
                            roles={process.roles || []}
                            stages={process.stages || []}
                            title="Кросс-функциональная схема (Swimlane)"
                        />
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stages" className="mt-6">
            {(!process.stageDetails || process.stageDetails.length === 0) ? (
              <Card>
                <CardHeader className="text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Детальное описание этапов еще не сгенерировано</CardTitle>
                  <CardDescription>
                    Нажмите кнопку ниже, чтобы ИИ создал подробное описание каждого этапа процесса
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Button
                    onClick={() => toast.info("Функция в разработке")}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Сгенерировать описание этапов
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <StageDetails
                stages={process.stages || []}
                stageDetails={process.stageDetails || []}
              />
            )}
          </TabsContent>

          <TabsContent value="metrics" className="mt-6">
            {(!process.totalTime && !process.totalCost) ? (
              <Card>
                <CardHeader className="text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Метрики процесса еще не рассчитаны</CardTitle>
                  <CardDescription>
                    Нажмите кнопку ниже, чтобы ИИ рассчитал время выполнения и стоимость процесса
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Button
                    onClick={() => toast.info("Функция в разработке")}
                    className="gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Рассчитать метрики
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ProcessMetrics
                totalTime={process.totalTime}
                totalCost={process.totalCost}
                salaryData={process.salaryData}
              />
            )}
          </TabsContent>

          <TabsContent value="funnels" className="mt-6">
            {(!process.crmFunnels || process.crmFunnels.length === 0) ? (
              <Card>
                <CardHeader className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <CardTitle>CRM воронки еще не созданы</CardTitle>
                  <CardDescription>
                    Нажмите кнопку ниже, чтобы ИИ создал воронки продаж для вашего процесса
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Button
                    onClick={() => toast.info("Функция в разработке")}
                    className="gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Создать CRM воронки
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <CRMFunnels funnels={process.crmFunnels || []} />
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <RequiredDocuments documents={process.requiredDocuments || []} />
          </TabsContent>

          <TabsContent value="details" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Этапы процесса</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {process.stages?.map((stage: any) => (
                    <div key={stage.id} className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">
                        {stage.order}. {stage.name}
                      </h4>
                      <div className="space-y-2">
                        {process.steps
                          ?.filter((step: any) => step.stageId === stage.id)
                          .map((step: any) => (
                            <div key={step.id} className="pl-4 border-l-2 border-primary/30">
                              <div className="font-medium text-sm">{step.name}</div>
                              {step.tools && step.tools.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Инструменты: {step.tools.join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {process.itIntegration && (
              <Card>
                <CardHeader>
                  <CardTitle>ИТ-интеграция</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {process.itIntegration.crmStatuses && (
                      <div>
                        <h5 className="font-semibold mb-2">Статусы CRM</h5>
                        <div className="flex flex-wrap gap-2">
                          {process.itIntegration.crmStatuses.map((status: string, i: number) => (
                            <Badge key={i} variant="secondary">
                              {status}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {process.itIntegration.automations && (
                      <div>
                        <h5 className="font-semibold mb-2">Автоматизации</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {process.itIntegration.automations.map((auto: string, i: number) => (
                            <li key={i}>{auto}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            {!recommendationsQuery.data || recommendationsQuery.data.length === 0 ? (
              <Card>
                <CardHeader className="text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Рекомендации еще не сгенерированы</CardTitle>
                  <CardDescription>
                    Нажмите кнопку выше, чтобы ИИ проанализировал процесс и предложил улучшения
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : recommendationsQuery.isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Загрузка рекомендаций...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recommendationsQuery.data?.map((rec) => {
                  const Icon = categoryIcons[rec.category] || Sparkles;
                  return (
                    <Card key={rec.id}>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <CardTitle className="text-lg break-words">{rec.title}</CardTitle>
                                <Badge variant={priorityColors[rec.priority] as any} className="whitespace-nowrap">
                                  {rec.priority === "high"
                                    ? "Высокий"
                                    : rec.priority === "medium"
                                    ? "Средний"
                                    : "Низкий"}
                                </Badge>
                              </div>
                              <Badge variant="outline" className="whitespace-nowrap">{categoryLabels[rec.category]}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4 break-words">{rec.description}</p>
                        {rec.toolsSuggested && rec.toolsSuggested.length > 0 && (
                          <div>
                            <div className="text-sm font-semibold mb-2">Рекомендуемые инструменты:</div>
                            <div className="flex flex-wrap gap-2">
                              {rec.toolsSuggested.map((tool: string, i: number) => (
                                <Badge key={i} variant="secondary">
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
