import React, { memo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  getStraightPath,
  getSmoothStepPath,
} from 'reactflow';
import { cn } from '@/lib/utils';
import { CONNECTION_TYPES, ConnectionType } from '@shared/processBuilder';

interface ProcessEdgeData {
  connectionType?: ConnectionType;
  label?: string;
  condition?: string;
  description?: string;
}

const ProcessEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    markerEnd,
  }: EdgeProps<ProcessEdgeData>) => {
    const connectionType = data?.connectionType || CONNECTION_TYPES.SEQUENCE_FLOW;
    
    // Get path based on connection type
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    
    // Determine edge style based on connection type
    const getEdgeStyle = () => {
      switch (connectionType) {
        case CONNECTION_TYPES.DATA_FLOW:
          return {
            stroke: '#10b981',
            strokeDasharray: '5,5',
            strokeWidth: 2,
          };
        case CONNECTION_TYPES.CONDITIONAL_FLOW:
          return {
            stroke: '#f59e0b',
            strokeWidth: 2,
          };
        case CONNECTION_TYPES.SEQUENCE_FLOW:
        default:
          return {
            stroke: '#64748b',
            strokeWidth: 2,
          };
      }
    };
    
    const edgeStyle = getEdgeStyle();
    const label = data?.label || data?.condition;
    
    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...edgeStyle,
            ...(selected && { stroke: '#3b82f6', strokeWidth: 3 }),
            transition: 'all 0.2s',
          }}
        />
        
        {/* Edge label */}
        {label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              }}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium border bg-white shadow-sm',
                connectionType === CONNECTION_TYPES.DATA_FLOW && 'border-emerald-400 text-emerald-700',
                connectionType === CONNECTION_TYPES.CONDITIONAL_FLOW && 'border-amber-400 text-amber-700',
                connectionType === CONNECTION_TYPES.SEQUENCE_FLOW && 'border-slate-300 text-slate-700',
                selected && 'ring-2 ring-primary ring-offset-1'
              )}
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
        
        {/* Connection type indicator */}
        {connectionType !== CONNECTION_TYPES.SEQUENCE_FLOW && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - (label ? 20 : 0)}px)`,
                pointerEvents: 'none',
              }}
              className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold',
                connectionType === CONNECTION_TYPES.DATA_FLOW && 'bg-emerald-100 text-emerald-700',
                connectionType === CONNECTION_TYPES.CONDITIONAL_FLOW && 'bg-amber-100 text-amber-700'
              )}
            >
              {connectionType === CONNECTION_TYPES.DATA_FLOW ? 'D' : 'C'}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
);

ProcessEdge.displayName = 'ProcessEdge';

export default ProcessEdge;
