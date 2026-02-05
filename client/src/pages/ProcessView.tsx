import { useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BpmnEditor from "@/components/BpmnEditor";
import ProcessDescription from "@/components/ProcessDescription";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Download, RefreshCw, MessageSquarePlus, FileText, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { exportProcessToPDF } from "@/lib/pdfExport";
import { OPERATION_COSTS } from "@shared/costs";
import { ChangeRequestPanel } from "@/components/ChangeRequestPanel";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ProcessView() {
  const [, params] = useRoute("/process/:id");
  const processId = params?.id ? parseInt(params.id) : 0;
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [changeRequestDialogOpen, setChangeRequestDialogOpen] = useState(false);

  const { data: process, isLoading, refetch } = trpc.processes.get.useQuery({ id: processId });

  const regenerateMutation = trpc.processes.regenerate.useMutation({
    onSuccess: () => {
      toast.success("Процесс успешно перегенерирован");
      refetch();
      setRegenerateDialogOpen(false);
      setIsRegenerating(false);
    },
    onError: (error: any) => {
      toast.error(`Ошибка регенерации: ${error.message}`);
      setIsRegenerating(false);
    },
  });

  const saveBpmnXmlMutation = trpc.processes.saveBpmnXml.useMutation({
    onSuccess: () => {
      toast.success("Диаграмма сохранена");
    },
    onError: (error) => {
      toast.error(`Ошибка сохранения: ${error.message}`);
    },
  });

  const handleRegenerate = () => {
    setIsRegenerating(true);
    regenerateMutation.mutate({ id: processId });
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

  return (
    <div className="min-h-screen bg-background">
      {/* Заголовок */}
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
            <div className="flex flex-wrap gap-2">
              <Dialog open={changeRequestDialogOpen} onOpenChange={setChangeRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="gap-2">
                    <MessageSquarePlus className="w-4 h-4" />
                    Запросить изменения
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Запросить изменения</DialogTitle>
                    <DialogDescription>
                      Опишите желаемые изменения в бизнес-процессе
                    </DialogDescription>
                  </DialogHeader>
                  <ChangeRequestPanel 
                    businessProcessId={processId} 
                    onClose={() => {
                      setChangeRequestDialogOpen(false);
                      refetch();
                    }}
                  />
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRegenerateDialogOpen(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Сгенерировать заново
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
        </div>
      </header>

      {/* Основной контент с вкладками */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="description" className="gap-2">
              <FileText className="w-4 h-4" />
              Описание
            </TabsTrigger>
            <TabsTrigger value="bpmn" className="gap-2">
              <GitBranch className="w-4 h-4" />
              BPMN Диаграмма
            </TabsTrigger>
          </TabsList>

          {/* Вкладка Описание - полное текстовое описание процесса */}
          <TabsContent value="description" className="mt-6">
            <ProcessDescription process={{
              ...process,
              description: process.description || undefined,
              startEvent: process.startEvent || undefined,
              endEvent: process.endEvent || undefined,
              totalTime: process.totalTime ? String(process.totalTime) : undefined,
              totalCost: process.totalCost ? String(process.totalCost) : undefined,
            }} />
          </TabsContent>

          {/* Вкладка BPMN Диаграмма - визуальный редактор */}
          <TabsContent value="bpmn" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="mb-2">BPMN 2.0 Диаграмма</CardTitle>
                    <CardDescription className="break-words">
                      Интерактивный редактор бизнес-процесса в нотации BPMN 2.0. 
                      Вы можете редактировать диаграмму, добавлять элементы и экспортировать результат.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <BpmnEditor
                  process={{
                    id: process.id,
                    title: process.title,
                    roles: process.roles || [],
                    stages: process.stages || [],
                    steps: process.steps || []
                  }}
                  initialXml={process.bpmnXml || undefined}
                  editable={true}
                  height="700px"
                  onSave={(xml) => {
                    saveBpmnXmlMutation.mutate({ processId: process.id, bpmnXml: xml });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Диалог подтверждения регенерации */}
      <AlertDialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сгенерировать процесс заново?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                AI-ассистент создаст новую версию бизнес-процесса на основе исходной анкеты.
                Текущая версия процесса будет заменена.
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">
                  Стоимость операции: <strong>{OPERATION_COSTS.GENERATE_PROCESS} токенов</strong>
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Сгенерировать
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
