import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import ProcessDiffViewer from "./ProcessDiffViewer";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProgressIndicator from "./ProgressIndicator";

interface PreviewData {
  currentData: any;
  updatedData: any;
  cost: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview: (description: string) => Promise<PreviewData>;
  onConfirm: (updatedData: any, cost: number) => Promise<void>;
}

export default function ProcessEditDialog({ 
  open, 
  onOpenChange, 
  onPreview, 
  onConfirm
}: Props) {
  const [description, setDescription] = useState("");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handlePreview = async () => {
    if (!description.trim()) return;
    
    setIsLoadingPreview(true);
    try {
      const preview = await onPreview(description);
      setPreviewData(preview);
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error(error?.message || "Ошибка генерации предпросмотра");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    
    setIsConfirming(true);
    try {
      await onConfirm(previewData.updatedData, previewData.cost);
      toast.success("Изменения успешно применены");
      handleClose();
    } catch (error: any) {
      console.error("Confirm error:", error);
      toast.error(error?.message || "Ошибка применения изменений");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleBack = () => {
    setPreviewData(null);
  };

  const handleClose = () => {
    setDescription("");
    setPreviewData(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {previewData ? "Предпросмотр изменений" : "Предложить изменения процесса"}
          </DialogTitle>
          <DialogDescription>
            {previewData 
              ? "Проверьте изменения перед применением. Стоимость операции будет списана после подтверждения."
              : "Опишите, какие изменения нужно внести в бизнес-процесс. AI-ассистент покажет предпросмотр перед применением."
            }
          </DialogDescription>
        </DialogHeader>

        {!previewData ? (
          <>
            <div className="space-y-4 py-4">
              {isLoadingPreview && (
                <div className="mb-4">
                  <ProgressIndicator
                    stages={[
                      { label: "Анализ текущей структуры процесса", duration: 2000 },
                      { label: "Обработка запроса изменений", duration: 3000 },
                      { label: "Генерация обновленной структуры", duration: 4000 },
                      { label: "Подготовка предпросмотра", duration: 2000 },
                    ]}
                  />
                </div>
              )}
              <Textarea
                placeholder="Например: Переместить блок 'Согласование договора' из этапа 'Подготовка' в этап 'Исполнение' для роли 'Менеджер'"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                disabled={isLoadingPreview}
                className="resize-none"
              />

              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium">Примеры команд:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Переместить блок "X" в этап "Y" для роли "Z"</li>
                  <li>Добавить новый блок "Проверка документов" в этап "Контроль"</li>
                  <li>Удалить блок "Старая задача"</li>
                  <li>Изменить название блока "X" на "Y"</li>
                  <li>Добавить новую роль "Координатор"</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoadingPreview}
              >
                Отмена
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!description.trim() || isLoadingPreview}
              >
                {isLoadingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Показать предпросмотр
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="py-4">
                <ProcessDiffViewer 
                  currentData={previewData.currentData}
                  updatedData={previewData.updatedData}
                />
              </div>
            </ScrollArea>

            <div className="border-t pt-4 -mx-6 px-6 bg-muted/30">
              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-muted-foreground">Стоимость операции:</span>
                <span className="font-semibold">{previewData.cost} токенов</span>
              </div>
              
              {isConfirming && (
                <div className="mb-4">
                  <ProgressIndicator
                    stages={[
                      { label: "Проверка баланса токенов", duration: 1000 },
                      { label: "Сохранение изменений в базу данных", duration: 2000 },
                      { label: "Списание токенов", duration: 1000 },
                      { label: "Обновление процесса", duration: 1500 },
                    ]}
                  />
                </div>
              )}
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isConfirming}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isConfirming}
                >
                  <X className="w-4 h-4 mr-2" />
                  Отменить
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Применение...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Применить изменения
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
