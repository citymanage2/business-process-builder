import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRoute, useLocation } from "wouter";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  NodeChange,
  EdgeChange,
  SelectionMode,
} from "reactflow";
import "reactflow/dist/style.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

import {
  Save,
  Download,
  Upload,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  MousePointer2,
  Hand,
  MessageSquare,
  FolderOpen,
  Settings,
  Play,
  Square,
  CheckSquare,
  GitBranch,
  GitFork,
  GitMerge,
  Zap,
  Bell,
  Globe,
  Clock,
  Database,
  FileText,
  User,
  Building,
  Server,
  AlertTriangle,
  ArrowUp,
  LogIn,
  LogOut,
  List,
  FileInput,
  FileOutput,
  Radio,
  XCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Loader2,
  ArrowLeft,
  FileJson,
  FileImage,
  Plus,
  Layers,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";

import {
  BLOCK_LIBRARY,
  BLOCK_CATEGORIES,
  BlockDefinition,
  ProcessBlock,
  ProcessConnection,
  ProcessDiagram,
  BlockCategory,
  BlockType,
  ValidationResult,
} from "@shared/processBuilder";

// Custom Node Component
function ProcessNode({ data, selected }: { data: any; selected: boolean }) {
  const blockDef = BLOCK_LIBRARY.find((b) => b.type === data.blockType);
  const IconComponent = getIconComponent(blockDef?.icon || "CheckSquare");

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-md transition-all ${
        selected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        backgroundColor: data.color || blockDef?.color || "#ffffff",
        borderColor: selected ? "#3b82f6" : darkenColor(data.color || blockDef?.color || "#ffffff", 20),
        minWidth: blockDef?.defaultWidth || 150,
        minHeight: blockDef?.defaultHeight || 60,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <IconComponent className="w-4 h-4 text-white drop-shadow" />
        <span className="font-semibold text-sm text-white drop-shadow truncate">
          {data.label}
        </span>
      </div>
      {data.description && (
        <p className="text-xs text-white/80 truncate max-w-[200px]">
          {data.description}
        </p>
      )}
      {data.responsible && (
        <Badge variant="secondary" className="mt-2 text-xs">
          {data.responsible}
        </Badge>
      )}
    </div>
  );
}

// Gateway Node (Diamond shape)
function GatewayNode({ data, selected }: { data: any; selected: boolean }) {
  const blockDef = BLOCK_LIBRARY.find((b) => b.type === data.blockType);
  const IconComponent = getIconComponent(blockDef?.icon || "GitFork");

  return (
    <div
      className={`flex items-center justify-center transition-all ${
        selected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        width: 80,
        height: 80,
        backgroundColor: data.color || blockDef?.color || "#eab308",
        borderColor: selected ? "#3b82f6" : darkenColor(data.color || blockDef?.color || "#eab308", 20),
        borderWidth: 2,
        borderStyle: "solid",
        transform: "rotate(45deg)",
        borderRadius: 8,
      }}
    >
      <div style={{ transform: "rotate(-45deg)" }}>
        <IconComponent className="w-6 h-6 text-white drop-shadow" />
      </div>
    </div>
  );
}

// Event Node (Circle)
function EventNode({ data, selected }: { data: any; selected: boolean }) {
  const blockDef = BLOCK_LIBRARY.find((b) => b.type === data.blockType);
  const IconComponent = getIconComponent(blockDef?.icon || "Clock");

  return (
    <div
      className={`flex items-center justify-center rounded-full transition-all ${
        selected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        width: 80,
        height: 80,
        backgroundColor: data.color || blockDef?.color || "#f472b6",
        borderColor: selected ? "#3b82f6" : darkenColor(data.color || blockDef?.color || "#f472b6", 20),
        borderWidth: 3,
        borderStyle: "solid",
      }}
    >
      <div className="text-center">
        <IconComponent className="w-6 h-6 text-white drop-shadow mx-auto" />
        <span className="text-xs text-white font-medium mt-1 block">{data.label}</span>
      </div>
    </div>
  );
}

// Start/End Node (Rounded pill)
function StartEndNode({ data, selected }: { data: any; selected: boolean }) {
  const blockDef = BLOCK_LIBRARY.find((b) => b.type === data.blockType);
  const IconComponent = getIconComponent(blockDef?.icon || "Play");
  const isStart = data.blockType === "start" || data.blockType === "entry_point";

  return (
    <div
      className={`flex items-center justify-center rounded-full px-6 py-3 transition-all ${
        selected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        backgroundColor: data.color || blockDef?.color || (isStart ? "#22c55e" : "#ef4444"),
        borderColor: selected
          ? "#3b82f6"
          : darkenColor(data.color || blockDef?.color || (isStart ? "#22c55e" : "#ef4444"), 20),
        borderWidth: 2,
        borderStyle: "solid",
        minWidth: 120,
      }}
    >
      <IconComponent className="w-5 h-5 text-white drop-shadow mr-2" />
      <span className="font-semibold text-white drop-shadow">{data.label}</span>
    </div>
  );
}

// Node types mapping
const nodeTypes: NodeTypes = {
  process: ProcessNode,
  gateway: GatewayNode,
  event: EventNode,
  startEnd: StartEndNode,
};

// Get icon component from name
function getIconComponent(iconName: string) {
  const icons: Record<string, any> = {
    Play,
    Square,
    LogIn,
    LogOut,
    CheckSquare,
    GitBranch,
    Hand: () => <span>✋</span>,
    Zap,
    Bell,
    Globe,
    GitFork,
    List,
    GitMerge,
    XCircle,
    FileInput,
    FileOutput,
    Database,
    FileText,
    Clock,
    Radio,
    AlertTriangle,
    ArrowUp,
    User,
    Building,
    Server,
  };
  return icons[iconName] || CheckSquare;
}

// Darken color utility
function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = ((num >> 8) & 0x00ff) - amt;
  const B = (num & 0x0000ff) - amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 0 ? 0 : R > 255 ? 255 : R) * 0x10000 +
      (G < 0 ? 0 : G > 255 ? 255 : G) * 0x100 +
      (B < 0 ? 0 : B > 255 ? 255 : B)
    )
      .toString(16)
      .slice(1)
  );
}

// Get node type based on block type
function getNodeType(blockType: BlockType): string {
  if (["start", "end", "entry_point", "exit_point"].includes(blockType)) {
    return "startEnd";
  }
  if (["condition", "multiple_choice", "parallel_gateway", "exclusive_gateway"].includes(blockType)) {
    return "gateway";
  }
  if (["timer_event", "signal_event", "error_event", "escalation_event"].includes(blockType)) {
    return "event";
  }
  return "process";
}

// Main ProcessBuilder Component (wrapped)
function ProcessBuilderContent() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/builder/:id?");
  const processId = params?.id ? parseInt(params.id) : undefined;

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project, fitView, zoomIn, zoomOut, getNodes, getEdges } = useReactFlow();

  // UI state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processTitle, setProcessTitle] = useState("Новый процесс");
  const [processDescription, setProcessDescription] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(BLOCK_CATEGORIES))
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load existing process if editing
  const { data: existingProcess, isLoading } = trpc.processes.get.useQuery(
    { id: processId! },
    { enabled: !!processId }
  );

  // Load process data into editor
  useEffect(() => {
    if (existingProcess && processId) {
      setProcessTitle(existingProcess.title || "Без названия");
      setProcessDescription(existingProcess.description || "");
      
      // Convert process data to ReactFlow nodes and edges
      if (existingProcess.diagramData) {
        try {
          const diagramData = typeof existingProcess.diagramData === 'string' 
            ? JSON.parse(existingProcess.diagramData) 
            : existingProcess.diagramData;
          
          if (diagramData.blocks) {
            const loadedNodes = diagramData.blocks.map((block: ProcessBlock) => ({
              id: block.id,
              type: getNodeType(block.type),
              position: block.position,
              data: {
                label: block.name,
                description: block.description,
                blockType: block.type,
                color: block.color,
                responsible: block.responsible,
                duration: block.duration,
                ...block,
              },
            }));
            setNodes(loadedNodes);
          }
          
          if (diagramData.connections) {
            const loadedEdges = diagramData.connections.map((conn: ProcessConnection) => ({
              id: conn.id,
              source: conn.sourceBlockId,
              target: conn.targetBlockId,
              type: conn.type === "conditional" ? "smoothstep" : "default",
              label: conn.label,
              animated: conn.type === "data_flow",
              style: conn.style || {},
              markerEnd: { type: MarkerType.ArrowClosed },
            }));
            setEdges(loadedEdges);
          }
        } catch (e) {
          console.error("Failed to parse diagram data:", e);
        }
      }
    }
  }, [existingProcess, processId, setNodes, setEdges]);

  // Save to history
  const saveToHistory = useCallback(() => {
    const currentState = { nodes: getNodes(), edges: getEdges() };
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [getNodes, getEdges, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Handle connection
  const onConnect = useCallback(
    (params: Connection) => {
      saveToHistory();
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}`,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: false,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, saveToHistory]
  );

  // Handle node selection
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Handle drop from block library
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const blockTypeData = event.dataTransfer.getData("application/processblock");
      if (!blockTypeData) return;

      const blockType = blockTypeData as BlockType;
      const blockDef = BLOCK_LIBRARY.find((b) => b.type === blockType);
      if (!blockDef) return;

      if (!reactFlowWrapper.current) return;
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      saveToHistory();

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: getNodeType(blockType),
        position,
        data: {
          label: blockDef.name,
          description: blockDef.description,
          blockType: blockType,
          color: blockDef.color,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes, saveToHistory]
  );

  // Delete selected node or edge
  const handleDelete = useCallback(() => {
    saveToHistory();
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
      );
      setSelectedNode(null);
    }
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }, [selectedNode, selectedEdge, setNodes, setEdges, saveToHistory]);

  // Copy selected node
  const handleCopy = useCallback(() => {
    if (selectedNode) {
      saveToHistory();
      const newNode: Node = {
        ...selectedNode,
        id: `node-${Date.now()}`,
        position: {
          x: selectedNode.position.x + 50,
          y: selectedNode.position.y + 50,
        },
        selected: false,
      };
      setNodes((nds) => nds.concat(newNode));
      toast.success("Блок скопирован");
    }
  }, [selectedNode, setNodes, saveToHistory]);

  // Update selected node data
  const updateNodeData = useCallback(
    (key: string, value: any) => {
      if (!selectedNode) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: { ...n.data, [key]: value } }
            : n
        )
      );
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, [key]: value } } : null
      );
    },
    [selectedNode, setNodes]
  );

  // Validate process
  const validateProcess = useCallback((): ValidationResult => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const errors: ValidationResult["errors"] = [];
    const warnings: ValidationResult["warnings"] = [];

    // Check for start node
    const startNodes = currentNodes.filter(
      (n) => n.data.blockType === "start" || n.data.blockType === "entry_point"
    );
    if (startNodes.length === 0) {
      errors.push({
        type: "missing_start",
        message: "Процесс должен иметь хотя бы один блок 'Начало'",
      });
    }

    // Check for end node
    const endNodes = currentNodes.filter(
      (n) => n.data.blockType === "end" || n.data.blockType === "exit_point"
    );
    if (endNodes.length === 0) {
      errors.push({
        type: "missing_end",
        message: "Процесс должен иметь хотя бы один блок 'Завершение'",
      });
    }

    // Check for isolated nodes
    currentNodes.forEach((node) => {
      const hasIncoming = currentEdges.some((e) => e.target === node.id);
      const hasOutgoing = currentEdges.some((e) => e.source === node.id);
      const blockDef = BLOCK_LIBRARY.find((b) => b.type === node.data.blockType);

      if (blockDef?.hasInputPort && !hasIncoming && node.data.blockType !== "start" && node.data.blockType !== "entry_point") {
        warnings.push({
          type: "unused_block",
          blockId: node.id,
          message: `Блок "${node.data.label}" не имеет входящих связей`,
        });
      }

      if (blockDef?.hasOutputPort && !hasOutgoing && node.data.blockType !== "end" && node.data.blockType !== "exit_point") {
        warnings.push({
          type: "unused_block",
          blockId: node.id,
          message: `Блок "${node.data.label}" не имеет исходящих связей`,
        });
      }
    });

    // Check for duplicate names
    const names = currentNodes.map((n) => n.data.label);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      warnings.push({
        type: "duplicate_name",
        message: `Обнаружены дублирующиеся названия блоков: ${Array.from(new Set(duplicates)).join(", ")}`,
      });
    }

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
    setValidationResult(result);
    return result;
  }, [getNodes, getEdges]);

  // Save process
  const createProcessMutation = trpc.processes.update.useMutation();

  const handleSave = useCallback(async () => {
    const validation = validateProcess();
    if (!validation.isValid) {
      toast.error("Исправьте ошибки перед сохранением");
      return;
    }

    setIsSaving(true);
    try {
      const currentNodes = getNodes();
      const currentEdges = getEdges();

      const diagramData: ProcessDiagram = {
        version: 1,
        title: processTitle,
        description: processDescription,
        visibility: "private",
        blocks: currentNodes.map((node) => ({
          id: node.id,
          type: node.data.blockType,
          name: node.data.label,
          description: node.data.description,
          position: node.position,
          color: node.data.color,
          responsible: node.data.responsible,
          duration: node.data.duration,
          ...node.data,
        })),
        connections: currentEdges.map((edge) => ({
          id: edge.id,
          sourceBlockId: edge.source,
          targetBlockId: edge.target,
          type: edge.animated ? "data_flow" : "sequence",
          label: typeof edge.label === "string" ? edge.label : undefined,
        })),
        viewport: { x: 0, y: 0, zoom: 1 },
        gridEnabled: showGrid,
        snapToGrid,
      };

      if (processId) {
        await createProcessMutation.mutateAsync({
          id: processId,
          title: processTitle,
          description: processDescription,
        });
      }

      toast.success("Процесс сохранен");
      setSaveDialogOpen(false);
    } catch (error) {
      toast.error("Ошибка при сохранении процесса");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [
    validateProcess,
    getNodes,
    getEdges,
    processTitle,
    processDescription,
    showGrid,
    snapToGrid,
    processId,
    createProcessMutation,
  ]);

  // Export to JSON
  const handleExportJSON = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();

    const diagramData: ProcessDiagram = {
      version: 1,
      title: processTitle,
      description: processDescription,
      visibility: "private",
      blocks: currentNodes.map((node) => ({
        id: node.id,
        type: node.data.blockType,
        name: node.data.label,
        description: node.data.description,
        position: node.position,
        color: node.data.color,
        responsible: node.data.responsible,
        duration: node.data.duration,
      })),
      connections: currentEdges.map((edge) => ({
        id: edge.id,
        sourceBlockId: edge.source,
        targetBlockId: edge.target,
        type: edge.animated ? "data_flow" : "sequence",
        label: typeof edge.label === "string" ? edge.label : undefined,
      })),
    };

    const blob = new Blob([JSON.stringify(diagramData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${processTitle.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Файл экспортирован");
  }, [getNodes, getEdges, processTitle, processDescription]);

  // Import from JSON
  const handleImportJSON = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as ProcessDiagram;
          saveToHistory();

          setProcessTitle(data.title || "Imported Process");
          setProcessDescription(data.description || "");

          const importedNodes = data.blocks.map((block) => ({
            id: block.id,
            type: getNodeType(block.type),
            position: block.position,
            data: {
              label: block.name,
              description: block.description,
              blockType: block.type,
              color: block.color,
              responsible: block.responsible,
              duration: block.duration,
            },
          }));
          setNodes(importedNodes);

          const importedEdges = data.connections.map((conn) => ({
            id: conn.id,
            source: conn.sourceBlockId,
            target: conn.targetBlockId,
            type: "smoothstep",
            label: conn.label,
            animated: conn.type === "data_flow",
            markerEnd: { type: MarkerType.ArrowClosed },
          }));
          setEdges(importedEdges);

          toast.success("Процесс импортирован");
        } catch (err) {
          toast.error("Ошибка при импорте файла");
          console.error(err);
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [setNodes, setEdges, saveToHistory]
  );

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    const grouped: Record<string, BlockDefinition[]> = {};
    BLOCK_LIBRARY.forEach((block) => {
      if (!grouped[block.category]) {
        grouped[block.category] = [];
      }
      grouped[block.category].push(block);
    });
    return grouped;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNode || selectedEdge) {
          handleDelete();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (selectedNode) {
          e.preventDefault();
          handleCopy();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleSave, handleDelete, handleCopy, selectedNode, selectedEdge]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/processes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={processTitle}
            onChange={(e) => setProcessTitle(e.target.value)}
            className="w-64 font-semibold"
            placeholder="Название процесса"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Отменить (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Повторить (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom controls */}
          <Button variant="ghost" size="icon" onClick={() => zoomOut()} title="Уменьшить">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => zoomIn()} title="Увеличить">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => fitView()} title="Показать все">
            <Maximize2 className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Grid toggle */}
          <Button
            variant={showGrid ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowGrid(!showGrid)}
            title="Сетка"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Validate */}
          <Button variant="outline" size="sm" onClick={() => validateProcess()}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Проверить
          </Button>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Экспорт
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportJSON}>
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Экспорт в PDF в разработке")}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Экспорт в PNG в разработке")}>
                <FileImage className="w-4 h-4 mr-2" />
                PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import */}
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Импорт
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportJSON}
            />
          </label>

          {/* Save */}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Сохранить
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block Library Sidebar */}
        <aside className="w-72 border-r bg-card overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Библиотека блоков</h2>
            <p className="text-sm text-muted-foreground">
              Перетащите блоки на холст
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {Object.entries(BLOCK_CATEGORIES).map(([categoryKey, categoryInfo]) => (
                <div key={categoryKey} className="mb-2">
                  <button
                    className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-md transition-colors"
                    onClick={() => toggleCategory(categoryKey)}
                  >
                    {expandedCategories.has(categoryKey) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoryInfo.color }}
                    />
                    <span className="text-sm font-medium">{categoryInfo.name}</span>
                  </button>

                  {expandedCategories.has(categoryKey) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {blocksByCategory[categoryKey]?.map((block) => {
                        const IconComponent = getIconComponent(block.icon);
                        return (
                          <div
                            key={block.type}
                            className="flex items-center gap-2 p-2 rounded-md cursor-grab hover:bg-accent transition-colors border border-transparent hover:border-border"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("application/processblock", block.type);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center"
                              style={{ backgroundColor: block.color }}
                            >
                              <IconComponent className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {block.name}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            snapToGrid={snapToGrid}
            snapGrid={[15, 15]}
            fitView
            selectionMode={SelectionMode.Partial}
            defaultEdgeOptions={{
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
          >
            <Controls />
            {showGrid && <Background gap={15} size={1} />}
            <MiniMap
              nodeStrokeWidth={3}
              nodeColor={(node) => node.data.color || "#e2e8f0"}
              maskColor="rgba(0, 0, 0, 0.1)"
            />

            {/* Validation Panel */}
            {validationResult && (
              <Panel position="top-center" className="mt-4">
                <Card className="w-96">
                  <CardHeader className="p-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {validationResult.isValid ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Процесс валиден
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            Найдены ошибки
                          </>
                        )}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setValidationResult(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {validationResult.errors.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {validationResult.errors.map((error, i) => (
                          <div
                            key={i}
                            className="text-xs text-red-600 flex items-start gap-1"
                          >
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {error.message}
                          </div>
                        ))}
                      </div>
                    )}
                    {validationResult.warnings.length > 0 && (
                      <div className="space-y-1">
                        {validationResult.warnings.map((warning, i) => (
                          <div
                            key={i}
                            className="text-xs text-yellow-600 flex items-start gap-1"
                          >
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {warning.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        <aside className="w-80 border-l bg-card overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Свойства</h2>
          </div>
          <ScrollArea className="flex-1">
            {selectedNode ? (
              <div className="p-4 space-y-4">
                <div>
                  <Label htmlFor="node-name">Название</Label>
                  <Input
                    id="node-name"
                    value={selectedNode.data.label || ""}
                    onChange={(e) => updateNodeData("label", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="node-description">Описание</Label>
                  <Textarea
                    id="node-description"
                    value={selectedNode.data.description || ""}
                    onChange={(e) => updateNodeData("description", e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="node-responsible">Ответственный</Label>
                  <Input
                    id="node-responsible"
                    value={selectedNode.data.responsible || ""}
                    onChange={(e) => updateNodeData("responsible", e.target.value)}
                    className="mt-1"
                    placeholder="Роль или имя"
                  />
                </div>

                <div>
                  <Label htmlFor="node-duration">Длительность (мин)</Label>
                  <Input
                    id="node-duration"
                    type="number"
                    value={selectedNode.data.duration || ""}
                    onChange={(e) =>
                      updateNodeData("duration", parseInt(e.target.value) || 0)
                    }
                    className="mt-1"
                    min={0}
                  />
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Копировать
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить
                  </Button>
                </div>
              </div>
            ) : selectedEdge ? (
              <div className="p-4 space-y-4">
                <div>
                  <Label htmlFor="edge-label">Подпись связи</Label>
                  <Input
                    id="edge-label"
                    value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
                    onChange={(e) => {
                      setEdges((eds) =>
                        eds.map((edge) =>
                          edge.id === selectedEdge.id
                            ? { ...edge, label: e.target.value }
                            : edge
                        )
                      );
                    }}
                    className="mt-1"
                    placeholder="Условие или описание"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="edge-animated">Анимация (поток данных)</Label>
                  <Switch
                    id="edge-animated"
                    checked={selectedEdge.animated || false}
                    onCheckedChange={(checked) => {
                      setEdges((eds) =>
                        eds.map((edge) =>
                          edge.id === selectedEdge.id
                            ? { ...edge, animated: checked }
                            : edge
                        )
                      );
                    }}
                  />
                </div>

                <Separator />

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить связь
                </Button>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Выберите блок или связь для редактирования свойств
                </p>
              </div>
            )}
          </ScrollArea>

          {/* Process Info */}
          <div className="border-t p-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="process-description">Описание процесса</Label>
                <Textarea
                  id="process-description"
                  value={processDescription}
                  onChange={(e) => setProcessDescription(e.target.value)}
                  className="mt-1"
                  rows={2}
                  placeholder="Опишите назначение процесса..."
                />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Блоков: {nodes.length}</span>
                <span>Связей: {edges.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Wrapper with ReactFlowProvider
export default function ProcessBuilder() {
  return (
    <ReactFlowProvider>
      <ProcessBuilderContent />
    </ReactFlowProvider>
  );
}
