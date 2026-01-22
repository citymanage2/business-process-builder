import React, { useEffect } from 'react';
import { Node } from 'reactflow';
import { NodeData } from './types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2 } from 'lucide-react';

interface Props {
  selectedNode: Node<NodeData> | null;
  onUpdate: (id: string, data: Partial<NodeData>) => void;
  onDelete: (id: string) => void;
}

export function PropertiesPanel({ selectedNode, onUpdate, onDelete }: Props) {
  const [label, setLabel] = React.useState('');
  const [description, setDescription] = React.useState('');

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label);
      setDescription(selectedNode.data.description || '');
    }
  }, [selectedNode]);

  const handleChange = (field: string, value: string) => {
    if (!selectedNode) return;
    
    if (field === 'label') setLabel(value);
    if (field === 'description') setDescription(value);

    onUpdate(selectedNode.id, { [field]: value });
  };

  if (!selectedNode) {
    return (
      <div className="w-80 border-l bg-background p-4 flex items-center justify-center text-muted-foreground text-sm">
        Выберите элемент для редактирования
      </div>
    );
  }

  return (
    <aside className="w-80 border-l bg-background p-4 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold">Свойства</h3>
        <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground font-mono">
          {selectedNode.data.type}
        </span>
      </div>
      
      <div className="space-y-6 flex-1">
        <div className="space-y-2">
          <Label htmlFor="label">Название</Label>
          <Input 
            id="label"
            value={label} 
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Введите название..."
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea 
            id="description"
            value={description} 
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Добавьте описание..."
            rows={5}
            className="resize-none"
          />
        </div>

        {/* TODO: Add specific fields based on node type */}
        {/* e.g. Assignee for Task, Condition for Decision, etc. */}
        
        <Separator />
        
        <Button 
            type="button" 
            variant="destructive" 
            className="w-full gap-2"
            onClick={() => onDelete(selectedNode.id)}
        >
            <Trash2 className="w-4 h-4" />
            Удалить элемент
        </Button>
      </div>
    </aside>
  );
}
