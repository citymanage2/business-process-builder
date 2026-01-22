// Process Builder Types

// Block Categories
export const BLOCK_CATEGORIES = {
  START_END: 'start_end',
  ACTIONS: 'actions',
  DECISIONS: 'decisions',
  DATA: 'data',
  EVENTS: 'events',
  PARTICIPANTS: 'participants',
} as const;

export type BlockCategory = typeof BLOCK_CATEGORIES[keyof typeof BLOCK_CATEGORIES];

// Block Types
export const BLOCK_TYPES = {
  // Start and End
  START: 'start',
  END: 'end',
  ENTRY_POINT: 'entry_point',
  EXIT_POINT: 'exit_point',
  
  // Actions
  TASK: 'task',
  SUBPROCESS: 'subprocess',
  MANUAL_ACTION: 'manual_action',
  AUTOMATED_ACTION: 'automated_action',
  SEND_NOTIFICATION: 'send_notification',
  API_CALL: 'api_call',
  
  // Decisions
  CONDITION: 'condition',
  MULTIPLE_CHOICE: 'multiple_choice',
  PARALLEL_GATEWAY: 'parallel_gateway',
  EXCLUSIVE_GATEWAY: 'exclusive_gateway',
  
  // Data
  DATA_INPUT: 'data_input',
  DATA_OUTPUT: 'data_output',
  DATA_STORE: 'data_store',
  DOCUMENT: 'document',
  
  // Events
  TIMER_EVENT: 'timer_event',
  SIGNAL_EVENT: 'signal_event',
  ERROR_EVENT: 'error_event',
  ESCALATION_EVENT: 'escalation_event',
  
  // Participants
  ROLE: 'role',
  DEPARTMENT: 'department',
  EXTERNAL_SYSTEM: 'external_system',
} as const;

export type BlockType = typeof BLOCK_TYPES[keyof typeof BLOCK_TYPES];

// Connection Types
export const CONNECTION_TYPES = {
  SEQUENCE_FLOW: 'sequence_flow',
  DATA_FLOW: 'data_flow',
  CONDITIONAL_FLOW: 'conditional_flow',
} as const;

export type ConnectionType = typeof CONNECTION_TYPES[keyof typeof CONNECTION_TYPES];

// Block Definition (for library)
export interface BlockDefinition {
  type: BlockType;
  category: BlockCategory;
  name: {
    en: string;
    ru: string;
  };
  description: {
    en: string;
    ru: string;
  };
  icon: string; // lucide-react icon name
  color: string; // Hex color for the block
  shape: 'rectangle' | 'diamond' | 'oval' | 'parallelogram' | 'hexagon' | 'circle';
  hasInputs: boolean;
  hasOutputs: boolean;
  maxInputs?: number;
  maxOutputs?: number;
  defaultWidth: number;
  defaultHeight: number;
}

// Node data stored in process
export interface ProcessNodeData {
  id: string;
  type: BlockType;
  
  // Basic properties
  name: string;
  description?: string;
  
  // Visual properties
  color?: string;
  icon?: string;
  
  // Responsibility
  responsible?: string; // Role or user
  
  // Timing
  duration?: string; // e.g., "2 hours", "3 days"
  durationMinutes?: number;
  
  // Conditions (for decisions)
  conditions?: {
    id: string;
    label: string;
    expression?: string;
  }[];
  
  // Input/Output parameters
  inputs?: {
    id: string;
    name: string;
    type: string;
    required: boolean;
  }[];
  outputs?: {
    id: string;
    name: string;
    type: string;
  }[];
  
  // Tags for categorization
  tags?: string[];
  
  // Subprocess reference
  subprocessId?: number;
  
  // Custom properties (JSON)
  customData?: Record<string, any>;
}

// Node position and dimensions
export interface ProcessNode {
  id: string;
  type: string; // ReactFlow node type
  position: {
    x: number;
    y: number;
  };
  data: ProcessNodeData;
  width?: number;
  height?: number;
  selected?: boolean;
  dragging?: boolean;
}

// Edge/Connection
export interface ProcessEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: ConnectionType;
  animated?: boolean;
  label?: string;
  labelStyle?: Record<string, any>;
  style?: Record<string, any>;
  data?: {
    condition?: string;
    description?: string;
  };
}

// Viewport
export interface ProcessViewport {
  x: number;
  y: number;
  zoom: number;
}

// Complete process data
export interface ProcessData {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  viewport?: ProcessViewport;
}

