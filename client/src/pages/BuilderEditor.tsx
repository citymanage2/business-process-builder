import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  BackgroundVariant
} from "reactflow";
import "reactflow/dist/style.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Upload,
  Settings,
  ArrowLeft,
  Play,
  AlertTriangle,
  CheckCircle,
  Grid,
  Eye
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BlockLibrary } from "@/components/builder/BlockLibrary";
import { PropertiesPanel } from "@/components/builder/PropertiesPanel";
import { CustomNode } from "@/components/builder/CustomNode";
import { CustomEdge } from "@/components/builder/CustomEdge";
import { ValidationPanel } from "@/components/builder/ValidationPanel";
import { BlockData, ConnectionData, BLOCK_METADATA, BlockType } from "@shared/builderTypes";
import { nanoid } from "nanoid";

// Define node types
const nodeTypes: NodeTypes = {
  customBlock: CustomNode
};

// Define edge types
const edgeTypes: EdgeTypes = {
  customEdge: CustomEdge
};

function BuilderEditorContent() {
  const { id } = useParams<{ id: string }>();
  const processId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut, getViewport, setViewport } = useReactFlow();

  // State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [showBlockLibrary, setShowBlockLibrary] = useState(true);
  const [showProperties, setShowProperties] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [versionComment, setVersionComment] = useState("");
  const [gridEnabled, setGridEnabled] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [processName, setProcessName] = useState("");

  // History for undo/redo
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Queries
  const { data: process, isLoading, error } = trpc.builder.processes.get.useQuery(
    { id: processId },
    { enabled: processId > 0 }
  );

  // Mutations
  const saveDiagram = trpc.builder.processes.saveDiagram.useMutation({
    onSuccess: () => {
      toast.success("Process saved successfully");
      setHasUnsavedChanges(false);
      setShowSaveDialog(false);
      setVersionComment("");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const updateProcess = trpc.builder.processes.update.useMutation({
    onSuccess: () => {
      toast.success("Process updated");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Convert process data to ReactFlow nodes/edges
  useEffect(() => {
    if (process) {
      setProcessName(process.name);
      
      const initialNodes: Node[] = (process.blocksData || []).map((block: BlockData) => ({
        id: block.id,
        type: "customBlock",
        position: block.position,
        data: {
          ...block,
          label: block.name
        }
      }));

      const initialEdges: Edge[] = (process.connectionsData || []).map((conn: ConnectionData) => ({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
        type: "customEdge",
        data: {
          connectionType: conn.type,
          label: conn.label,
          ...conn.data
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20
        }
      }));

      setNodes(initialNodes);
      setEdges(initialEdges);

      // Initialize history
      setHistory([{ nodes: initialNodes, edges: initialEdges }]);
      setHistoryIndex(0);

      // Restore viewport
      if (process.canvasSettings) {
        setTimeout(() => {
          setViewport({
            x: process.canvasSettings?.panX ?? 0,
            y: process.canvasSettings?.panY ?? 0,
            zoom: process.canvasSettings?.zoom ?? 1
          });
        }, 100);
      }

      setGridEnabled(process.canvasSettings?.gridEnabled ?? true);
    }
  }, [process, setNodes, setEdges, setViewport]);

  // Track changes
  useEffect(() => {
    if (historyIndex >= 0 && history.length > 0) {
      const currentState = history[historyIndex];
      const nodesChanged = JSON.stringify(nodes) !== JSON.stringify(currentState?.nodes);
      const edgesChanged = JSON.stringify(edges) !== JSON.stringify(currentState?.edges);
      
      if (nodesChanged || edgesChanged) {
        setHasUnsavedChanges(true);
      }
    }
  }, [nodes, edges, history, historyIndex]);

  // Save state to history
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, history, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevState = history[newIndex];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Handle connection
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        id: `edge-${nanoid()}`,
        type: "customEdge",
        data: {
          connectionType: "sequence_flow"
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20
        }
      };
      setEdges((eds) => addEdge(newEdge, eds));
      saveToHistory();
    },
    [setEdges, saveToHistory]
  );

  // Handle node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setShowProperties(true);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setShowProperties(true);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setShowProperties(false);
  }, []);

  // Handle drag over for dropping blocks
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle drop of new block
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const blockType = event.dataTransfer.getData("application/reactflow") as BlockType;
      if (!blockType) return;

      const metadata = BLOCK_METADATA[blockType];
      if (!metadata) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const viewport = getViewport();
      const position = {
        x: (event.clientX - reactFlowBounds.left - viewport.x) / viewport.zoom,
        y: (event.clientY - reactFlowBounds.top - viewport.y) / viewport.zoom
      };

      const newNode: Node = {
        id: `block-${nanoid()}`,
        type: "customBlock",
        position,
        data: {
          id: `block-${nanoid()}`,
          type: blockType,
          name: metadata.label,
          description: "",
          label: metadata.label,
          style: {
            color: metadata.color
          }
        }
      };

      setNodes((nds) => [...nds, newNode]);
      saveToHistory();
    },
    [getViewport, setNodes, saveToHistory]
  );

  // Handle node changes (position, deletion, etc.)
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);
      // Check if it's a position change that ended
      const positionChange = changes.find((c: any) => c.type === "position" && c.dragging === false);
      if (positionChange) {
        saveToHistory();
      }
    },
    [onNodesChange, saveToHistory]
  );

  // Handle node property update
  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Partial<BlockData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
                label: data.name || node.data.label
              }
            };
          }
          return node;
        })
      );
      saveToHistory();
    },
    [setNodes, saveToHistory]
  );

  // Handle edge property update
  const handleEdgeUpdate = useCallback(
    (edgeId: string, data: Partial<ConnectionData>) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            return {
              ...edge,
              data: {
                ...edge.data,
                ...data
              }
            };
          }
          return edge;
        })
      );
      saveToHistory();
    },
    [setEdges, saveToHistory]
  );

  // Handle delete selected
  const handleDeleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      saveToHistory();
    } else if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      saveToHistory();
    }
  }, [selectedNode, selectedEdge, setNodes, setEdges, saveToHistory]);

  // Save process
  const handleSave = useCallback(
    (createVersion = false) => {
      const blocksData: BlockData[] = nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        name: node.data.name || node.data.label,
        description: node.data.description,
        position: node.position,
        data: node.data.data,
        style: node.data.style
      }));

      const connectionsData: ConnectionData[] = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined,
        type: edge.data?.connectionType || "sequence_flow",
        label: edge.data?.label,
        data: edge.data
      }));

      const viewport = getViewport();
      const canvasSettings = {
        zoom: viewport.zoom,
        panX: viewport.x,
        panY: viewport.y,
        gridEnabled
      };

      saveDiagram.mutate({
        id: processId,
        blocks: blocksData,
        connections: connectionsData,
        canvasSettings,
        createVersion,
        versionComment: createVersion ? versionComment : undefined
      });
    },
    [nodes, edges, getViewport, gridEnabled, processId, versionComment, saveDiagram]
  );

  // Validate process
  const validationErrors = useMemo(() => {
    const errors: { type: "error" | "warning"; message: string; blockId?: string }[] = [];

    // Check for start block
    const hasStart = nodes.some((n) => n.data.type === "start");
    if (!hasStart) {
      errors.push({ type: "error", message: "Process must have a Start block" });
    }

    // Check for end block
    const hasEnd = nodes.some((n) => n.data.type === "end");
    if (!hasEnd) {
      errors.push({ type: "error", message: "Process must have an End block" });
    }

    // Check for isolated nodes
    nodes.forEach((node) => {
      const hasIncoming = edges.some((e) => e.target === node.id);
      const hasOutgoing = edges.some((e) => e.source === node.id);
      const meta = BLOCK_METADATA[node.data.type as BlockType];

      if (meta?.hasInputHandle && !hasIncoming && node.data.type !== "start" && node.data.type !== "entry_point") {
        errors.push({
          type: "warning",
          message: `"${node.data.label}" has no incoming connections`,
          blockId: node.id
        });
      }

      if (meta?.hasOutputHandle && !hasOutgoing && node.data.type !== "end" && node.data.type !== "exit_point") {
        errors.push({
          type: "warning",
          message: `"${node.data.label}" has no outgoing connections`,
          blockId: node.id
        });
      }
    });

    return errors;
  }, [nodes, edges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave(false);
      }
      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl + Y: Redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") || ((e.ctrlKey || e.metaKey) && e.key === "y")) {
        e.preventDefault();
        handleRedo();
      }
      // Delete/Backspace: Delete selected
      if ((e.key === "Delete" || e.key === "Backspace") && (selectedNode || selectedEdge)) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleUndo, handleRedo, handleDeleteSelected, selectedNode, selectedEdge]);

  if (isLoading) {
    return <EditorSkeleton />;
  }

  if (error || !process) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Process not found</h2>
          <p className="text-muted-foreground mb-4">
            The process you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => setLocation("/builder")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const canEdit = process.accessRole === "owner" || process.accessRole === "editor";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Block Library Sidebar */}
      {showBlockLibrary && canEdit && (
        <BlockLibrary onClose={() => setShowBlockLibrary(false)} />
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b bg-background flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/builder")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <Input
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              onBlur={() => {
                if (processName !== process.name) {
                  updateProcess.mutate({ id: processId, name: processName });
                }
              }}
              className="w-64 h-8 font-medium"
              disabled={!canEdit}
            />
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}>
                      <Undo className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                    >
                      <Redo className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
                </Tooltip>

                <div className="h-6 w-px bg-border" />
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => zoomIn()}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => zoomOut()}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => fitView({ padding: 0.2 })}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to View</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridEnabled ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setGridEnabled(!gridEnabled)}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>

            <div className="h-6 w-px bg-border" />

            <Button
              variant={showValidation ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowValidation(!showValidation)}
            >
              {validationErrors.filter((e) => e.type === "error").length > 0 ? (
                <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              )}
              Validate
            </Button>

            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saveDiagram.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>

                <Button size="sm" onClick={() => setShowSaveDialog(true)} disabled={saveDiagram.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Version
                </Button>
              </>
            )}

            {!canEdit && (
              <Button variant="outline" size="sm" onClick={() => setLocation(`/builder/view/${processId}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Mode
              </Button>
            )}
          </div>
        </div>

        {/* ReactFlow Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid={gridEnabled}
            snapGrid={[15, 15]}
            deleteKeyCode={canEdit ? ["Delete", "Backspace"] : null}
            selectionKeyCode={canEdit ? "Shift" : null}
            multiSelectionKeyCode={canEdit ? ["Meta", "Control"] : null}
            panOnScroll
            selectionOnDrag={canEdit}
            nodesDraggable={canEdit}
            nodesConnectable={canEdit}
            elementsSelectable={true}
          >
            <Background
              variant={gridEnabled ? BackgroundVariant.Dots : undefined}
              gap={15}
              size={1}
              color="#ddd"
            />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              nodeColor={(node) => {
                const meta = BLOCK_METADATA[node.data?.type as BlockType];
                return meta?.color || "#64748b";
              }}
            />

            {/* Validation Panel */}
            {showValidation && (
              <Panel position="bottom-left" className="m-4">
                <ValidationPanel
                  errors={validationErrors}
                  onClose={() => setShowValidation(false)}
                  onSelectBlock={(blockId) => {
                    const node = nodes.find((n) => n.id === blockId);
                    if (node) {
                      setSelectedNode(node);
                      setShowProperties(true);
                    }
                  }}
                />
              </Panel>
            )}
          </ReactFlow>

          {/* Toggle Block Library Button */}
          {!showBlockLibrary && canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 left-4 z-10"
              onClick={() => setShowBlockLibrary(true)}
            >
              <Play className="mr-2 h-4 w-4" />
              Blocks
            </Button>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <Sheet open={showProperties} onOpenChange={setShowProperties}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              {selectedNode ? "Block Properties" : selectedEdge ? "Connection Properties" : "Properties"}
            </SheetTitle>
          </SheetHeader>
          <PropertiesPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onNodeUpdate={handleNodeUpdate}
            onEdgeUpdate={handleEdgeUpdate}
            onDelete={handleDeleteSelected}
            readOnly={!canEdit}
          />
        </SheetContent>
      </Sheet>

      {/* Save Version Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save New Version</DialogTitle>
            <DialogDescription>
              Create a new version of this process that you can restore later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="versionComment">Version Comment (optional)</Label>
            <Textarea
              id="versionComment"
              placeholder="Describe the changes in this version..."
              value={versionComment}
              onChange={(e) => setVersionComment(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saveDiagram.isPending}>
              {saveDiagram.isPending ? "Saving..." : "Save Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Editor Skeleton
function EditorSkeleton() {
  return (
    <div className="flex h-screen">
      <Skeleton className="w-64 h-full" />
      <div className="flex-1 flex flex-col">
        <Skeleton className="h-14" />
        <Skeleton className="flex-1" />
      </div>
    </div>
  );
}

// Wrap with ReactFlowProvider
export default function BuilderEditor() {
  return (
    <ReactFlowProvider>
      <BuilderEditorContent />
    </ReactFlowProvider>
  );
}
