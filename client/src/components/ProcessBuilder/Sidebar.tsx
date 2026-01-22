import React from 'react';
import { BLOCKS, BlockCategory } from './types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  PlayCircle, StopCircle, 
  CheckSquare, Settings, Bell, Database, FileText, 
  Clock, Users, Building, AlertCircle, Split
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
  department: Building,
  signal: Bell,
  error: AlertCircle,
};

export function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories: Record<BlockCategory, string> = {
    start_end: 'Начало и конец',
    actions: 'Действия',
    decisions: 'Решения',
    data: 'Данные',
    events: 'События',
    participants: 'Участники',
  };

  // Group blocks by category
  const groupedBlocks = BLOCKS.reduce((acc, block) => {
    if (!acc[block.category]) {
      acc[block.category] = [];
    }
    acc[block.category].push(block);
    return acc;
  }, {} as Record<BlockCategory, typeof BLOCKS>);

  return (
    <aside className="w-64 border-r bg-background h-full flex flex-col">
      <div className="p-4 border-b font-semibold">Библиотека блоков</div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {Object.entries(groupedBlocks).map(([category, blocks]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {categories[category as BlockCategory]}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {blocks.map((block) => {
                  const Icon = Icons[block.type] || Settings;
                  return (
                    <Card
                      key={block.type}
                      className="p-2 text-xs flex flex-col items-center justify-center cursor-grab hover:bg-accent/50 transition-colors border-dashed"
                      draggable
                      onDragStart={(event) => onDragStart(event, block.type, block.label)}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 mb-2 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-center leading-tight">{block.label}</span>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
