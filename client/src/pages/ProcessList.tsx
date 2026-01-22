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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export function ProcessListPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState('my');
  
  // Delete dialog
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  // Queries
  const myProcessesQuery = trpc.builder.processes.list.useQuery(
    { includeShared: true },
    { enabled: !!user }
  );
  const publicProcessesQuery = trpc.builder.processes.listPublic.useQuery();
  const categoriesQuery = trpc.builder.categories.list.useQuery();
  const statsQuery = trpc.builder.analytics.userStats.useQuery(undefined, { enabled: !!user });
  
  // Mutations
  const deleteProcess = trpc.builder.processes.delete.useMutation({
    onSuccess: () => {
      toast.success('Процесс удален');
      myProcessesQuery.refetch();
    },
    onError: () => {
      toast.error('Ошибка удаления');
    },
  });
  const archiveProcess = trpc.builder.processes.archive.useMutation({
    onSuccess: () => {
      toast.success('Процесс перемещен в архив');
      myProcessesQuery.refetch();
    },
  });

  // Filter processes
  const filteredMyProcesses = useMemo(() => {
    let processes = myProcessesQuery.data || [];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      processes = processes.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    if (categoryFilter) {
      processes = processes.filter(p => p.categoryId?.toString() === categoryFilter);
    }
    
    if (statusFilter) {
      processes = processes.filter(p => p.status === statusFilter);
    }
    
    return processes;
  }, [myProcessesQuery.data, searchQuery, categoryFilter, statusFilter]);

  const filteredPublicProcesses = useMemo(() => {
    let processes = publicProcessesQuery.data || [];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      processes = processes.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    if (categoryFilter) {
      processes = processes.filter(p => p.categoryId?.toString() === categoryFilter);
    }
    
    return processes;
  }, [publicProcessesQuery.data, searchQuery, categoryFilter]);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProcess.mutateAsync({ id: deleteId });
      setDeleteId(null);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <LucideIcons.Loader2 className="animate-spin" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Конструктор процессов</h1>
            <p className="text-muted-foreground">
              Создавайте и управляйте бизнес-процессами
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/templates')}>
              <LucideIcons.Layout size={20} className="mr-2" />
              Шаблоны
            </Button>
            <Button onClick={() => navigate('/builder/new')}>
              <LucideIcons.Plus size={20} className="mr-2" />
              Новый процесс
            </Button>
          </div>
        </div>

        {/* Stats */}
        {user && statsQuery.data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <LucideIcons.FileText className="text-primary" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statsQuery.data.total}</p>
                    <p className="text-sm text-muted-foreground">Всего процессов</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <LucideIcons.Edit className="text-yellow-500" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statsQuery.data.drafts}</p>
                    <p className="text-sm text-muted-foreground">Черновики</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <LucideIcons.CheckCircle className="text-green-500" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statsQuery.data.published}</p>
                    <p className="text-sm text-muted-foreground">Опубликовано</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <LucideIcons.Eye className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statsQuery.data.totalViews}</p>
                    <p className="text-sm text-muted-foreground">Просмотров</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Поиск процессов..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
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
          
          {activeTab === 'my' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все статусы</SelectItem>
                <SelectItem value="draft">Черновики</SelectItem>
                <SelectItem value="published">Опубликованные</SelectItem>
                <SelectItem value="archived">В архиве</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my" disabled={!user}>
              <LucideIcons.User size={16} className="mr-2" />
              Мои процессы
            </TabsTrigger>
            <TabsTrigger value="public">
              <LucideIcons.Globe size={16} className="mr-2" />
              Публичные
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="mt-6">
            {!user ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <LucideIcons.Lock size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Требуется авторизация</p>
                  <p className="text-muted-foreground mb-4">Войдите для доступа к своим процессам</p>
                  <Button onClick={() => navigate('/login')}>Войти</Button>
                </CardContent>
              </Card>
            ) : myProcessesQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
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
            ) : filteredMyProcesses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <LucideIcons.FileX size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {searchQuery || categoryFilter || statusFilter
                      ? 'Процессы не найдены'
                      : 'У вас пока нет процессов'}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || categoryFilter || statusFilter
                      ? 'Попробуйте изменить параметры поиска'
                      : 'Создайте свой первый бизнес-процесс'}
                  </p>
                  {!searchQuery && !categoryFilter && !statusFilter && (
                    <Button onClick={() => navigate('/builder/new')}>
                      <LucideIcons.Plus size={20} className="mr-2" />
                      Создать процесс
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMyProcesses.map(process => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    categories={categoriesQuery.data || []}
                    onEdit={() => navigate(`/builder/${process.id}`)}
                    onArchive={() => archiveProcess.mutate({ id: process.id })}
                    onDelete={() => setDeleteId(process.id)}
                    isOwner={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="public" className="mt-6">
            {publicProcessesQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
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
            ) : filteredPublicProcesses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <LucideIcons.Globe size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Публичных процессов пока нет</p>
                  <p className="text-muted-foreground">
                    Станьте первым, кто опубликует свой процесс!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPublicProcesses.map(process => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    categories={categoriesQuery.data || []}
                    onView={() => navigate(`/builder/${process.id}`)}
                    isOwner={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить процесс?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Процесс и вся его история версий будут удалены навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// =============================================
// Process Card Component
// =============================================

interface ProcessCardProps {
  process: any;
  categories: any[];
  onEdit?: () => void;
  onView?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  isOwner: boolean;
}

function ProcessCard({
  process,
  categories,
  onEdit,
  onView,
  onArchive,
  onDelete,
  isOwner,
}: ProcessCardProps) {
  const category = categories.find(c => c.id === process.categoryId);
  
  const statusBadge = {
    draft: { label: 'Черновик', variant: 'outline' as const },
    published: { label: 'Опубликован', variant: 'default' as const },
    archived: { label: 'В архиве', variant: 'secondary' as const },
  }[process.status as string] || { label: process.status, variant: 'outline' as const };

  const nodeCount = process.nodes?.length || 0;
  const edgeCount = process.edges?.length || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{process.title}</CardTitle>
            {process.description && (
              <CardDescription className="line-clamp-2">
                {process.description}
              </CardDescription>
            )}
          </div>
          
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0 ml-2">
                  <LucideIcons.MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <LucideIcons.Edit size={16} className="mr-2" />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive}>
                  <LucideIcons.Archive size={16} className="mr-2" />
                  В архив
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <LucideIcons.Trash2 size={16} className="mr-2" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {category && (
            <Badge variant="outline">{category.name}</Badge>
          )}
          {process.visibility === 'public' && (
            <Badge variant="outline">
              <LucideIcons.Globe size={12} className="mr-1" />
              Публичный
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{nodeCount}</p>
            <p className="text-xs text-muted-foreground">Блоков</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{edgeCount}</p>
            <p className="text-xs text-muted-foreground">Связей</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{process.currentVersion || 1}</p>
            <p className="text-xs text-muted-foreground">Версия</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <LucideIcons.Clock size={12} />
          <span>
            {process.lastEditedAt
              ? formatDistanceToNow(new Date(process.lastEditedAt), { addSuffix: true, locale: ru })
              : 'Недавно'}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <LucideIcons.Eye size={12} />
          <span>{process.viewCount || 0}</span>
        </div>
      </CardFooter>
      
      <CardFooter className="pt-0">
        <Button
          variant="default"
          className="w-full"
          onClick={isOwner ? onEdit : onView}
        >
          {isOwner ? (
            <>
              <LucideIcons.Edit size={16} className="mr-2" />
              Редактировать
            </>
          ) : (
            <>
              <LucideIcons.Eye size={16} className="mr-2" />
              Просмотреть
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ProcessListPage;
