import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useProcessBuilderStore } from '@/stores/processBuilderStore';
import {
  ProcessNodeData,
  getBlockDefinition,
  BLOCK_TYPES,
  CONNECTION_TYPES,
} from '@shared/processBuilder';
import * as LucideIcons from 'lucide-react';
import { Trash2, Plus, Copy, X } from 'lucide-react';
import { nanoid } from 'nanoid';

// Get icon component by name
const getIcon = (iconName: string, className?: string) => {
  const Icon = (LucideIcons as any)[iconName];
  if (!Icon) return null;
  return <Icon className={className} />;
};

interface PropertiesPanelProps {
  nodeId: string | null;
  language?: 'en' | 'ru';
}

export default function PropertiesPanel({ nodeId, language = 'ru' }: PropertiesPanelProps) {
  const nodes = useProcessBuilderStore((state) => state.nodes);
  const edges = useProcessBuilderStore((state) => state.edges);
  const updateNodeData = useProcessBuilderStore((state) => state.updateNodeData);
  const removeNodes = useProcessBuilderStore((state) => state.removeNodes);
  const duplicateNodes = useProcessBuilderStore((state) => state.duplicateNodes);
  const updateEdgeData = useProcessBuilderStore((state) => state.updateEdgeData);
  const setEdgeType = useProcessBuilderStore((state) => state.setEdgeType);
  const removeEdges = useProcessBuilderStore((state) => state.removeEdges);
  
  // Find the selected node
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === nodeId);
  }, [nodes, nodeId]);
  
  const nodeData = selectedNode?.data;
  const blockDef = useMemo(() => {
    return nodeData ? getBlockDefinition(nodeData.type as any) : null;
  }, [nodeData?.type]);
  
  // Get connected edges
  const connectedEdges = useMemo(() => {
    if (!nodeId) return [];
    return edges.filter((e) => e.source === nodeId || e.target === nodeId);
  }, [edges, nodeId]);
  
  // Handle field updates
  const handleUpdate = (field: keyof ProcessNodeData, value: any) => {
    if (nodeId) {
      updateNodeData(nodeId, { [field]: value });
    }
  };
  
  // Handle condition updates
  const handleConditionUpdate = (conditionId: string, field: string, value: string) => {
    if (!nodeId || !nodeData?.conditions) return;
    
    const updatedConditions = nodeData.conditions.map((c) =>
      c.id === conditionId ? { ...c, [field]: value } : c
    );
    updateNodeData(nodeId, { conditions: updatedConditions });
  };
  
  const addCondition = () => {
    if (!nodeId) return;
    
    const newCondition = {
      id: nanoid(),
      label: language === 'ru' ? 'Новое условие' : 'New condition',
      expression: '',
    };
    
    const currentConditions = nodeData?.conditions || [];
    updateNodeData(nodeId, { conditions: [...currentConditions, newCondition] });
  };
  
  const removeCondition = (conditionId: string) => {
    if (!nodeId || !nodeData?.conditions) return;
    
    const updatedConditions = nodeData.conditions.filter((c) => c.id !== conditionId);
    updateNodeData(nodeId, { conditions: updatedConditions });
  };
  
  // Handle input/output parameter updates
  const handleInputUpdate = (inputId: string, field: string, value: any) => {
    if (!nodeId || !nodeData?.inputs) return;
    
    const updatedInputs = nodeData.inputs.map((i) =>
      i.id === inputId ? { ...i, [field]: value } : i
    );
    updateNodeData(nodeId, { inputs: updatedInputs });
  };
  
  const addInput = () => {
    if (!nodeId) return;
    
    const newInput = {
      id: nanoid(),
      name: '',
      type: 'string',
      required: false,
    };
    
    const currentInputs = nodeData?.inputs || [];
    updateNodeData(nodeId, { inputs: [...currentInputs, newInput] });
  };
  
  const removeInput = (inputId: string) => {
    if (!nodeId || !nodeData?.inputs) return;
    
    const updatedInputs = nodeData.inputs.filter((i) => i.id !== inputId);
    updateNodeData(nodeId, { inputs: updatedInputs });
  };
  
  if (!nodeId || !selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {getIcon('MousePointer2', 'w-8 h-8')}
        </div>
        <p className="text-sm">
          {language === 'ru'
            ? 'Выберите блок для редактирования его свойств'
            : 'Select a block to edit its properties'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${nodeData?.color || blockDef?.color}20` }}
        >
          {getIcon(nodeData?.icon || blockDef?.icon || 'Box', 'w-4 h-4')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {blockDef?.name[language] || nodeData?.type}
          </div>
          <div className="text-xs text-muted-foreground">ID: {nodeId.slice(0, 8)}</div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => duplicateNodes([nodeId])}
            title={language === 'ru' ? 'Дублировать' : 'Duplicate'}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => removeNodes([nodeId])}
            title={language === 'ru' ? 'Удалить' : 'Delete'}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Basic Properties */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              {language === 'ru' ? 'Основные свойства' : 'Basic Properties'}
            </h4>
            
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                {language === 'ru' ? 'Название' : 'Name'} *
              </Label>
              <Input
                id="name"
                value={nodeData?.name || ''}
                onChange={(e) => handleUpdate('name', e.target.value)}
                placeholder={language === 'ru' ? 'Введите название' : 'Enter name'}
              />
            </div>
            
            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                {language === 'ru' ? 'Описание' : 'Description'}
              </Label>
              <Textarea
                id="description"
                value={nodeData?.description || ''}
                onChange={(e) => handleUpdate('description', e.target.value)}
                placeholder={language === 'ru' ? 'Введите описание' : 'Enter description'}
                rows={3}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Execution Properties */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              {language === 'ru' ? 'Параметры выполнения' : 'Execution Parameters'}
            </h4>
            
            {/* Responsible */}
            <div className="space-y-1.5">
              <Label htmlFor="responsible">
                {language === 'ru' ? 'Ответственный' : 'Responsible'}
              </Label>
              <Input
                id="responsible"
                value={nodeData?.responsible || ''}
                onChange={(e) => handleUpdate('responsible', e.target.value)}
                placeholder={language === 'ru' ? 'Роль или имя' : 'Role or name'}
              />
            </div>
            
            {/* Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="duration">
                {language === 'ru' ? 'Длительность' : 'Duration'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="durationMinutes"
                  type="number"
                  value={nodeData?.durationMinutes || ''}
                  onChange={(e) => handleUpdate('durationMinutes', parseInt(e.target.value) || undefined)}
                  placeholder="0"
                  className="w-20"
                />
                <Select
                  value={nodeData?.duration?.includes('час') || nodeData?.duration?.includes('hour') ? 'hours' : 'minutes'}
                  onValueChange={(v) => {
                    const mins = nodeData?.durationMinutes || 0;
                    const label = v === 'hours'
                      ? `${mins / 60} ${language === 'ru' ? 'час.' : 'hours'}`
                      : `${mins} ${language === 'ru' ? 'мин.' : 'min'}`;
                    handleUpdate('duration', label);
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">
                      {language === 'ru' ? 'мин' : 'min'}
                    </SelectItem>
                    <SelectItem value="hours">
                      {language === 'ru' ? 'час' : 'hours'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Conditions (for decision blocks) */}
          {(nodeData?.type === BLOCK_TYPES.CONDITION ||
            nodeData?.type === BLOCK_TYPES.MULTIPLE_CHOICE ||
            nodeData?.type === BLOCK_TYPES.EXCLUSIVE_GATEWAY) && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    {language === 'ru' ? 'Условия' : 'Conditions'}
                  </h4>
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="w-3 h-3 mr-1" />
                    {language === 'ru' ? 'Добавить' : 'Add'}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {(nodeData?.conditions || []).map((condition, index) => (
                    <div key={condition.id} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <Input
                          value={condition.label}
                          onChange={(e) =>
                            handleConditionUpdate(condition.id, 'label', e.target.value)
                          }
                          placeholder={language === 'ru' ? 'Метка' : 'Label'}
                          className="h-8"
                        />
                        <Input
                          value={condition.expression || ''}
                          onChange={(e) =>
                            handleConditionUpdate(condition.id, 'expression', e.target.value)
                          }
                          placeholder={language === 'ru' ? 'Выражение (опционально)' : 'Expression (optional)'}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => removeCondition(condition.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Input/Output Parameters */}
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="inputs">
              <AccordionTrigger className="text-sm">
                {language === 'ru' ? 'Входные параметры' : 'Input Parameters'}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {(nodeData?.inputs || []).map((input) => (
                    <div key={input.id} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <Input
                          value={input.name}
                          onChange={(e) =>
                            handleInputUpdate(input.id, 'name', e.target.value)
                          }
                          placeholder={language === 'ru' ? 'Название' : 'Name'}
                          className="h-8"
                        />
                        <div className="flex gap-2">
                          <Select
                            value={input.type}
                            onValueChange={(v) =>
                              handleInputUpdate(input.id, 'type', v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="object">Object</SelectItem>
                              <SelectItem value="array">Array</SelectItem>
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={input.required}
                              onChange={(e) =>
                                handleInputUpdate(input.id, 'required', e.target.checked)
                              }
                            />
                            {language === 'ru' ? 'Обяз.' : 'Req.'}
                          </label>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeInput(input.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addInput} className="w-full">
                    <Plus className="w-3 h-3 mr-1" />
                    {language === 'ru' ? 'Добавить параметр' : 'Add parameter'}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Tags */}
            <AccordionItem value="tags">
              <AccordionTrigger className="text-sm">
                {language === 'ru' ? 'Теги' : 'Tags'}
              </AccordionTrigger>
              <AccordionContent>
                <Input
                  value={(nodeData?.tags || []).join(', ')}
                  onChange={(e) =>
                    handleUpdate(
                      'tags',
                      e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                    )
                  }
                  placeholder={language === 'ru' ? 'Теги через запятую' : 'Comma-separated tags'}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          {/* Connected Edges */}
          {connectedEdges.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">
                  {language === 'ru' ? 'Связи' : 'Connections'} ({connectedEdges.length})
                </h4>
                <div className="space-y-2">
                  {connectedEdges.map((edge) => {
                    const isSource = edge.source === nodeId;
                    const otherNode = nodes.find(
                      (n) => n.id === (isSource ? edge.target : edge.source)
                    );
                    
                    return (
                      <div
                        key={edge.id}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">
                            {isSource
                              ? language === 'ru' ? 'К:' : 'To:'
                              : language === 'ru' ? 'От:' : 'From:'}
                          </div>
                          <div className="text-sm truncate">
                            {otherNode?.data.name || edge.id}
                          </div>
                        </div>
                        <Select
                          value={edge.data?.connectionType || CONNECTION_TYPES.SEQUENCE_FLOW}
                          onValueChange={(v) => setEdgeType(edge.id, v as any)}
                        >
                          <SelectTrigger className="w-28 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={CONNECTION_TYPES.SEQUENCE_FLOW}>
                              {language === 'ru' ? 'Поток' : 'Sequence'}
                            </SelectItem>
                            <SelectItem value={CONNECTION_TYPES.DATA_FLOW}>
                              {language === 'ru' ? 'Данные' : 'Data'}
                            </SelectItem>
                            <SelectItem value={CONNECTION_TYPES.CONDITIONAL_FLOW}>
                              {language === 'ru' ? 'Условие' : 'Conditional'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeEdges([edge.id])}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
