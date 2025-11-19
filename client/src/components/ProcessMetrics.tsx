import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, Users } from "lucide-react";

interface RoleWorkload {
  roleId: string;
  roleName: string;
  salaryMonthly: number;
  workloadPercent: number;
  timeSpentMinutes: number;
  costRub: number;
}

interface Props {
  totalTime?: number | null;
  totalCost?: number | null;
  salaryData?: RoleWorkload[] | null;
}

export default function ProcessMetrics({ totalTime, totalCost, salaryData }: Props) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ч ${mins} мин`;
    }
    return `${mins} мин`;
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(cost);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Метрики процесса</h3>
        <p className="text-gray-600">Расчет времени и затрат на выполнение процесса</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общее время</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTime ? formatTime(totalTime) : "Не рассчитано"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Суммарное время выполнения всех шагов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Стоимость процесса</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCost ? formatCost(totalCost) : "Не рассчитано"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Затраты по ФОТ на выполнение процесса
            </p>
          </CardContent>
        </Card>
      </div>

      {salaryData && salaryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Распределение по ролям
            </CardTitle>
            <CardDescription>Детализация времени и затрат по каждой роли</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salaryData.map((role) => (
                <div key={role.roleId} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{role.roleName}</h4>
                      <p className="text-sm text-gray-600">
                        ЗП: {formatCost(role.salaryMonthly)}/мес • Загрузка: {role.workloadPercent}%
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">{formatCost(role.costRub)}</div>
                      <div className="text-sm text-gray-600">{formatTime(role.timeSpentMinutes)}</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{
                        width: `${totalCost ? (role.costRub / totalCost) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
