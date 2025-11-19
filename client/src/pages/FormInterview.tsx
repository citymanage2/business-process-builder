import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ArrowLeft, Save, Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FULL_QUESTIONS, SHORT_QUESTIONS, QUESTION_BLOCKS, type Question } from "../../../server/questions";

export default function FormInterview() {
  const [, params] = useRoute("/form-interview/:id/:type");
  const [, setLocation] = useLocation();
  const companyId = params?.id ? parseInt(params.id) : 0;
  const interviewType = params?.type as "full" | "short" || "short";

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draftId, setDraftId] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string }>>([]);

  const questions = interviewType === "full" ? FULL_QUESTIONS : SHORT_QUESTIONS;
  const currentBlock = QUESTION_BLOCKS[currentBlockIndex];
  const currentBlockQuestions = questions.filter(q => q.block === currentBlock.id);
  const totalBlocks = QUESTION_BLOCKS.length;
  const progress = ((currentBlockIndex + 1) / totalBlocks) * 100;

  const { data: company } = trpc.companies.get.useQuery({ id: companyId });
  const { data: documents } = trpc.documents.list.useQuery({ companyId });
  const { data: drafts } = trpc.drafts.list.useQuery({ companyId });

  const saveDraftMutation = trpc.drafts.save.useMutation({
    onSuccess: (data) => {
      if (data.id) setDraftId(data.id);
      toast.success("Черновик сохранен");
    },
  });

  const uploadDocumentMutation = trpc.documents.upload.useMutation({
    onSuccess: (data) => {
      toast.success("Документ загружен");
      setUploadedFiles(prev => [...prev, { name: "Документ", url: data.url }]);
    },
  });

  const generateProcessMutation = trpc.processes.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Процесс сгенерирован!");
      setLocation(`/process/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  // Загрузка черновика при монтировании
  useEffect(() => {
    if (drafts && drafts.length > 0) {
      const draft = drafts[0];
      setDraftId(draft.id);
      if (draft.answers) {
        try {
          setAnswers(JSON.parse(draft.answers));
        } catch (e) {
          console.error("Failed to parse draft answers", e);
        }
      }
    }
  }, [drafts]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiselectChange = (questionId: string, option: string, checked: boolean) => {
    const current = answers[questionId] ? JSON.parse(answers[questionId]) : [];
    const updated = checked 
      ? [...current, option]
      : current.filter((o: string) => o !== option);
    setAnswers(prev => ({ ...prev, [questionId]: JSON.stringify(updated) }));
  };

  const handleSaveDraft = () => {
    saveDraftMutation.mutate({
      id: draftId || undefined,
      companyId,
      interviewType: interviewType === "full" ? "form_full" : "form_short",
      answers: JSON.stringify(answers),
      progress: Math.round(progress),
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверка размера (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс 10MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      if (!base64) return;

      uploadDocumentMutation.mutate({
        companyId,
        fileName: file.name,
        fileContent: base64,
        mimeType: file.type,
        description: "Прикрепленный документ для анализа процесса",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    // Проверка обязательных полей текущего блока
    const requiredQuestions = currentBlockQuestions.filter(q => q.required);
    const unanswered = requiredQuestions.filter(q => !answers[q.id] || answers[q.id].trim() === "");
    
    if (unanswered.length > 0) {
      toast.error(`Пожалуйста, ответьте на все обязательные вопросы`);
      return;
    }

    if (currentBlockIndex < totalBlocks - 1) {
      setCurrentBlockIndex(prev => prev + 1);
      handleSaveDraft(); // Автосохранение при переходе
    }
  };

  const handlePrevious = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Проверка всех обязательных полей
    const requiredQuestions = questions.filter(q => q.required);
    const unanswered = requiredQuestions.filter(q => !answers[q.id] || answers[q.id].trim() === "");
    
    if (unanswered.length > 0) {
      toast.error(`Не заполнены обязательные вопросы: ${unanswered.length}`);
      return;
    }

    // Сохраняем финальный черновик с ответами
    const structuredData = {
      interviewType,
      answers,
      documents: documents?.map(d => d.fileUrl) || [],
    };

    // Создаем или обновляем интервью со статусом completed
    const finalDraft = await saveDraftMutation.mutateAsync({
      id: draftId || undefined,
      companyId,
      interviewType: interviewType === "full" ? "form_full" : "form_short",
      answers: JSON.stringify(answers),
      progress: 100,
    });

    // Генерируем процесс
    generateProcessMutation.mutate({
      companyId,
      interviewId: finalDraft.id!,
    });
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.id] || "";

    switch (question.type) {
      case "text":
        return (
          <div className="space-y-2">
            <Input
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Ваш ответ..."
            />
            {question.placeholder && (
              <p className="text-sm text-muted-foreground select-text">
                <span className="font-medium">Пример:</span> {question.placeholder}
              </p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Ваш ответ..."
              rows={4}
            />
            {question.placeholder && (
              <p className="text-sm text-muted-foreground select-text">
                <span className="font-medium">Пример:</span> {question.placeholder}
              </p>
            )}
          </div>
        );

      case "select":
        return (
          <Select value={value} onValueChange={(v) => handleAnswerChange(question.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите вариант" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect":
        const selected = value ? JSON.parse(value) : [];
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) => 
                    handleMultiselectChange(question.id, option, checked as boolean)
                  }
                />
                <label
                  htmlFor={`${question.id}-${option}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
          />
        );

      default:
        return null;
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Анкета: {company.name}
        </h1>
        <p className="text-muted-foreground">
          {interviewType === "full" ? "Полная анкета (50 вопросов)" : "Сокращенная анкета (10 ключевых вопросов)"}
        </p>
      </div>

      {/* Прогресс */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Блок {currentBlockIndex + 1} из {totalBlocks}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      {/* Текущий блок вопросов */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{currentBlock.title}</CardTitle>
          <CardDescription>{currentBlock.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentBlockQuestions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label className="text-base">
                {question.text}
                {question.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderQuestion(question)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Загрузка документов */}
      {currentBlockIndex === 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Прикрепите документы
            </CardTitle>
            <CardDescription>
              Загрузите регламенты, схемы, инструкции или другие документы, которые помогут построить процесс
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Поддерживаемые форматы: PDF, Word, Excel, изображения. Макс 10MB
              </p>
            </div>

            {documents && documents.length > 0 && (
              <div className="space-y-2">
                <Label>Загруженные документы:</Label>
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                    <FileText className="w-4 h-4" />
                    <span>{doc.fileName}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Навигация */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentBlockIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={saveDraftMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Сохранить черновик
        </Button>

        {currentBlockIndex < totalBlocks - 1 ? (
          <Button onClick={handleNext}>
            Далее
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={generateProcessMutation.isPending}
          >
            {generateProcessMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                Сгенерировать процесс
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
