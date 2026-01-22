import React from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import {
  ChevronLeft,
  GitBranch,
  Eye,
  FileText,
  TrendingUp,
  Activity,
  Calendar,
  Users,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  
  const statsQuery = trpc.builder.analytics.userStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [authLoading, isAuthenticated, setLocation]);
  
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  const stats = statsQuery.data;
  
  // Prepare pie chart data for status distribution
  const statusData = stats
    ? [
        { name: 'Черновики', value: stats.draftCount, color: '#64748b' },
        { name: 'Опубликованные', value: stats.publishedCount, color: '#22c55e' },
        {
          name: 'Другие',
          value: stats.totalProcesses - stats.draftCount - stats.publishedCount,
          color: '#f59e0b',
        },
      ].filter((d) => d.value > 0)
    : [];
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/processes">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Аналитика
              </h1>
              <p className="text-sm text-muted-foreground">
                Статистика ваших бизнес-процессов
              </p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {statsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-8 mb-2" />
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Key metrics */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-100">
                      <GitBranch className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalProcesses || 0}</p>
                      <p className="text-sm text-muted-foreground">Всего процессов</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-100">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.publishedCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Опубликовано</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gray-100">
                      <FileText className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.draftCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Черновиков</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-100">
                      <Eye className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalViews || 0}</p>
                      <p className="text-sm text-muted-foreground">Просмотров</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Activity chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Активность за 30 дней
                  </CardTitle>
                  <CardDescription>
                    Количество изменений в процессах по дням
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={stats.recentActivity}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getDate()}.${date.getMonth() + 1}`;
                          }}
                        />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                          }}
                          labelFormatter={(value) => {
                            const date = new Date(value as string);
                            return date.toLocaleDateString('ru-RU');
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      <div className="text-center">
                        <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Нет данных об активности</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Status distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Распределение по статусам
                  </CardTitle>
                  <CardDescription>
                    Процессы по текущему статусу
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={50}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--background)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      <div className="text-center">
                        <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Нет процессов</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Tips */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Советы по улучшению</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {stats?.draftCount && stats.draftCount > 3 && (
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                        <div>
                          <p className="font-medium">У вас много черновиков</p>
                          <p className="text-muted-foreground">
                            Рекомендуем завершить или удалить неиспользуемые процессы
                          </p>
                        </div>
                      </li>
                    )}
                    {stats?.totalProcesses === 0 && (
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div>
                          <p className="font-medium">Создайте свой первый процесс</p>
                          <p className="text-muted-foreground">
                            Начните с шаблона или создайте процесс с нуля
                          </p>
                        </div>
                      </li>
                    )}
                    {stats?.totalViews === 0 && stats?.publishedCount && stats.publishedCount > 0 && (
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                        <div>
                          <p className="font-medium">Поделитесь процессами</p>
                          <p className="text-muted-foreground">
                            Сделайте процессы публичными или пригласите коллег
                          </p>
                        </div>
                      </li>
                    )}
                    {!stats?.totalProcesses && (
                      <li className="text-sm text-muted-foreground text-center py-4">
                        Начните работу, чтобы увидеть рекомендации
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
