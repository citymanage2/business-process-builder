import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, Coins, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Profile() {
  const { user, loading, logout } = useAuth();

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

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Личный кабинет</h1>
        <p className="text-muted-foreground">
          Управление профилем и балансом токенов
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Информация о пользователе */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Профиль
            </CardTitle>
            <CardDescription>Ваши данные</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Имя</p>
              <p className="text-lg font-medium">{user.name || "Не указано"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-medium">{user.email || "Не указан"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Роль</p>
              <p className="text-lg font-medium capitalize">
                {user.role === "admin" ? "Администратор" : "Пользователь"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дата регистрации</p>
              <p className="text-lg font-medium">
                {new Date(user.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Баланс токенов */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              Баланс токенов
            </CardTitle>
            <CardDescription>Токены для генерации процессов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-primary mb-2">
                {user.tokenBalance || 0}
              </div>
              <p className="text-sm text-muted-foreground">токенов доступно</p>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Генерация процесса: ~100-200 токенов</p>
              <p>• Голосовое интервью: ~50-100 токенов</p>
              <p>• Модификация процесса: ~50 токенов</p>
            </div>

            <Button className="w-full" variant="outline" disabled>
              Пополнить баланс
              <span className="ml-2 text-xs">(скоро)</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Действия */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Действия</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full md:w-auto"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти из системы
          </Button>
        </CardContent>
      </Card>

      {/* Статистика использования */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Статистика</CardTitle>
          <CardDescription>Ваша активность в системе</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-primary">0</p>
              <p className="text-sm text-muted-foreground mt-1">Компаний</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-primary">0</p>
              <p className="text-sm text-muted-foreground mt-1">Процессов</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-primary">0</p>
              <p className="text-sm text-muted-foreground mt-1">Интервью</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
