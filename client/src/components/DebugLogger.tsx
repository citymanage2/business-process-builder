import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Bug, X, Trash2 } from "lucide-react";
import logger, { type LogEntry } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Debug logger component for testing mode
 * Shows a floating button at the bottom of the page to download logs
 */
export default function DebugLogger() {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleDownload = () => {
    logger.downloadLogs();
  };

  const handleViewLogs = () => {
    setLogs(logger.getLogs());
    setShowLogs(true);
  };

  const handleClearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return "text-red-600";
      case "warn":
        return "text-yellow-600";
      case "api":
        return "text-blue-600";
      case "action":
        return "text-purple-600";
      case "info":
        return "text-cyan-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <>
      {/* Floating button at bottom right */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <Button
          onClick={handleViewLogs}
          variant="outline"
          size="sm"
          className="shadow-lg bg-white hover:bg-gray-50"
        >
          <Bug className="w-4 h-4 mr-2" />
          Просмотр логов
        </Button>
        <Button
          onClick={handleDownload}
          variant="default"
          size="sm"
          className="shadow-lg"
        >
          <Download className="w-4 h-4 mr-2" />
          Скачать логи
        </Button>
      </div>

      {/* Logs viewer dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Логи отладки</span>
              <div className="flex gap-2">
                <Button
                  onClick={handleClearLogs}
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Очистить
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="default"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Скачать
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Всего записей: {logs.length}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Логи пусты
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-3 text-sm font-mono bg-gray-50"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-semibold uppercase text-xs ${getLevelColor(
                        log.level
                      )}`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-800 whitespace-pre-wrap break-words">
                    {log.message}
                  </div>
                  {log.stack && (
                    <div className="mt-2 text-xs text-red-600 whitespace-pre-wrap break-words border-t pt-2">
                      {log.stack}
                    </div>
                  )}
                  {log.url && (
                    <div className="mt-1 text-xs text-blue-600">
                      {log.url}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
