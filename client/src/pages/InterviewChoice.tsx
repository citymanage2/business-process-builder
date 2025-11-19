import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, Mic, CheckCircle2, Clock, Loader2 } from "lucide-react";

export default function InterviewChoice() {
  const [, params] = useRoute("/interview-choice/:id");
  const [, setLocation] = useLocation();
  const companyId = params?.id ? parseInt(params.id) : 0;

  const { data: company, isLoading } = trpc.companies.get.useQuery({ id: companyId });

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
        <p className="text-muted-foreground">
          Компания: {company.name}
        </p>
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
