import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MapPin, CheckSquare, Target } from "lucide-react";

interface StageDetail {
  stageId: string;
  whatToDo: string;
  whereToDo: string;
  keyActions: string[];
  expectedResults: string;
}

interface Stage {
  id: string;
  name: string;
  description?: string;
}

interface Props {
  stages: Stage[];
  stageDetails: StageDetail[];
}

export default function StageDetails({ stages, stageDetails }: Props) {
  if (!stageDetails || stageDetails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Детальное описание этапов</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Детальное описание этапов не сгенерировано</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Детальное описание этапов</h3>
        <p className="text-gray-600">Подробные инструкции по выполнению каждого этапа процесса</p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {stages.map((stage) => {
          const detail = stageDetails.find((d) => d.stageId === stage.id);
          if (!detail) return null;

          return (
            <AccordionItem key={stage.id} value={stage.id}>
              <AccordionTrigger className="text-left">
                <div>
                  <div className="font-semibold text-lg">{stage.name}</div>
                  {stage.description && (
                    <div className="text-sm text-gray-600 mt-1">{stage.description}</div>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-4">
                  {/* Что делать */}
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                      Что делать
                    </h4>
                    <p className="text-gray-700 leading-relaxed">{detail.whatToDo}</p>
                  </div>

                  {/* Где делать */}
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-indigo-600" />
                      Где делать
                    </h4>
                    <p className="text-gray-700 leading-relaxed">{detail.whereToDo}</p>
                  </div>

                  {/* Ключевые действия */}
                  {detail.keyActions && detail.keyActions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Ключевые действия</h4>
                      <ol className="space-y-2">
                        {detail.keyActions.map((action, idx) => (
                          <li key={idx} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-medium">
                              {idx + 1}
                            </span>
                            <span className="text-gray-700 pt-0.5">{action}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Ожидаемые результаты */}
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-indigo-600" />
                      Ожидаемые результаты
                    </h4>
                    <p className="text-gray-700 leading-relaxed">{detail.expectedResults}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
