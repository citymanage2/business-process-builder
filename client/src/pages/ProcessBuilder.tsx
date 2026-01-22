import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useProcessBuilderStore } from '@/stores/processBuilderStore';
import ProcessCanvas from '@/components/ProcessBuilder/ProcessCanvas';
import BlockLibrary from '@/components/ProcessBuilder/BlockLibrary';
import PropertiesPanel from '@/components/ProcessBuilder/PropertiesPanel';
import Toolbar from '@/components/ProcessBuilder/Toolbar';
import { BlockDefinition } from '@shared/processBuilder';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Blocks,
  Settings,
  MessageSquare,
  History,
  Menu,
  X,
} from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';

export default function ProcessBuilder() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const processId = params.id ? parseInt(params.id) : null;
  const isNewProcess = !processId;
  
  const [isSaving, setIsSaving] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Store state
  const processName = useProcessBuilderStore((state) => state.processName);
  const setProcessName = useProcessBuilderStore((state) => state.setProcessName);
  const loadProcess = useProcessBuilderStore((state) => state.loadProcess);
  const resetProcess = useProcessBuilderStore((state) => state.resetProcess);
  const getProcessData = useProcessBuilderStore((state) => state.getProcessData);
  const markAsSaved = useProcessBuilderStore((state) => state.markAsSaved);
  const isDirty = useProcessBuilderStore((state) => state.isDirty);
  const activePanel = useProcessBuilderStore((state) => state.activePanel);
  const setActivePanel = useProcessBuilderStore((state) => state.setActivePanel);
  const selectedBlockForProperties = useProcessBuilderStore(
    (state) => state.selectedBlockForProperties
  );
  
  // tRPC queries and mutations
  const processQuery = trpc.builder.get.useQuery(
    { id: processId! },
    { enabled: !!processId && isAuthenticated }
  );
  
  const createProcess = trpc.builder.create.useMutation();
  const updateProcess = trpc.builder.update.useMutation();
  
  // Load process data
  useEffect(() => {
    if (processQuery.data) {
      loadProcess({
        id: processQuery.data.id,
        name: processQuery.data.name,
        description: processQuery.data.description || '',
        nodes: processQuery.data.nodes || [],
        edges: processQuery.data.edges || [],
        viewport: processQuery.data.viewport,
      });
    }
  }, [processQuery.data, loadProcess]);
  
  // Reset on unmount
  useEffect(() => {
    return () => {
      resetProcess();
    };
  }, [resetProcess]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [authLoading, isAuthenticated, setLocation]);
  
  // Auto-save every 30 seconds
  useEffect(() => {
    if (!processId || !isDirty) return;
    
    const timer = setInterval(() => {
      handleSave();
    }, 30000);
    
    return () => clearInterval(timer);
  }, [processId, isDirty]);
  
  // Save handler
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const data = getProcessData();
      
      if (isNewProcess) {
        // Create new process
        if (!processName.trim()) {
          toast.error('Введите название процесса');
          setIsSaving(false);
          return;
        }
        
        const result = await createProcess.mutateAsync({
          name: processName,
          ...data,
        });
        
        markAsSaved();
        toast.success('Процесс создан');
        setLocation(`/builder/${result.id}`);
      } else {
        // Update existing process
        await updateProcess.mutateAsync({
          id: processId!,
          name: processName,
          ...data,
          createVersion: true,
          versionComment: 'Auto-saved',
        });
        
        markAsSaved();
        toast.success('Изменения сохранены');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    isNewProcess,
    processId,
    processName,
    getProcessData,
    createProcess,
    updateProcess,
    markAsSaved,
    setLocation,
  ]);
  
  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);
  
  // Export handler
  const handleExport = useCallback(
    async (format: 'png' | 'svg' | 'pdf' | 'json' | 'bpmn') => {
      try {
        const flowElement = document.querySelector('.react-flow') as HTMLElement;
        
        if (format === 'png' || format === 'svg') {
          if (!flowElement) {
            toast.error('Не удалось найти диаграмму');
            return;
          }
          
          const exportFn = format === 'png' ? toPng : toSvg;
          const dataUrl = await exportFn(flowElement, {
            backgroundColor: '#ffffff',
            quality: 1,
          });
          
          const link = document.createElement('a');
          link.download = `${processName || 'process'}.${format}`;
          link.href = dataUrl;
          link.click();
          
          toast.success(`Экспортировано в ${format.toUpperCase()}`);
        } else if (format === 'json') {
          const data = getProcessData();
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.download = `${processName || 'process'}.json`;
          link.href = url;
          link.click();
          
          URL.revokeObjectURL(url);
          toast.success('Экспортировано в JSON');
        } else if (format === 'pdf') {
          toast.info('Экспорт в PDF скоро будет доступен');
        } else if (format === 'bpmn') {
          toast.info('Экспорт в BPMN скоро будет доступен');
        }
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Ошибка экспорта');
      }
    },
    [processName, getProcessData]
  );
  
  // Import handler
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.nodes && data.edges) {
          loadProcess({
            id: processId || 0,
            name: processName || file.name.replace('.json', ''),
            nodes: JSON.parse(data.nodes),
            edges: JSON.parse(data.edges),
            viewport: data.viewport ? JSON.parse(data.viewport) : undefined,
          });
          toast.success('Процесс импортирован');
        } else {
          toast.error('Неверный формат файла');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Ошибка импорта');
      }
    };
    
    input.click();
  }, [processId, processName, loadProcess]);
  
  // Drag handler for block library
  const handleDragStart = useCallback(
    (event: React.DragEvent, blockType: string, blockDef: BlockDefinition) => {
      event.dataTransfer.setData('application/reactflow/type', blockType);
      event.dataTransfer.setData('application/reactflow/blockDef', JSON.stringify(blockDef));
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );
  
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
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background z-10 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/processes')}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <Input
            value={processName}
            onChange={(e) => setProcessName(e.target.value)}
            placeholder="Название процесса"
            className="w-64 h-8 font-medium"
          />
          
          {isDirty && (
            <span className="text-xs text-muted-foreground">
              (несохраненные изменения)
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>
      
      {/* Toolbar */}
      <Toolbar
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        isSaving={isSaving}
        language="ru"
      />
      
      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left panel - Block Library */}
          <ResizablePanel
            defaultSize={20}
            minSize={0}
            maxSize={35}
            collapsible
            collapsedSize={0}
            onCollapse={() => setLeftPanelCollapsed(true)}
            onExpand={() => setLeftPanelCollapsed(false)}
            className={cn(leftPanelCollapsed && 'hidden lg:block')}
          >
            <div className="h-full border-r bg-background">
              <Tabs value={activePanel === 'blocks' ? 'blocks' : 'blocks'} className="h-full flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b px-2">
                  <TabsTrigger
                    value="blocks"
                    className="gap-1.5"
                    onClick={() => setActivePanel('blocks')}
                  >
                    <Blocks className="w-4 h-4" />
                    Блоки
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="blocks" className="flex-1 m-0">
                  <BlockLibrary onDragStart={handleDragStart} language="ru" />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Center - Canvas */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <div ref={canvasRef} className="h-full">
              <ProcessCanvas language="ru" />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Right panel - Properties */}
          <ResizablePanel
            defaultSize={20}
            minSize={0}
            maxSize={35}
            collapsible
            collapsedSize={0}
            onCollapse={() => setRightPanelCollapsed(true)}
            onExpand={() => setRightPanelCollapsed(false)}
            className={cn(rightPanelCollapsed && 'hidden lg:block')}
          >
            <div className="h-full border-l bg-background">
              <Tabs
                value={activePanel || 'properties'}
                onValueChange={(v) => setActivePanel(v as any)}
                className="h-full flex flex-col"
              >
                <TabsList className="w-full justify-start rounded-none border-b px-2">
                  <TabsTrigger value="properties" className="gap-1.5">
                    <Settings className="w-4 h-4" />
                    Свойства
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    Комментарии
                  </TabsTrigger>
                  <TabsTrigger value="versions" className="gap-1.5">
                    <History className="w-4 h-4" />
                    Версии
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="properties" className="flex-1 m-0 overflow-hidden">
                  <PropertiesPanel nodeId={selectedBlockForProperties} language="ru" />
                </TabsContent>
                
                <TabsContent value="comments" className="flex-1 m-0 p-4">
                  <div className="text-center text-muted-foreground text-sm">
                    Комментарии к процессу будут здесь
                  </div>
                </TabsContent>
                
                <TabsContent value="versions" className="flex-1 m-0 p-4">
                  <div className="text-center text-muted-foreground text-sm">
                    История версий будет здесь
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