// Validation error
export interface ValidationError {
  type: 'error' | 'warning';
  nodeId?: string;
  edgeId?: string;
  message: {
    en: string;
    ru: string;
  };
  code: string;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Block library definition
export const BLOCK_LIBRARY: BlockDefinition[] = [
  // Start and End
  {
    type: BLOCK_TYPES.START,
    category: BLOCK_CATEGORIES.START_END,
    name: { en: 'Start', ru: 'Начало' },
    description: { en: 'Process start point', ru: 'Начальная точка процесса' },
    icon: 'Play',
    color: '#22c55e',
    shape: 'oval',
    hasInputs: false,
    hasOutputs: true,
    maxOutputs: 1,
    defaultWidth: 120,
    defaultHeight: 60,
  },
  {
    type: BLOCK_TYPES.END,
    category: BLOCK_CATEGORIES.START_END,
    name: { en: 'End', ru: 'Завершение' },
    description: { en: 'Process end point', ru: 'Конечная точка процесса' },
    icon: 'Square',
    color: '#ef4444',
    shape: 'oval',
    hasInputs: true,
    hasOutputs: false,
    defaultWidth: 120,
    defaultHeight: 60,
  },
  {
    type: BLOCK_TYPES.ENTRY_POINT,
    category: BLOCK_CATEGORIES.START_END,
    name: { en: 'Entry Point', ru: 'Точка входа' },
    description: { en: 'Alternative entry point', ru: 'Альтернативная точка входа' },
    icon: 'LogIn',
    color: '#84cc16',
    shape: 'circle',
    hasInputs: false,
    hasOutputs: true,
    defaultWidth: 60,
    defaultHeight: 60,
  },
  {
    type: BLOCK_TYPES.EXIT_POINT,
    category: BLOCK_CATEGORIES.START_END,
    name: { en: 'Exit Point', ru: 'Точка выхода' },
    description: { en: 'Alternative exit point', ru: 'Альтернативная точка выхода' },
    icon: 'LogOut',
    color: '#f97316',
    shape: 'circle',
    hasInputs: true,
    hasOutputs: false,
    defaultWidth: 60,
    defaultHeight: 60,
  },
  
  // Actions
  {
    type: BLOCK_TYPES.TASK,
    category: BLOCK_CATEGORIES.ACTIONS,
    name: { en: 'Task', ru: 'Задача' },
    description: { en: 'A task or activity', ru: 'Задача или действие' },
    icon: 'CheckSquare',
    color: '#3b82f6',
    shape: 'rectangle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 180,
    defaultHeight: 80,
  },
  {
    type: BLOCK_TYPES.SUBPROCESS,
    category: BLOCK_CATEGORIES.ACTIONS,
    name: { en: 'Subprocess', ru: 'Подпроцесс' },
    description: { en: 'Reference to another process', ru: 'Ссылка на другой процесс' },
    icon: 'GitBranch',
    color: '#6366f1',
    shape: 'rectangle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 180,
    defaultHeight: 80,
  },
  {
    type: BLOCK_TYPES.MANUAL_ACTION,
    category: BLOCK_CATEGORIES.ACTIONS,
    name: { en: 'Manual Action', ru: 'Ручное действие' },
    description: { en: 'Action performed by a person', ru: 'Действие, выполняемое человеком' },
    icon: 'Hand',
    color: '#8b5cf6',
    shape: 'rectangle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 180,
    defaultHeight: 80,
  },
  {
    type: BLOCK_TYPES.AUTOMATED_ACTION,
    category: BLOCK_CATEGORIES.ACTIONS,
    name: { en: 'Automated Action', ru: 'Автоматическое действие' },
    description: { en: 'Automated system action', ru: 'Автоматическое системное действие' },
    icon: 'Cpu',
    color: '#0ea5e9',
    shape: 'rectangle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 180,
    defaultHeight: 80,
  },
  {
    type: BLOCK_TYPES.SEND_NOTIFICATION,
    category: BLOCK_CATEGORIES.ACTIONS,
    name: { en: 'Send Notification', ru: 'Отправка уведомления' },
    description: { en: 'Send email, SMS, or push notification', ru: 'Отправка email, SMS или push-уведомления' },
    icon: 'Bell',
    color: '#14b8a6',
    shape: 'rectangle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 180,
    defaultHeight: 80,
  },
  {
    type: BLOCK_TYPES.API_CALL,
    category: BLOCK_CATEGORIES.ACTIONS,
    name: { en: 'API Call', ru: 'Вызов API' },
    description: { en: 'External API integration', ru: 'Интеграция с внешним API' },
    icon: 'Globe',
    color: '#06b6d4',
    shape: 'rectangle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 180,
    defaultHeight: 80,
  },
  
  // Decisions
  {
    type: BLOCK_TYPES.CONDITION,
    category: BLOCK_CATEGORIES.DECISIONS,
    name: { en: 'Condition', ru: 'Условие' },
    description: { en: 'Decision point with yes/no outcome', ru: 'Точка принятия решения да/нет' },
    icon: 'HelpCircle',
    color: '#f59e0b',
    shape: 'diamond',
    hasInputs: true,
    hasOutputs: true,
    maxOutputs: 2,
    defaultWidth: 120,
    defaultHeight: 120,
  },
  {
    type: BLOCK_TYPES.MULTIPLE_CHOICE,
    category: BLOCK_CATEGORIES.DECISIONS,
    name: { en: 'Multiple Choice', ru: 'Множественный выбор' },
    description: { en: 'Decision with multiple outcomes', ru: 'Решение с несколькими исходами' },
    icon: 'ListTree',
    color: '#eab308',
    shape: 'diamond',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 120,
    defaultHeight: 120,
  },
  {
    type: BLOCK_TYPES.PARALLEL_GATEWAY,
    category: BLOCK_CATEGORIES.DECISIONS,
    name: { en: 'Parallel Gateway', ru: 'Параллельное выполнение' },
    description: { en: 'Execute branches in parallel', ru: 'Параллельное выполнение веток' },
    icon: 'GitFork',
    color: '#a855f7',
    shape: 'diamond',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 80,
    defaultHeight: 80,
  },
  {
    type: BLOCK_TYPES.EXCLUSIVE_GATEWAY,
    category: BLOCK_CATEGORIES.DECISIONS,
    name: { en: 'Exclusive Gateway', ru: 'Эксклюзивный выбор' },
    description: { en: 'Only one branch is executed', ru: 'Выполняется только одна ветка' },
    icon: 'GitMerge',
    color: '#d946ef',
    shape: 'diamond',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 80,
    defaultHeight: 80,
  },
  
  // Data
  {
    type: BLOCK_TYPES.DATA_INPUT,
    category: BLOCK_CATEGORIES.DATA,
    name: { en: 'Data Input', ru: 'Ввод данных' },
    description: { en: 'Input data into the process', ru: 'Ввод данных в процесс' },
    icon: 'FileInput',
    color: '#10b981',
    shape: 'parallelogram',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 160,
    defaultHeight: 70,
  },
  {
    type: BLOCK_TYPES.DATA_OUTPUT,
    category: BLOCK_CATEGORIES.DATA,
    name: { en: 'Data Output', ru: 'Вывод данных' },
    description: { en: 'Output data from the process', ru: 'Вывод данных из процесса' },
    icon: 'FileOutput',
    color: '#059669',
    shape: 'parallelogram',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 160,
    defaultHeight: 70,
  },
  {
    type: BLOCK_TYPES.DATA_STORE,
    category: BLOCK_CATEGORIES.DATA,
    name: { en: 'Data Store', ru: 'Хранилище данных' },
    description: { en: 'Database or storage', ru: 'База данных или хранилище' },
    icon: 'Database',
    color: '#047857',
    shape: 'rectangle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 140,
    defaultHeight: 70,
  },
  {
    type: BLOCK_TYPES.DOCUMENT,
    category: BLOCK_CATEGORIES.DATA,
    name: { en: 'Document', ru: 'Документ' },
    description: { en: 'Document or file', ru: 'Документ или файл' },
    icon: 'FileText',
    color: '#065f46',
    shape: 'rectangle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 140,
    defaultHeight: 70,
  },
  
  // Events
  {
    type: BLOCK_TYPES.TIMER_EVENT,
    category: BLOCK_CATEGORIES.EVENTS,
    name: { en: 'Timer', ru: 'Таймер' },
    description: { en: 'Time-based trigger', ru: 'Триггер по времени' },
    icon: 'Clock',
    color: '#ec4899',
    shape: 'circle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 60,
    defaultHeight: 60,
  },
  {
    type: BLOCK_TYPES.SIGNAL_EVENT,
    category: BLOCK_CATEGORIES.EVENTS,
    name: { en: 'Signal', ru: 'Сигнал' },
    description: { en: 'Signal-based trigger', ru: 'Триггер по сигналу' },
    icon: 'Radio',
    color: '#db2777',
    shape: 'circle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 60,
    defaultHeight: 60,
  },
  {
    type: BLOCK_TYPES.ERROR_EVENT,
    category: BLOCK_CATEGORIES.EVENTS,
    name: { en: 'Error', ru: 'Ошибка' },
    description: { en: 'Error handling event', ru: 'Обработка ошибки' },
    icon: 'AlertTriangle',
    color: '#dc2626',
    shape: 'circle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 60,
    defaultHeight: 60,
  },
  {
    type: BLOCK_TYPES.ESCALATION_EVENT,
    category: BLOCK_CATEGORIES.EVENTS,
    name: { en: 'Escalation', ru: 'Эскалация' },
    description: { en: 'Escalation trigger', ru: 'Триггер эскалации' },
    icon: 'ArrowUpCircle',
    color: '#b91c1c',
    shape: 'circle',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 60,
    defaultHeight: 60,
  },
  
  // Participants
  {
    type: BLOCK_TYPES.ROLE,
    category: BLOCK_CATEGORIES.PARTICIPANTS,
    name: { en: 'Role', ru: 'Роль' },
    description: { en: 'Process participant role', ru: 'Роль участника процесса' },
    icon: 'User',
    color: '#64748b',
    shape: 'hexagon',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 140,
    defaultHeight: 70,
  },
  {
    type: BLOCK_TYPES.DEPARTMENT,
    category: BLOCK_CATEGORIES.DECISIONS,
    name: { en: 'Department', ru: 'Отдел' },
    description: { en: 'Department or team', ru: 'Отдел или команда' },
    icon: 'Users',
    color: '#475569',
    shape: 'hexagon',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 140,
    defaultHeight: 70,
  },
  {
    type: BLOCK_TYPES.EXTERNAL_SYSTEM,
    category: BLOCK_CATEGORIES.PARTICIPANTS,
    name: { en: 'External System', ru: 'Внешняя система' },
    description: { en: 'External system integration', ru: 'Интеграция с внешней системой' },
    icon: 'Server',
    color: '#334155',
    shape: 'hexagon',
    hasInputs: true,
    hasOutputs: true,
    defaultWidth: 140,
    defaultHeight: 70,
  },
];

// Get block definition by type
export function getBlockDefinition(type: BlockType): BlockDefinition | undefined {
  return BLOCK_LIBRARY.find(b => b.type === type);
}

// Get blocks by category
export function getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
  return BLOCK_LIBRARY.filter(b => b.category === category);
}

