import React from 'react';
import { Node, MarkerType } from 'reactflow';

// =============================================
// Block Type Definitions
// =============================================

export type BlockCategory =
  | 'start_end'
  | 'actions'
  | 'decisions'
  | 'data'
  | 'events'
  | 'participants';

export type BlockType =
  // Start and End
  | 'start'
  | 'end'
  | 'entry_point'
  | 'exit_point'
  // Actions
  | 'task'
  | 'subprocess'
  | 'manual_action'
  | 'automated_action'
  | 'send_notification'
  | 'api_call'
  // Decisions
  | 'condition'
  | 'multiple_choice'
  | 'parallel_gateway'
  | 'exclusive_gateway'
  // Data
  | 'data_input'
  | 'data_output'
  | 'data_store'
  | 'document'
  // Events
  | 'timer_event'
  | 'signal_event'
  | 'error_event'
  | 'escalation_event'
  // Participants
  | 'role'
  | 'department'
  | 'external_system';

export type ConnectionType = 'sequence' | 'data' | 'conditional';

// =============================================
// Block Data Interface
// =============================================

export interface BlockData {
  label: string;
  description?: string;
  blockType: BlockType;
  responsible?: string;
  duration?: number; // in minutes
  conditions?: string[];
  inputParams?: { name: string; type: string }[];
  outputParams?: { name: string; type: string }[];
  tags?: string[];
  color?: string;
  icon?: string;
}

export interface ProcessNode extends Node<BlockData> {
  type: string;
}

export interface ProcessEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  markerEnd?: any;
  data?: {
    connectionType: ConnectionType;
    label?: string;
    condition?: string;
  };
  label?: string;
}

// =============================================
// Block Definitions with Icons and Colors
// =============================================

export interface BlockDefinition {
  type: BlockType;
  category: BlockCategory;
  name: string;
  nameRu: string;
  description: string;
  icon: string;
  color: string;
  defaultData: Partial<BlockData>;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // Start and End
  {
    type: 'start',
    category: 'start_end',
    name: 'Start',
    nameRu: 'Начало',
    description: 'Начальная точка процесса',
    icon: 'PlayCircle',
    color: '#22c55e',
    defaultData: { label: 'Начало' }
  },
  {
    type: 'end',
    category: 'start_end',
    name: 'End',
    nameRu: 'Конец',
    description: 'Конечная точка процесса',
    icon: 'StopCircle',
    color: '#ef4444',
    defaultData: { label: 'Конец' }
  },
  {
    type: 'entry_point',
    category: 'start_end',
    name: 'Entry Point',
    nameRu: 'Точка входа',
    description: 'Дополнительная точка входа в процесс',
    icon: 'LogIn',
    color: '#10b981',
    defaultData: { label: 'Точка входа' }
  },
  {
    type: 'exit_point',
    category: 'start_end',
    name: 'Exit Point',
    nameRu: 'Точка выхода',
    description: 'Дополнительная точка выхода из процесса',
    icon: 'LogOut',
    color: '#f97316',
    defaultData: { label: 'Точка выхода' }
  },

  // Actions
  {
    type: 'task',
    category: 'actions',
    name: 'Task',
    nameRu: 'Задача',
    description: 'Обычная задача в процессе',
    icon: 'CheckSquare',
    color: '#3b82f6',
    defaultData: { label: 'Новая задача', duration: 30 }
  },
  {
    type: 'subprocess',
    category: 'actions',
    name: 'Subprocess',
    nameRu: 'Подпроцесс',
    description: 'Вложенный процесс',
    icon: 'Layers',
    color: '#8b5cf6',
    defaultData: { label: 'Подпроцесс' }
  },
  {
    type: 'manual_action',
    category: 'actions',
    name: 'Manual Action',
    nameRu: 'Ручное действие',
    description: 'Действие, выполняемое человеком',
    icon: 'Hand',
    color: '#06b6d4',
    defaultData: { label: 'Ручное действие', duration: 15 }
  },
  {
    type: 'automated_action',
    category: 'actions',
    name: 'Automated Action',
    nameRu: 'Автоматическое действие',
    description: 'Автоматизированное действие',
    icon: 'Cpu',
    color: '#14b8a6',
    defaultData: { label: 'Автоматическое действие' }
  },
  {
    type: 'send_notification',
    category: 'actions',
    name: 'Send Notification',
    nameRu: 'Отправка уведомления',
    description: 'Отправка уведомления участникам',
    icon: 'Bell',
    color: '#f59e0b',
    defaultData: { label: 'Отправить уведомление' }
  },
  {
    type: 'api_call',
    category: 'actions',
    name: 'API Call',
    nameRu: 'Вызов API',
    description: 'Вызов внешнего API',
    icon: 'Globe',
    color: '#6366f1',
    defaultData: { label: 'Вызов API' }
  },

