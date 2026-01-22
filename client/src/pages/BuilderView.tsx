import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  MarkerType,
  BackgroundVariant
} from "reactflow";
import "reactflow/dist/style.css";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Copy,
  Eye,
  AlertTriangle,
  Share2,
  History,
  FileEdit
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CustomNode } from "@/components/builder/CustomNode";
import { CustomEdge } from "@/components/builder/CustomEdge";
import { ExportDialog } from "@/components/builder/ExportDialog";
import { VersionHistory } from "@/components/builder/VersionHistory";
import { BlockData, ConnectionData, BLOCK_METADATA, BlockType } from "@shared/builderTypes";

// Define node types
const nodeTypes: NodeTypes = {
  customBlock: CustomNode
};

// Define edge types
const edgeTypes: EdgeTypes = {
  customEdge: CustomEdge
};

function BuilderViewContent() {
  const { id } = useParams<{ id: string }>();
  const processId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // State
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [showExport, setShowExport] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Queries
  const { data: process, isLoading, error, refetch } = trpc.builder.processes.get.useQuery(
    { id: processId },
    { enabled: processId > 0 }
  );

  const duplicateProcess = trpc.builder.processes.duplicate.useMutation({
    onSuccess: (result) => {
      toast.success("Process duplicated");
      setLocation(`/builder/edit/${result.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Convert process data to ReactFlow nodes/edges
  useEffect(() => {
    if (process) {
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
    }
  }, [process, setNodes, setEdges]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!process) return null;
    
    const blocks = process.blocksData || [];
    const connections = process.connectionsData || [];
    
    const blockCounts: Record<string, number> = {};
    blocks.forEach((block: BlockData) => {
      const category = BLOCK_METADATA[block.type]?.category || "OTHER";
      blockCounts[category] = (blockCounts[category] || 0) + 1;
    });

    return {
      totalBlocks: blocks.length,
      totalConnections: connections.length,
      blockCounts
    };
  }, [process]);

  if (isLoading) {
    return <ViewSkeleton />;
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="h-16 border-b bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/builder")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="font-semibold">{process.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={process.status === "published" ? "default" : "secondary"}>
                {process.status}
              </Badge>
              <Badge variant="outline">{process.accessRole}</Badge>
              <span className="text-xs text-muted-foreground">
                v{process.currentVersion}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShowVersionHistory(true)}>
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Version History</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShowExport(true)}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export</TooltipContent>
          </Tooltip>

          {user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateProcess.mutate({ id: processId })}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Make a Copy</TooltipContent>
            </Tooltip>
          )}

          <div className="h-6 w-px bg-border" />

          {canEdit && (
            <Button onClick={() => setLocation(`/builder/edit/${processId}`)}>
              <FileEdit className="mr-2 h-4 w-4" />
              Edit Process
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            panOnScroll
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnDoubleClick={false}
          >
            <Background variant={BackgroundVariant.Dots} gap={15} size={1} color="#ddd" />
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
          </ReactFlow>
        </div>

        {/* Info Sidebar */}
        <div className="w-80 border-l bg-muted/30 p-4 overflow-auto">
          <h2 className="font-semibold mb-4">Process Information</h2>
          
          {/* Description */}
          {process.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
              <p className="text-sm">{process.description}</p>
            </div>
          )}

          {/* Tags */}
          {process.tags && process.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {process.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Blocks</span>
                <span className="font-medium">{stats?.totalBlocks || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Connections</span>
                <span className="font-medium">{stats?.totalConnections || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Version</span>
                <span className="font-medium">{process.currentVersion}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Views</span>
                <span className="font-medium">{process.viewCount}</span>
              </div>
            </div>
          </div>

          {/* Block Breakdown */}
          {stats && Object.keys(stats.blockCounts).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Blocks by Category</h3>
              <div className="space-y-2">
                {Object.entries(stats.blockCounts).map(([category, count]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span>{category.replace("_", " ")}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        processId={processId}
        processName={process.name}
        open={showExport}
        onOpenChange={setShowExport}
      />

      {/* Version History */}
      <VersionHistory
        processId={processId}
        currentVersion={process.currentVersion}
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
        onVersionRestored={() => refetch()}
      />
    </div>
  );
}

// Skeleton
function ViewSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      <Skeleton className="h-16" />
      <div className="flex flex-1">
        <Skeleton className="flex-1" />
        <Skeleton className="w-80" />
      </div>
    </div>
  );
}

// Wrap with ReactFlowProvider
export default function BuilderView() {
  return (
    <ReactFlowProvider>
      <BuilderViewContent />
    </ReactFlowProvider>
  );
}
