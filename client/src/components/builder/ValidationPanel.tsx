import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationError {
  type: "error" | "warning";
  message: string;
  blockId?: string;
}

interface ValidationPanelProps {
  errors: ValidationError[];
  onClose: () => void;
  onSelectBlock: (blockId: string) => void;
}

export function ValidationPanel({ errors, onClose, onSelectBlock }: ValidationPanelProps) {
  const errorCount = errors.filter((e) => e.type === "error").length;
  const warningCount = errors.filter((e) => e.type === "warning").length;

  return (
    <Card className="w-80 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {errorCount > 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            Validation Results
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {errorCount > 0 && (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              {errorCount} {errorCount === 1 ? "error" : "errors"}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              {warningCount} {warningCount === 1 ? "warning" : "warnings"}
            </span>
          )}
          {errors.length === 0 && (
            <span className="text-green-500">Process is valid</span>
          )}
        </div>
      </CardHeader>
      {errors.length > 0 && (
        <CardContent className="pt-0">
          <ScrollArea className="max-h-48">
            <div className="space-y-2">
              {errors.map((error, index) => (
                <button
                  key={index}
                  onClick={() => error.blockId && onSelectBlock(error.blockId)}
                  className={cn(
                    "w-full text-left p-2 rounded-md text-sm flex items-start gap-2 transition-colors",
                    error.type === "error"
                      ? "bg-destructive/10 hover:bg-destructive/20 text-destructive"
                      : "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
                    error.blockId && "cursor-pointer"
                  )}
                  disabled={!error.blockId}
                >
                  {error.type === "error" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1">{error.message}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
