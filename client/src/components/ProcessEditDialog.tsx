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
import { Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (description: string) => void;
  isLoading?: boolean;
}

export default function ProcessEditDialog({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!description.trim()) return;
    onSubmit(description);
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Предложить изменения процесса
          </DialogTitle>
          <DialogDescription>
            Опишите, какие изменения нужно внести в бизнес-процесс. AI-ассистент автоматически применит их к структуре процесса.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Например: Переместить блок 'Согласование договора' из этапа 'Подготовка' в этап 'Исполнение' для роли 'Менеджер'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            disabled={isLoading}
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
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Применение изменений...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Применить изменения
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
