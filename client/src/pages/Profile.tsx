import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Coins, LogOut, Building2, GitBranch, FileText, Plus, ArrowRight, Settings, Bell, Layout } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Profile() {
  const { user, loading, logout } = useAuth();

  // Fetch user data
  const { data: companies } = trpc.companies.list.useQuery();
  const { data: sharedProcesses } = trpc.permissions.sharedWithMe.useQuery();
  const { data: notifications } = trpc.notifications.list.useQuery({ limit: 5 });
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Вы вышли из системы");
    } catch (error) {
      toast.error("Ошибка при выходе");
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const companiesCount = companies?.length || 0;
  const sharedCount = sharedProcesses?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Личный кабинет</h1>
              <p className="text-muted-foreground text-sm">
                Управление профилем и статистика
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/processes">
                <Button variant="outline">
                  <Layout className="w-4 h-4 mr-2" />
                  Мои процессы
                </Button>
              </Link>
              <Link href="/builder">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Новый процесс
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - User Info */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Профиль
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{user.name || "Пользователь"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className="mt-1">
                      {user.role === "admin" ? "Администратор" : "Пользователь"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Дата регистрации</span>
                    <span>{format(new Date(user.createdAt), "d MMMM yyyy", { locale: ru })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Последний вход</span>
                    <span>{format(new Date(user.lastSignedIn), "d MMM, HH:mm", { locale: ru })}</span>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full mt-4"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Выйти из системы
                </Button>
              </CardContent>
            </Card>

            {/* Token Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  Баланс токенов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {user.tokenBalance || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">доступно</p>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground mb-4">
                  <p>• Генерация процесса: ~100-200 токенов</p>
                  <p>• Рекомендации ИИ: ~50 токенов</p>
                </div>

                <Button className="w-full" variant="outline" disabled>
                  Пополнить баланс <span className="ml-1 text-xs">(скоро)</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Statistics */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{companiesCount}</p>
                      <p className="text-xs text-muted-foreground">Компаний</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sharedCount}</p>
                      <p className="text-xs text-muted-foreground">Общие</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Companies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Мои компании</CardTitle>
                <CardDescription>Последние созданные</CardDescription>
              </CardHeader>
              <CardContent>
                {!companies || companies.length === 0 ? (
                  <div className="text-center py-6">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Нет компаний
                    </p>
                    <Link href="/companies">
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Создать компанию
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companies.slice(0, 3).map((company) => (
                      <Link key={company.id} href={`/company/${company.id}/processes`}>
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{company.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {company.industry || "Не указано"}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                    {companies.length > 3 && (
                      <Link href="/companies">
                        <Button variant="ghost" size="sm" className="w-full">
                          Показать все ({companies.length})
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notifications & Activity */}
          <div className="space-y-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Уведомления
                    {unreadCount && unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {unreadCount}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!notifications || notifications.length === 0 ? (
                  <div className="text-center py-6">
                    <Bell className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Нет уведомлений
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg ${
                          notification.isRead === 0 ? "bg-accent" : "bg-muted/50"
                        }`}
                      >
                        <p className="text-sm font-medium">{notification.title}</p>
                        {notification.content && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.createdAt), "d MMM, HH:mm", {
                            locale: ru,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Быстрые действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/builder">
                  <Button variant="outline" className="w-full justify-start">
                    <Layout className="w-4 h-4 mr-2" />
                    Открыть конструктор
                  </Button>
                </Link>
                <Link href="/templates">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Библиотека шаблонов
                  </Button>
                </Link>
                <Link href="/companies">
                  <Button variant="outline" className="w-full justify-start">
                    <Building2 className="w-4 h-4 mr-2" />
                    Управление компаниями
                  </Button>
                </Link>
                {user.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Панель администратора
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
