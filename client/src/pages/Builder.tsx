import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { ProcessEditor } from '@/components/builder/ProcessEditor';
import { ProcessNode, ProcessEdge } from '@/lib/processBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import * as LucideIcons from 'lucide-react';

export function BuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const isNewProcess = !id || id === 'new';
  
  // Process data state
  const [processTitle, setProcessTitle] = useState('Новый процесс');
  const [processDescription, setProcessDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  
  // Editor state
  const [initialNodes, setInitialNodes] = useState<ProcessNode[]>([]);
  const [initialEdges, setInitialEdges] = useState<ProcessEdge[]>([]);
  const [initialViewport, setInitialViewport] = useState<{ x: number; y: number; zoom: number } | undefined>();
  
  // UI state
  const [showMetadataDialog, setShowMetadataDialog] = useState(isNewProcess);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Fetch process if editing existing
  const processQuery = trpc.builder.processes.get.useQuery(
    { id: parseInt(id!) },
    { enabled: !isNewProcess && !!id }
  );
  
  // Fetch categories
  const categoriesQuery = trpc.builder.categories.list.useQuery();
  
  // Mutations
  const createProcess = trpc.builder.processes.create.useMutation();
  const updateProcess = trpc.builder.processes.update.useMutation();
  const saveVersion = trpc.builder.processes.saveVersion.useMutation();

  // Load existing process data
  useEffect(() => {
    if (processQuery.data) {
      setProcessTitle(processQuery.data.title);
      setProcessDescription(processQuery.data.description || '');
      setVisibility(processQuery.data.visibility);
      setCategoryId(processQuery.data.categoryId);
      setInitialNodes(processQuery.data.nodes || []);
      setInitialEdges(processQuery.data.edges || []);
      setInitialViewport(processQuery.data.viewport);
    }
  }, [processQuery.data]);

  // Handle save
  const handleSave = async (
    nodes: ProcessNode[],
    edges: ProcessEdge[],
    viewport: { x: number; y: number; zoom: number }
  ) => {
    if (isNewProcess) {
      // Create new process
      const result = await createProcess.mutateAsync({
        title: processTitle,
        description: processDescription,
        visibility,
        categoryId: categoryId || undefined,
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        viewport: JSON.stringify(viewport),
      });
      
      toast.success('Процесс создан');
      navigate(`/builder/${result.id}`);
    } else {
      // Save new version
      await saveVersion.mutateAsync({
        id: parseInt(id!),
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        viewport: JSON.stringify(viewport),
      });
      
      // Update metadata if changed
      await updateProcess.mutateAsync({
        id: parseInt(id!),
        title: processTitle,
        description: processDescription,
        visibility,
        categoryId,
      });
      
      toast.success('Изменения сохранены');
      setHasChanges(false);
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

  // Not authenticated
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <LucideIcons.Lock size={48} className="text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Требуется авторизация</h2>
          <p className="text-muted-foreground mb-4">Войдите в систему для работы с конструктором</p>
          <Button onClick={() => navigate('/login')}>
            Войти
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Loading existing process
  if (!isNewProcess && processQuery.isLoading) {
    return (
      <DashboardLayout noPadding>
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-[400px] w-[600px]" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error loading process
  if (!isNewProcess && processQuery.isError) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <LucideIcons.AlertTriangle size={48} className="text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Ошибка загрузки</h2>
          <p className="text-muted-foreground mb-4">Не удалось загрузить процесс</p>
          <Button onClick={() => navigate('/processes')}>
            К списку процессов
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Check access
  const canEdit = isNewProcess || 
    processQuery.data?.isOwner || 
    processQuery.data?.accessLevel === 'editor';

  return (
    <DashboardLayout noPadding>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate('/processes')}>
          <LucideIcons.ArrowLeft size={20} />
        </Button>
        
        <div className="flex-1 flex items-center gap-2">
          <h1 className="text-lg font-semibold truncate">{processTitle}</h1>
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">
              Несохраненные изменения
            </Badge>
          )}
          {processQuery.data?.status && (
            <Badge variant={
              processQuery.data.status === 'published' ? 'default' :
              processQuery.data.status === 'archived' ? 'secondary' : 'outline'
            }>
              {processQuery.data.status === 'published' ? 'Опубликован' :
               processQuery.data.status === 'archived' ? 'В архиве' : 'Черновик'}
            </Badge>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMetadataDialog(true)}
        >
          <LucideIcons.Settings size={16} className="mr-2" />
          Настройки
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <ProcessEditor
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          initialViewport={initialViewport}
          processTitle={processTitle}
          onSave={handleSave}
          readOnly={!canEdit}
        />
      </div>

      {/* Metadata Dialog */}
      <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isNewProcess ? 'Создание процесса' : 'Настройки процесса'}
            </DialogTitle>
            <DialogDescription>
              {isNewProcess 
                ? 'Укажите основную информацию о процессе'
                : 'Измените настройки процесса'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название *</Label>
              <Input
                id="title"
                value={processTitle}
                onChange={e => setProcessTitle(e.target.value)}
                placeholder="Название процесса"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={processDescription}
                onChange={e => setProcessDescription(e.target.value)}
                placeholder="Описание процесса..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Категория</Label>
              <Select
                value={categoryId?.toString() || ''}
                onValueChange={v => setCategoryId(v ? parseInt(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Без категории</SelectItem>
                  {categoriesQuery.data?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="visibility">Видимость</Label>
              <Select
                value={visibility}
                onValueChange={v => setVisibility(v as 'private' | 'public')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <LucideIcons.Lock size={16} />
                      Приватный
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <LucideIcons.Globe size={16} />
                      Публичный
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {visibility === 'private' 
                  ? 'Процесс виден только вам и приглашенным пользователям'
                  : 'Процесс будет виден всем пользователям после публикации'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetadataDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={() => setShowMetadataDialog(false)}
              disabled={!processTitle.trim()}
            >
              {isNewProcess ? 'Создать' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default BuilderPage;
