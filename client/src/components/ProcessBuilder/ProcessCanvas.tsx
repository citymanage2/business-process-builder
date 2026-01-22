import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  Node,
  Edge,
  Connection,
  NodeTypes,
  EdgeTypes,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  SelectionMode,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import { useProcessBuilderStore } from '@/stores/processBuilderStore';
import ProcessBlockNode from './ProcessBlockNode';
import ProcessEdge from './ProcessEdge';
import { BlockDefinition, ProcessNodeData, getBlockDefinition } from '@shared/processBuilder';

// Custom node types
const nodeTypes: NodeTypes = {
  processBlock: ProcessBlockNode,
};

// Custom edge types
const edgeTypes: EdgeTypes = {
  processEdge: ProcessEdge,
};

interface ProcessCanvasProps {
  onNodeClick?: (nodeId: string) => void;
  onPaneClick?: () => void;
  language?: 'en' | 'ru';
}

function ProcessCanvasInner({ onNodeClick, onPaneClick, language = 'ru' }: ProcessCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  
  const nodes = useProcessBuilderStore((state) => state.nodes);
  const edges = useProcessBuilderStore((state) => state.edges);
  const onNodesChange = useProcessBuilderStore((state) => state.onNodesChange);
  const onEdgesChange = useProcessBuilderStore((state) => state.onEdgesChange);
  const onConnect = useProcessBuilderStore((state) => state.onConnect);
  const addNode = useProcessBuilderStore((state) => state.addNode);
  const setViewport = useProcessBuilderStore((state) => state.setViewport);
  const setSelectedNodes = useProcessBuilderStore((state) => state.setSelectedNodes);
  const setSelectedEdges = useProcessBuilderStore((state) => state.setSelectedEdges);
  const setSelectedBlockForProperties = useProcessBuilderStore(
    (state) => state.setSelectedBlockForProperties
  );
  
  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  // Handle drop from block library
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const type = event.dataTransfer.getData('application/reactflow/type');
      if (!type) return;
      
      const blockDefJson = event.dataTransfer.getData('application/reactflow/blockDef');
      let blockDef: BlockDefinition | null = null;
      
      try {
        blockDef = blockDefJson ? JSON.parse(blockDefJson) : getBlockDefinition(type as any);
      } catch {
        blockDef = getBlockDefinition(type as any);
      }
      
      if (!blockDef) return;
      
      // Get drop position
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      // Add node at drop position
      addNode(type as any, position, {
        name: blockDef.name[language],
      });
    },
    [screenToFlowPosition, addNode, language]
  );
  
  // Handle node selection
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedNodes(selectedNodes.map((n) => n.id));
      setSelectedEdges(selectedEdges.map((e) => e.id));
      
      // Update properties panel
      if (selectedNodes.length === 1) {
        setSelectedBlockForProperties(selectedNodes[0].id);
      } else if (selectedNodes.length === 0) {
        setSelectedBlockForProperties(null);
      }
    },
    [setSelectedNodes, setSelectedEdges, setSelectedBlockForProperties]
  );
  
  // Handle viewport change
  const handleMove = useCallback(
    (event: any, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
    },
    [setViewport]
  );
  
  // Handle node click
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedBlockForProperties(node.id);
      onNodeClick?.(node.id);
    },
    [setSelectedBlockForProperties, onNodeClick]
  );
  
  // Handle pane click
  const handlePaneClick = useCallback(() => {
    setSelectedBlockForProperties(null);
    onPaneClick?.();
  }, [setSelectedBlockForProperties, onPaneClick]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      
      const { selectedNodes, undo, redo, removeNodes, duplicateNodes, selectAll } =
        useProcessBuilderStore.getState();
      
      // Ctrl/Cmd + Z - Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      
      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z - Redo
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'y' || (event.key === 'z' && event.shiftKey))
      ) {
        event.preventDefault();
        redo();
      }
      
      // Delete or Backspace - Delete selected
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodes.length > 0) {
          event.preventDefault();
          removeNodes(selectedNodes);
        }
      }
      
      // Ctrl/Cmd + D - Duplicate
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        if (selectedNodes.length > 0) {
          event.preventDefault();
          duplicateNodes(selectedNodes);
        }
      }
      
      // Ctrl/Cmd + A - Select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        selectAll();
      }
      
      // Escape - Clear selection
      if (event.key === 'Escape') {
        useProcessBuilderStore.getState().clearSelection();
        setSelectedBlockForProperties(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedBlockForProperties]);
  
  // Fit view on initial load
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, []);
  
  // Styled nodes with selected state
  const styledNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      className: cn(
        'transition-shadow duration-200',
        node.selected && 'shadow-lg'
      ),
    }));
  }, [nodes]);
  
  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionChange={handleSelectionChange}
        onMoveEnd={handleMove}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'processEdge',
          animated: false,
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ strokeWidth: 2, stroke: '#64748b' }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        selectNodesOnDrag={false}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        deleteKeyCode={null} // We handle delete manually
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background color="#e5e7eb" gap={15} />
        
        <Controls
          showZoom={false}
          showFitView={false}
          showInteractive={false}
          position="bottom-left"
          className="!shadow-md"
        />
        
        <MiniMap
          position="bottom-right"
          className="!bg-white !shadow-md !border !rounded-lg"
          maskColor="rgba(0, 0, 0, 0.1)"
          nodeColor={(node) => {
            const blockDef = getBlockDefinition(node.data?.type);
            return blockDef?.color || '#3b82f6';
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        
        {/* Empty state */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="!top-1/2 !-translate-y-1/2">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg border max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {language === 'ru' ? 'Начните создание процесса' : 'Start Building Your Process'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {language === 'ru'
                  ? 'Перетащите блоки из библиотеки слева на холст для создания диаграммы процесса'
                  : 'Drag blocks from the library on the left to the canvas to create your process diagram'}
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export default function ProcessCanvas(props: ProcessCanvasProps) {
  return (
    <ReactFlowProvider>
      <ProcessCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
