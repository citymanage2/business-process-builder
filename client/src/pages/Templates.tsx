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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search,
  Star,
  ArrowLeft,
  Users,
  Clock,
  Copy,
  Eye,
  FileText,
  Briefcase,
  ShoppingCart,
  DollarSign,
  Truck,
  Monitor,
  FolderKanban,
  Headphones,
  Building2,
  Plus,
} from "lucide-react";
import { PROCESS_CATEGORIES, ProcessTemplateData, ProcessDiagram } from "@shared/processBuilder";

// Predefined templates
const BUILT_IN_TEMPLATES: ProcessTemplateData[] = [
  {
    id: 1,
    name: "Процесс найма сотрудника",
    description: "Полный цикл найма от создания вакансии до оформления",
    category: "hr",
    tags: ["HR", "Найм", "Онбординг"],
    usageCount: 1250,
    rating: 45,
    isBuiltIn: true,
    diagram: {
      version: 1,
      title: "Процесс найма сотрудника",
      description: "Полный цикл найма от создания вакансии до оформления",
      visibility: "public",
      blocks: [
        { id: "1", type: "start", name: "Запрос на найм", position: { x: 50, y: 200 } },
        { id: "2", type: "task", name: "Создание вакансии", position: { x: 200, y: 200 }, responsible: "HR", duration: 60 },
        { id: "3", type: "task", name: "Публикация вакансии", position: { x: 400, y: 200 }, responsible: "HR", duration: 30 },
        { id: "4", type: "task", name: "Отбор резюме", position: { x: 600, y: 200 }, responsible: "HR", duration: 240 },
        { id: "5", type: "condition", name: "Кандидаты найдены?", position: { x: 800, y: 200 } },
        { id: "6", type: "task", name: "Проведение интервью", position: { x: 1000, y: 150 }, responsible: "HR + Руководитель", duration: 120 },
        { id: "7", type: "condition", name: "Кандидат подходит?", position: { x: 1200, y: 150 } },
        { id: "8", type: "task", name: "Оформление оффера", position: { x: 1400, y: 100 }, responsible: "HR", duration: 60 },
        { id: "9", type: "task", name: "Оформление документов", position: { x: 1600, y: 100 }, responsible: "HR", duration: 120 },
        { id: "10", type: "end", name: "Сотрудник принят", position: { x: 1800, y: 100 } },
      ],
      connections: [
        { id: "e1", sourceBlockId: "1", targetBlockId: "2", type: "sequence" },
        { id: "e2", sourceBlockId: "2", targetBlockId: "3", type: "sequence" },
        { id: "e3", sourceBlockId: "3", targetBlockId: "4", type: "sequence" },
        { id: "e4", sourceBlockId: "4", targetBlockId: "5", type: "sequence" },
        { id: "e5", sourceBlockId: "5", targetBlockId: "6", type: "conditional", label: "Да" },
        { id: "e6", sourceBlockId: "5", targetBlockId: "3", type: "conditional", label: "Нет" },
        { id: "e7", sourceBlockId: "6", targetBlockId: "7", type: "sequence" },
        { id: "e8", sourceBlockId: "7", targetBlockId: "8", type: "conditional", label: "Да" },
        { id: "e9", sourceBlockId: "7", targetBlockId: "4", type: "conditional", label: "Нет" },
        { id: "e10", sourceBlockId: "8", targetBlockId: "9", type: "sequence" },
        { id: "e11", sourceBlockId: "9", targetBlockId: "10", type: "sequence" },
      ],
    },
  },
  {
    id: 2,
    name: "Обработка заказа",
    description: "От получения заказа до доставки клиенту",
    category: "sales",
    tags: ["Продажи", "Заказы", "Логистика"],
    usageCount: 980,
    rating: 42,
    isBuiltIn: true,
    diagram: {
      version: 1,
      title: "Обработка заказа",
      description: "От получения заказа до доставки клиенту",
      visibility: "public",
      blocks: [
        { id: "1", type: "start", name: "Заказ получен", position: { x: 50, y: 200 } },
        { id: "2", type: "task", name: "Проверка наличия", position: { x: 200, y: 200 }, responsible: "Менеджер", duration: 15 },
        { id: "3", type: "condition", name: "Товар в наличии?", position: { x: 400, y: 200 } },
        { id: "4", type: "task", name: "Формирование заказа", position: { x: 600, y: 150 }, responsible: "Склад", duration: 30 },
        { id: "5", type: "task", name: "Уведомление о сроках", position: { x: 600, y: 300 }, responsible: "Менеджер", duration: 10 },
        { id: "6", type: "task", name: "Оплата", position: { x: 800, y: 200 }, responsible: "Клиент", duration: 60 },
        { id: "7", type: "task", name: "Отгрузка", position: { x: 1000, y: 200 }, responsible: "Склад", duration: 45 },
        { id: "8", type: "task", name: "Доставка", position: { x: 1200, y: 200 }, responsible: "Курьер", duration: 240 },
        { id: "9", type: "end", name: "Заказ доставлен", position: { x: 1400, y: 200 } },
      ],
      connections: [
        { id: "e1", sourceBlockId: "1", targetBlockId: "2", type: "sequence" },
        { id: "e2", sourceBlockId: "2", targetBlockId: "3", type: "sequence" },
        { id: "e3", sourceBlockId: "3", targetBlockId: "4", type: "conditional", label: "Да" },
        { id: "e4", sourceBlockId: "3", targetBlockId: "5", type: "conditional", label: "Нет" },
        { id: "e5", sourceBlockId: "4", targetBlockId: "6", type: "sequence" },
        { id: "e6", sourceBlockId: "5", targetBlockId: "6", type: "sequence" },
        { id: "e7", sourceBlockId: "6", targetBlockId: "7", type: "sequence" },
        { id: "e8", sourceBlockId: "7", targetBlockId: "8", type: "sequence" },
        { id: "e9", sourceBlockId: "8", targetBlockId: "9", type: "sequence" },
      ],
    },
  },
  {
    id: 3,
    name: "Согласование документов",
    description: "Маршрут согласования внутренних документов",
    category: "finance",
    tags: ["Документооборот", "Согласование", "Подписание"],
    usageCount: 750,
    rating: 40,
    isBuiltIn: true,
    diagram: {
      version: 1,
      title: "Согласование документов",
      description: "Маршрут согласования внутренних документов",
      visibility: "public",
      blocks: [
        { id: "1", type: "start", name: "Документ создан", position: { x: 50, y: 200 } },
        { id: "2", type: "task", name: "Первичная проверка", position: { x: 200, y: 200 }, responsible: "Автор", duration: 30 },
        { id: "3", type: "task", name: "Согласование руководителем", position: { x: 400, y: 200 }, responsible: "Руководитель", duration: 120 },
        { id: "4", type: "condition", name: "Согласовано?", position: { x: 600, y: 200 } },
        { id: "5", type: "task", name: "Юридическая проверка", position: { x: 800, y: 150 }, responsible: "Юрист", duration: 180 },
        { id: "6", type: "task", name: "Доработка", position: { x: 800, y: 300 }, responsible: "Автор", duration: 60 },
        { id: "7", type: "task", name: "Финальное подписание", position: { x: 1000, y: 150 }, responsible: "Директор", duration: 60 },
        { id: "8", type: "task", name: "Регистрация", position: { x: 1200, y: 150 }, responsible: "Секретарь", duration: 15 },
        { id: "9", type: "end", name: "Документ утвержден", position: { x: 1400, y: 150 } },
      ],
      connections: [
        { id: "e1", sourceBlockId: "1", targetBlockId: "2", type: "sequence" },
        { id: "e2", sourceBlockId: "2", targetBlockId: "3", type: "sequence" },
        { id: "e3", sourceBlockId: "3", targetBlockId: "4", type: "sequence" },
        { id: "e4", sourceBlockId: "4", targetBlockId: "5", type: "conditional", label: "Да" },
        { id: "e5", sourceBlockId: "4", targetBlockId: "6", type: "conditional", label: "Нет" },
        { id: "e6", sourceBlockId: "6", targetBlockId: "2", type: "sequence" },
        { id: "e7", sourceBlockId: "5", targetBlockId: "7", type: "sequence" },
        { id: "e8", sourceBlockId: "7", targetBlockId: "8", type: "sequence" },
        { id: "e9", sourceBlockId: "8", targetBlockId: "9", type: "sequence" },
      ],
    },
  },
  {
    id: 4,
    name: "Обработка обращений клиентов",
    description: "От получения обращения до решения проблемы",
    category: "support",
    tags: ["Поддержка", "Клиенты", "Тикеты"],
    usageCount: 620,
    rating: 38,
    isBuiltIn: true,
    diagram: {
      version: 1,
      title: "Обработка обращений клиентов",
      visibility: "public",
      blocks: [
        { id: "1", type: "start", name: "Обращение получено", position: { x: 50, y: 200 } },
        { id: "2", type: "task", name: "Классификация", position: { x: 200, y: 200 }, responsible: "Оператор", duration: 10 },
        { id: "3", type: "multiple_choice", name: "Тип обращения", position: { x: 400, y: 200 } },
        { id: "4", type: "task", name: "Техническая поддержка", position: { x: 600, y: 100 }, responsible: "Техподдержка", duration: 60 },
        { id: "5", type: "task", name: "Консультация по продукту", position: { x: 600, y: 200 }, responsible: "Консультант", duration: 30 },
        { id: "6", type: "task", name: "Оформление возврата", position: { x: 600, y: 300 }, responsible: "Менеджер", duration: 45 },
        { id: "7", type: "task", name: "Фиксация результата", position: { x: 800, y: 200 }, responsible: "Оператор", duration: 10 },
        { id: "8", type: "send_notification", name: "Уведомление клиента", position: { x: 1000, y: 200 } },
        { id: "9", type: "end", name: "Обращение закрыто", position: { x: 1200, y: 200 } },
      ],
      connections: [
        { id: "e1", sourceBlockId: "1", targetBlockId: "2", type: "sequence" },
        { id: "e2", sourceBlockId: "2", targetBlockId: "3", type: "sequence" },
        { id: "e3", sourceBlockId: "3", targetBlockId: "4", type: "conditional", label: "Техническая" },
        { id: "e4", sourceBlockId: "3", targetBlockId: "5", type: "conditional", label: "Консультация" },
        { id: "e5", sourceBlockId: "3", targetBlockId: "6", type: "conditional", label: "Возврат" },
        { id: "e6", sourceBlockId: "4", targetBlockId: "7", type: "sequence" },
        { id: "e7", sourceBlockId: "5", targetBlockId: "7", type: "sequence" },
        { id: "e8", sourceBlockId: "6", targetBlockId: "7", type: "sequence" },
        { id: "e9", sourceBlockId: "7", targetBlockId: "8", type: "sequence" },
        { id: "e10", sourceBlockId: "8", targetBlockId: "9", type: "sequence" },
      ],
    },
  },
  {
    id: 5,
    name: "Разработка продукта",
    description: "Agile процесс разработки программного продукта",
    category: "projects",
    tags: ["Разработка", "Agile", "Scrum"],
    usageCount: 580,
    rating: 44,
    isBuiltIn: true,
    diagram: {
      version: 1,
      title: "Разработка продукта",
      visibility: "public",
      blocks: [
        { id: "1", type: "start", name: "Идея продукта", position: { x: 50, y: 200 } },
        { id: "2", type: "task", name: "Сбор требований", position: { x: 200, y: 200 }, responsible: "Аналитик", duration: 480 },
        { id: "3", type: "task", name: "Планирование спринта", position: { x: 400, y: 200 }, responsible: "Scrum Master", duration: 120 },
        { id: "4", type: "task", name: "Разработка", position: { x: 600, y: 200 }, responsible: "Разработчики", duration: 4800 },
        { id: "5", type: "task", name: "Тестирование", position: { x: 800, y: 200 }, responsible: "QA", duration: 960 },
        { id: "6", type: "condition", name: "Тесты пройдены?", position: { x: 1000, y: 200 } },
        { id: "7", type: "task", name: "Исправление багов", position: { x: 1000, y: 350 }, responsible: "Разработчики", duration: 240 },
        { id: "8", type: "task", name: "Демо и ретро", position: { x: 1200, y: 200 }, responsible: "Команда", duration: 120 },
        { id: "9", type: "condition", name: "Продукт готов?", position: { x: 1400, y: 200 } },
        { id: "10", type: "task", name: "Релиз", position: { x: 1600, y: 150 }, responsible: "DevOps", duration: 120 },
        { id: "11", type: "end", name: "Продукт запущен", position: { x: 1800, y: 150 } },
      ],
      connections: [
        { id: "e1", sourceBlockId: "1", targetBlockId: "2", type: "sequence" },
        { id: "e2", sourceBlockId: "2", targetBlockId: "3", type: "sequence" },
        { id: "e3", sourceBlockId: "3", targetBlockId: "4", type: "sequence" },
        { id: "e4", sourceBlockId: "4", targetBlockId: "5", type: "sequence" },
        { id: "e5", sourceBlockId: "5", targetBlockId: "6", type: "sequence" },
        { id: "e6", sourceBlockId: "6", targetBlockId: "8", type: "conditional", label: "Да" },
        { id: "e7", sourceBlockId: "6", targetBlockId: "7", type: "conditional", label: "Нет" },
        { id: "e8", sourceBlockId: "7", targetBlockId: "5", type: "sequence" },
        { id: "e9", sourceBlockId: "8", targetBlockId: "9", type: "sequence" },
        { id: "e10", sourceBlockId: "9", targetBlockId: "10", type: "conditional", label: "Да" },
        { id: "e11", sourceBlockId: "9", targetBlockId: "3", type: "conditional", label: "Нет" },
        { id: "e12", sourceBlockId: "10", targetBlockId: "11", type: "sequence" },
      ],
    },
  },
  {
    id: 6,
    name: "Закупка товаров",
    description: "Процесс закупки от заявки до оприходования",
    category: "production",
    tags: ["Закупки", "Снабжение", "Склад"],
    usageCount: 420,
    rating: 36,
    isBuiltIn: true,
    diagram: {
      version: 1,
      title: "Закупка товаров",
      visibility: "public",
      blocks: [
        { id: "1", type: "start", name: "Заявка на закупку", position: { x: 50, y: 200 } },
        { id: "2", type: "task", name: "Согласование бюджета", position: { x: 200, y: 200 }, responsible: "Финансы", duration: 120 },
        { id: "3", type: "task", name: "Выбор поставщика", position: { x: 400, y: 200 }, responsible: "Снабжение", duration: 240 },
        { id: "4", type: "task", name: "Оформление заказа", position: { x: 600, y: 200 }, responsible: "Снабжение", duration: 60 },
        { id: "5", type: "task", name: "Оплата", position: { x: 800, y: 200 }, responsible: "Бухгалтерия", duration: 60 },
        { id: "6", type: "timer_event", name: "Ожидание доставки", position: { x: 1000, y: 200 } },
        { id: "7", type: "task", name: "Приемка товара", position: { x: 1200, y: 200 }, responsible: "Склад", duration: 120 },
        { id: "8", type: "task", name: "Оприходование", position: { x: 1400, y: 200 }, responsible: "Склад", duration: 30 },
        { id: "9", type: "end", name: "Закупка завершена", position: { x: 1600, y: 200 } },
      ],
      connections: [
        { id: "e1", sourceBlockId: "1", targetBlockId: "2", type: "sequence" },
        { id: "e2", sourceBlockId: "2", targetBlockId: "3", type: "sequence" },
        { id: "e3", sourceBlockId: "3", targetBlockId: "4", type: "sequence" },
        { id: "e4", sourceBlockId: "4", targetBlockId: "5", type: "sequence" },
        { id: "e5", sourceBlockId: "5", targetBlockId: "6", type: "sequence" },
        { id: "e6", sourceBlockId: "6", targetBlockId: "7", type: "sequence" },
        { id: "e7", sourceBlockId: "7", targetBlockId: "8", type: "sequence" },
        { id: "e8", sourceBlockId: "8", targetBlockId: "9", type: "sequence" },
      ],
    },
  },
];

