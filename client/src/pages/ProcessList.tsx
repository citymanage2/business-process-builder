import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Eye,
  Copy,
  Trash2,
  Download,
  Share2,
  Loader2,
  FileText,
  Calendar,
  User,
  Building2,
  FolderOpen,
  Filter,
  Layout,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { PROCESS_CATEGORIES } from "@shared/processBuilder";

export default function ProcessList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Fetch all user's companies
  const { data: companies, isLoading: companiesLoading } = trpc.companies.list.useQuery();

  // We'll aggregate processes from all companies
  const allProcesses = companies?.flatMap((company) => {
    return []; // Will be populated when we add process fetching
  }) || [];

  // Delete mutation
  const deleteMutation = trpc.processes.delete.useMutation({
    onSuccess: () => {
      toast.success("Процесс удален");
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  // Filter processes
  const filteredProcesses = allProcesses.filter((process: any) => {
    const matchesSearch = process.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         process.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || process.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || process.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDuplicate = (processId: number) => {
    toast.info("Функция дублирования в разработке");
  };

  const handleExport = (processId: number) => {
    toast.info("Функция экспорта в разработке");
  };

  const handleShare = (processId: number) => {
    toast.info("Функция совместного доступа в разработке");
  };

  if (companiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/companies">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Компании
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Конструктор процессов</h1>
                <p className="text-muted-foreground text-sm">
                  Создавайте и управляйте бизнес-процессами
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/templates">
                <Button variant="outline">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Шаблоны
                </Button>
              </Link>
              <Link href="/builder">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Новый процесс
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск процессов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {PROCESS_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="draft">Черновик</SelectItem>
              <SelectItem value="in_review">На проверке</SelectItem>
              <SelectItem value="approved">Утвержден</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="my" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="my">Мои процессы</TabsTrigger>
            <TabsTrigger value="shared">Общие со мной</TabsTrigger>
            <TabsTrigger value="public">Публичные</TabsTrigger>
          </TabsList>

          <TabsContent value="my">
            {filteredProcesses.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Layout className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    У вас пока нет процессов
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Создайте свой первый бизнес-процесс или выберите готовый шаблон
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link href="/templates">
                      <Button variant="outline">
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Шаблоны
                      </Button>
                    </Link>
                    <Link href="/builder">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Создать процесс
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProcesses.map((process: any) => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    onEdit={() => setLocation(`/builder/${process.id}`)}
                    onView={() => setLocation(`/process/${process.id}`)}
                    onDuplicate={() => handleDuplicate(process.id)}
                    onExport={() => handleExport(process.id)}
                    onShare={() => handleShare(process.id)}
                    onDelete={() => deleteMutation.mutate({ id: process.id })}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProcesses.map((process: any) => (
                  <ProcessRow
                    key={process.id}
                    process={process}
                    onEdit={() => setLocation(`/builder/${process.id}`)}
                    onView={() => setLocation(`/process/${process.id}`)}
                    onDuplicate={() => handleDuplicate(process.id)}
                    onExport={() => handleExport(process.id)}
                    onShare={() => handleShare(process.id)}
                    onDelete={() => deleteMutation.mutate({ id: process.id })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared">
            <Card className="py-12">
              <CardContent className="text-center">
                <Share2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  Нет общих процессов
                </h3>
                <p className="text-muted-foreground">
                  Когда кто-то поделится с вами процессом, он появится здесь
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="public">
            <Card className="py-12">
              <CardContent className="text-center">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  Публичные процессы
                </h3>
                <p className="text-muted-foreground">
                  Здесь будут отображаться публичные процессы других пользователей
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        {companies && companies.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Ваши компании</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <Link key={company.id} href={`/company/${company.id}/processes`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        {company.name}
                      </CardTitle>
                      <CardDescription>
                        {company.industry || "Отрасль не указана"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Перейти к процессам
                        </span>
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Process Card Component
function ProcessCard({
  process,
  onEdit,
  onView,
  onDuplicate,
  onExport,
  onShare,
  onDelete,
}: {
  process: any;
  onEdit: () => void;
  onView: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    in_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
  };

  const statusLabels: Record<string, string> = {
    draft: "Черновик",
    in_review: "На проверке",
    approved: "Утвержден",
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{process.title}</CardTitle>
            <CardDescription className="truncate">
              {process.description || "Без описания"}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="w-4 h-4 mr-2" />
                Просмотр
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Дублировать
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExport}>
                <Download className="w-4 h-4 mr-2" />
                Экспорт
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Поделиться
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить процесс?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Вы уверены, что хотите удалить "{process.title}"? Это
                      действие нельзя отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge className={statusColors[process.status] || statusColors.draft}>
            {statusLabels[process.status] || "Черновик"}
          </Badge>
          {process.category && (
            <Badge variant="outline">{process.category}</Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {process.updatedAt
              ? format(new Date(process.updatedAt), "d MMM yyyy", { locale: ru })
              : "—"}
          </div>
          <div className="flex items-center gap-3">
            <span>{process.blocksCount || 0} блоков</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Process Row Component (List view)
function ProcessRow({
  process,
  onEdit,
  onView,
  onDuplicate,
  onExport,
  onShare,
  onDelete,
}: {
  process: any;
  onEdit: () => void;
  onView: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    in_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
  };

  const statusLabels: Record<string, string> = {
    draft: "Черновик",
    in_review: "На проверке",
    approved: "Утвержден",
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div>
                <h3 className="font-medium truncate">{process.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {process.description || "Без описания"}
                </p>
              </div>
            </div>
          </div>

          <Badge className={statusColors[process.status] || statusColors.draft}>
            {statusLabels[process.status] || "Черновик"}
          </Badge>

          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {process.updatedAt
              ? format(new Date(process.updatedAt), "d MMM yyyy", { locale: ru })
              : "—"}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onView}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Дублировать
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Поделиться
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
