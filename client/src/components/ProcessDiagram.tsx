import React, { useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

interface ProcessDiagramProps {
  steps: any[];
  roles: any[];
  stages: any[];
  branches: any[];
}

// Пастельные цвета для колонок ролей (как в PDF)
const PASTEL_COLORS = [
  "#E3F2FD", // светло-голубой
  "#FFF9C4", // светло-желтый
  "#F8BBD0", // светло-розовый
  "#C8E6C9", // светло-зеленый
  "#E1BEE7", // светло-фиолетовый
  "#FFCCBC", // светло-оранжевый
  "#B2DFDB", // светло-бирюзовый
  "#D7CCC8", // светло-коричневый
  "#CFD8DC", // светло-серый
];

const COLUMN_WIDTH = 250;
const STEP_HEIGHT = 180;
const STEP_SPACING = 40;
const HEADER_HEIGHT = 60;

// Кастомный компонент для swimlane колонки
const SwimlaneColumn: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: data.color,
        border: "2px solid #999",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "14px",
        color: "#333",
        padding: "8px",
        textAlign: "center",
      }}
    >
      {data.label}
    </div>
  );
};

// Кастомный компонент для шага процесса
const ProcessStepNode: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff",
        border: "2px solid #666",
        borderRadius: "6px",
        padding: "12px",
        fontSize: "11px",
        color: "#000",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "12px" }}>
        {data.order}. {data.label}
      </div>
      {data.role && (
        <div style={{ fontSize: "10px", color: "#666", marginBottom: "4px" }}>
          👤 {data.role}
        </div>
      )}
      {data.duration && (
        <div style={{ fontSize: "10px", color: "#666", marginBottom: "6px" }}>
          ⏱ {data.duration}
        </div>
      )}
      {data.mop && (
        <div style={{ fontSize: "9px", color: "#444", lineHeight: "1.3" }}>
          <div style={{ fontWeight: "600", marginBottom: "3px" }}>МОП:</div>
          {data.mop.materials && data.mop.materials.length > 0 && (
            <div>📦 {data.mop.materials.join(", ")}</div>
          )}
          {data.mop.equipment && data.mop.equipment.length > 0 && (
            <div>🔧 {data.mop.equipment.join(", ")}</div>
          )}
          {data.mop.personnel && data.mop.personnel.length > 0 && (
            <div>👥 {data.mop.personnel.join(", ")}</div>
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  swimlane: SwimlaneColumn,
  processStep: ProcessStepNode,
};

function ProcessDiagramInner({ steps, roles, stages, branches }: ProcessDiagramProps) {
  const { fitView } = useReactFlow();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(
    new Set(roles.map((r) => r.id))
  );

  // Создаем map ролей для быстрого доступа
  const roleMap = useMemo(() => {
    const map = new Map();
    roles.forEach((role, index) => {
      map.set(role.id, {
        ...role,
        index,
        color: PASTEL_COLORS[index % PASTEL_COLORS.length],
      });
    });
    return map;
  }, [roles]);

  // Создаем swimlane колонки (вертикальные)
  const swimlaneNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    const maxStepsInRole = new Map<string, number>();

    // Подсчитываем максимальное количество шагов в каждой роли
    steps.forEach((step) => {
      const count = maxStepsInRole.get(step.roleId) || 0;
      maxStepsInRole.set(step.roleId, count + 1);
    });

    const maxSteps = Math.max(...Array.from(maxStepsInRole.values()), 5);
    const columnHeight = HEADER_HEIGHT + maxSteps * (STEP_HEIGHT + STEP_SPACING) + 100;

    roles.forEach((role) => {
      const roleInfo = roleMap.get(role.id);
      if (!roleInfo) return;

      nodes.push({
        id: `swimlane-${role.id}`,
        type: "swimlane",
        data: {
          label: role.name,
          color: roleInfo.color,
        },
        position: {
          x: roleInfo.index * COLUMN_WIDTH,
          y: 0,
        },
        style: {
          width: COLUMN_WIDTH,
          height: columnHeight,
          zIndex: -1,
        },
        draggable: false,
        selectable: false,
      });
    });

    return nodes;
  }, [roles, roleMap, steps]);

  // Создаем ноды для шагов
  const stepNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    const roleStepCounters = new Map<string, number>();

    // Сортируем шаги по этапам и порядку
    const sortedSteps = [...steps].sort((a, b) => {
      const stageA = stages.find((s) => s.id === a.stageId);
      const stageB = stages.find((s) => s.id === b.stageId);
      if (stageA && stageB && stageA.order !== stageB.order) {
        return stageA.order - stageB.order;
      }
      return a.order - b.order;
    });

    sortedSteps.forEach((step, globalIndex) => {
      const roleInfo = roleMap.get(step.roleId);
      if (!roleInfo) return;

      const stepIndexInRole = roleStepCounters.get(step.roleId) || 0;
      roleStepCounters.set(step.roleId, stepIndexInRole + 1);

      const x = roleInfo.index * COLUMN_WIDTH + 10;
      const y = HEADER_HEIGHT + stepIndexInRole * (STEP_HEIGHT + STEP_SPACING) + 20;

      nodes.push({
        id: step.id,
        type: "processStep",
        data: {
          label: step.name,
          order: globalIndex + 1,
          role: roleInfo.name,
          duration: step.duration || step.timeEstimate,
          mop: step.mop || {
            materials: step.materials || [],
            equipment: step.equipment || [],
            personnel: step.personnel || [],
          },
        },
        position: { x, y },
        style: {
          width: COLUMN_WIDTH - 20,
          height: STEP_HEIGHT,
        },
        parentNode: `swimlane-${step.roleId}`,
        extent: "parent" as const,
        draggable: true,
      });
    });

    return nodes;
  }, [steps, stages, roleMap]);

  const initialNodes = useMemo(
    () => [...swimlaneNodes, ...stepNodes],
    [swimlaneNodes, stepNodes]
  );

  // Создаем edges (связи)
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const edgeSet = new Set<string>();

    // Последовательные связи
    const sortedSteps = [...steps].sort((a, b) => {
      const stageA = stages.find((s) => s.id === a.stageId);
      const stageB = stages.find((s) => s.id === b.stageId);
      if (stageA && stageB && stageA.order !== stageB.order) {
        return stageA.order - stageB.order;
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
          style: { stroke: "#666", strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#666",
          },
        });
        edgeSet.add(edgeId);
      }
    }

    // Ветвления
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

  // Фильтрация по ролям
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (node.type === "swimlane") {
        const roleId = node.id.replace("swimlane-", "");
        return selectedRoles.has(roleId);
      }
      if (node.type === "processStep") {
        const step = steps.find((s) => s.id === node.id);
        return step && selectedRoles.has(step.roleId);
      }
      return true;
    });
  }, [nodes, selectedRoles, steps]);

  const filteredEdges = useMemo(() => {
    return edges.filter((edge) => {
      const sourceNode = filteredNodes.find((n) => n.id === edge.source);
      const targetNode = filteredNodes.find((n) => n.id === edge.target);
      return sourceNode && targetNode;
    });
  }, [edges, filteredNodes]);

  const toggleRole = useCallback((roleId: string) => {
    setSelectedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  }, []);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === "processStep") {
      setSelectedNode(node.id);
    }
  }, []);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => [...eds, params]),
    [setEdges]
  );

  const onDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
      setEdges((eds) =>
        eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode)
      );
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

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
      <div className="flex-1 h-[800px] border rounded-lg bg-background">
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

          <Panel
            position="bottom-right"
            className="bg-background border rounded-lg p-3 shadow-lg"
          >
            <div className="text-sm font-semibold mb-3">Легенда</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-600 bg-white rounded"></div>
                <span>Шаг процесса</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-red-500 bg-white rounded"></div>
                <span className="text-red-600">Ветвление</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {selectedStep && (
        <div className="w-80 border rounded-lg p-4 bg-background overflow-y-auto max-h-[800px]">
          <h3 className="font-bold text-lg mb-4">Детали шага</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">Название</div>
              <div className="text-sm">{selectedStep.name}</div>
            </div>
            {selectedStep.description && (
              <div>
                <div className="text-sm font-semibold text-muted-foreground">Описание</div>
                <div className="text-sm">{selectedStep.description}</div>
              </div>
            )}
            {(selectedStep.duration || selectedStep.timeEstimate) && (
              <div>
                <div className="text-sm font-semibold text-muted-foreground">Время</div>
                <div className="text-sm">{selectedStep.duration || selectedStep.timeEstimate}</div>
              </div>
            )}
            {selectedStep.mop && (
              <>
                {selectedStep.mop.materials && selectedStep.mop.materials.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground">Материалы</div>
                    <ul className="text-sm list-disc list-inside">
                      {selectedStep.mop.materials.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedStep.mop.equipment && selectedStep.mop.equipment.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground">Оборудование</div>
                    <ul className="text-sm list-disc list-inside">
                      {selectedStep.mop.equipment.map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedStep.mop.personnel && selectedStep.mop.personnel.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground">Персонал</div>
                    <ul className="text-sm list-disc list-inside">
                      {selectedStep.mop.personnel.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
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