  // Decisions
  {
    type: 'condition',
    category: 'decisions',
    name: 'Condition',
    nameRu: 'Условие',
    description: 'Условное ветвление (да/нет)',
    icon: 'GitBranch',
    color: '#eab308',
    defaultData: { label: 'Условие' }
  },
  {
    type: 'multiple_choice',
    category: 'decisions',
    name: 'Multiple Choice',
    nameRu: 'Множественный выбор',
    description: 'Выбор из нескольких вариантов',
    icon: 'List',
    color: '#f97316',
    defaultData: { label: 'Множественный выбор' }
  },
  {
    type: 'parallel_gateway',
    category: 'decisions',
    name: 'Parallel Gateway',
    nameRu: 'Параллельное выполнение',
    description: 'Параллельное выполнение нескольких веток',
    icon: 'GitFork',
    color: '#84cc16',
    defaultData: { label: 'Параллельно' }
  },
  {
    type: 'exclusive_gateway',
    category: 'decisions',
    name: 'Exclusive Gateway',
    nameRu: 'Эксклюзивный выбор',
    description: 'Только одна ветка будет выполнена',
    icon: 'GitMerge',
    color: '#ec4899',
    defaultData: { label: 'Один из' }
  },

  // Data
  {
    type: 'data_input',
    category: 'data',
    name: 'Data Input',
    nameRu: 'Ввод данных',
    description: 'Ввод данных пользователем',
    icon: 'Download',
    color: '#0ea5e9',
    defaultData: { label: 'Ввод данных' }
  },
  {
    type: 'data_output',
    category: 'data',
    name: 'Data Output',
    nameRu: 'Вывод данных',
    description: 'Вывод данных из процесса',
    icon: 'Upload',
    color: '#0891b2',
    defaultData: { label: 'Вывод данных' }
  },
  {
    type: 'data_store',
    category: 'data',
    name: 'Data Store',
    nameRu: 'Хранилище данных',
    description: 'База данных или хранилище',
    icon: 'Database',
    color: '#7c3aed',
    defaultData: { label: 'Хранилище' }
  },
  {
    type: 'document',
    category: 'data',
    name: 'Document',
    nameRu: 'Документ',
    description: 'Документ в процессе',
    icon: 'FileText',
    color: '#a855f7',
    defaultData: { label: 'Документ' }
  },

  // Events
  {
    type: 'timer_event',
    category: 'events',
    name: 'Timer Event',
    nameRu: 'Таймер',
    description: 'Событие по таймеру',
    icon: 'Clock',
    color: '#f43f5e',
    defaultData: { label: 'Таймер' }
  },
  {
    type: 'signal_event',
    category: 'events',
    name: 'Signal Event',
    nameRu: 'Сигнал',
    description: 'Событие по сигналу',
    icon: 'Zap',
    color: '#facc15',
    defaultData: { label: 'Сигнал' }
  },
  {
    type: 'error_event',
    category: 'events',
    name: 'Error Event',
    nameRu: 'Ошибка',
    description: 'Обработка ошибки',
    icon: 'AlertTriangle',
    color: '#dc2626',
    defaultData: { label: 'Ошибка' }
  },
  {
    type: 'escalation_event',
    category: 'events',
    name: 'Escalation Event',
    nameRu: 'Эскалация',
    description: 'Событие эскалации',
    icon: 'ArrowUpCircle',
    color: '#ea580c',
    defaultData: { label: 'Эскалация' }
  },

