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
import { ChevronDown, ChevronUp } from "lucide-react";

interface ProcessDiagramProps {
  steps: any[];
  roles: any[];
  stages: any[];
  branches: any[];
}

// Пастельные цвета для ролей
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

const COLUMN_WIDTH = 280;
const STEP_HEIGHT = 120;
const STEP_SPACING = 60;
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
        padding: "8px",
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          fontSize: "14px",
          textAlign: "center",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.8)",
          borderRadius: "4px",
          marginBottom: "8px",
        }}
      >
        {data.label}
      </div>
    </div>
  );
};

// Кастомный компонент для блока процесса с формами блок-схем
const ProcessStepNode: React.FC<{ data: any }> = ({ data }) => {
  const step = data.step;
  const shapeType = step.shapeType || "rectangle"; // rectangle, diamond, oval, parallelogram
  
  // Определяем стили в зависимости от типа фигуры
  const getShapeStyle = () => {
    const baseStyle = {
      padding: "12px",
      fontSize: "11px",
      color: "#000",
      border: "2px solid #333",
      backgroundColor: "#fff",
      minHeight: "80px",
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center" as const,
      wordWrap: "break-word" as const,
      overflow: "hidden",
    };

    switch (shapeType) {
      case "diamond": // Решение
        return {
          ...baseStyle,
          width: "140px",
          height: "140px",
          transform: "rotate(45deg)",
          borderRadius: "8px",
        };
      case "oval": // Начало/Конец/Время
        return {
          ...baseStyle,
          width: "180px",
          height: "90px",
          borderRadius: "50%",
        };
      case "parallelogram": // Ввод/Вывод данных
        return {
          ...baseStyle,
          width: "200px",
          height: "80px",
          transform: "skewX(-20deg)",
        };
      default: // rectangle - Процесс/Действие
        return {
          ...baseStyle,
          width: "200px",
          minHeight: "80px",
          borderRadius: "4px",
        };
    }
  };

  const getContentStyle = () => {
    if (shapeType === "diamond") {
      return {
        transform: "rotate(-45deg)",
        width: "100px",
        fontSize: "10px",
      };
    }
    if (shapeType === "parallelogram") {
      return {
        transform: "skewX(20deg)",
      };
    }
    return {};
  };

  return (
    <div style={getShapeStyle()}>
      <div style={getContentStyle()}>
        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
          {step.order}. {step.title}
        </div>
        {step.duration && (
          <div style={{ fontSize: "9px", color: "#666", marginTop: "4px" }}>
            ⏱ {step.duration}
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  swimlane: SwimlaneColumn,
  processStep: ProcessStepNode,
};

function ProcessDiagramInner({ steps = [], roles = [], stages = [], branches = [] }: ProcessDiagramProps) {
  const { fitView } = useReactFlow();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(
    new Set(roles.map((r) => r.id))
  );
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  // Создаем map ролей для быстрого доступа
  const roleMap = useMemo(() => {
    const map = new Map();
    (roles || []).forEach((role, index) => {
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

    (roles || []).forEach((role) => {
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
          width: COLUMN_WIDTH - 10,
          height: columnHeight,
          zIndex: -1,
        },
        draggable: false,
        selectable: false,
      });
    });

    return nodes;
  }, [roles, roleMap, steps]);

  // Создаем ноды для шагов процесса
  const stepNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    const roleStepCounts = new Map<string, number>();

    // Сортируем шаги по order
    const sortedSteps = [...(steps || [])].sort((a, b) => a.order - b.order);

    (sortedSteps || []).forEach((step) => {
      const roleInfo = roleMap.get(step.roleId);
      if (!roleInfo) return;

      const stepIndexInRole = roleStepCounts.get(step.roleId) || 0;
      roleStepCounts.set(step.roleId, stepIndexInRole + 1);

      const x = roleInfo.index * COLUMN_WIDTH + (COLUMN_WIDTH - 200) / 2;
      const y = HEADER_HEIGHT + 40 + stepIndexInRole * (STEP_HEIGHT + STEP_SPACING);

      nodes.push({
        id: step.id,
        type: "processStep",
        data: { step },
        position: { x, y },
        draggable: true,
      });
    });

    return nodes;
  }, [steps, roleMap]);

  const initialNodes = useMemo(() => {
    return [...swimlaneNodes, ...stepNodes];
  }, [swimlaneNodes, stepNodes]);

  // Создаем edges (связи) между шагами
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const edgeSet = new Set<string>();

    // Сортируем шаги по order
    const sortedSteps = [...(steps || [])].sort((a, b) => a.order - b.order);

    // Создаем последовательные связи
    for (let i = 0; i < sortedSteps.length - 1; i++) {
      const edgeId = `e-${sortedSteps[i].id}-${sortedSteps[i + 1].id}`;
      if (!edgeSet.has(edgeId)) {
        edges.push({
          id: edgeId,
          source: sortedSteps[i].id,
          target: sortedSteps[i + 1].id,
          type: "smoothstep",
          animated: false,
          style: { stroke: "#333", strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#333",
          },
        });
        edgeSet.add(edgeId);
      }
    }

    // Добавляем ветвления из branches
    (branches || []).forEach((branch) => {
      branch.options.forEach((option: any, index: number) => {
        const edgeId = `e-branch-${branch.fromStepId}-${option.toStepId}-${index}`;
        if (!edgeSet.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: branch.fromStepId,
            target: option.toStepId,
            type: "smoothstep",
            animated: true,
            label: option.condition,
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
    });

    return edges;
  }, [steps, branches]);

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
      console.error("Error exporting to PNG:", error);
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
      console.error("Error exporting to SVG:", error);
    }
  };

  // Находим выбранный шаг для отображения деталей
  const selectedStep = useMemo(() => {
    if (!selectedNode) return null;
    return steps.find((s) => s.id === selectedNode);
  }, [selectedNode, steps]);

  return (
    <div style={{ width: "100%", height: "800px", position: "relative" }}>
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
          className="bg-background border rounded-lg shadow-lg max-w-xs"
        >
          <div 
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition"
            onClick={() => setFilterCollapsed(!filterCollapsed)}
          >
            <div className="text-sm font-semibold">Фильтр по ролям</div>
            {filterCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
          {!filterCollapsed && (
            <div className="p-3 pt-0">
              <div className="space-y-1.5 mb-3">
                {(roles || []).map((role) => (
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
                className="w-full px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition"
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
            </div>
          )}
        </Panel>

        <Panel
          position="bottom-right"
          className="bg-background border rounded-lg p-3 shadow-lg"
        >
          <div className="text-xs font-semibold mb-2">Легенда</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div style={{ width: "30px", height: "20px", border: "2px solid #333", borderRadius: "2px", backgroundColor: "#fff" }}></div>
              <span>Процесс</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: "20px", height: "20px", border: "2px solid #333", transform: "rotate(45deg)", backgroundColor: "#fff" }}></div>
              <span>Решение</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: "30px", height: "18px", border: "2px solid #333", borderRadius: "50%", backgroundColor: "#fff" }}></div>
              <span>Начало/Конец</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: "30px", height: "18px", border: "2px solid #333", transform: "skewX(-20deg)", backgroundColor: "#fff" }}></div>
              <span>Данные</span>
            </div>
          </div>
        </Panel>

        {selectedStep && (
          <Panel
            position="bottom-left"
            className="bg-background border rounded-lg p-4 shadow-lg max-w-md"
          >
            <div className="text-sm font-semibold mb-3">Детали шага</div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold">Название:</span> {selectedStep.title}
              </div>
              {selectedStep.description && (
                <div>
                  <span className="font-semibold">Описание:</span> {selectedStep.description}
                </div>
              )}
              {selectedStep.duration && (
                <div>
                  <span className="font-semibold">Длительность:</span> {selectedStep.duration}
                </div>
              )}
              {selectedStep.responsible && (
                <div>
                  <span className="font-semibold">Ответственный:</span> {selectedStep.responsible}
                </div>
              )}
              {selectedStep.substeps && selectedStep.substeps.length > 0 && (
                <div>
                  <span className="font-semibold">Подэтапы:</span>
                  <ol className="list-decimal list-inside ml-2 mt-1">
                    {selectedStep.substeps.map((substep: any, index: number) => (
                      <li key={index}>{substep.action}</li>
                    ))}
                  </ol>
                </div>
              )}
              {selectedStep.informationSystems && selectedStep.informationSystems.length > 0 && (
                <div>
                  <span className="font-semibold">Информационные системы:</span>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    {selectedStep.informationSystems.map((is: any, index: number) => (
                      <li key={index}>{is.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export default function ProcessDiagram(props: ProcessDiagramProps) {
  return (
    <ReactFlowProvider>
      <ProcessDiagramInner {...props} />
    </ReactFlowProvider>
  );
}
