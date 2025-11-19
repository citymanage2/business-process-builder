import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  category: string;
}

export default function Interview() {
  const [, params] = useRoute("/interview/:id");
  const [, setLocation] = useLocation();
  const companyId = params?.id ? parseInt(params.id) : 0;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [interviewId, setInterviewId] = useState<number | null>(null);

  const { data: company } = trpc.companies.get.useQuery(
    { id: companyId },
    { enabled: companyId > 0 }
  );

  const startMutation = trpc.interviews.start.useMutation({
    onSuccess: (data) => {
      setInterviewId(data.id);
      // Вопросы теперь задаются статически в новой системе
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  const uploadAudioMutation = trpc.interviews.uploadAudio.useMutation();
  const transcribeMutation = trpc.interviews.transcribe.useMutation();
  const saveAnswersMutation = trpc.interviews.saveAnswers.useMutation({
    onSuccess: () => {
      toast.success("Ответы сохранены");
      if (interviewId) {
        setLocation(`/process/generate/${companyId}/${interviewId}`);
      }
    },
  });

  useEffect(() => {
    if (companyId) {
      startMutation.mutate({ companyId });
    }
  }, [companyId]);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!interviewId) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];
        if (!base64Audio) return;

        await uploadAudioMutation.mutateAsync({
          interviewId,
          audioData: base64Audio,
          mimeType: "audio/webm",
        });

        const transcription = await transcribeMutation.mutateAsync({ interviewId });
        
        const currentQuestion = questions[currentQuestionIndex];
        setAnswers((prev) => ({
          ...prev,
          [currentQuestion.id]: transcription.transcript,
        }));

        toast.success("Ответ записан");
      };
    } catch (error) {
      toast.error("Ошибка при обработке аудио");
    }
  };

  const handleTextAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const answer = answers[currentQuestion.id] || "";
    
    if (!answer.trim()) {
      toast.error("Введите ответ");
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleFinish = () => {
    if (!interviewId) return;

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      toast.error(`Ответьте на все вопросы (${answeredCount}/${questions.length})`);
      return;
    }

    saveAnswersMutation.mutate({ interviewId, answers });
  };

  if (startMutation.isPending || !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Подготовка интервью...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Интервью: {company?.name}</h1>
          <p className="text-muted-foreground">
            Вопрос {currentQuestionIndex + 1} из {questions.length}
          </p>
          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Вопрос {currentQuestionIndex + 1}</CardTitle>
            <CardDescription className="text-lg">{currentQuestion.question}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              isProcessing={uploadAudioMutation.isPending || transcribeMutation.isPending}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">или введите текстом</span>
              </div>
            </div>

            <div>
              <Textarea
                value={answers[currentQuestion.id] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: e.target.value,
                  }))
                }
                placeholder="Введите ваш ответ..."
                rows={4}
              />
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                Назад
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button onClick={handleTextAnswer} className="gap-2">
                  Следующий вопрос <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={saveAnswersMutation.isPending}
                  className="gap-2"
                >
                  {saveAnswersMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Завершить интервью
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Прогресс ответов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className={`p-2 rounded border text-center text-sm ${
                    answers[q.id]
                      ? "bg-primary/10 border-primary"
                      : index === currentQuestionIndex
                      ? "bg-accent border-primary"
                      : "bg-muted"
                  }`}
                >
                  {index + 1}. {answers[q.id] ? "✓" : "—"}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
