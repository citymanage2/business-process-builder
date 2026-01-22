import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from './types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  PlayCircle, StopCircle, 
  CheckSquare, Settings, Bell, Database, FileText, 
  Clock, Users, AlertCircle, Split
} from 'lucide-react';

const Icons: Record<string, any> = {
  start: PlayCircle,
  end: StopCircle,
  task: CheckSquare,
  subprocess: Settings,
  manual: Users,
  automated: Settings,
  notification: Bell,
  api: Database,
  condition: Split,
  parallel: Split,
  exclusive: Split,
  document: FileText,
  data_store: Database,
  timer: Clock,
  role: Users,
  department: Users,
  signal: Bell,
  error: AlertCircle,
};

const CustomNode = ({ data, selected }: NodeProps<NodeData>) => {
  const Icon = Icons[data.type] || Settings;
  const isStart = data.type === 'start';
  const isEnd = data.type === 'end';

  return (
    <Card className={`min-w-[180px] shadow-sm transition-all ${selected ? 'ring-2 ring-primary border-primary' : ''}`}>
      {!isStart && (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 bg-primary border-2 border-background" 
        />
      )}
      
      <div className="flex items-center gap-3 p-3">
        <div className={`p-2 rounded-lg ${selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-medium leading-none mb-1">{data.label}</div>
          <div className="text-[10px] text-muted-foreground uppercase">{data.type}</div>
        </div>
      </div>
      
      {data.description && (
        <div className="px-3 pb-3 pt-0">
          <p className="text-xs text-muted-foreground border-t pt-2 mt-1">
            {data.description}
          </p>
        </div>
      )}

      {!isEnd && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 bg-primary border-2 border-background" 
        />
      )}
    </Card>
  );
};

export default memo(CustomNode);
