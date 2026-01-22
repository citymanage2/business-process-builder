import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { ArrowRight, Mic, Sparkles, GitBranch, TrendingUp, Layout, FileText, Users, FolderOpen } from "lucide-react";
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
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/templates" className="text-muted-foreground hover:text-foreground transition-colors">
              Шаблоны
            </Link>
            <Link href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/processes">
                  <Button variant="outline">Мои процессы</Button>
                </Link>
                <Link href="/builder">
                  <Button>Конструктор</Button>
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
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              Конструктор бизнес-процессов
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Визуальное проектирование, документирование и управление бизнес-процессами. 
              Создавайте процессы из готовых блоков или генерируйте с помощью ИИ.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link href="/builder">
                    <Button size="lg" className="gap-2">
                      <Layout className="w-5 h-5" />
                      Открыть конструктор
                    </Button>
                  </Link>
                  <Link href="/templates">
                    <Button size="lg" variant="outline" className="gap-2">
                      <FolderOpen className="w-5 h-5" />
                      Шаблоны процессов
                    </Button>
                  </Link>
                </>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="gap-2">
                    Начать бесплатно <ArrowRight className="w-5 h-5" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <h3 className="text-3xl font-bold text-center mb-4">Два способа создать процесс</h3>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Используйте визуальный конструктор для ручного создания или доверьте работу искусственному интеллекту
          </p>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 hover:border-primary transition-colors p-6">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Layout className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Визуальный конструктор</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base mb-6">
                  Создавайте процессы с помощью drag-and-drop. Используйте готовые блоки, 
                  настраивайте связи, добавляйте комментарии и экспортируйте в PDF.
                </CardDescription>
                <ul className="text-sm text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    6 категорий блоков (25+ типов)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Автоматическая валидация
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Версионирование изменений
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Экспорт в JSON, PDF, PNG
                  </li>
                </ul>
                {isAuthenticated ? (
                  <Link href="/builder">
                    <Button className="w-full gap-2">
                      Открыть конструктор <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <a href={getLoginUrl()}>
                    <Button className="w-full gap-2">
                      Попробовать <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors p-6">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Генерация с ИИ</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base mb-6">
                  Ответьте на вопросы голосом или заполните анкету, и ИИ создаст 
                  готовый бизнес-процесс с рекомендациями по оптимизации.
                </CardDescription>
                <ul className="text-sm text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Голосовое интервью (5-15 мин)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Анализ и структуризация
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Рекомендации по автоматизации
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    Интеграция с CRM
                  </li>
                </ul>
                {isAuthenticated ? (
                  <Link href="/companies">
                    <Button variant="outline" className="w-full gap-2">
                      Создать через интервью <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <a href={getLoginUrl()}>
                    <Button variant="outline" className="w-full gap-2">
                      Попробовать <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
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
                  Создать компанию <ArrowRight className="w-5 h-5" />
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
