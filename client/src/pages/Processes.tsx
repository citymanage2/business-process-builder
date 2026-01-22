import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  MoreVertical,
  GitBranch,
  Eye,
  Trash2,
  Copy,
  FileEdit,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  FolderOpen,
  Clock,
  Users,
  Globe,
  Lock,
  ChevronLeft,
  FileText,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Processes() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processToDelete, setProcessToDelete] = useState<number | null>(null);
  
  // Form state for new process
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessDescription, setNewProcessDescription] = useState('');
  
  // Queries
  const processesQuery = trpc.builder.list.useQuery(
    {
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
      sortBy: 'updated',
      sortOrder: 'desc',
    },
    { enabled: isAuthenticated }
  );
  
  const templatesQuery = trpc.builder.templates.list.useQuery(
    { isSystem: true, limit: 6 },
    { enabled: isAuthenticated }
  );
  
  // Mutations
  const createProcess = trpc.builder.create.useMutation({
    onSuccess: (data) => {
      setLocation(`/builder/${data.id}`);
      setCreateDialogOpen(false);
      setNewProcessName('');
      setNewProcessDescription('');
    },
    onError: () => {
      toast.error('Ошибка создания процесса');
    },
  });
  
  const deleteProcess = trpc.builder.delete.useMutation({
    onSuccess: () => {
      toast.success('Процесс удален');
      processesQuery.refetch();
      setDeleteDialogOpen(false);
      setProcessToDelete(null);
    },
    onError: () => {
      toast.error('Ошибка удаления');
    },
  });
  
  const duplicateProcess = trpc.builder.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success('Процесс скопирован');
      setLocation(`/builder/${data.id}`);
    },
    onError: () => {
      toast.error('Ошибка копирования');
    },
  });
  
  // Handlers
  const handleCreateProcess = () => {
    if (!newProcessName.trim()) {
      toast.error('Введите название процесса');
      return;
    }
    
    createProcess.mutate({
      name: newProcessName,
      description: newProcessDescription || undefined,
    });
  };
  
  const handleCreateFromTemplate = (templateId: number) => {
    createProcess.mutate({
      name: 'Новый процесс из шаблона',
      templateId,
    });
  };
  
  const handleDelete = () => {
    if (processToDelete) {
      deleteProcess.mutate({ id: processToDelete });
    }
  };
  
  const handleDuplicate = (id: number) => {
    duplicateProcess.mutate({ id });
  };
  
  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [authLoading, isAuthenticated, setLocation]);
  
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Черновик</Badge>;
      case 'published':
        return <Badge variant="default">Опубликован</Badge>;
      case 'archived':
        return <Badge variant="outline">В архиве</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="w-4 h-4 text-green-500" />;
      case 'shared':
        return <Users className="w-4 h-4 text-blue-500" />;
      default:
        return <Lock className="w-4 h-4 text-gray-500" />;
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Мои процессы
                </h1>
                <p className="text-sm text-muted-foreground">
                  Создавайте и управляйте бизнес-процессами
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href="/analytics">
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Аналитика
                </Button>
              </Link>
              
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Создать процесс
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Создать новый процесс</DialogTitle>
                  <DialogDescription>
                    Создайте пустой процесс или выберите шаблон
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Название</Label>
                    <Input
                      id="name"
                      value={newProcessName}
                      onChange={(e) => setNewProcessName(e.target.value)}
                      placeholder="Введите название процесса"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Описание (опционально)</Label>
                    <Textarea
                      id="description"
                      value={newProcessDescription}
                      onChange={(e) => setNewProcessDescription(e.target.value)}
                      placeholder="Краткое описание процесса"
                      rows={3}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreateProcess} disabled={createProcess.isPending}>
                    {createProcess.isPending ? 'Создание...' : 'Создать'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {/* Templates section */}
        {templatesQuery.data && templatesQuery.data.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Начните с шаблона
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {templatesQuery.data.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleCreateFromTemplate(template.id)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm truncate">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.useCount} использований
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск процессов..."
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="draft">Черновики</SelectItem>
                <SelectItem value="published">Опубликованные</SelectItem>
                <SelectItem value="archived">В архиве</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Process list */}
        {processesQuery.isLoading ? (
          <div className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
          )}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : processesQuery.data && processesQuery.data.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processesQuery.data.map((process) => (
                <Card key={process.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          <Link href={`/builder/${process.id}`} className="hover:text-primary">
                            {process.name}
                          </Link>
                        </CardTitle>
                        {process.description && (
                          <CardDescription className="line-clamp-2 mt-1">
                            {process.description}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/builder/${process.id}`)}>
                            <FileEdit className="w-4 h-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(process.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Дублировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setProcessToDelete(process.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(process.status)}
                        {getVisibilityIcon(process.visibility)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(process.updatedAt), 'd MMM', { locale: ru })}
                      </div>
                    </div>
                    {process.tags && process.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {process.tags.slice(0, 3).map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {processesQuery.data.map((process) => (
                <Card key={process.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center p-4 gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <GitBranch className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/builder/${process.id}`}
                        className="font-medium hover:text-primary truncate block"
                      >
                        {process.name}
                      </Link>
                      {process.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {process.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(process.status)}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(process.updatedAt), 'd MMM yyyy', { locale: ru })}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/builder/${process.id}`)}>
                            <FileEdit className="w-4 h-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(process.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Дублировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setProcessToDelete(process.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет процессов</h3>
              <p className="text-muted-foreground text-center mb-6">
                {searchQuery
                  ? 'По вашему запросу ничего не найдено'
                  : 'Создайте свой первый бизнес-процесс'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать процесс
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить процесс?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Процесс будет удален безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProcess.isPending}
            >
              {deleteProcess.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
