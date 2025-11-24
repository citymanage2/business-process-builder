import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Coins } from "lucide-react";
import { toast } from "sonner";

export default function ProcessGenerate() {
  const [, params] = useRoute("/process/generate/:companyId/:interviewId");
  const [, setLocation] = useLocation();
  
  const companyId = params?.companyId ? parseInt(params.companyId) : 0;
  const interviewId = params?.interviewId ? parseInt(params.interviewId) : 0;

  const generateMutation = trpc.processes.generate.useMutation({
    onSuccess: (data) => {
      if (data.tokensDeducted && data.newBalance !== undefined) {
        toast.success(
          `Бизнес-процесс создан! Списано ${data.tokensDeducted} токенов. Осталось: ${data.newBalance}`,
          { duration: 5000 }
        );
      } else {
        toast.success("Бизнес-процесс создан!");
      }
      setLocation(`/process/${data.id}`);
    },
    onError: (error) => {
      // Проверяем код ошибки недостаточного баланса
      if (error.data?.code === 'PRECONDITION_FAILED') {
        toast.error(error.message, {
          duration: 7000,
          action: {
            label: 'Пополнить',
            onClick: () => setLocation('/profile')
          }
        });
      } else {
        toast.error(`Ошибка: ${error.message}`);
      }
    },
  });

  useEffect(() => {
    if (companyId && interviewId && !generateMutation.isPending && !generateMutation.isSuccess) {
      generateMutation.mutate({ companyId, interviewId });
    }
  }, [companyId, interviewId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl">Генерация бизнес-процесса</CardTitle>
          <CardDescription className="text-base">
            ИИ анализирует ваши ответы и создает детальный бизнес-процесс
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/50">
              <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
              <div>
                <div className="font-medium">Анализ данных интервью</div>
                <div className="text-sm text-muted-foreground">
                  Обработка ответов и выделение ключевых моментов
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/50">
              <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
              <div>
                <div className="font-medium">Построение этапов и ролей</div>
                <div className="text-sm text-muted-foreground">
                  Определение участников и последовательности действий
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/50">
              <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
              <div>
                <div className="font-medium">Создание диаграммы процесса</div>
                <div className="text-sm text-muted-foreground">
                  Визуализация бизнес-процесса в формате BPMN
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/50">
              <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
              <div>
                <div className="font-medium">Генерация рекомендаций</div>
                <div className="text-sm text-muted-foreground">
                  Анализ узких мест и предложения по оптимизации
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-center text-muted-foreground">
              Это может занять 30-60 секунд. Пожалуйста, не закрывайте страницу.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
