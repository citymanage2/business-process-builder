import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, Database, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function DatabaseMonitor() {
  const { data: metrics, refetch } = trpc.admin.getPoolMetrics.useQuery(undefined, {
    refetchInterval: 3000, // Обновлять каждые 3 секунды
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Мониторинг базы данных
          </CardTitle>
          <CardDescription>Загрузка метрик...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const activeConnections = metrics.totalConnections - metrics.idleConnections;
  const usagePercent = (metrics.totalConnections / metrics.maxConnections) * 100;
  const isHealthy = usagePercent < 80 && metrics.waitingRequests === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Мониторинг базы данных
          {isHealthy ? (
            <span className="text-xs font-normal text-green-600 flex items-center gap-1">
              <Activity className="w-4 h-4" />
              Здорова
            </span>
          ) : (
            <span className="text-xs font-normal text-orange-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Высокая нагрузка
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Статус: {metrics.status === 'active' ? 'Активен' : 'Не инициализирован'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Pool Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Использование пула</span>
            <span className="font-medium">
              {metrics.totalConnections} / {metrics.maxConnections}
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {usagePercent.toFixed(1)}% от максимума
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Connections */}
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Активные
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{activeConnections}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Обрабатывают запросы
            </p>
          </div>

          {/* Idle Connections */}
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Свободные
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600">{metrics.idleConnections}</p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Готовы к работе
            </p>
          </div>

          {/* Waiting Requests */}
          <div className={`p-4 border rounded-lg ${
            metrics.waitingRequests > 0 
              ? 'bg-orange-50 dark:bg-orange-950/20' 
              : 'bg-gray-50 dark:bg-gray-950/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className={`w-4 h-4 ${
                metrics.waitingRequests > 0 ? 'text-orange-600' : 'text-gray-600'
              }`} />
              <span className={`text-sm font-medium ${
                metrics.waitingRequests > 0 
                  ? 'text-orange-900 dark:text-orange-100' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                В очереди
              </span>
            </div>
            <p className={`text-2xl font-bold ${
              metrics.waitingRequests > 0 ? 'text-orange-600' : 'text-gray-600'
            }`}>
              {metrics.waitingRequests}
            </p>
            <p className={`text-xs mt-1 ${
              metrics.waitingRequests > 0 
                ? 'text-orange-700 dark:text-orange-300' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {metrics.waitingRequests > 0 ? 'Ожидают подключения' : 'Нет ожидающих'}
            </p>
          </div>
        </div>

        {/* Health Status */}
        {!isHealthy && (
          <div className="p-4 border border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-950/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Рекомендации
                </p>
                <ul className="text-xs text-orange-700 dark:text-orange-300 mt-1 space-y-1">
                  {usagePercent >= 80 && (
                    <li>• Использование пула превышает 80% - рассмотрите увеличение max connections</li>
                  )}
                  {metrics.waitingRequests > 0 && (
                    <li>• Есть ожидающие запросы - возможна перегрузка системы</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground">
          <p>Обновление каждые 3 секунды</p>
          <p className="mt-1">
            Пул подключений автоматически управляет соединениями с PostgreSQL для оптимальной производительности
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