// Process categories for filtering
export const PROCESS_CATEGORIES = [
  { id: 'hr', name: { en: 'HR & Personnel', ru: 'HR и управление персоналом' }, icon: 'Users', color: '#3b82f6' },
  { id: 'sales', name: { en: 'Sales & Marketing', ru: 'Продажи и маркетинг' }, icon: 'TrendingUp', color: '#22c55e' },
  { id: 'finance', name: { en: 'Finance & Accounting', ru: 'Финансы и бухгалтерия' }, icon: 'DollarSign', color: '#f59e0b' },
  { id: 'production', name: { en: 'Production & Logistics', ru: 'Производство и логистика' }, icon: 'Package', color: '#8b5cf6' },
  { id: 'it', name: { en: 'IT & Technical Support', ru: 'IT и техническая поддержка' }, icon: 'Monitor', color: '#06b6d4' },
  { id: 'projects', name: { en: 'Project Management', ru: 'Управление проектами' }, icon: 'Kanban', color: '#ec4899' },
  { id: 'customer', name: { en: 'Customer Service', ru: 'Обслуживание клиентов' }, icon: 'HeadphonesIcon', color: '#14b8a6' },
] as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  UNDO: 'ctrl+z',
  REDO: 'ctrl+y',
  COPY: 'ctrl+c',
  PASTE: 'ctrl+v',
  CUT: 'ctrl+x',
  DELETE: 'delete',
  SELECT_ALL: 'ctrl+a',
  SAVE: 'ctrl+s',
  ZOOM_IN: 'ctrl+=',
  ZOOM_OUT: 'ctrl+-',
  ZOOM_RESET: 'ctrl+0',
  FIT_VIEW: 'ctrl+1',
} as const;
