import { useRoute, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Plus, Trash2, Eye, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export default function CompanyProcesses() {
  const [, params] = useRoute("/company/:id/processes");
  const [, setLocation] = useLocation();
  const companyId = params?.id ? parseInt(params.id) : 0;

  const { data: company, isLoading: companyLoading } = trpc.companies.get.useQuery({ id: companyId });
  const { data: processes, isLoading: processesLoading, refetch } = trpc.processes.list.useQuery({ companyId });

  const deleteMutation = trpc.processes.delete.useMutation({
    onSuccess: () => {
      toast.success("Процесс удален");
      refetch();
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  if (companyLoading || processesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Компания не найдена</CardTitle>
            <CardDescription>Проверьте правильность ссылки</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    draft: "Черновик",
    in_review: "На проверке",
    approved: "Утвержден",
  };

  const statusColors: Record<string, "default" | "secondary" | "outline"> = {
    draft: "secondary",
    in_review: "default",
    approved: "outline",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/companies")}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Назад
                </Button>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{company.name}</h1>
              <p className="text-muted-foreground break-words">
                Сохраненные бизнес-процессы компании
              </p>
            </div>
            <Button
              onClick={() => setLocation(`/interview-choice/${companyId}`)}
              className="gap-2 flex-shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Создать новый процесс
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!processes || processes.length === 0 ? (
          <Card className="max-w-2xl mx-auto text-center py-12">
            <CardHeader>
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Нет сохраненных процессов</CardTitle>
              <CardDescription>
                Создайте первый бизнес-процесс для этой компании, пройдя интервью
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation(`/interview-choice/${companyId}`)} className="gap-2">
                <Plus className="w-4 h-4" />
                Создать процесс
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processes.map((process) => (
              <Card key={process.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg break-words flex-1">{process.title}</CardTitle>
                    <Badge variant={statusColors[process.status || "draft"]} className="whitespace-nowrap">
                      {statusLabels[process.status || "draft"]}
                    </Badge>
                  </div>
                  <CardDescription className="break-words line-clamp-2">
                    {process.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {process.createdAt
                          ? formatDistanceToNow(new Date(process.createdAt), {
                              addSuffix: true,
                              locale: ru,
                            })
                          : "Недавно"}
                      </span>
                    </div>
                    {process.totalTime && (
                      <div className="text-xs">
                        Время выполнения: {process.totalTime} мин
                      </div>
                    )}
                    {process.totalCost && (
                      <div className="text-xs">
                        Стоимость: {process.totalCost.toLocaleString()} ₽
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/process/${process.id}`} className="flex-1">
                      <Button className="w-full gap-2" size="sm">
                        <Eye className="w-4 h-4" />
                        Открыть
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="px-3">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить процесс?</AlertDialogTitle>
                          <AlertDialogDescription className="break-words">
                            Вы уверены, что хотите удалить процесс <strong>"{process.title}"</strong>?
                            Это действие нельзя отменить. Все рекомендации и комментарии будут удалены.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: process.id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Удаление...
                              </>
                            ) : (
                              "Удалить"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
