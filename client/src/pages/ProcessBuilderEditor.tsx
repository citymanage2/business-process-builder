import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowInstance,
  Connection,
  Edge,
  Node,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { nanoid } from "nanoid";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Plus } from "lucide-react";
import { toast } from "sonner";

type BlockDefinition = {
  type: string;
  label: string;
  category: string;
};

const BLOCK_LIBRARY: BlockDefinition[] = [
  { category: "Start & End", type: "Start", label: "Start" },
  { category: "Start & End", type: "End", label: "End" },
  { category: "Start & End", type: "Entry Point", label: "Entry Point" },
  { category: "Start & End", type: "Exit Point", label: "Exit Point" },
  { category: "Actions", type: "Task", label: "Task" },
  { category: "Actions", type: "Subprocess", label: "Subprocess" },
  { category: "Actions", type: "Manual Action", label: "Manual Action" },
  { category: "Actions", type: "Automated Action", label: "Automated Action" },
  { category: "Actions", type: "Send Notification", label: "Send Notification" },
  { category: "Actions", type: "API Call", label: "API Call" },
  { category: "Decisions", type: "Condition", label: "Condition" },
  { category: "Decisions", type: "Multiple Choice", label: "Multiple Choice" },
  { category: "Decisions", type: "Parallel Gateway", label: "Parallel Gateway" },
  { category: "Decisions", type: "Exclusive Gateway", label: "Exclusive Gateway" },
  { category: "Data", type: "Data Input", label: "Data Input" },
  { category: "Data", type: "Data Output", label: "Data Output" },
  { category: "Data", type: "Data Store", label: "Data Store" },
  { category: "Data", type: "Document", label: "Document" },
  { category: "Events", type: "Timer Event", label: "Timer Event" },
  { category: "Events", type: "Signal Event", label: "Signal Event" },
  { category: "Events", type: "Error Event", label: "Error Event" },
  { category: "Events", type: "Escalation Event", label: "Escalation Event" },
  { category: "Participants", type: "Role", label: "Role" },
  { category: "Participants", type: "Department", label: "Department" },
  { category: "Participants", type: "External System", label: "External System" },
];

type NodeData = {
  label: string;
  blockType: string;
  description?: string;
  color?: string;
};

const defaultViewport = { x: 0, y: 0, zoom: 1 };

const buildNode = (block: BlockDefinition, offset = 0): Node<NodeData> => ({
  id: nanoid(),
  position: { x: 120 + offset, y: 120 + offset },
  data: {
    label: block.label,
    blockType: block.type,
    description: "",
    color: "",
  },
  type: "default",
});

const validateProcess = (nodes: Node<NodeData>[], edges: Edge[]) => {
  const errors: string[] = [];
  const hasStart = nodes.some(node => node.data.blockType === "Start");
  const hasEnd = nodes.some(node => node.data.blockType === "End");
  if (!hasStart) errors.push("Add a Start block.");
  if (!hasEnd) errors.push("Add an End block.");

  nodes.forEach(node => {
    const hasIncoming = edges.some(edge => edge.target === node.id);
    const hasOutgoing = edges.some(edge => edge.source === node.id);
    if (!hasIncoming && !hasOutgoing) {
      errors.push(`Block "${node.data.label}" is isolated.`);
    }
  });

  return errors;
};

