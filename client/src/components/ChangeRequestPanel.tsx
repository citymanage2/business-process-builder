import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquarePlus, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Eye,
  History,
  ArrowLeft,
  Clock,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface ChangeRequestPanelProps {
  businessProcessId: number;
  onClose?: () => void;
}

type RequestStatus = "pending" | "processing" | "preview" | "applied" | "rejected" | "rolled_back";

const statusLabels: Record<RequestStatus, string> = {
  pending: "Ожидает обработки",
  processing: "Обрабатывается",
  preview: "Готово к просмотру",
  applied: "Применено",
  rejected: "Отклонено",
  rolled_back: "Откачено",
};

const statusColors: Record<RequestStatus, string> = {
  pending: "bg-yellow-500",
  processing: "bg-blue-500",
  preview: "bg-purple-500",
  applied: "bg-green-500",
  rejected: "bg-red-500",
  rolled_back: "bg-gray-500",
};

export function ChangeRequestPanel({ businessProcessId, onClose }: ChangeRequestPanelProps) {
  const [activeTab, setActiveTab] = useState("request");
  const [requestText, setRequestText] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const utils = trpc.useUtils();

  // Получение списка запросов
  const { data: requests, isLoading: requestsLoading } = trpc.changeRequests.list.useQuery(
    { businessProcessId },
    { refetchInterval: pollingEnabled ? 2000 : false }
  );

  // Получение статуса выбранного запроса
  const { data: selectedRequest } = trpc.changeRequests.getStatus.useQuery(
    { requestId: selectedRequestId! },
    { 
      enabled: !!selectedRequestId,
      refetchInterval: pollingEnabled ? 2000 : false 
    }
  );

  // Получение предпросмотра
  const { data: preview, isLoading: previewLoading } = trpc.changeRequests.getPreview.useQuery(
    { requestId: selectedRequestId! },
    { enabled: !!selectedRequestId && selectedRequest?.status === "preview" }
  );

  // Получение истории версий
  const { data: versionHistory } = trpc.changeRequests.getVersionHistory.useQuery(
    { businessProcessId }
  );

  // Мутации
  const createRequest = trpc.changeRequests.create.useMutation({
    onSuccess: (data) => {
      toast.success("Запрос на изменение создан");
      setSelectedRequestId(data.id);
      setPollingEnabled(true);
      setActiveTab("status");
      setRequestText("");
      utils.changeRequests.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const applyChanges = trpc.changeRequests.applyChanges.useMutation({
    onSuccess: () => {
      toast.success("Изменения успешно применены");
      setPollingEnabled(false);
      utils.changeRequests.list.invalidate();
      utils.changeRequests.getVersionHistory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectChanges = trpc.changeRequests.reject.useMutation({
    onSuccess: () => {
      toast.info("Изменения отклонены");
      setPollingEnabled(false);
      utils.changeRequests.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rollbackChanges = trpc.changeRequests.rollback.useMutation({
    onSuccess: () => {
      toast.success("Изменения откачены");
      utils.changeRequests.list.invalidate();
      utils.changeRequests.getVersionHistory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rollbackToVersion = trpc.changeRequests.rollbackToVersion.useMutation({
    onSuccess: () => {
      toast.success("Процесс восстановлен до выбранной версии");
      utils.changeRequests.getVersionHistory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Автоматически отключаем polling когда запрос обработан
  useEffect(() => {
    if (selectedRequest && ["preview", "applied", "rejected", "rolled_back"].includes(selectedRequest.status)) {
      setPollingEnabled(false);
    }
  }, [selectedRequest?.status]);

  const handleSubmitRequest = () => {
    if (!requestText.trim()) {
      toast.error("Опишите желаемые изменения");
      return;
    }
    createRequest.mutate({
      businessProcessId,
      requestText: requestText.trim(),
    });
  };

  const renderRequestForm = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Опишите желаемые изменения в бизнес-процессе
        </label>
        <Textarea
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
          placeholder="Например: Добавить этап согласования с юридическим отделом перед подписанием договора. Или: Оптимизировать процесс закупки материалов, убрав дублирующие проверки."
          className="min-h-[150px]"
        />
      </div>
      <div className="flex gap-2">
        <Button 
          onClick={handleSubmitRequest}
          disabled={createRequest.isPending || !requestText.trim()}
          className="flex-1"
        >
          {createRequest.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              Запросить изменения
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderRequestStatus = () => {
    if (!selectedRequest) {
      return (
        <div className="text-center text-muted-foreground py-8">
          Выберите запрос из списка или создайте новый
        </div>
      );
    }

    const status = selectedRequest.status as RequestStatus;

    return (
      <div className="space-y-6">
        {/* Статус и прогресс */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Статус запроса</CardTitle>
              <Badge className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>
            </div>
            <CardDescription>
              {selectedRequest.requestText}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(status === "pending" || status === "processing") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{selectedRequest.progressMessage || "Обработка..."}</span>
                  <span>{selectedRequest.progress}%</span>
                </div>
                <Progress value={selectedRequest.progress || 0} className="h-2" />
              </div>
            )}

            {status === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Изменения готовы к просмотру</span>
                </div>
                
                {preview && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Предлагаемые изменения:</h4>
                    <p className="text-sm text-muted-foreground">
                      {preview.summary}
                    </p>
                    
                    {preview.proposedChanges?.changes && (
                      <div className="mt-4 space-y-2">
                        {preview.proposedChanges.changes.map((change, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="shrink-0">
                              {change.type === "add" && "Добавление"}
                              {change.type === "modify" && "Изменение"}
                              {change.type === "delete" && "Удаление"}
                              {change.type === "reorder" && "Перемещение"}
                            </Badge>
                            <span>{change.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={() => applyChanges.mutate({ requestId: selectedRequest.id })}
                    disabled={applyChanges.isPending}
                    className="flex-1"
                  >
                    {applyChanges.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Применить изменения
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => rejectChanges.mutate({ requestId: selectedRequest.id })}
                    disabled={rejectChanges.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Отклонить
                  </Button>
                </div>
              </div>
            )}

            {status === "applied" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Изменения применены</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.changesSummary}
                </p>
                <Button 
                  variant="outline"
                  onClick={() => rollbackChanges.mutate({ requestId: selectedRequest.id })}
                  disabled={rollbackChanges.isPending}
                >
                  {rollbackChanges.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Откатить изменения
                </Button>
              </div>
            )}

            {status === "rejected" && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Изменения отклонены</span>
              </div>
            )}

            {status === "rolled_back" && (
              <div className="flex items-center gap-2 text-gray-600">
                <RotateCcw className="w-5 h-5" />
                <span className="font-medium">Изменения откачены</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRequestsList = () => (
    <ScrollArea className="h-[300px]">
      {requestsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : requests && requests.length > 0 ? (
        <div className="space-y-2">
          {requests.map((request) => (
            <Card 
              key={request.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedRequestId === request.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => {
                setSelectedRequestId(request.id);
                setActiveTab("status");
                if (["pending", "processing"].includes(request.status)) {
                  setPollingEnabled(true);
                }
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {request.requestText.slice(0, 50)}...
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(request.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <Badge className={statusColors[request.status as RequestStatus]}>
                    {statusLabels[request.status as RequestStatus]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          Нет запросов на изменение
        </div>
      )}
    </ScrollArea>
  );

  const renderVersionHistory = () => (
    <ScrollArea className="h-[400px]">
      {versionHistory && versionHistory.length > 0 ? (
        <div className="space-y-2">
          {versionHistory.map((version) => (
            <Card key={version.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{version.versionNumber}</Badge>
                      {version.isActive === 1 && (
                        <Badge className="bg-green-500">Текущая</Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1">
                      {version.changeSummary || "Начальная версия"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(version.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  {version.isActive !== 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rollbackToVersion.mutate({
                        businessProcessId,
                        versionId: version.id,
                      })}
                      disabled={rollbackToVersion.isPending}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Восстановить
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>История версий пуста</p>
          <p className="text-xs mt-1">Версии создаются при применении изменений</p>
        </div>
      )}
    </ScrollArea>
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" />
            Запросить изменения
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Назад
            </Button>
          )}
        </div>
        <CardDescription>
          Опишите желаемые изменения, и система автоматически подготовит их для вас
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="request">
              <MessageSquarePlus className="w-4 h-4 mr-1" />
              Новый
            </TabsTrigger>
            <TabsTrigger value="list">
              <Clock className="w-4 h-4 mr-1" />
              Запросы
            </TabsTrigger>
            <TabsTrigger value="status">
              <Eye className="w-4 h-4 mr-1" />
              Статус
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-1" />
              История
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-4">
            <TabsContent value="request">
              {renderRequestForm()}
            </TabsContent>
            <TabsContent value="list">
              {renderRequestsList()}
            </TabsContent>
            <TabsContent value="status">
              {renderRequestStatus()}
            </TabsContent>
            <TabsContent value="history">
              {renderVersionHistory()}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
