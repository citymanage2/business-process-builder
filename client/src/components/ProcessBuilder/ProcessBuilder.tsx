import React, { useState, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  Connection,
  Panel,
  ReactFlowInstance,
  MarkerType,
  OnSelectionChangeParams,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Sidebar } from './Sidebar';
import { PropertiesPanel } from './PropertiesPanel';
import CustomNode from './CustomNode';
import { NodeData } from './types';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

interface ProcessBuilderProps {
  initialNodes?: Node<NodeData>[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node<NodeData>[], edges: Edge[]) => void;
  readOnly?: boolean;
}

const ProcessBuilderContent = ({ initialNodes = [], initialEdges = [], onSave, readOnly = false }: ProcessBuilderProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: true,
  }, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<NodeData> = {
        id: nanoid(),
        type,
        position: position || { x: 0, y: 0 },
        data: { label, type: type as any },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    setSelectedNode(nodes[0] as Node<NodeData> || null);
  }, []);

  const updateNodeData = useCallback((id: string, data: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
            return {
                ...node,
                data: { ...node.data, ...data }
            };
        }
        return node;
      })
    );
    if (selectedNode?.id === id) {
        setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...data } } : null);
    }
  }, [setNodes, selectedNode]);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleSave = () => {
    if (onSave) {
        onSave(nodes, edges);
    }
  };

  const customNodeTypes = useMemo(() => {
      const types: Record<string, any> = {};
      const allTypes = [
        'start', 'end', 'entry', 'exit',
        'task', 'subprocess', 'manual', 'automated', 'notification', 'api',
        'condition', 'multiple_choice', 'parallel', 'exclusive',
        'data_input', 'data_output', 'data_store', 'document',
        'timer', 'signal', 'error', 'escalation',
        'role', 'department', 'external_system'
      ];
      
      allTypes.forEach(t => {
          types[t] = CustomNode;
      });
      return types;
  }, []);

  return (
    <div className="flex h-full w-full bg-gray-50">
      {!readOnly && <Sidebar />}
      <div className="flex-1 h-full relative border-r bg-white" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onInit={setReactFlowInstance}
          onDrop={readOnly ? undefined : onDrop}
          onDragOver={readOnly ? undefined : onDragOver}
          onSelectionChange={onSelectionChange}
          nodeTypes={customNodeTypes}
          fitView
          defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
          snapToGrid={!readOnly}
          snapGrid={[15, 15]}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={true} // Allow selecting to view details even in readOnly? Maybe.
        >
          <Controls />
          <MiniMap />
          <Background gap={16} size={1} color="#e5e7eb" />
          {!readOnly && (
            <Panel position="top-right">
              <Button onClick={handleSave} size="sm" className="gap-2 shadow-md">
                  <Save className="w-4 h-4" />
                  Сохранить процесс
              </Button>
            </Panel>
          )}
        </ReactFlow>
      </div>
      {!readOnly && (
        <PropertiesPanel 
          selectedNode={selectedNode} 
          onUpdate={updateNodeData} 
          onDelete={deleteNode} 
        />
      )}
    </div>
  );
};

export default function ProcessBuilder(props: ProcessBuilderProps) {
  return (
    <ReactFlowProvider>
      <ProcessBuilderContent {...props} />
    </ReactFlowProvider>
  );
}
