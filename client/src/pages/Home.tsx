import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { ArrowRight, Mic, Sparkles, GitBranch, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{APP_TITLE}</h1>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/profile">
                  <Button variant="ghost">Профиль</Button>
                </Link>
                <Link href="/companies">
                  <Button>Мои компании</Button>
                </Link>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button>Войти</Button>
              </a>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              Создайте бизнес-процесс вашей компании за 15 минут
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Пройдите голосовое интервью, и ИИ построит детальный бизнес-процесс с рекомендациями по оптимизации
            </p>
            {isAuthenticated ? (
              <Link href="/companies">
                <Button size="lg" className="gap-2">
                  Начать <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" className="gap-2">
                  Начать бесплатно <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <h3 className="text-3xl font-bold text-center mb-12">Как это работает</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>1. Голосовое интервью</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Ответьте на вопросы о вашей компании голосом. ИИ распознает речь и структурирует данные.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>2. Генерация процесса</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  ИИ анализирует ваши ответы и создает детальный бизнес-процесс с этапами, ролями и шагами.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <GitBranch className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>3. Визуализация</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Получите интерактивную BPMN-диаграмму процесса с возможностью редактирования и комментирования.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>4. Рекомендации</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  ИИ предложит оптимизации, автоматизацию через CRM, чат-боты, 1С и выявит узкие места.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-primary to-indigo-600 rounded-2xl p-12 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">Готовы оптимизировать ваш бизнес?</h3>
            <p className="text-xl mb-8 opacity-90">
              Создайте первый бизнес-процесс бесплатно прямо сейчас
            </p>
            {isAuthenticated ? (
              <Link href="/companies">
                <Button size="lg" variant="secondary" className="gap-2">
                  Создать процесс <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" variant="secondary" className="gap-2">
                  Начать <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 {APP_TITLE}. Построение бизнес-процессов с помощью ИИ.</p>
        </div>
      </footer>
    </div>
  );
}
