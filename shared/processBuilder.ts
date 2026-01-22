/**
 * Process Builder Types
 * Defines all block types, properties, and process structure
 */

// Block Categories
export type BlockCategory =
  | "start_end"
  | "actions"
  | "decisions"
  | "data"
  | "events"
  | "participants";

// Block Types within categories
export type BlockType =
  // Start/End
  | "start"
  | "end"
  | "entry_point"
  | "exit_point"
  // Actions
  | "task"
  | "subprocess"
  | "manual_action"
  | "automated_action"
  | "send_notification"
  | "api_call"
  // Decisions
  | "condition"
  | "multiple_choice"
  | "parallel_gateway"
  | "exclusive_gateway"
  // Data
  | "data_input"
  | "data_output"
  | "data_store"
  | "document"
  // Events
  | "timer_event"
  | "signal_event"
  | "error_event"
  | "escalation_event"
  // Participants
  | "role"
  | "department"
  | "external_system";

// Connection Types
export type ConnectionType = "sequence" | "data_flow" | "conditional";

// Block Definition (from library)
export interface BlockDefinition {
  type: BlockType;
  category: BlockCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultWidth: number;
  defaultHeight: number;
  hasInputPort: boolean;
  hasOutputPort: boolean;
  maxInputs: number;
  maxOutputs: number;
}

