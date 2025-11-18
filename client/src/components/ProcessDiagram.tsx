import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  Panel,
  ReactFlowProvider,
  NodeTypes,
  Connection,
  addEdge,
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
  type?: "action" | "decision" | "result" | "time";
  mop?: {
    materials?: string[];
    equipment?: string[];
    personnel?: string[];
  };
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
  fromStepId: string;
  toStepId: string;
  condition: string;
}

interface ProcessDiagramProps {
  steps: ProcessStep[];
  roles: ProcessRole[];
  stages: ProcessStage[];
  branches?: ProcessBranch[];
}

// Custom node components for different shapes
const ActionNode = ({ data }: any) => (
  <div
    className="px-4 py-3 rounded-lg border-2 shadow-md min-w-[180px] max-w-[220px]"
    style={{
      backgroundColor: data.color,
      borderColor: data.borderColor || "#666",
    }}
  >
    <div className="font-semibold text-sm mb-1 text-gray-900 break-words">
      {data.label}
    </div>
    {data.sla && (
      <div className="text-xs text-gray-700 mt-1">⏱ {data.sla}</div>
    )}
    {data.tools && data.tools.length > 0 && (
      <div className="text-xs text-gray-700 mt-1">
        🛠 {data.tools.join(", ")}
      </div>
    )}
  </div>
);

const DecisionNode = ({ data }: any) => (
  <div
    className="relative px-6 py-4 min-w-[160px] max-w-[200px]"
    style={{
      clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      backgroundColor: data.color,
      border: `2px solid ${data.borderColor || "#666"}`,
    }}
  >
    <div className="font-semibold text-sm text-center text-gray-900 break-words">
      {data.label}
    </div>
  </div>
);

const ResultNode = ({ data }: any) => (
  <div
    className="px-4 py-3 rounded-md border-2 shadow-md min-w-[180px] max-w-[220px]"
    style={{
      backgroundColor: data.color,
      borderColor: data.borderColor || "#666",
      borderRadius: "8px",
    }}
  >
    <div className="font-semibold text-sm mb-1 text-gray-900 break-words">
      📄 {data.label}
    </div>
    {data.output && (
      <div className="text-xs text-gray-700 mt-1">
        Результат: {data.output}
      </div>
    )}
  </div>
);

const TimeNode = ({ data }: any) => (
  <div
    className="px-6 py-3 rounded-full border-2 shadow-md min-w-[140px] max-w-[180px]"
    style={{
      backgroundColor: data.color,
      borderColor: data.borderColor || "#666",
    }}
  >
    <div className="font-semibold text-sm text-center text-gray-900 break-words">
      ⏰ {data.label}
    </div>
    {data.sla && (
      <div className="text-xs text-center text-gray-700 mt-1">{data.sla}</div>
    )}
  </div>
);

const nodeTypes: NodeTypes = {
  action: ActionNode,
  decision: DecisionNode,
  result: ResultNode,
  time: TimeNode,
};

const SWIMLANE_HEIGHT = 200;
const SWIMLANE_PADDING = 20;
const NODE_SPACING_X = 280;
const NODE_SPACING_Y = 100;