  // Participants
  {
    type: 'role',
    category: 'participants',
    name: 'Role',
    nameRu: 'Роль',
    description: 'Участник с определенной ролью',
    icon: 'User',
    color: '#64748b',
    defaultData: { label: 'Роль' }
  },
  {
    type: 'department',
    category: 'participants',
    name: 'Department',
    nameRu: 'Отдел',
    description: 'Отдел организации',
    icon: 'Building2',
    color: '#475569',
    defaultData: { label: 'Отдел' }
  },
  {
    type: 'external_system',
    category: 'participants',
    name: 'External System',
    nameRu: 'Внешняя система',
    description: 'Внешняя система',
    icon: 'Server',
    color: '#334155',
    defaultData: { label: 'Внешняя система' }
  },
];

export const BLOCK_CATEGORIES: { id: BlockCategory; name: string; nameRu: string }[] = [
  { id: 'start_end', name: 'Start & End', nameRu: 'Начало и конец' },
  { id: 'actions', name: 'Actions', nameRu: 'Действия' },
  { id: 'decisions', name: 'Decisions', nameRu: 'Решения' },
  { id: 'data', name: 'Data', nameRu: 'Данные' },
  { id: 'events', name: 'Events', nameRu: 'События' },
  { id: 'participants', name: 'Participants', nameRu: 'Участники' },
];

export function getBlockDefinition(type: BlockType): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find(b => b.type === type);
}

export function getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter(b => b.category === category);
}

// =============================================
// Connection Styles
// =============================================

export const CONNECTION_STYLES: Record<ConnectionType, { 
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
  markerEnd: { type: MarkerType; color: string };
}> = {
  sequence: {
    stroke: '#64748b',
    strokeWidth: 2,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
  },
  data: {
    stroke: '#8b5cf6',
    strokeDasharray: '5,5',
    strokeWidth: 2,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
  },
  conditional: {
    stroke: '#f59e0b',
    strokeWidth: 2,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
  },
};

// =============================================
// Helper Functions
// =============================================

export function createNode(
  type: BlockType,
  position: { x: number; y: number },
  overrides?: Partial<BlockData>
): ProcessNode {
  const definition = getBlockDefinition(type);
  if (!definition) {
    throw new Error(`Unknown block type: ${type}`);
  }

  return {
    id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'processBlock',
    position,
    data: {
      label: definition.defaultData.label || definition.nameRu,
      blockType: type,
      color: definition.color,
      icon: definition.icon,
      ...definition.defaultData,
      ...overrides,
    },
  };
}

