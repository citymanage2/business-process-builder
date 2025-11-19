import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Zap } from "lucide-react";

interface FunnelStage {
  name: string;
  description: string;
  correspondingSteps: string[];
  automations: string[];
}

interface CRMFunnel {
  variant: number;
  name: string;
  description: string;
  stages: FunnelStage[];
  advantages: string[];
  disadvantages: string[];
}

interface Props {
  funnels: CRMFunnel[];
}

export default function CRMFunnels({ funnels }: Props) {
  if (!funnels || funnels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Варианты воронок CRM</CardTitle>
          <CardDescription>Воронки не сгенерированы</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Варианты воронок CRM</h3>
        <p className="text-gray-600">
          Три подхода к построению воронки для автоматизации процесса
        </p>
      </div>

      <Tabs defaultValue="1" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {funnels.map((funnel) => (
            <TabsTrigger key={funnel.variant} value={String(funnel.variant)}>
              {funnel.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {funnels.map((funnel) => (
          <TabsContent key={funnel.variant} value={String(funnel.variant)} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{funnel.name}</CardTitle>
                <CardDescription>{funnel.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Стадии воронки */}
                <div>
                  <h4 className="font-semibold mb-3">Стадии воронки</h4>
                  <div className="space-y-3">
                    {funnel.stages.map((stage, idx) => (
                      <div key={idx} className="border-l-4 border-indigo-500 pl-4 py-2">
                        <div className="font-medium">{stage.name}</div>
                        <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                        {stage.correspondingSteps.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {stage.correspondingSteps.map((step) => (
                              <Badge key={step} variant="outline" className="text-xs">
                                {step}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {stage.automations.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {stage.automations.map((auto, autoIdx) => (
                              <div key={autoIdx} className="flex items-start gap-2 text-sm">
                                <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{auto}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Преимущества и недостатки */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Преимущества
                    </h4>
                    <ul className="space-y-2">
                      {funnel.advantages.map((adv, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      Недостатки
                    </h4>
                    <ul className="space-y-2">
                      {funnel.disadvantages.map((dis, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-red-600 mt-1">•</span>
                          <span>{dis}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