function ProcessDiagramInner({ steps, roles, stages, branches = [] }: ProcessDiagramProps) {
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(
    new Set(roles.map((r) => r.id))
  );
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { fitView, deleteElements } = useReactFlow();

  const roleMap = useMemo(() => {
    const map: Record<string, { role: ProcessRole; index: number }> = {};
    roles.forEach((role, index) => {
      map[role.id] = { role, index };
    });
    return map;
  }, [roles]);

  // Create swimlane background nodes
  const swimlaneNodes: Node[] = useMemo(() => {
    return roles.map((role, index) => ({
      id: `swimlane-${role.id}`,
      type: "group",
      position: { x: 0, y: index * (SWIMLANE_HEIGHT + SWIMLANE_PADDING) },
      data: { label: role.name },
      style: {
        backgroundColor: `${role.color}20`,
        width: 2000,
        height: SWIMLANE_HEIGHT,
        border: `2px solid ${role.color}`,
        borderRadius: "8px",
      },
      draggable: false,
      selectable: false,
    }));
  }, [roles]);

  // Create step nodes with swimlane positioning
  const stepNodes: Node[] = useMemo(() => {
    const stageGroups: Record<string, ProcessStep[]> = {};
    
    steps.forEach((step) => {
      if (!stageGroups[step.stageId]) {
        stageGroups[step.stageId] = [];
      }
      stageGroups[step.stageId].push(step);
    });

    const nodes: Node[] = [];
    let currentX = 100;

    stages
      .sort((a, b) => a.order - b.order)
      .forEach((stage) => {
        const stageSteps = stageGroups[stage.id] || [];
        stageSteps.sort((a, b) => a.order - b.order);

        stageSteps.forEach((step) => {
          const roleInfo = roleMap[step.roleId];
          if (!roleInfo) return;

          const y =
            roleInfo.index * (SWIMLANE_HEIGHT + SWIMLANE_PADDING) +
            SWIMLANE_HEIGHT / 2 -
            40;

          const nodeType = step.type || "action";
          
          nodes.push({
            id: step.id,
            type: nodeType,
            position: { x: currentX, y },
            data: {
              label: step.name,
              color: roleInfo.role.color,
              borderColor: roleInfo.role.color.replace("ff", "cc"),
              sla: step.sla,
              tools: step.tools,
              output: step.output,
              input: step.input,
              actions: step.actions,
              mop: step.mop,
            },
            parentNode: `swimlane-${step.roleId}`,
            extent: "parent" as const,
            draggable: true,
          });
        });

        currentX += NODE_SPACING_X;
      });

    return nodes;
  }, [steps, stages, roleMap]);

  const initialNodes = useMemo(
    () => [...swimlaneNodes, ...stepNodes],
    [swimlaneNodes, stepNodes]
  );

  // Create edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const edgeSet = new Set<string>();

    // Sequential edges
    const sortedSteps = [...steps].sort((a, b) => {
      if (a.stageId !== b.stageId) {
        const stageA = stages.find((s) => s.id === a.stageId);
        const stageB = stages.find((s) => s.id === b.stageId);
        return (stageA?.order || 0) - (stageB?.order || 0);
      }
      return a.order - b.order;
    });

    for (let i = 0; i < sortedSteps.length - 1; i++) {
      const edgeId = `e-${sortedSteps[i].id}-${sortedSteps[i + 1].id}`;
      if (!edgeSet.has(edgeId)) {
        edges.push({
          id: edgeId,
          source: sortedSteps[i].id,
          target: sortedSteps[i + 1].id,
          type: "smoothstep",
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
        });
        edgeSet.add(edgeId);
      }
    }

    // Branch edges
    branches.forEach((branch, index) => {
      const edgeId = `e-branch-${branch.fromStepId}-${branch.toStepId}-${index}`;
      if (!edgeSet.has(edgeId)) {
        edges.push({
          id: edgeId,
          source: branch.fromStepId,
          target: branch.toStepId,
          label: branch.condition,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#ff6b6b", strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#ff6b6b",
          },
        });
        edgeSet.add(edgeId);
      }
    });

    return edges;
  }, [steps, stages, branches]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Filter nodes and edges based on selected roles
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (node.id.startsWith("swimlane-")) {
        const roleId = node.id.replace("swimlane-", "");
        return selectedRoles.has(roleId);
      }
      const step = steps.find((s) => s.id === node.id);
      return !step || selectedRoles.has(step.roleId);
    });
  }, [nodes, steps, selectedRoles]);

  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(
      filteredNodes.filter((n) => !n.id.startsWith("swimlane-")).map((n) => n.id)
    );
    return edges.filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }, [edges, filteredNodes]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!node.id.startsWith("swimlane-")) {
      setSelectedNode(node.id);
    }
  }, []);

  const onDeleteNode = useCallback(() => {
    if (selectedNode) {
      deleteElements({ nodes: [{ id: selectedNode }] });
      setSelectedNode(null);
    }
  }, [selectedNode, deleteElements]);

  const exportToPNG = async () => {
    const { toPng } = await import("html-to-image");
    const element = document.querySelector(".react-flow") as HTMLElement;
    if (!element) return;

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#ffffff",
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      const link = document.createElement("a");
      link.download = "business-process-diagram.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to export diagram:", error);
    }
  };

  const exportToSVG = async () => {
    const { toSvg } = await import("html-to-image");
    const element = document.querySelector(".react-flow") as HTMLElement;
    if (!element) return;

    try {
      const dataUrl = await toSvg(element, {
        backgroundColor: "#ffffff",
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      const link = document.createElement("a");
      link.download = "business-process-diagram.svg";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to export diagram:", error);
    }
  };

  const selectedStep = useMemo(() => {
    return steps.find((s) => s.id === selectedNode);
  }, [selectedNode, steps]);

  return (
    <div className="flex gap-4">
      <div className="flex-1 h-[700px] border rounded-lg bg-background">
        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />

          <Panel
            position="top-right"
            className="bg-background border rounded-lg p-3 shadow-lg space-y-2"
          >
            <div className="text-sm font-semibold mb-2">Экспорт</div>
            <button
              onClick={exportToPNG}
              className="w-full px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
            >
              ↓ PNG
            </button>
            <button
              onClick={exportToSVG}
              className="w-full px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
            >
              ↓ SVG
            </button>
          </Panel>

          <Panel
            position="top-left"
            className="bg-background border rounded-lg p-3 shadow-lg max-w-xs"
          >
            <div className="text-sm font-semibold mb-2">Фильтр по ролям</div>
            <div className="space-y-1.5">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-1.5 rounded transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.has(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs">{role.name}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => fitView({ duration: 300 })}
              className="w-full mt-3 px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition"
            >
              🔍 Вместить всё
            </button>
            {selectedNode && (
              <button
                onClick={onDeleteNode}
                className="w-full mt-2 px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition"
              >
                🗑 Удалить блок
              </button>
            )}
          </Panel>
        </ReactFlow>
      </div>

      {selectedStep && (
        <div className="w-80 border rounded-lg p-4 bg-background overflow-y-auto max-h-[700px]">
          <h3 className="font-bold text-lg mb-3">{selectedStep.name}</h3>
          
          {selectedStep.input && (
            <div className="mb-3">
              <div className="text-sm font-semibold text-gray-700">Вход:</div>
              <div className="text-sm text-gray-600">{selectedStep.input}</div>
            </div>
          )}

          {selectedStep.actions && selectedStep.actions.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-semibold text-gray-700 mb-1">
                Действия:
              </div>
              <ol className="list-decimal list-inside space-y-1">
                {selectedStep.actions.map((action, idx) => (
                  <li key={idx} className="text-sm text-gray-600">
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {selectedStep.output && (
            <div className="mb-3">
              <div className="text-sm font-semibold text-gray-700">Выход:</div>
              <div className="text-sm text-gray-600">{selectedStep.output}</div>
            </div>
          )}

          {selectedStep.mop && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="text-sm font-bold text-gray-800 mb-2">МОП</div>
              
              {selectedStep.mop.materials && selectedStep.mop.materials.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-gray-700">
                    Материалы:
                  </div>
                  <ul className="list-disc list-inside">
                    {selectedStep.mop.materials.map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-600">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedStep.mop.equipment && selectedStep.mop.equipment.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-gray-700">
                    Оборудование:
                  </div>
                  <ul className="list-disc list-inside">
                    {selectedStep.mop.equipment.map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-600">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedStep.mop.personnel && selectedStep.mop.personnel.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700">
                    Персонал:
                  </div>
                  <ul className="list-disc list-inside">
                    {selectedStep.mop.personnel.map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-600">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {selectedStep.tools && selectedStep.tools.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-semibold text-gray-700">
                Инструменты:
              </div>
              <div className="text-sm text-gray-600">
                {selectedStep.tools.join(", ")}
              </div>
            </div>
          )}

          {selectedStep.sla && (
            <div className="mb-3">
              <div className="text-sm font-semibold text-gray-700">SLA:</div>
              <div className="text-sm text-gray-600">{selectedStep.sla}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProcessDiagram(props: ProcessDiagramProps) {
  return (
    <ReactFlowProvider>
      <ProcessDiagramInner {...props} />
    </ReactFlowProvider>
  );
}
