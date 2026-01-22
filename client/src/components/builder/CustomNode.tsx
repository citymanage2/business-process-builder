import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { BLOCK_METADATA, BlockType } from "@shared/builderTypes";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomNodeData {
  type: BlockType;
  name: string;
  label: string;
  description?: string;
  style?: {
    color?: string;
    icon?: string;
    width?: number;
    height?: number;
  };
  data?: Record<string, unknown>;
}

// Helper functions to avoid TypeScript issues with conditional rendering
function renderDescription(description?: string): React.ReactNode {
  if (!description) return null;
  return (
    <div className="px-3 py-2 flex-1">
      <p className="text-xs text-muted-foreground line-clamp-2">
        {description}
      </p>
    </div>
  );
}

function renderResponsible(responsible?: unknown): React.ReactNode {
  if (!responsible) return null;
  return (
    <div className="px-3 py-1.5 border-t bg-muted/20">
      <span className="text-xs text-muted-foreground">
        {String(responsible)}
      </span>
    </div>
  );
}

function CustomNodeComponent(props: NodeProps) {
  const nodeData: CustomNodeData = props.data as CustomNodeData;
  const { selected } = props;
  const meta = BLOCK_METADATA[nodeData.type];
  if (!meta) {
    return <div className="p-2 bg-red-100 rounded">Unknown block type</div>;
  }

  const IconComponent = (LucideIcons as any)[meta.icon] || LucideIcons.Box;
  const color = nodeData.style?.color || meta.color;

  // Different shapes based on block category
  const isGateway = meta.category === "DECISIONS";
  const isEvent = meta.category === "EVENTS";
  const isStartEnd = meta.category === "START_END";
  const isParticipant = meta.category === "PARTICIPANTS";

  const nodeStyle = {
    minWidth: nodeData.style?.width || meta.defaultWidth,
    minHeight: nodeData.style?.height || meta.defaultHeight
  };

  // Render based on block type
  if (isGateway) {
    return (
      <div className="relative" style={{ width: nodeStyle.minWidth, height: nodeStyle.minHeight }}>
        {/* Diamond shape */}
        <div
          className={cn(
            "absolute inset-0 rotate-45 rounded-lg border-2 bg-background shadow-sm transition-shadow",
            selected && "ring-2 ring-primary ring-offset-2"
          )}
          style={{ borderColor: color }}
        />
        
        {/* Content (not rotated) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: color + "20" }}
          >
            <IconComponent className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-xs font-medium text-center mt-1 line-clamp-2 px-2">
            {nodeData.label || nodeData.name}
          </span>
        </div>

        {/* Handles */}
        {meta.hasInputHandle && (
          <Handle
            type="target"
            position={Position.Top}
            className="!bg-muted-foreground !border-background !w-3 !h-3"
          />
        )}
        {meta.hasOutputHandle && (
          <>
            <Handle
              type="source"
              position={Position.Bottom}
              id="bottom"
              className="!bg-muted-foreground !border-background !w-3 !h-3"
            />
            <Handle
              type="source"
              position={Position.Right}
              id="right"
              className="!bg-muted-foreground !border-background !w-3 !h-3"
            />
            <Handle
              type="source"
              position={Position.Left}
              id="left"
              className="!bg-muted-foreground !border-background !w-3 !h-3"
            />
          </>
        )}
      </div>
    );
  }

  if (isEvent || isStartEnd) {
    const isCircle = nodeData.type === "start" || nodeData.type === "end" || isEvent;
    
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-3 bg-background border-2 shadow-sm transition-shadow",
          isCircle ? "rounded-full" : "rounded-lg",
          selected && "ring-2 ring-primary ring-offset-2"
        )}
        style={{ 
          borderColor: color,
          ...nodeStyle
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: color + "20" }}
        >
          <IconComponent className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-xs font-medium text-center mt-1 line-clamp-1">
          {nodeData.label || nodeData.name}
        </span>

        {/* Handles */}
        {meta.hasInputHandle && (
          <Handle
            type="target"
            position={Position.Top}
            className="!bg-muted-foreground !border-background !w-3 !h-3"
          />
        )}
        {meta.hasOutputHandle && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!bg-muted-foreground !border-background !w-3 !h-3"
          />
        )}
      </div>
    );
  }

  if (isParticipant) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-background border-2 border-dashed rounded-lg shadow-sm transition-shadow",
          selected && "ring-2 ring-primary ring-offset-2"
        )}
        style={{ 
          borderColor: color,
          ...nodeStyle
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + "20" }}
        >
          <IconComponent className="h-4 w-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate">
            {nodeData.label || nodeData.name}
          </span>
          {nodeData.description && (
            <span className="text-xs text-muted-foreground block truncate">
              {nodeData.description}
            </span>
          )}
        </div>

        {/* Handles for external system */}
        {meta.hasInputHandle && (
          <Handle
            type="target"
            position={Position.Left}
            className="!bg-muted-foreground !border-background !w-3 !h-3"
          />
        )}
        {meta.hasOutputHandle && (
          <Handle
            type="source"
            position={Position.Right}
            className="!bg-muted-foreground !border-background !w-3 !h-3"
          />
        )}
      </div>
    );
  }

  // Default: rectangular block (tasks, data, actions)
  return (
    <div
      className={cn(
        "flex flex-col bg-background border rounded-lg shadow-sm transition-shadow overflow-hidden",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        borderColor: color,
        borderLeftWidth: 4,
        ...nodeStyle
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <div
          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + "20" }}
        >
          <IconComponent className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <span className="text-sm font-medium truncate flex-1">
          {nodeData.label || nodeData.name}
        </span>
      </div>

      {/* Content */}
      {renderDescription(nodeData.description)}

      {/* Footer with metadata */}
      {renderResponsible(nodeData.data?.responsible)}

      {/* Handles */}
      {meta.hasInputHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-muted-foreground !border-background !w-3 !h-3"
        />
      )}
      {meta.hasOutputHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-muted-foreground !border-background !w-3 !h-3"
        />
      )}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
