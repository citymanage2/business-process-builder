import { memo } from "react";
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge
} from "reactflow";
import { CONNECTION_METADATA, ConnectionType } from "@shared/builderTypes";

interface CustomEdgeData {
  connectionType: ConnectionType;
  label?: string;
  condition?: string;
}

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd
}: EdgeProps<CustomEdgeData>) {
  const connectionType = data?.connectionType || "sequence_flow";
  const metadata = CONNECTION_METADATA[connectionType];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const strokeDasharray = 
    metadata.strokeStyle === "dashed" ? "5,5" :
    metadata.strokeStyle === "dotted" ? "2,2" : 
    undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "hsl(var(--primary))" : metadata.color,
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray
        }}
      />
      
      {/* Label */}
      {(data?.label || data?.condition) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all"
            }}
            className="px-2 py-1 text-xs bg-background border rounded shadow-sm max-w-[120px]"
          >
            <span className="truncate block">
              {data?.label || data?.condition}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CustomEdge = memo(CustomEdgeComponent);
