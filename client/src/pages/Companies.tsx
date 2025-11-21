import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Building2, ArrowRight, Loader2, Trash2, User, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Companies() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    region: "",
    format: "B2B" as "B2B" | "B2C" | "mixed",
    averageCheck: "",
    productsServices: "",
    itSystems: "",
  });

  const { data: companies, isLoading, refetch } = trpc.companies.list.useQuery();
  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      toast.success("Компания создана");
      setOpen(false);
      refetch();
      setFormData({
        name: "",
        industry: "",
        region: "",
        format: "B2B",
        averageCheck: "",
        productsServices: "",
        itSystems: "",
      });
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  const deleteMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      toast.success("Компания удалена");
      refetch();
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Введите название компании");
      return;
    }
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Мои компании</h1>
              <p className="text-muted-foreground">Управляйте бизнес-процессами ваших компаний</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/profile">
                <Button variant="outline" className="gap-2">
                  <User className="w-4 h-4" />
                  Профиль
                </Button>
              </Link>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Добавить компанию
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Новая компания</DialogTitle>
                  <DialogDescription>
                    Заполните базовую информацию о компании
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название компании *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ООО «Пример»"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industry">Отрасль</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        placeholder="Строительство"
                      />
                    </div>
                    <div>
                      <Label htmlFor="region">Регион</Label>
                      <Input
                        id="region"
                        value={formData.region}
                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                        placeholder="Москва"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="format">Формат работы</Label>
                      <Select
                        value={formData.format}
                        onValueChange={(value: "B2B" | "B2C" | "mixed") =>
                          setFormData({ ...formData, format: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="B2B">B2B</SelectItem>
                          <SelectItem value="B2C">B2C</SelectItem>
                          <SelectItem value="mixed">Смешанный</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="averageCheck">Средний чек</Label>
                      <Input
                        id="averageCheck"
                        value={formData.averageCheck}
                        onChange={(e) => setFormData({ ...formData, averageCheck: e.target.value })}
                        placeholder="100 000 ₽"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="productsServices">Продукты/услуги</Label>
                    <Textarea
                      id="productsServices"
                      value={formData.productsServices}
                      onChange={(e) => setFormData({ ...formData, productsServices: e.target.value })}
                      placeholder="Опишите основные продукты или услуги"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="itSystems">ИТ-системы</Label>
                    <Input
                      id="itSystems"
                      value={formData.itSystems}
                      onChange={(e) => setFormData({ ...formData, itSystems: e.target.value })}
                      placeholder="CRM, 1С, Excel"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Создание...
                        </>
                      ) : (
                        "Создать"
                      )}
                    </Button>
                  </div>
                </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!companies || companies.length === 0 ? (
          <Card className="max-w-2xl mx-auto text-center py-12">
            <CardHeader>
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>У вас пока нет компаний</CardTitle>
              <CardDescription>
                Создайте первую компанию, чтобы начать строить бизнес-процессы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Добавить компанию
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    {company.name}
                  </CardTitle>
                  <CardDescription>
                    {company.industry || "Отрасль не указана"} • {company.region || "Регион не указан"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {company.format && <div>Формат: {company.format}</div>}
                    {company.averageCheck && <div>Средний чек: {company.averageCheck}</div>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Link href={`/company/${company.id}/processes`} className="flex-1">
                        <Button variant="outline" className="w-full gap-2" size="sm">
                          <FileText className="w-4 h-4" />
                          Процессы
                        </Button>
                      </Link>
                      <Link href={`/interview-choice/${company.id}`} className="flex-1">
                        <Button className="w-full gap-2" size="sm">
                          <Plus className="w-4 h-4" />
                          Создать
                        </Button>
                      </Link>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                          <Trash2 className="w-4 h-4" />
                          Удалить
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить компанию?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить компанию <strong>{company.name}</strong>?
                            Это действие нельзя отменить. Все связанные интервью, процессы и документы будут удалены.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: company.id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Удаление...
                              </>
                            ) : (
                              "Удалить"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
