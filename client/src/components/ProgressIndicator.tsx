import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface Stage {
  label: string;
  duration: number; // в миллисекундах
}

interface Props {
  stages: Stage[];
  onComplete?: () => void;
}

export default function ProgressIndicator({ stages, onComplete }: Props) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentStageIndex >= stages.length) {
      onComplete?.();
      return;
    }

    const currentStage = stages[currentStageIndex];
    const totalDuration = stages.reduce((sum, stage) => sum + stage.duration, 0);
    const previousDuration = stages
      .slice(0, currentStageIndex)
      .reduce((sum, stage) => sum + stage.duration, 0);
    
    const startProgress = (previousDuration / totalDuration) * 100;
    const endProgress = ((previousDuration + currentStage.duration) / totalDuration) * 100;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const stageProgress = Math.min(elapsed / currentStage.duration, 1);
      const currentProgress = startProgress + (endProgress - startProgress) * stageProgress;
      
      setProgress(currentProgress);
      
      if (stageProgress >= 1) {
        clearInterval(interval);
        setCurrentStageIndex(prev => prev + 1);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentStageIndex, stages, onComplete]);

  const currentStage = stages[currentStageIndex];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-muted-foreground">
            {currentStage ? currentStage.label : "Завершение..."}
          </span>
        </div>
        <span className="font-semibold text-primary">
          {Math.round(progress)}%
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
