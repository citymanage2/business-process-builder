import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { BlockData, getBlockDefinition } from '@/lib/processBuilder';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface ProcessBlockNodeProps {
  data: BlockData;
  selected?: boolean;
}

const ProcessBlockNode = memo(({ data, selected }: ProcessBlockNodeProps) => {
  const definition = useMemo(() => getBlockDefinition(data.blockType), [data.blockType]);
  
  // Dynamically get the icon
  const IconComponent = useMemo(() => {
    const iconName = data.icon || definition?.icon;
    if (iconName && iconName in LucideIcons) {
      return (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
    }
    return LucideIcons.Square;
  }, [data.icon, definition?.icon]);

  const color = data.color || definition?.color || '#64748b';
  
  // Determine node shape based on block type
  const isCircular = ['start', 'end', 'entry_point', 'exit_point'].includes(data.blockType);
  const isDiamond = ['condition', 'multiple_choice', 'exclusive_gateway', 'parallel_gateway'].includes(data.blockType);
  
  return (
    <div
      className={cn(
        'relative transition-all duration-200',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Input Handle */}
      {data.blockType !== 'start' && data.blockType !== 'entry_point' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-background hover:!bg-primary transition-colors"
        />
      )}
      
      {/* Node Body */}
      {isCircular ? (
        // Circular nodes for start/end
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center shadow-md border-2',
            'bg-white dark:bg-slate-800'
          )}
          style={{ borderColor: color }}
        >
          <IconComponent className="text-2xl" style={{ color }} size={28} />
        </div>
      ) : isDiamond ? (
        // Diamond nodes for conditions
        <div
          className="w-24 h-24 flex items-center justify-center"
          style={{ transform: 'rotate(45deg)' }}
        >
          <div
            className={cn(
              'w-16 h-16 flex items-center justify-center shadow-md border-2',
              'bg-white dark:bg-slate-800 rounded-lg'
            )}
            style={{ borderColor: color }}
          >
            <div style={{ transform: 'rotate(-45deg)' }}>
              <IconComponent style={{ color }} size={24} />
            </div>
          </div>
        </div>
      ) : (
        // Regular rectangular nodes
        <div
          className={cn(
            'min-w-[160px] max-w-[240px] rounded-lg shadow-md border-2',
            'bg-white dark:bg-slate-800 overflow-hidden'
          )}
          style={{ borderColor: color }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 flex items-center gap-2"
            style={{ backgroundColor: `${color}20` }}
          >
            <IconComponent style={{ color }} size={18} />
            <span
              className="text-xs font-medium truncate"
              style={{ color }}
            >
              {definition?.nameRu || data.blockType}
            </span>
          </div>
          
          {/* Content */}
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-foreground truncate">
              {data.label}
            </p>
            {data.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {data.description}
              </p>
            )}
            {data.duration && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <LucideIcons.Clock size={12} />
                <span>{data.duration} мин</span>
              </div>
            )}
            {data.responsible && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <LucideIcons.User size={12} />
                <span className="truncate">{data.responsible}</span>
              </div>
            )}
          </div>
          
          {/* Tags */}
          {data.tags && data.tags.length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {data.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {data.tags.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
                  +{data.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Label for circular/diamond nodes */}
      {(isCircular || isDiamond) && (
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 whitespace-nowrap',
            'text-xs font-medium text-foreground text-center max-w-[120px] truncate',
            isCircular ? 'top-full mt-2' : 'top-full mt-6'
          )}
        >
          {data.label}
        </div>
      )}
      
      {/* Output Handle */}
      {data.blockType !== 'end' && data.blockType !== 'exit_point' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-background hover:!bg-primary transition-colors"
        />
      )}
      
      {/* Additional handles for decision nodes */}
      {isDiamond && (
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-background hover:!bg-primary transition-colors !left-0"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-background hover:!bg-primary transition-colors !right-0"
          />
        </>
      )}
    </div>
  );
});

ProcessBlockNode.displayName = 'ProcessBlockNode';

export default ProcessBlockNode;