// Process Block Instance (on canvas)
export interface ProcessBlock {
  id: string;
  type: BlockType;
  name: string;
  description?: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  // Properties
  responsible?: string;
  duration?: number; // in minutes
  durationUnit?: "minutes" | "hours" | "days";
  conditions?: string[];
  inputParams?: BlockParameter[];
  outputParams?: BlockParameter[];
  tags?: string[];
  color?: string;
  icon?: string;
  // For decision blocks
  conditionExpression?: string;
  // For subprocess blocks
  subprocessId?: number;
  // For API call blocks
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST" | "PUT" | "DELETE";
  // For timer events
  timerType?: "duration" | "date" | "cycle";
  timerValue?: string;
  // For document blocks
  documentType?: string;
  documentTemplate?: string;
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export interface BlockParameter {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "date" | "object" | "array";
  required?: boolean;
  defaultValue?: any;
  description?: string;
}

// Connection between blocks
export interface ProcessConnection {
  id: string;
  sourceBlockId: string;
  targetBlockId: string;
  type: ConnectionType;
  label?: string;
  condition?: string;
  // For visual routing
  waypoints?: { x: number; y: number }[];
  animated?: boolean;
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
}

// Comment on process or block
export interface ProcessComment {
  id: string;
  blockId?: string; // null for process-level comments
  userId: number;
  userName?: string;
  content: string;
  parentCommentId?: string; // for threading
  mentions?: number[]; // user IDs mentioned
  createdAt: string;
  updatedAt?: string;
}

// Group of blocks
export interface ProcessGroup {
  id: string;
  name: string;
  blockIds: string[];
  color?: string;
  collapsed?: boolean;
}

// Full process structure
export interface ProcessDiagram {
  id?: number;
  version: number;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility: "private" | "public";
  // Canvas data
  blocks: ProcessBlock[];
  connections: ProcessConnection[];
  groups?: ProcessGroup[];
  // Metadata
  viewport?: { x: number; y: number; zoom: number };
  gridEnabled?: boolean;
  snapToGrid?: boolean;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: "missing_start" | "missing_end" | "isolated_block" | "invalid_connection" | "missing_field" | "circular_dependency";
  blockId?: string;
  connectionId?: string;
  message: string;
}

export interface ValidationWarning {
  type: "duplicate_name" | "long_path" | "potential_loop" | "unused_block";
  blockId?: string;
  message: string;
}

// Process template
export interface ProcessTemplateData {
  id?: number;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  diagram: ProcessDiagram;
  isBuiltIn?: boolean;
  usageCount?: number;
  rating?: number;
}

// Export formats
export type ExportFormat = "json" | "pdf" | "png" | "svg" | "bpmn" | "markdown" | "html";

export interface ExportOptions {
  format: ExportFormat;
  includeDescription?: boolean;
  includeMetadata?: boolean;
  includeLogo?: string;
  pageSize?: "A4" | "A3" | "letter";
  orientation?: "portrait" | "landscape";
}

// Block library with all predefined blocks
export const BLOCK_LIBRARY: BlockDefinition[] = [
  // Start/End blocks
  {
    type: "start",
    category: "start_end",
    name: "Начало процесса",
    description: "Точка входа в процесс",
    icon: "Play",
    color: "#22c55e",
    defaultWidth: 120,
    defaultHeight: 60,
    hasInputPort: false,
    hasOutputPort: true,
    maxInputs: 0,
    maxOutputs: 1,
  },
  {
    type: "end",
    category: "start_end",
    name: "Завершение процесса",
    description: "Точка завершения процесса",
    icon: "Square",
    color: "#ef4444",
    defaultWidth: 120,
    defaultHeight: 60,
    hasInputPort: true,
    hasOutputPort: false,
    maxInputs: -1,
    maxOutputs: 0,
  },
  {
    type: "entry_point",
    category: "start_end",
    name: "Точка входа",
    description: "Дополнительная точка входа в процесс",
    icon: "LogIn",
    color: "#16a34a",
    defaultWidth: 120,
    defaultHeight: 60,
    hasInputPort: false,
    hasOutputPort: true,
    maxInputs: 0,
    maxOutputs: 1,
  },
  {
    type: "exit_point",
    category: "start_end",
    name: "Точка выхода",
    description: "Дополнительная точка выхода из процесса",
    icon: "LogOut",
    color: "#dc2626",
    defaultWidth: 120,
    defaultHeight: 60,
    hasInputPort: true,
    hasOutputPort: false,
    maxInputs: -1,
    maxOutputs: 0,
  },

  // Action blocks
  {
    type: "task",
    category: "actions",
    name: "Задача",
    description: "Обычная задача, выполняемая пользователем",
    icon: "CheckSquare",
    color: "#3b82f6",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "subprocess",
    category: "actions",
    name: "Подпроцесс",
    description: "Ссылка на другой бизнес-процесс",
    icon: "GitBranch",
    color: "#6366f1",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "manual_action",
    category: "actions",
    name: "Ручное действие",
    description: "Действие, выполняемое вручную",
    icon: "Hand",
    color: "#8b5cf6",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "automated_action",
    category: "actions",
    name: "Автоматическое действие",
    description: "Автоматизированное действие системы",
    icon: "Zap",
    color: "#f59e0b",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "send_notification",
    category: "actions",
    name: "Отправка уведомления",
    description: "Отправка email, SMS или push-уведомления",
    icon: "Bell",
    color: "#ec4899",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "api_call",
    category: "actions",
    name: "Вызов API",
    description: "Интеграция с внешней системой через API",
    icon: "Globe",
    color: "#06b6d4",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },

  // Decision blocks
  {
    type: "condition",
    category: "decisions",
    name: "Условие",
    description: "Ветвление на основе условия (да/нет)",
    icon: "GitFork",
    color: "#eab308",
    defaultWidth: 140,
    defaultHeight: 100,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: 2,
  },
  {
    type: "multiple_choice",
    category: "decisions",
    name: "Множественный выбор",
    description: "Ветвление на несколько путей",
    icon: "List",
    color: "#f97316",
    defaultWidth: 140,
    defaultHeight: 100,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "parallel_gateway",
    category: "decisions",
    name: "Параллельное выполнение",
    description: "Разделение на параллельные ветки",
    icon: "GitMerge",
    color: "#84cc16",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "exclusive_gateway",
    category: "decisions",
    name: "Эксклюзивный выбор",
    description: "Выбор только одного пути из нескольких",
    icon: "XCircle",
    color: "#f43f5e",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },

  // Data blocks
  {
    type: "data_input",
    category: "data",
    name: "Ввод данных",
    description: "Получение данных от пользователя или системы",
    icon: "FileInput",
    color: "#0ea5e9",
    defaultWidth: 160,
    defaultHeight: 70,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "data_output",
    category: "data",
    name: "Вывод данных",
    description: "Отправка данных пользователю или системе",
    icon: "FileOutput",
    color: "#14b8a6",
    defaultWidth: 160,
    defaultHeight: 70,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "data_store",
    category: "data",
    name: "Хранилище данных",
    description: "База данных или файловое хранилище",
    icon: "Database",
    color: "#64748b",
    defaultWidth: 160,
    defaultHeight: 70,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },
  {
    type: "document",
    category: "data",
    name: "Документ",
    description: "Создание или обработка документа",
    icon: "FileText",
    color: "#a855f7",
    defaultWidth: 160,
    defaultHeight: 70,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: -1,
    maxOutputs: -1,
  },

  // Event blocks
  {
    type: "timer_event",
    category: "events",
    name: "Таймер",
    description: "Ожидание определенного времени или интервала",
    icon: "Clock",
    color: "#f472b6",
    defaultWidth: 100,
    defaultHeight: 100,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: 1,
    maxOutputs: 1,
  },
  {
    type: "signal_event",
    category: "events",
    name: "Сигнал",
    description: "Ожидание внешнего сигнала или триггера",
    icon: "Radio",
    color: "#818cf8",
    defaultWidth: 100,
    defaultHeight: 100,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: 1,
    maxOutputs: 1,
  },
  {
    type: "error_event",
    category: "events",
    name: "Ошибка",
    description: "Обработка ошибки в процессе",
    icon: "AlertTriangle",
    color: "#ef4444",
    defaultWidth: 100,
    defaultHeight: 100,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: 1,
    maxOutputs: 1,
  },
  {
    type: "escalation_event",
    category: "events",
    name: "Эскалация",
    description: "Эскалация задачи на вышестоящий уровень",
    icon: "ArrowUp",
    color: "#fb923c",
    defaultWidth: 100,
    defaultHeight: 100,
    hasInputPort: true,
    hasOutputPort: true,
    maxInputs: 1,
    maxOutputs: 1,
  },

  // Participant blocks
  {
    type: "role",
    category: "participants",
    name: "Роль",
    description: "Исполнитель или роль в процессе",
    icon: "User",
    color: "#10b981",
    defaultWidth: 140,
    defaultHeight: 60,
    hasInputPort: false,
    hasOutputPort: false,
    maxInputs: 0,
    maxOutputs: 0,
  },
  {
    type: "department",
    category: "participants",
    name: "Отдел",
    description: "Отдел или подразделение организации",
    icon: "Building",
    color: "#0d9488",
    defaultWidth: 140,
    defaultHeight: 60,
    hasInputPort: false,
    hasOutputPort: false,
    maxInputs: 0,
    maxOutputs: 0,
  },
  {
    type: "external_system",
    category: "participants",
    name: "Внешняя система",
    description: "Внешняя интегрированная система",
    icon: "Server",
    color: "#7c3aed",
    defaultWidth: 140,
    defaultHeight: 60,
    hasInputPort: false,
    hasOutputPort: false,
    maxInputs: 0,
    maxOutputs: 0,
  },
];

// Category labels and colors
export const BLOCK_CATEGORIES = {
  start_end: { name: "Начало и завершение", color: "#22c55e", icon: "Flag" },
  actions: { name: "Действия", color: "#3b82f6", icon: "Zap" },
  decisions: { name: "Решения", color: "#eab308", icon: "GitFork" },
  data: { name: "Данные", color: "#0ea5e9", icon: "Database" },
  events: { name: "События", color: "#f472b6", icon: "Bell" },
  participants: { name: "Участники", color: "#10b981", icon: "Users" },
} as const;

// Default process template categories
export const PROCESS_CATEGORIES = [
  { id: "hr", name: "HR и управление персоналом", color: "#8b5cf6" },
  { id: "sales", name: "Продажи и маркетинг", color: "#3b82f6" },
  { id: "finance", name: "Финансы и бухгалтерия", color: "#22c55e" },
  { id: "production", name: "Производство и логистика", color: "#f59e0b" },
  { id: "it", name: "IT и техническая поддержка", color: "#06b6d4" },
  { id: "projects", name: "Управление проектами", color: "#ec4899" },
  { id: "support", name: "Обслуживание клиентов", color: "#14b8a6" },
  { id: "other", name: "Другое", color: "#64748b" },
] as const;
