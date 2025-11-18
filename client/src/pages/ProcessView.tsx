import { useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProcessDiagram } from "@/components/ProcessDiagram";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { toast } from "sonner";

export default function ProcessView() {
  const [, params] = useRoute("/process/:id");
  const processId = params?.id ? parseInt(params.id) : 0;

  const { data: process, isLoading } = trpc.processes.get.useQuery({ id: processId });

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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{process.title}</h1>
              <p className="text-muted-foreground mt-1">{process.description}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{process.startEvent}</Badge>
                <Badge variant="outline">{process.endEvent}</Badge>
              </div>
            </div>
            {(!recommendationsQuery.data || recommendationsQuery.data.length === 0) && (
              <Button
                onClick={handleGenerateRecommendations}
                disabled={generateRecommendationsMutation.isPending}
                className="gap-2"
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
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="diagram">Диаграмма</TabsTrigger>
            <TabsTrigger value="details">Детали</TabsTrigger>
            <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
          </TabsList>

          <TabsContent value="diagram" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Визуализация процесса</CardTitle>
                <CardDescription>
                  Интерактивная BPMN-диаграмма бизнес-процесса
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProcessDiagram
                  steps={process.steps || []}
                  roles={process.roles || []}
                  stages={process.stages || []}
                  branches={process.branches || []}
                />
              </CardContent>
            </Card>
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
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-lg">{rec.title}</CardTitle>
                                <Badge variant={priorityColors[rec.priority] as any}>
                                  {rec.priority === "high"
                                    ? "Высокий"
                                    : rec.priority === "medium"
                                    ? "Средний"
                                    : "Низкий"}
                                </Badge>
                              </div>
                              <Badge variant="outline">{categoryLabels[rec.category]}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">{rec.description}</p>
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
