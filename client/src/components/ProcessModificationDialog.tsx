import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  processId: number;
  onSubmit: (request: string) => void;
  isProcessing?: boolean;
}

export default function ProcessModificationDialog({ processId, onSubmit, isProcessing }: Props) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Запись началась");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Не удалось начать запись. Проверьте доступ к микрофону.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Запись остановлена");
    }
  };

  const handleSubmit = () => {
    if (!request.trim() && !audioBlob) {
      toast.error("Введите текст или запишите голосовое сообщение");
      return;
    }

    // TODO: Если есть audioBlob, сначала транскрибировать его
    if (audioBlob) {
      toast.info("Обработка голосового сообщения...");
      // Здесь будет вызов API для транскрипции
      // Пока просто используем текстовый запрос
    }

    onSubmit(request);
    setRequest("");
    setAudioBlob(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="w-4 h-4 mr-2" />
          Запросить изменения
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Запрос на изменение процесса</DialogTitle>
          <DialogDescription>
            Опишите текстом или голосом какие изменения нужно внести в бизнес-процесс. AI
            проанализирует ваш запрос и предложит обновленную версию.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Описание изменений
            </label>
            <Textarea
              placeholder="Например: Добавить этап согласования с юристом после подписания договора..."
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={6}
              disabled={isProcessing}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 text-sm text-muted-foreground">
              Или запишите голосовое сообщение
            </div>
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Остановить запись
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Начать запись
                </>
              )}
            </Button>
          </div>

          {audioBlob && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                ✓ Голосовое сообщение записано ({(audioBlob.size / 1024).toFixed(1)} KB)
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing || (!request.trim() && !audioBlob)}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Обработка...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Отправить запрос
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
