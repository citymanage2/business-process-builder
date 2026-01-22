import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';

export function TemplatesPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  
  // Use template dialog
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [newProcessTitle, setNewProcessTitle] = useState('');
  
  // Queries
  const templatesQuery = trpc.builder.templates.listPublic.useQuery();
  const categoriesQuery = trpc.builder.categories.list.useQuery();
  
  // Mutations
  const useTemplate = trpc.builder.templates.useTemplate.useMutation({
    onSuccess: (data) => {
      toast.success('Процесс создан из шаблона');
      navigate(`/builder/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка создания процесса');
    },
  });

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = templatesQuery.data || [];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    if (categoryFilter) {
      templates = templates.filter(t => t.categoryId?.toString() === categoryFilter);
    }
    
    return templates;
  }, [templatesQuery.data, searchQuery, categoryFilter]);

  const handleUseTemplate = () => {
    if (!selectedTemplate || !newProcessTitle.trim()) return;
    
    useTemplate.mutate({
      templateId: selectedTemplate.id,
      title: newProcessTitle,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Шаблоны процессов</h1>
            <p className="text-muted-foreground">
              Используйте готовые шаблоны для быстрого старта
            </p>
          </div>
          
          <Button onClick={() => navigate('/processes')}>
            <LucideIcons.ArrowLeft size={20} className="mr-2" />
            К моим процессам
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Поиск шаблонов..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все категории</SelectItem>
              {categoriesQuery.data?.map(cat => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {templatesQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LucideIcons.FileX size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {searchQuery || categoryFilter
                  ? 'Шаблоны не найдены'
                  : 'Шаблоны пока не добавлены'}
              </p>
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter
                  ? 'Попробуйте изменить параметры поиска'
                  : 'Создайте свой первый шаблон'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                categories={categoriesQuery.data || []}
                onUse={() => {
                  setSelectedTemplate(template);
                  setNewProcessTitle(template.title);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Use Template Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать процесс из шаблона</DialogTitle>
            <DialogDescription>
              Новый процесс будет создан на основе шаблона "{selectedTemplate?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="processTitle">Название процесса</Label>
              <Input
                id="processTitle"
                value={newProcessTitle}
                onChange={e => setNewProcessTitle(e.target.value)}
                placeholder="Введите название"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Отмена
            </Button>
            <Button 
              onClick={handleUseTemplate}
              disabled={!newProcessTitle.trim() || useTemplate.isPending}
            >
              {useTemplate.isPending ? (
                <>
                  <LucideIcons.Loader2 size={16} className="mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <LucideIcons.Plus size={16} className="mr-2" />
                  Создать процесс
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// =============================================
// Template Card Component
// =============================================

interface TemplateCardProps {
  template: any;
  categories: any[];
  onUse: () => void;
}

function TemplateCard({ template, categories, onUse }: TemplateCardProps) {
  const category = categories.find(c => c.id === template.categoryId);
  
  // Parse nodes to count blocks
  let nodeCount = 0;
  try {
    const nodes = typeof template.nodes === 'string' ? JSON.parse(template.nodes) : template.nodes;
    nodeCount = Array.isArray(nodes) ? nodes.length : 0;
  } catch {
    nodeCount = 0;
  }
  
  // Calculate rating stars
  const rating = template.rating ? template.rating / 100 : 0;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{template.title}</CardTitle>
            {template.description && (
              <CardDescription className="line-clamp-2">
                {template.description}
              </CardDescription>
            )}
          </div>
        </div>
        
        {category && (
          <div className="pt-2">
            <Badge variant="outline">{category.name}</Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pb-3 flex-1">
        {/* Preview placeholder */}
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
          <LucideIcons.GitBranch size={32} className="text-muted-foreground/50" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-lg font-semibold">{nodeCount}</p>
            <p className="text-xs text-muted-foreground">Блоков</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{template.usageCount || 0}</p>
            <p className="text-xs text-muted-foreground">Использований</p>
          </div>
          <div>
            <div className="flex justify-center items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <LucideIcons.Star
                  key={i}
                  size={14}
                  className={
                    i < fullStars
                      ? 'text-yellow-400 fill-yellow-400'
                      : i === fullStars && hasHalfStar
                      ? 'text-yellow-400 fill-yellow-400/50'
                      : 'text-muted-foreground/30'
                  }
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{template.ratingCount || 0} отзывов</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t">
        <Button className="w-full" onClick={onUse}>
          <LucideIcons.Copy size={16} className="mr-2" />
          Использовать шаблон
        </Button>
      </CardFooter>
    </Card>
  );
}

export default TemplatesPage;