// Category icons mapping
const CATEGORY_ICONS: Record<string, any> = {
  hr: Briefcase,
  sales: ShoppingCart,
  finance: DollarSign,
  production: Truck,
  it: Monitor,
  projects: FolderKanban,
  support: Headphones,
  other: Building2,
};

export default function Templates() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "newest">("popular");

  // Filter templates
  const filteredTemplates = BUILT_IN_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "popular") return (b.usageCount || 0) - (a.usageCount || 0);
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const handleUseTemplate = (template: ProcessTemplateData) => {
    // Store template data in sessionStorage and navigate to builder
    sessionStorage.setItem("templateData", JSON.stringify(template.diagram));
    toast.success("Шаблон загружен");
    setLocation("/builder");
  };

  const handlePreviewTemplate = (template: ProcessTemplateData) => {
    toast.info("Предпросмотр шаблона в разработке");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/processes">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Библиотека шаблонов</h1>
                <p className="text-muted-foreground text-sm">
                  Готовые шаблоны бизнес-процессов
                </p>
              </div>
            </div>

            <Link href="/builder">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Создать с нуля
              </Button>
            </Link>
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
              placeholder="Поиск шаблонов..."
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

          <Select
            value={sortBy}
            onValueChange={(value: "popular" | "rating" | "newest") =>
              setSortBy(value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">По популярности</SelectItem>
              <SelectItem value="rating">По рейтингу</SelectItem>
              <SelectItem value="newest">Новые</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categories Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Категории</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {PROCESS_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.id] || Building2;
              const count = BUILT_IN_TEMPLATES.filter(
                (t) => t.category === category.id
              ).length;
              return (
                <Card
                  key={category.id}
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    selectedCategory === category.id
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === category.id ? "all" : category.id
                    )
                  }
                >
                  <CardContent className="p-4 text-center">
                    <div
                      className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: category.color + "20" }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: category.color }}
                      />
                    </div>
                    <p className="text-sm font-medium truncate">
                      {category.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{count}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Templates Tabs */}
        <Tabs defaultValue="builtin">
          <TabsList className="mb-4">
            <TabsTrigger value="builtin">Встроенные</TabsTrigger>
            <TabsTrigger value="community">Сообщество</TabsTrigger>
            <TabsTrigger value="my">Мои шаблоны</TabsTrigger>
          </TabsList>

          <TabsContent value="builtin">
            {filteredTemplates.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    Шаблоны не найдены
                  </h3>
                  <p className="text-muted-foreground">
                    Попробуйте изменить параметры поиска
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={() => handleUseTemplate(template)}
                    onPreview={() => handlePreviewTemplate(template)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="community">
            <Card className="py-12">
              <CardContent className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  Шаблоны сообщества
                </h3>
                <p className="text-muted-foreground">
                  Здесь будут отображаться шаблоны, созданные другими
                  пользователями
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my">
            <Card className="py-12">
              <CardContent className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Мои шаблоны</h3>
                <p className="text-muted-foreground mb-4">
                  Вы пока не сохранили ни одного шаблона
                </p>
                <Link href="/builder">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать процесс
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onUse,
  onPreview,
}: {
  template: ProcessTemplateData;
  onUse: () => void;
  onPreview: () => void;
}) {
  const category = PROCESS_CATEGORIES.find((c) => c.id === template.category);
  const Icon = CATEGORY_ICONS[template.category || "other"] || Building2;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: (category?.color || "#64748b") + "20" }}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: category?.color || "#64748b" }}
            />
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">
              {((template.rating || 0) / 10).toFixed(1)}
            </span>
          </div>
        </div>
        <CardTitle className="text-base mt-3">{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{template.usageCount?.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{template.diagram.blocks.length} блоков</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onPreview}>
            <Eye className="w-4 h-4 mr-2" />
            Просмотр
          </Button>
          <Button className="flex-1" onClick={onUse}>
            <Copy className="w-4 h-4 mr-2" />
            Использовать
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
