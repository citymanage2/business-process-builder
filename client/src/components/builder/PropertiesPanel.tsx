import { useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BlockData,
  getBlockDefinition,
  ConnectionType,
  CONNECTION_STYLES,
} from '@/lib/processBuilder';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface PropertiesPanelProps {
  selectedNode: Node<BlockData> | null;
  selectedEdge: Edge | null;
  onNodeUpdate: (nodeId: string, data: Partial<BlockData>) => void;
  onEdgeUpdate: (edgeId: string, data: { connectionType?: ConnectionType; label?: string; condition?: string }) => void;
  onDelete: () => void;
  className?: string;
}

export function PropertiesPanel({
  selectedNode,
  selectedEdge,
  onNodeUpdate,
  onEdgeUpdate,
  onDelete,
  className,
}: PropertiesPanelProps) {
  if (!selectedNode && !selectedEdge) {
    return (
      <div className={cn('flex flex-col h-full bg-background border-l', className)}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Свойства</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <LucideIcons.MousePointer2 className="mx-auto mb-2" size={24} />
            <p className="text-sm">Выберите блок или связь</p>
            <p className="text-xs mt-1">для редактирования свойств</p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedEdge) {
    return (
      <EdgeProperties
        edge={selectedEdge}
        onUpdate={onEdgeUpdate}
        onDelete={onDelete}
        className={className}
      />
    );
  }

  return (
    <NodeProperties
      node={selectedNode!}
      onUpdate={onNodeUpdate}
      onDelete={onDelete}
      className={className}
    />
  );
}

// =============================================
// Node Properties
// =============================================

interface NodePropertiesProps {
  node: Node<BlockData>;
  onUpdate: (nodeId: string, data: Partial<BlockData>) => void;
  onDelete: () => void;
  className?: string;
}

function NodeProperties({ node, onUpdate, onDelete, className }: NodePropertiesProps) {
  const definition = useMemo(() => getBlockDefinition(node.data.blockType), [node.data.blockType]);
  
  const IconComponent = useMemo(() => {
    const iconName = node.data.icon || definition?.icon;
    if (iconName && iconName in LucideIcons) {
      return (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
    }
    return LucideIcons.Square;
  }, [node.data.icon, definition?.icon]);

  const color = node.data.color || definition?.color || '#64748b';

  const handleChange = (field: keyof BlockData, value: string | number | string[]) => {
    onUpdate(node.id, { [field]: value });
  };

  return (
    <div className={cn('flex flex-col h-full bg-background border-l', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <IconComponent size={24} style={{ color }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{definition?.nameRu || 'Блок'}</h2>
            <p className="text-xs text-muted-foreground">{node.data.blockType}</p>
          </div>
        </div>
      </div>

      {/* Properties */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="label">Название</Label>
              <Input
                id="label"
                value={node.data.label || ''}
                onChange={e => handleChange('label', e.target.value)}
                placeholder="Название блока"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={node.data.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Описание блока..."
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Execution Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Выполнение</h3>
            
            <div className="space-y-2">
              <Label htmlFor="responsible">Ответственный</Label>
              <Input
                id="responsible"
                value={node.data.responsible || ''}
                onChange={e => handleChange('responsible', e.target.value)}
                placeholder="Роль или сотрудник"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Длительность (мин)</Label>
              <Input
                id="duration"
                type="number"
                min={0}
                value={node.data.duration || ''}
                onChange={e => handleChange('duration', parseInt(e.target.value) || 0)}
                placeholder="30"
              />
            </div>
          </div>

          <Separator />

          {/* Styling */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Внешний вид</h3>
            
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={node.data.color || color}
                  onChange={e => handleChange('color', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border"
                />
                <Input
                  value={node.data.color || color}
                  onChange={e => handleChange('color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Теги</h3>
            <div className="flex flex-wrap gap-1">
              {(node.data.tags || []).map((tag, i) => (
                <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => {
                  const newTags = [...(node.data.tags || [])];
                  newTags.splice(i, 1);
                  handleChange('tags', newTags);
                }}>
                  {tag}
                  <LucideIcons.X size={12} className="ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Новый тег"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      handleChange('tags', [...(node.data.tags || []), input.value.trim()]);
                      input.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Conditions (for decision nodes) */}
          {['condition', 'multiple_choice', 'exclusive_gateway'].includes(node.data.blockType) && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Условия</h3>
                {(node.data.conditions || []).map((condition, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={condition}
                      onChange={e => {
                        const newConditions = [...(node.data.conditions || [])];
                        newConditions[i] = e.target.value;
                        handleChange('conditions', newConditions);
                      }}
                      placeholder={`Условие ${i + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newConditions = [...(node.data.conditions || [])];
                        newConditions.splice(i, 1);
                        handleChange('conditions', newConditions);
                      }}
                    >
                      <LucideIcons.Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleChange('conditions', [...(node.data.conditions || []), ''])}
                >
                  <LucideIcons.Plus size={16} className="mr-1" />
                  Добавить условие
                </Button>
              </div>
              <Separator />
            </>
          )}

          {/* Position Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Позиция</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>X: {Math.round(node.position.x)}</div>
              <div>Y: {Math.round(node.position.y)}</div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t">
        <Button variant="destructive" onClick={onDelete} className="w-full">
          <LucideIcons.Trash2 size={16} className="mr-2" />
          Удалить блок
        </Button>
      </div>
    </div>
  );
}

// =============================================
// Edge Properties
// =============================================

interface EdgePropertiesProps {
  edge: Edge;
  onUpdate: (edgeId: string, data: { connectionType?: ConnectionType; label?: string; condition?: string }) => void;
  onDelete: () => void;
  className?: string;
}

function EdgeProperties({ edge, onUpdate, onDelete, className }: EdgePropertiesProps) {
  const connectionType = (edge.data?.connectionType as ConnectionType) || 'sequence';
  
  return (
    <div className={cn('flex flex-col h-full bg-background border-l', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
            <LucideIcons.ArrowRight size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Связь</h2>
            <p className="text-xs text-muted-foreground">Соединение блоков</p>
          </div>
        </div>
      </div>

      {/* Properties */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="connectionType">Тип связи</Label>
            <Select
              value={connectionType}
              onValueChange={(value: ConnectionType) => onUpdate(edge.id, { connectionType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequence">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5" style={{ backgroundColor: CONNECTION_STYLES.sequence.stroke }} />
                    Последовательный поток
                  </div>
                </SelectItem>
                <SelectItem value="data">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: CONNECTION_STYLES.data.stroke }} />
                    Поток данных
                  </div>
                </SelectItem>
                <SelectItem value="conditional">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5" style={{ backgroundColor: CONNECTION_STYLES.conditional.stroke }} />
                    Условный поток
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edgeLabel">Подпись</Label>
            <Input
              id="edgeLabel"
              value={edge.data?.label || ''}
              onChange={e => onUpdate(edge.id, { label: e.target.value })}
              placeholder="Подпись связи"
            />
          </div>

          {connectionType === 'conditional' && (
            <div className="space-y-2">
              <Label htmlFor="condition">Условие</Label>
              <Textarea
                id="condition"
                value={edge.data?.condition || ''}
                onChange={e => onUpdate(edge.id, { condition: e.target.value })}
                placeholder="Условие перехода..."
                rows={2}
              />
            </div>
          )}

          <Separator />

          {/* Connection Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Соединение</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>От: {edge.source}</p>
              <p>К: {edge.target}</p>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t">
        <Button variant="destructive" onClick={onDelete} className="w-full">
          <LucideIcons.Trash2 size={16} className="mr-2" />
          Удалить связь
        </Button>
      </div>
    </div>
  );
}

export default PropertiesPanel;
