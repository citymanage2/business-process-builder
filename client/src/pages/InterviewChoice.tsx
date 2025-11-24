import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, Mic, CheckCircle2, Clock, Loader2, ArrowRight, Coins } from "lucide-react";
import { OPERATION_COSTS } from "@shared/costs";
import { useEffect } from "react";

export default function InterviewChoice() {
  const [, params] = useRoute("/interview-choice/:id");
  const [, setLocation] = useLocation();
  const companyId = params?.id ? parseInt(params.id) : 0;

  const { data: company, isLoading } = trpc.companies.get.useQuery({ id: companyId });
  const { data: allProcesses } = trpc.processes.list.useQuery({ companyId });
  const { data: drafts } = trpc.drafts.list.useQuery({ companyId });

  // Автопереход к результатам если интервью завершено
  useEffect(() => {
    if (allProcesses && allProcesses.length > 0) {
      const companyProcess = allProcesses.find(p => p.companyId === companyId);
      if (companyProcess) {
        // Есть готовый процесс - переходим к нему
        setLocation(`/process/${companyProcess.id}`);
      }
    }
  }, [allProcesses, setLocation, companyId]);

  const completedDraft = drafts?.find(d => d.progress === 100);
  const hasCompletedInterview = !!completedDraft;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Компания не найдена</h1>
        <Button onClick={() => setLocation("/")}>Вернуться на главную</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          Выберите способ интервью
        </h1>
        <p className="text-muted-foreground mb-3">
          Компания: {company.name}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Стоимость генерации процесса: {OPERATION_COSTS.GENERATE_PROCESS} токенов
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Голосовое интервью */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation(`/interview/${companyId}`)}>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
              <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>Голосовое интервью</CardTitle>
            <CardDescription>
              Запишите аудио с описанием вашего процесса
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Быстро и естественно</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Автоматическая транскрипция</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>5-15 минут</span>
            </div>
            <Button className="w-full mt-4">
              Начать запись
            </Button>
          </CardContent>
        </Card>

        {/* Сокращенная анкета */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-primary" onClick={() => setLocation(`/form-interview/${companyId}/short`)}>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="flex items-center gap-2">
              Сокращенная анкета
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Рекомендуем</span>
            </CardTitle>
            <CardDescription>
              10 ключевых вопросов о процессе
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Быстрое заполнение</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Структурированные ответы</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Сохранение черновиков</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>10-15 минут</span>
            </div>
            <Button className="w-full mt-4">
              Заполнить анкету
            </Button>
          </CardContent>
        </Card>

        {/* Полная анкета */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation(`/form-interview/${companyId}/full`)}>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle>Полная анкета</CardTitle>
            <CardDescription>
              50 детальных вопросов по всем аспектам
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Максимальная детализация</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>7 тематических блоков</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Загрузка документов</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>30-45 минут</span>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Заполнить анкету
            </Button>
          </CardContent>
        </Card>
      </div>

      {hasCompletedInterview && (
        <div className="mt-8 p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Интервью уже завершено
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                Вы уже прошли интервью для этой компании. Вы можете перейти к результатам или пройти интервью заново другим способом.
              </p>
              <Button 
                onClick={() => setLocation(`/process/generate/${companyId}/${completedDraft.id}`)}
                className="gap-2"
              >
                Перейти к результатам <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">💡 Совет</h3>
        <p className="text-sm text-muted-foreground">
          Для первого знакомства рекомендуем начать с <strong>сокращенной анкеты</strong> — 
          она позволит быстро получить базовую схему процесса. При необходимости вы всегда 
          сможете дополнить информацию позже или создать новый процесс с полной анкетой.
        </p>
      </div>
    </div>
  );
}
