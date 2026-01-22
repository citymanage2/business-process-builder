import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { ProcessNodeData, getBlockDefinition, BLOCK_TYPES, BLOCK_CATEGORIES } from '@shared/processBuilder';
import * as LucideIcons from 'lucide-react';
import { useProcessBuilderStore } from '@/stores/processBuilderStore';

// Get icon component by name
const getIcon = (iconName: string, className?: string) => {
  const Icon = (LucideIcons as any)[iconName];
  if (!Icon) return null;
  return <Icon className={className} />;
};

interface ProcessBlockNodeProps extends NodeProps<ProcessNodeData> {}

const ProcessBlockNode = memo(({ data, selected, id }: ProcessBlockNodeProps) => {
  const validationResult = useProcessBuilderStore((state) => state.validationResult);
  const blockDef = useMemo(() => getBlockDefinition(data.type as any), [data.type]);
  
  // Check if this node has validation errors
  const nodeErrors = useMemo(() => {
    if (!validationResult) return [];
    return [
      ...validationResult.errors.filter((e) => e.nodeId === id),
      ...validationResult.warnings.filter((e) => e.nodeId === id),
    ];
  }, [validationResult, id]);
  
  const hasErrors = nodeErrors.some((e) => e.type === 'error');
  const hasWarnings = nodeErrors.some((e) => e.type === 'warning');
  
  // Determine if handles should be shown
  const showInputHandle = blockDef?.hasInputs !== false;
  const showOutputHandle = blockDef?.hasOutputs !== false;
  
  // Get shape styles
  const getShapeClass = () => {
    if (!blockDef) return 'rounded-lg';
    
    switch (blockDef.shape) {
      case 'oval':
        return 'rounded-full';
      case 'diamond':
        return 'rotate-45';
      case 'circle':
        return 'rounded-full aspect-square';
      case 'parallelogram':
        return 'skew-x-[-12deg]';
      case 'hexagon':
        return 'clip-path-hexagon';
      default:
        return 'rounded-lg';
    }
  };
  
  const getContentClass = () => {
    if (!blockDef) return '';
    
    switch (blockDef.shape) {
      case 'diamond':
        return '-rotate-45';
      case 'parallelogram':
        return 'skew-x-[12deg]';
      default:
        return '';
    }
  };
  
  // Determine size based on shape
  const getSize = () => {
    if (!blockDef) return { width: 180, height: 80 };
    return {
      width: blockDef.defaultWidth,
      height: blockDef.defaultHeight,
    };
  };
  
  const size = getSize();
  const color = data.color || blockDef?.color || '#3b82f6';
  
  // Determine category color for border
  const getCategoryColor = () => {
    if (!blockDef) return 'border-gray-400';
    
    switch (blockDef.category) {
      case BLOCK_CATEGORIES.START_END:
        return 'border-green-500';
      case BLOCK_CATEGORIES.ACTIONS:
        return 'border-blue-500';
      case BLOCK_CATEGORIES.DECISIONS:
        return 'border-yellow-500';
      case BLOCK_CATEGORIES.DATA:
        return 'border-emerald-500';
      case BLOCK_CATEGORIES.EVENTS:
        return 'border-pink-500';
      case BLOCK_CATEGORIES.PARTICIPANTS:
        return 'border-slate-500';
      default:
        return 'border-gray-400';
    }
  };
  
  return (
    <div
      className={cn(
        'relative transition-all duration-200',
        selected && 'ring-2 ring-primary ring-offset-2',
        hasErrors && 'ring-2 ring-red-500 ring-offset-2',
        hasWarnings && !hasErrors && 'ring-2 ring-yellow-500 ring-offset-2'
      )}
      style={{ width: size.width, height: size.height }}
    >
      {/* Input Handle */}
      {showInputHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className={cn(
            '!w-3 !h-3 !bg-white !border-2',
            getCategoryColor(),
            'hover:!scale-125 transition-transform'
          )}
        />
      )}
      
      {/* Node Body */}
      <div
        className={cn(
          'w-full h-full border-2 bg-white shadow-md flex items-center justify-center',
          getShapeClass(),
          getCategoryColor(),
          'hover:shadow-lg transition-shadow cursor-pointer'
        )}
        style={{
          borderColor: selected ? undefined : color,
        }}
      >
        <div
          className={cn('flex flex-col items-center justify-center p-2 w-full h-full', getContentClass())}
        >
          {/* Icon */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
            style={{ backgroundColor: `${color}20` }}
          >
            {getIcon(data.icon || blockDef?.icon || 'Box', 'w-4 h-4')}
          </div>
          
          {/* Name */}
          <div
            className="text-xs font-semibold text-center leading-tight px-1 truncate w-full"
            title={data.name}
          >
            {data.name}
          </div>
          
          {/* Duration badge */}
          {data.duration && (
            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-0.5">
              {getIcon('Clock', 'w-3 h-3')}
              {data.duration}
            </div>
          )}
          
          {/* Responsible badge */}
          {data.responsible && (
            <div className="text-[10px] text-gray-500 flex items-center gap-0.5 truncate max-w-full">
              {getIcon('User', 'w-3 h-3 flex-shrink-0')}
              <span className="truncate">{data.responsible}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Output Handle */}
      {showOutputHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={cn(
            '!w-3 !h-3 !bg-white !border-2',
            getCategoryColor(),
            'hover:!scale-125 transition-transform'
          )}
        />
      )}
      
      {/* Error indicator */}
      {(hasErrors || hasWarnings) && (
        <div
          className={cn(
            'absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs',
            hasErrors ? 'bg-red-500' : 'bg-yellow-500'
          )}
          title={nodeErrors.map((e) => e.message.ru).join('\n')}
        >
          {hasErrors ? '!' : '?'}
        </div>
      )}
      
      {/* Conditions indicator for decision blocks */}
      {data.conditions && data.conditions.length > 0 && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1">
          {data.conditions.map((cond, i) => (
            <div
              key={cond.id}
              className="px-1.5 py-0.5 text-[9px] bg-yellow-100 border border-yellow-300 rounded"
              title={cond.label}
            >
              {cond.label.substring(0, 8)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ProcessBlockNode.displayName = 'ProcessBlockNode';

export default ProcessBlockNode;