export function createEdge(
  sourceId: string,
  targetId: string,
  connectionType: ConnectionType = 'sequence',
  label?: string
): ProcessEdge {
  const style = CONNECTION_STYLES[connectionType];
  
  return {
    id: `edge_${sourceId}_${targetId}_${Date.now()}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
    animated: connectionType === 'conditional',
    style: {
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      strokeDasharray: style.strokeDasharray,
    },
    markerEnd: style.markerEnd,
    data: {
      connectionType,
      label,
    },
  };
}

// =============================================
// Validation Functions
// =============================================

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  type: 'error' | 'warning';
  message: string;
}

export function validateProcess(nodes: ProcessNode[], edges: ProcessEdge[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for start node
  const startNodes = nodes.filter(n => n.data.blockType === 'start');
  if (startNodes.length === 0) {
    errors.push({
      type: 'error',
      message: 'Процесс должен иметь начальный блок (Начало)',
    });
  } else if (startNodes.length > 1) {
    errors.push({
      type: 'warning',
      message: 'Процесс имеет несколько начальных блоков',
    });
  }

  // Check for end node
  const endNodes = nodes.filter(n => n.data.blockType === 'end');
  if (endNodes.length === 0) {
    errors.push({
      type: 'error',
      message: 'Процесс должен иметь конечный блок (Конец)',
    });
  }

  // Check for isolated nodes (no connections)
  nodes.forEach(node => {
    if (node.data.blockType === 'start') return; // Start can have no incoming
    if (node.data.blockType === 'end') return; // End can have no outgoing
    
    const hasIncoming = edges.some(e => e.target === node.id);
    const hasOutgoing = edges.some(e => e.source === node.id);
    
    if (!hasIncoming && !hasOutgoing) {
      errors.push({
        nodeId: node.id,
        type: 'warning',
        message: `Блок "${node.data.label}" не имеет связей`,
      });
    }
  });

  // Check that start has outgoing
  startNodes.forEach(node => {
    const hasOutgoing = edges.some(e => e.source === node.id);
    if (!hasOutgoing) {
      errors.push({
        nodeId: node.id,
        type: 'error',
        message: 'Начальный блок должен иметь исходящую связь',
      });
    }
  });

  // Check that end has incoming
  endNodes.forEach(node => {
    const hasIncoming = edges.some(e => e.target === node.id);
    if (!hasIncoming) {
      errors.push({
        nodeId: node.id,
        type: 'error',
        message: 'Конечный блок должен иметь входящую связь',
      });
    }
  });

  // Check for empty labels
  nodes.forEach(node => {
    if (!node.data.label || node.data.label.trim() === '') {
      errors.push({
        nodeId: node.id,
        type: 'warning',
        message: 'Блок не имеет названия',
      });
    }
  });

  return errors;
}

// =============================================
// Default Templates
// =============================================

export const DEFAULT_TEMPLATES = [
  {
    id: 'hiring',
    name: 'Процесс найма сотрудника',
    description: 'Стандартный процесс найма нового сотрудника',
    categoryId: 1,
    nodes: [
      createNode('start', { x: 250, y: 0 }),
      createNode('task', { x: 250, y: 100 }, { label: 'Заявка на вакансию' }),
      createNode('task', { x: 250, y: 200 }, { label: 'Публикация вакансии' }),
      createNode('task', { x: 250, y: 300 }, { label: 'Сбор резюме' }),
      createNode('task', { x: 250, y: 400 }, { label: 'Отбор кандидатов' }),
      createNode('condition', { x: 250, y: 500 }, { label: 'Есть подходящие?' }),
      createNode('task', { x: 100, y: 600 }, { label: 'Интервью' }),
      createNode('task', { x: 100, y: 700 }, { label: 'Оффер' }),
      createNode('end', { x: 100, y: 800 }),
      createNode('task', { x: 400, y: 600 }, { label: 'Повторный поиск' }),
    ],
  },
  {
    id: 'order',
    name: 'Обработка заказа',
    description: 'Стандартный процесс обработки заказа клиента',
    categoryId: 2,
    nodes: [
      createNode('start', { x: 250, y: 0 }),
      createNode('data_input', { x: 250, y: 100 }, { label: 'Получение заказа' }),
      createNode('task', { x: 250, y: 200 }, { label: 'Проверка наличия' }),
      createNode('condition', { x: 250, y: 300 }, { label: 'Товар в наличии?' }),
      createNode('task', { x: 100, y: 400 }, { label: 'Резервирование' }),
      createNode('task', { x: 100, y: 500 }, { label: 'Оплата' }),
      createNode('task', { x: 100, y: 600 }, { label: 'Доставка' }),
      createNode('end', { x: 100, y: 700 }),
      createNode('send_notification', { x: 400, y: 400 }, { label: 'Уведомление клиента' }),
    ],
  },
];

// =============================================
// Export/Import Functions
// =============================================

export interface ProcessExport {
  version: string;
  title: string;
  description?: string;
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    author?: string;
  };
}

export function exportProcess(
  title: string,
  nodes: ProcessNode[],
  edges: ProcessEdge[],
  description?: string,
  metadata?: ProcessExport['metadata']
): ProcessExport {
  return {
    version: '1.0',
    title,
    description,
    nodes,
    edges,
    metadata: {
      ...metadata,
      createdAt: metadata?.createdAt || new Date().toISOString(),
    },
  };
}

export function importProcess(json: string): ProcessExport {
  const data = JSON.parse(json);
  
  // Validate structure
  if (!data.nodes || !Array.isArray(data.nodes)) {
    throw new Error('Invalid process data: missing nodes array');
  }
  if (!data.edges || !Array.isArray(data.edges)) {
    throw new Error('Invalid process data: missing edges array');
  }
  
  return {
    version: data.version || '1.0',
    title: data.title || 'Imported Process',
    description: data.description,
    nodes: data.nodes,
    edges: data.edges,
    metadata: data.metadata,
  };
}