export default function ProcessBuilderEditor() {
  const [isNew] = useRoute("/builder/new");
  const [, params] = useRoute<{ id: string }>("/builder/:id");
  const [, setLocation] = useLocation();
  const processId = !isNew && params?.id ? Number(params.id) : undefined;

  const [title, setTitle] = useState("Untitled process");
  const [description, setDescription] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const processQuery = trpc.processBuilder.processes.get.useQuery(
    { id: processId as number },
    { enabled: !!processId },
  );

  const createMutation = trpc.processBuilder.processes.create.useMutation();
  const updateMutation = trpc.processBuilder.processes.update.useMutation();
  const blocksMutation = trpc.processBuilder.blocks.bulkUpdate.useMutation();
  const connectionsMutation = trpc.processBuilder.connections.bulkUpdate.useMutation();

  useEffect(() => {
    if (!processQuery.data) return;
    setTitle(processQuery.data.title);
    setDescription(processQuery.data.description ?? "");
    const content = processQuery.data.content as { nodes?: Node<NodeData>[]; edges?: Edge[]; viewport?: any } | null;
    if (content?.nodes) setNodes(content.nodes);
    if (content?.edges) setEdges(content.edges);
    setIsDirty(false);
  }, [processQuery.data, setNodes, setEdges]);

  const categories = useMemo(() => {
    return BLOCK_LIBRARY.reduce<Record<string, BlockDefinition[]>>((acc, block) => {
      acc[block.category] = acc[block.category] || [];
      acc[block.category].push(block);
      return acc;
    }, {});
  }, []);

  const selectedNode = nodes.find(node => node.id === selectedNodeId);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge({ ...connection, type: "default" }, eds));
      setIsDirty(true);
    },
    [setEdges],
  );

  const handleAddBlock = (block: BlockDefinition) => {
    setNodes(currentNodes => [...currentNodes, buildNode(block, currentNodes.length * 20)]);
    setIsDirty(true);
  };

  const handleNodeUpdate = (updates: Partial<NodeData>) => {
    if (!selectedNodeId) return;
    setNodes(currentNodes =>
      currentNodes.map(node =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node,
      ),
    );
    setIsDirty(true);
  };

  const handleSave = useCallback(
    async (options?: { silent?: boolean }) => {
      const errors = validateProcess(nodes, edges);
      if (errors.length > 0) {
        if (!options?.silent) {
          toast.error("Fix validation errors before saving.");
        }
        return;
      }

      try {
        const content = {
          nodes,
          edges,
          viewport: flowInstance?.getViewport() ?? defaultViewport,
        };

      if (!processId) {
        const result = await createMutation.mutateAsync({
          title,
          description,
          content,
        });
        await blocksMutation.mutateAsync({
          processId: result.id,
          blocks: nodes.map(node => ({
            blockId: node.id,
            type: node.data.blockType,
            title: node.data.label,
            description: node.data.description,
            properties: { color: node.data.color },
            positionX: node.position.x,
            positionY: node.position.y,
          })),
        });
        await connectionsMutation.mutateAsync({
          processId: result.id,
          connections: edges.map(edge => ({
            sourceBlockId: edge.source,
            targetBlockId: edge.target,
            type: "sequence",
            label: typeof edge.label === "string" ? edge.label : undefined,
          })),
        });
        setIsDirty(false);
        setLocation(`/builder/${result.id}`);
        toast.success("Process created.");
        return;
      }

      await updateMutation.mutateAsync({
        id: processId,
        title,
        description,
        content,
      });

      await blocksMutation.mutateAsync({
        processId,
        blocks: nodes.map(node => ({
          blockId: node.id,
          type: node.data.blockType,
          title: node.data.label,
          description: node.data.description,
          properties: { color: node.data.color },
          positionX: node.position.x,
          positionY: node.position.y,
        })),
      });

      await connectionsMutation.mutateAsync({
        processId,
        connections: edges.map(edge => ({
          sourceBlockId: edge.source,
          targetBlockId: edge.target,
          type: "sequence",
          label: typeof edge.label === "string" ? edge.label : undefined,
        })),
      });

        setIsDirty(false);
        toast.success("Process saved.");
      } catch (error: any) {
        if (!options?.silent) {
          toast.error(error?.message ?? "Failed to save process.");
        }
      }
    },
    [
      nodes,
      edges,
      flowInstance,
      processId,
      title,
      description,
      createMutation,
      updateMutation,
      blocksMutation,
      connectionsMutation,
      setLocation,
    ],
  );

  useEffect(() => {
    if (!isDirty) return;
    const timer = window.setInterval(() => {
      void handleSave({ silent: true });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [isDirty, handleSave]);

  if (processQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const validationErrors = validateProcess(nodes, edges);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setIsDirty(true);
              }}
              className="text-xl font-semibold max-w-xl"
            />
            <Textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setIsDirty(true);
              }}
              placeholder="Process description"
              rows={2}
              className="max-w-2xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isDirty ? "secondary" : "outline"}>
              {isDirty ? "Unsaved changes" : "Saved"}
            </Badge>
            <Button onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending}>
              {(updateMutation.isPending || createMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 grid lg:grid-cols-[260px_1fr_320px] gap-6">
        <Card className="h-[640px] overflow-y-auto">
          <CardHeader>
            <CardTitle>Block library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(categories).map(([category, blocks]) => (
              <div key={category} className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">{category}</div>
                <div className="grid gap-2">
                  {blocks.map(block => (
                    <Button
                      key={block.type}
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={() => handleAddBlock(block)}
                    >
                      <Plus className="h-3 w-3" />
                      {block.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-[640px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              setIsDirty(true);
            }}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              setIsDirty(true);
            }}
            onConnect={onConnect}
            onInit={setFlowInstance}
            onSelectionChange={(selection) => {
              setSelectedNodeId(selection.nodes?.[0]?.id ?? null);
            }}
            fitView
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </Card>

        <Card className="h-[640px] overflow-y-auto">
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedNode ? (
              <>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={selectedNode.data.label}
                    onChange={(event) => handleNodeUpdate({ label: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input value={selectedNode.data.blockType} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={selectedNode.data.description ?? ""}
                    onChange={(event) => handleNodeUpdate({ description: event.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <input
                    type="color"
                    value={selectedNode.data.color || "#ffffff"}
                    onChange={(event) => handleNodeUpdate({ color: event.target.value })}
                    className="h-10 w-full rounded-md border"
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Select a block to edit properties.</div>
            )}
            {validationErrors.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <div className="font-semibold text-destructive mb-2">Validation issues</div>
                <ul className="list-disc pl-4 space-y-1">
                  {validationErrors.map(error => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
