import { useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

interface ProcessStep {
  id: string;
  stageId: string;
  roleId: string;
  name: string;
  order: number;
  input?: string;
  actions?: string[];
  output?: string;
  tools?: string[];
  sla?: string;
}

interface ProcessRole {
  id: string;
  name: string;
  color: string;
}

interface ProcessStage {
  id: string;
  name: string;
  order: number;
}

interface ProcessBranch {
  stepId: string;
  condition: string;
  trueNext: string;
  falseNext: string;
}

interface ProcessDiagramProps {
  steps: ProcessStep[];
  roles: ProcessRole[];
  stages: ProcessStage[];
  branches?: ProcessBranch[];
}

const ROLE_COLORS: Record<string, string> = {
  default: "#e0e7ff",
  role_1: "#dbeafe",
  role_2: "#fef3c7",
  role_3: "#fce7f3",
  role_4: "#d1fae5",
  role_5: "#e0e7ff",
};

export function ProcessDiagram({ steps, roles, stages, branches = [] }: ProcessDiagramProps) {
  const roleMap = useMemo(() => {
    const map: Record<string, ProcessRole> = {};
    roles.forEach((role) => {
      map[role.id] = role;
    });
    return map;
  }, [roles]);

  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    const roleColumns: Record<string, number> = {};
    
    roles.forEach((role, index) => {
      roleColumns[role.id] = index;
    });

    steps.forEach((step, index) => {
      const role = roleMap[step.roleId];
      const columnIndex = roleColumns[step.roleId] || 0;
      const rowIndex = index;

      nodes.push({
        id: step.id,
        type: "default",
        position: {
          x: columnIndex * 300 + 50,
          y: rowIndex * 150 + 100,
        },
        data: {
          label: (
            <div className="p-3 min-w-[200px]">
              <div className="font-semibold text-sm mb-1">{step.name}</div>
              {step.tools && step.tools.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  🛠️ {step.tools.join(", ")}
                </div>
              )}
              {step.sla && (
                <div className="text-xs text-muted-foreground mt-1">
                  ⏱️ {step.sla}
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: role?.color || ROLE_COLORS.default,
          border: "2px solid #4f46e5",
          borderRadius: "8px",
          padding: 0,
        },
      });
    });

    return nodes;
  }, [steps, roleMap, roles]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const edgeIds = new Set<string>();
    
    steps.forEach((step, index) => {
      if (index < steps.length - 1) {
        const nextStep = steps[index + 1];
        const edgeId = `e-${step.id}-${nextStep.id}`;
        
        // Skip if this edge already exists
        if (edgeIds.has(edgeId)) {
          return;
        }
        edgeIds.add(edgeId);
        
        edges.push({
          id: edgeId,
          source: step.id,
          target: nextStep.id,
          type: "smoothstep",
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#4f46e5",
          },
          style: {
            stroke: "#4f46e5",
            strokeWidth: 2,
          },
        });
      }
    });

    branches.forEach((branch, branchIndex) => {
      const trueEdgeId = `e-branch-${branchIndex}-true-${branch.stepId}-${branch.trueNext}`;
      const falseEdgeId = `e-branch-${branchIndex}-false-${branch.stepId}-${branch.falseNext}`;
      
      if (!edgeIds.has(trueEdgeId)) {
        edgeIds.add(trueEdgeId);
        edges.push({
          id: trueEdgeId,
          source: branch.stepId,
          target: branch.trueNext,
          type: "smoothstep",
          animated: true,
          label: "✓",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#10b981",
          },
          style: {
            stroke: "#10b981",
            strokeWidth: 2,
          },
        });
      }

      if (!edgeIds.has(falseEdgeId)) {
        edgeIds.add(falseEdgeId);
        edges.push({
          id: falseEdgeId,
          source: branch.stepId,
          target: branch.falseNext,
          type: "smoothstep",
          animated: true,
          label: "✗",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#ef4444",
          },
          style: {
            stroke: "#ef4444",
            strokeWidth: 2,
          },
        });
      }
    });

    return edges;
  }, [steps, branches]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-[600px] border rounded-lg bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            return node.style?.background as string || ROLE_COLORS.default;
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>

      <div className="mt-4 p-4 border-t">
        <h4 className="font-semibold mb-2">Роли:</h4>
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center gap-2 px-3 py-1 rounded-full border"
              style={{ backgroundColor: role.color }}
            >
              <div className="text-sm font-medium">{role.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
