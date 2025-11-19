import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle } from "lucide-react";

interface Document {
  type: "regulation" | "instruction" | "template";
  name: string;
  description: string;
  priority: "high" | "medium" | "low";
}

interface Props {
  documents: Document[];
}

const typeLabels = {
  regulation: "Регламент",
  instruction: "Инструкция",
  template: "Шаблон",
};

const priorityConfig = {
  high: { label: "Высокий", color: "bg-red-100 text-red-800 border-red-300" },
  medium: { label: "Средний", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  low: { label: "Низкий", color: "bg-green-100 text-green-800 border-green-300" },
};

export default function RequiredDocuments({ documents }: Props) {
  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Необходимые документы</CardTitle>
          <CardDescription>Список документов не сгенерирован</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const groupedByPriority = {
    high: documents.filter((d) => d.priority === "high"),
    medium: documents.filter((d) => d.priority === "medium"),
    low: documents.filter((d) => d.priority === "low"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Необходимые документы</h3>
        <p className="text-gray-600">
          Регламенты, инструкции и шаблоны для структурирования деятельности
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Важно!</p>
          <p className="mt-1">
            Эти документы необходимо разработать для обеспечения стабильной и эффективной работы
            процесса. Начните с документов высокого приоритета.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {(["high", "medium", "low"] as const).map((priority) => {
          const docs = groupedByPriority[priority];
          if (docs.length === 0) return null;

          return (
            <div key={priority}>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-semibold text-lg">Приоритет: {priorityConfig[priority].label}</h4>
                <Badge variant="outline" className={priorityConfig[priority].color}>
                  {docs.length}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {docs.map((doc, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <FileText className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <CardTitle className="text-base">{doc.name}</CardTitle>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {typeLabels[doc.type]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{doc.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>Рекомендация:</strong> После создания этих документов процесс станет более
            прозрачным, управляемым и масштабируемым. Документы помогут новым сотрудникам быстрее
            адаптироваться и снизят количество ошибок.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
