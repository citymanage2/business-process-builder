import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'sonner';
import { toPng, toSvg } from 'html-to-image';

import { cn } from '@/lib/utils';
import {
  BlockData,
  BlockType,
  ConnectionType,
  createNode,
  createEdge as createProcessEdge,
  validateProcess,
  ValidationError,
  exportProcess,
  importProcess,
  CONNECTION_STYLES,
  ProcessNode,
  ProcessEdge,
} from '@/lib/processBuilder';
import ProcessBlockNode from './ProcessBlockNode';
import BlockLibrary from './BlockLibrary';
import PropertiesPanel from './PropertiesPanel';
import EditorToolbar from './EditorToolbar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';

// Custom node types
const nodeTypes = {
  processBlock: ProcessBlockNode,
};

interface ProcessEditorProps {
  initialNodes?: ProcessNode[];
  initialEdges?: ProcessEdge[];
  initialViewport?: { x: number; y: number; zoom: number };
  processTitle?: string;
  onSave?: (nodes: ProcessNode[], edges: ProcessEdge[], viewport: { x: number; y: number; zoom: number }) => Promise<void>;
  readOnly?: boolean;
  className?: string;
}

function ProcessEditorInner({
  initialNodes = [],
  initialEdges = [],
  initialViewport,
  processTitle = 'Новый процесс',
  onSave,
  readOnly = false,
  className,
}: ProcessEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project, getViewport, fitView, setViewport, zoomIn, zoomOut } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);
  
  // History for undo/redo
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef({ nodes, edges });
  
  // Selection state
  const [selectedNode, setSelectedNode] = useState<Node<BlockData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  
  // UI state
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  
  // Clipboard
  const [clipboard, setClipboard] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  
  // Import dialog
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set initial viewport
  useEffect(() => {
    if (initialViewport) {
      setViewport(initialViewport);
    } else {
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, []);

  // Save history on changes
  useEffect(() => {
    const nodesChanged = JSON.stringify(nodes) !== JSON.stringify(historyRef.current.nodes);
    const edgesChanged = JSON.stringify(edges) !== JSON.stringify(historyRef.current.edges);
    
    if (nodesChanged || edgesChanged) {
      historyRef.current = { nodes, edges };
      
      // Only add to history if not undoing/redoing
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ nodes: [...nodes], edges: [...edges] });
      
      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [nodes, edges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;
      
      // Check if we're in an input field
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            e.preventDefault();
            break;
          case 'y':
            handleRedo();
            e.preventDefault();
            break;
          case 'c':
            handleCopy();
            e.preventDefault();
            break;
          case 'v':
            handlePaste();
            e.preventDefault();
            break;
          case 'a':
            handleSelectAll();
            e.preventDefault();
            break;
          case 's':
            handleSave();
            e.preventDefault();
            break;
        }
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdge, selectedNodes, clipboard, readOnly]);

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from library
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    if (!reactFlowWrapper.current) return;

    const blockType = event.dataTransfer.getData('application/reactflow') as BlockType;
    if (!blockType) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    const newNode = createNode(blockType, position);
    setNodes(nds => [...nds, newNode]);
    
    toast.success('Блок добавлен');
  }, [project, setNodes]);

  // Handle drag start from library
  const onDragStart = useCallback((event: React.DragEvent, blockType: BlockType) => {
    event.dataTransfer.setData('application/reactflow', blockType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle connection
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    const newEdge = createProcessEdge(connection.source, connection.target);
    setEdges(eds => addEdge(newEdge as Edge, eds));
  }, [setEdges]);

  // Handle selection change
  const onSelectionChange = useCallback(({ nodes: selectedNodesList, edges: selectedEdgesList }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodes(selectedNodesList);
    
    if (selectedNodesList.length === 1) {
      setSelectedNode(selectedNodesList[0] as Node<BlockData>);
      setSelectedEdge(null);
    } else if (selectedEdgesList.length === 1 && selectedNodesList.length === 0) {
      setSelectedEdge(selectedEdgesList[0]);
      setSelectedNode(null);
    } else {
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, []);

  // Update node data
  const handleNodeUpdate = useCallback((nodeId: string, data: Partial<BlockData>) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      )
    );
  }, [setNodes]);

  // Update edge data
  const handleEdgeUpdate = useCallback((edgeId: string, data: { connectionType?: ConnectionType; label?: string; condition?: string }) => {
    setEdges(eds =>
      eds.map(edge => {
        if (edge.id !== edgeId) return edge;
        
        const connectionType = data.connectionType || (edge.data as any)?.connectionType || 'sequence';
        const style = CONNECTION_STYLES[connectionType as ConnectionType];
        
        return {
          ...edge,
          animated: connectionType === 'conditional',
          style: {
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            strokeDasharray: style.strokeDasharray,
          },
          markerEnd: style.markerEnd,
          label: data.label,
          data: { ...(edge.data || {}), ...data },
        } as Edge;
      })
    );
  }, [setEdges]);

  // Delete selected elements
  const handleDelete = useCallback(() => {
    if (selectedNode) {
      setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
      setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      toast.success('Блок удален');
    } else if (selectedEdge) {
      setEdges(eds => eds.filter(e => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      toast.success('Связь удалена');
    } else if (selectedNodes.length > 0) {
      const nodeIds = selectedNodes.map(n => n.id);
      setNodes(nds => nds.filter(n => !nodeIds.includes(n.id)));
      setEdges(eds => eds.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
      setSelectedNodes([]);
      toast.success(`Удалено ${selectedNodes.length} блоков`);
    }
  }, [selectedNode, selectedEdge, selectedNodes, setNodes, setEdges]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setNodes(history[newIndex].nodes);
      setEdges(history[newIndex].edges);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setNodes(history[newIndex].nodes);
      setEdges(history[newIndex].edges);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Copy/Paste
  const handleCopy = useCallback(() => {
    if (selectedNodes.length > 0) {
      const nodeIds = selectedNodes.map(n => n.id);
      const connectedEdges = edges.filter(e => 
        nodeIds.includes(e.source) && nodeIds.includes(e.target)
      );
      setClipboard({ nodes: [...selectedNodes], edges: connectedEdges });
      toast.success(`Скопировано ${selectedNodes.length} блоков`);
    } else if (selectedNode) {
      setClipboard({ nodes: [selectedNode], edges: [] });
      toast.success('Блок скопирован');
    }
  }, [selectedNode, selectedNodes, edges]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    
    const idMap: Record<string, string> = {};
    const newNodes = clipboard.nodes.map(node => {
      const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      idMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: true,
      };
    });
    
    const newEdges = clipboard.edges.map(edge => ({
      ...edge,
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: idMap[edge.source] || edge.source,
      target: idMap[edge.target] || edge.target,
    }));
    
    // Deselect current nodes
    setNodes(nds => [
      ...nds.map(n => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    setEdges(eds => [...eds, ...newEdges]);
    
    toast.success(`Вставлено ${newNodes.length} блоков`);
  }, [clipboard, setNodes, setEdges]);

  const handleSelectAll = useCallback(() => {
    setNodes(nds => nds.map(n => ({ ...n, selected: true })));
  }, [setNodes]);

  // Alignment functions
  const handleAlign = useCallback((direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedNodes.length < 2) return;
    
    const bounds = selectedNodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.position.x),
        maxX: Math.max(acc.maxX, node.position.x + 160),
        minY: Math.min(acc.minY, node.position.y),
        maxY: Math.max(acc.maxY, node.position.y + 80),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );
    
    const nodeIds = selectedNodes.map(n => n.id);
    
    setNodes(nds =>
      nds.map(node => {
        if (!nodeIds.includes(node.id)) return node;
        
        let newPosition = { ...node.position };
        
        switch (direction) {
          case 'left':
            newPosition.x = bounds.minX;
            break;
          case 'center':
            newPosition.x = (bounds.minX + bounds.maxX) / 2 - 80;
            break;
          case 'right':
            newPosition.x = bounds.maxX - 160;
            break;
          case 'top':
            newPosition.y = bounds.minY;
            break;
          case 'middle':
            newPosition.y = (bounds.minY + bounds.maxY) / 2 - 40;
            break;
          case 'bottom':
            newPosition.y = bounds.maxY - 80;
            break;
        }
        
        return { ...node, position: newPosition };
      })
    );
  }, [selectedNodes, setNodes]);

  const handleDistribute = useCallback((direction: 'horizontal' | 'vertical') => {
    if (selectedNodes.length < 3) return;
    
    const sorted = [...selectedNodes].sort((a, b) =>
      direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y
    );
    
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = direction === 'horizontal'
      ? last.position.x - first.position.x
      : last.position.y - first.position.y;
    const spacing = totalSpace / (sorted.length - 1);
    
    const nodeIds = sorted.map(n => n.id);
    
    setNodes(nds =>
      nds.map(node => {
        const index = nodeIds.indexOf(node.id);
        if (index === -1) return node;
        
        const newPosition = { ...node.position };
        if (direction === 'horizontal') {
          newPosition.x = first.position.x + spacing * index;
        } else {
          newPosition.y = first.position.y + spacing * index;
        }
        
        return { ...node, position: newPosition };
      })
    );
  }, [selectedNodes, setNodes]);

  // Validation
  const handleValidate = useCallback(() => {
    const errors = validateProcess(nodes as ProcessNode[], edges as ProcessEdge[]);
    setValidationErrors(errors);
    setShowValidationDialog(true);
    
    if (errors.length === 0) {
      toast.success('Процесс валиден!');
    } else {
      toast.error(`Найдено ${errors.length} ошибок`);
    }
  }, [nodes, edges]);

  // Save
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      const viewport = getViewport();
      await onSave(nodes as ProcessNode[], edges as ProcessEdge[], viewport);
      toast.success('Процесс сохранен');
    } catch (error) {
      toast.error('Ошибка сохранения');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, getViewport, onSave]);

  // Export functions
  const handleExportJSON = useCallback(() => {
    const data = exportProcess(processTitle, nodes as ProcessNode[], edges as ProcessEdge[]);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${processTitle.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Экспортировано в JSON');
  }, [processTitle, nodes, edges]);

  const handleExportPNG = useCallback(async () => {
    if (!reactFlowWrapper.current) return;
    
    const element = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element) return;
    
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${processTitle.replace(/\s+/g, '_')}.png`;
      a.click();
      toast.success('Экспортировано в PNG');
    } catch (error) {
      toast.error('Ошибка экспорта');
      console.error(error);
    }
  }, [processTitle]);

  const handleExportSVG = useCallback(async () => {
    if (!reactFlowWrapper.current) return;
    
    const element = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element) return;
    
    try {
      const dataUrl = await toSvg(element);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${processTitle.replace(/\s+/g, '_')}.svg`;
      a.click();
      toast.success('Экспортировано в SVG');
    } catch (error) {
      toast.error('Ошибка экспорта');
      console.error(error);
    }
  }, [processTitle]);

  // Import
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = importProcess(content);
        setNodes(data.nodes as Node[]);
        setEdges(data.edges as Edge[]);
        setTimeout(() => fitView({ padding: 0.2 }), 100);
        toast.success('Процесс импортирован');
      } catch (error) {
        toast.error('Ошибка импорта: неверный формат файла');
        console.error(error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [setNodes, setEdges, fitView]);

  const errorCount = useMemo(() => validationErrors.filter(e => e.type === 'error').length, [validationErrors]);

  return (
    <div className={cn('flex h-full', className)}>
      {/* Block Library Sidebar */}
      {!readOnly && (
        <BlockLibrary
          onDragStart={onDragStart}
          className="w-64 flex-shrink-0"
        />
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        {!readOnly && (
          <EditorToolbar
            zoom={getViewport().zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onFitView={() => fitView({ padding: 0.2 })}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            hasSelection={!!selectedNode || selectedNodes.length > 0}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onDelete={handleDelete}
            onSelectAll={handleSelectAll}
            onAlignLeft={() => handleAlign('left')}
            onAlignCenter={() => handleAlign('center')}
            onAlignRight={() => handleAlign('right')}
            onAlignTop={() => handleAlign('top')}
            onAlignMiddle={() => handleAlign('middle')}
            onAlignBottom={() => handleAlign('bottom')}
            onDistributeHorizontal={() => handleDistribute('horizontal')}
            onDistributeVertical={() => handleDistribute('vertical')}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onToggleSnap={() => setSnapToGrid(!snapToGrid)}
            showMinimap={showMinimap}
            onToggleMinimap={() => setShowMinimap(!showMinimap)}
            validationErrors={errorCount}
            onValidate={handleValidate}
            isSaving={isSaving}
            onSave={handleSave}
            onExportJSON={handleExportJSON}
            onExportPNG={handleExportPNG}
            onExportSVG={handleExportSVG}
            onImport={handleImport}
          />
        )}

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onDrop={readOnly ? undefined : onDrop}
            onDragOver={readOnly ? undefined : onDragOver}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            snapToGrid={snapToGrid}
            snapGrid={[15, 15]}
            fitView
            attributionPosition="bottom-left"
            deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
            multiSelectionKeyCode={['Shift']}
            selectionOnDrag
            panOnDrag={[1, 2]}
            selectionMode={SelectionMode.Partial}
          >
            {showGrid && (
              <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
            )}
            <Controls showInteractive={false} />
            {showMinimap && (
              <MiniMap
                nodeStrokeWidth={3}
                zoomable
                pannable
                className="!bg-background border"
              />
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Properties Panel */}
      {!readOnly && (
        <PropertiesPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onNodeUpdate={handleNodeUpdate}
          onEdgeUpdate={handleEdgeUpdate}
          onDelete={handleDelete}
          className="w-72 flex-shrink-0"
        />
      )}

      {/* Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {validationErrors.length === 0 ? (
                <>
                  <LucideIcons.CheckCircle className="text-green-500" size={20} />
                  Процесс валиден
                </>
              ) : (
                <>
                  <LucideIcons.AlertTriangle className="text-yellow-500" size={20} />
                  Найдены проблемы
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {validationErrors.length === 0
                ? 'Все проверки пройдены успешно'
                : `Найдено ${validationErrors.length} проблем`}
            </DialogDescription>
          </DialogHeader>
          
          {validationErrors.length > 0 && (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {validationErrors.map((error, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-3 rounded-lg border',
                      error.type === 'error' ? 'bg-destructive/10 border-destructive/50' : 'bg-yellow-500/10 border-yellow-500/50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {error.type === 'error' ? (
                        <LucideIcons.XCircle className="text-destructive mt-0.5" size={16} />
                      ) : (
                        <LucideIcons.AlertTriangle className="text-yellow-500 mt-0.5" size={16} />
                      )}
                      <span className="text-sm">{error.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />
    </div>
  );
}

// Wrap with provider
export function ProcessEditor(props: ProcessEditorProps) {
  return (
    <ReactFlowProvider>
      <ProcessEditorInner {...props} />
    </ReactFlowProvider>
  );
}

export default ProcessEditor;
