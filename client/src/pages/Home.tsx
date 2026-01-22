import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { ArrowRight, Mic, Sparkles, GitBranch, TrendingUp, Blocks, Users, FileText, Share2 } from "lucide-react";
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
                <Link href="/processes">
                  <Button variant="ghost">Конструктор</Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost">Профиль</Button>
                </Link>
                <Link href="/companies">
                  <Button>Компании</Button>
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
                  Создать компанию <ArrowRight className="w-5 h-5" />
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

        {/* Visual Process Builder Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="bg-muted/50 rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-4">Визуальный конструктор процессов</h3>
                <p className="text-lg text-muted-foreground mb-6">
                  Создавайте бизнес-процессы с помощью drag-and-drop интерфейса. 
                  Библиотека готовых блоков, автоматическая валидация и экспорт в различные форматы.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Blocks className="w-5 h-5 text-primary" />
                    <span>26 типов блоков</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Экспорт в PDF/PNG</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>Совместная работа</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" />
                    <span>История версий</span>
                  </div>
                </div>
                {isAuthenticated ? (
                  <Link href="/processes">
                    <Button size="lg" className="gap-2">
                      Открыть конструктор <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                ) : (
                  <a href={getLoginUrl()}>
                    <Button size="lg" className="gap-2">
                      Попробовать бесплатно <ArrowRight className="w-5 h-5" />
                    </Button>
                  </a>
                )}
              </div>
              <div className="bg-background rounded-xl p-4 shadow-lg">
                <div className="aspect-video bg-gradient-to-br from-primary/5 to-indigo-500/5 rounded-lg flex items-center justify-center">
                  <GitBranch className="w-24 h-24 text-primary/30" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-primary to-indigo-600 rounded-2xl p-12 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">Готовы оптимизировать ваш бизнес?</h3>
            <p className="text-xl mb-8 opacity-90">
              Создайте первый бизнес-процесс бесплатно прямо сейчас
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link href="/companies">
                    <Button size="lg" variant="secondary" className="gap-2">
                      Создать компанию <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="/builder/new">
                    <Button size="lg" variant="outline" className="gap-2 bg-white/10 border-white/30 hover:bg-white/20">
                      Конструктор процессов <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" variant="secondary" className="gap-2">
                    Начать <ArrowRight className="w-5 h-5" />
                  </Button>
                </a>
              )}
            </div>
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
