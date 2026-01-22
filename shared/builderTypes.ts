// Block types available in the builder
export const BLOCK_CATEGORIES = {
  START_END: {
    label: "Start & End",
    labelRu: "Начало и завершение",
    types: ["start", "end", "entry_point", "exit_point"] as const
  },
  ACTIONS: {
    label: "Actions",
    labelRu: "Действия",
    types: ["task", "subprocess", "manual_action", "automated_action", "send_notification", "api_call"] as const
  },
  DECISIONS: {
    label: "Decisions",
    labelRu: "Решения",
    types: ["condition", "multiple_choice", "parallel_gateway", "exclusive_gateway"] as const
  },
  DATA: {
    label: "Data",
    labelRu: "Данные",
    types: ["data_input", "data_output", "data_store", "document"] as const
  },
  EVENTS: {
    label: "Events",
    labelRu: "События",
    types: ["timer_event", "signal_event", "error_event", "escalation_event"] as const
  },
  PARTICIPANTS: {
    label: "Participants",
    labelRu: "Участники",
    types: ["role", "department", "external_system"] as const
  }
} as const;

export type BlockType = 
  | "start" | "end" | "entry_point" | "exit_point"
  | "task" | "subprocess" | "manual_action" | "automated_action" | "send_notification" | "api_call"
  | "condition" | "multiple_choice" | "parallel_gateway" | "exclusive_gateway"
  | "data_input" | "data_output" | "data_store" | "document"
  | "timer_event" | "signal_event" | "error_event" | "escalation_event"
  | "role" | "department" | "external_system";

export type ConnectionType = "sequence_flow" | "data_flow" | "conditional_flow";

export interface BlockData {
  id: string;
  type: BlockType;
  name: string;
  description?: string;
  position: { x: number; y: number };
  data?: {
    responsible?: string;
    duration?: number;
    durationUnit?: "minutes" | "hours" | "days";
    condition?: string;
    inputs?: string[];
    outputs?: string[];
    tags?: string[];
    [key: string]: unknown;
  };
  style?: {
    color?: string;
    icon?: string;
    width?: number;
    height?: number;
  };
}

export interface ConnectionData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: ConnectionType;
  label?: string;
  data?: {
    condition?: string;
    [key: string]: unknown;
  };
}

export interface ProcessData {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  categoryId?: number;
  status: "draft" | "published" | "archived";
  visibility: "private" | "public";
  tags: string[];
  thumbnail?: string;
  currentVersion: number;
  viewCount: number;
  canvasSettings?: {
    zoom?: number;
    panX?: number;
    panY?: number;
    gridEnabled?: boolean;
  };
  blocksData: BlockData[];
  connectionsData: ConnectionData[];
  accessRole: string;
  createdAt: string;
  updatedAt: string;
}

// Block metadata for UI
export interface BlockMeta {
  type: BlockType;
  label: string;
  labelRu: string;
  description: string;
  descriptionRu: string;
  icon: string;
  color: string;
  category: keyof typeof BLOCK_CATEGORIES;
  defaultWidth: number;
  defaultHeight: number;
  hasInputHandle: boolean;
  hasOutputHandle: boolean;
  maxInputs?: number;
  maxOutputs?: number;
}

export const BLOCK_METADATA: Record<BlockType, BlockMeta> = {
  // Start & End
  start: {
    type: "start",
    label: "Start",
    labelRu: "Начало",
    description: "Process start point",
    descriptionRu: "Точка начала процесса",
    icon: "Play",
    color: "#22c55e",
    category: "START_END",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: false,
    hasOutputHandle: true,
    maxOutputs: 1
  },
  end: {
    type: "end",
    label: "End",
    labelRu: "Завершение",
    description: "Process end point",
    descriptionRu: "Точка завершения процесса",
    icon: "Square",
    color: "#ef4444",
    category: "START_END",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: false,
    maxInputs: 999
  },
  entry_point: {
    type: "entry_point",
    label: "Entry Point",
    labelRu: "Точка входа",
    description: "Alternative entry to the process",
    descriptionRu: "Альтернативный вход в процесс",
    icon: "LogIn",
    color: "#84cc16",
    category: "START_END",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: false,
    hasOutputHandle: true
  },
  exit_point: {
    type: "exit_point",
    label: "Exit Point",
    labelRu: "Точка выхода",
    description: "Alternative exit from the process",
    descriptionRu: "Альтернативный выход из процесса",
    icon: "LogOut",
    color: "#f97316",
    category: "START_END",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: false
  },
  // Actions
  task: {
    type: "task",
    label: "Task",
    labelRu: "Задача",
    description: "A work item to be performed",
    descriptionRu: "Рабочая задача для выполнения",
    icon: "CheckSquare",
    color: "#3b82f6",
    category: "ACTIONS",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  subprocess: {
    type: "subprocess",
    label: "Subprocess",
    labelRu: "Подпроцесс",
    description: "A nested process",
    descriptionRu: "Вложенный процесс",
    icon: "Layers",
    color: "#8b5cf6",
    category: "ACTIONS",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  manual_action: {
    type: "manual_action",
    label: "Manual Action",
    labelRu: "Ручное действие",
    description: "Action performed by a person",
    descriptionRu: "Действие, выполняемое человеком",
    icon: "Hand",
    color: "#06b6d4",
    category: "ACTIONS",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  automated_action: {
    type: "automated_action",
    label: "Automated Action",
    labelRu: "Автоматическое действие",
    description: "Action performed automatically",
    descriptionRu: "Автоматическое действие",
    icon: "Zap",
    color: "#eab308",
    category: "ACTIONS",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  send_notification: {
    type: "send_notification",
    label: "Send Notification",
    labelRu: "Отправить уведомление",
    description: "Send a notification to users",
    descriptionRu: "Отправить уведомление пользователям",
    icon: "Bell",
    color: "#f472b6",
    category: "ACTIONS",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  api_call: {
    type: "api_call",
    label: "API Call",
    labelRu: "Вызов API",
    description: "Call an external API",
    descriptionRu: "Вызов внешнего API",
    icon: "Globe",
    color: "#14b8a6",
    category: "ACTIONS",
    defaultWidth: 180,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  // Decisions
  condition: {
    type: "condition",
    label: "Condition",
    labelRu: "Условие",
    description: "Branch based on condition",
    descriptionRu: "Ветвление по условию",
    icon: "GitBranch",
    color: "#f59e0b",
    category: "DECISIONS",
    defaultWidth: 100,
    defaultHeight: 100,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  multiple_choice: {
    type: "multiple_choice",
    label: "Multiple Choice",
    labelRu: "Множественный выбор",
    description: "Branch to multiple paths",
    descriptionRu: "Ветвление на несколько путей",
    icon: "GitFork",
    color: "#d946ef",
    category: "DECISIONS",
    defaultWidth: 100,
    defaultHeight: 100,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  parallel_gateway: {
    type: "parallel_gateway",
    label: "Parallel Gateway",
    labelRu: "Параллельный шлюз",
    description: "Execute paths in parallel",
    descriptionRu: "Параллельное выполнение путей",
    icon: "GitMerge",
    color: "#6366f1",
    category: "DECISIONS",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  exclusive_gateway: {
    type: "exclusive_gateway",
    label: "Exclusive Gateway",
    labelRu: "Эксклюзивный шлюз",
    description: "Choose one path only",
    descriptionRu: "Выбор только одного пути",
    icon: "Split",
    color: "#ec4899",
    category: "DECISIONS",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  // Data
  data_input: {
    type: "data_input",
    label: "Data Input",
    labelRu: "Ввод данных",
    description: "Input data to the process",
    descriptionRu: "Ввод данных в процесс",
    icon: "FileInput",
    color: "#10b981",
    category: "DATA",
    defaultWidth: 140,
    defaultHeight: 70,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  data_output: {
    type: "data_output",
    label: "Data Output",
    labelRu: "Вывод данных",
    description: "Output data from the process",
    descriptionRu: "Вывод данных из процесса",
    icon: "FileOutput",
    color: "#0ea5e9",
    category: "DATA",
    defaultWidth: 140,
    defaultHeight: 70,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  data_store: {
    type: "data_store",
    label: "Data Store",
    labelRu: "Хранилище данных",
    description: "Store or retrieve data",
    descriptionRu: "Хранение или извлечение данных",
    icon: "Database",
    color: "#6366f1",
    category: "DATA",
    defaultWidth: 100,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  document: {
    type: "document",
    label: "Document",
    labelRu: "Документ",
    description: "A document in the process",
    descriptionRu: "Документ в процессе",
    icon: "FileText",
    color: "#64748b",
    category: "DATA",
    defaultWidth: 120,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  // Events
  timer_event: {
    type: "timer_event",
    label: "Timer Event",
    labelRu: "Таймер",
    description: "Wait for a time period",
    descriptionRu: "Ожидание временного периода",
    icon: "Clock",
    color: "#f97316",
    category: "EVENTS",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  signal_event: {
    type: "signal_event",
    label: "Signal Event",
    labelRu: "Сигнал",
    description: "Wait for a signal",
    descriptionRu: "Ожидание сигнала",
    icon: "Radio",
    color: "#8b5cf6",
    category: "EVENTS",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  error_event: {
    type: "error_event",
    label: "Error Event",
    labelRu: "Ошибка",
    description: "Handle an error",
    descriptionRu: "Обработка ошибки",
    icon: "AlertTriangle",
    color: "#ef4444",
    category: "EVENTS",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  escalation_event: {
    type: "escalation_event",
    label: "Escalation Event",
    labelRu: "Эскалация",
    description: "Escalate to higher level",
    descriptionRu: "Эскалация на более высокий уровень",
    icon: "ArrowUpCircle",
    color: "#dc2626",
    category: "EVENTS",
    defaultWidth: 80,
    defaultHeight: 80,
    hasInputHandle: true,
    hasOutputHandle: true
  },
  // Participants
  role: {
    type: "role",
    label: "Role",
    labelRu: "Роль",
    description: "A role in the process",
    descriptionRu: "Роль в процессе",
    icon: "User",
    color: "#06b6d4",
    category: "PARTICIPANTS",
    defaultWidth: 140,
    defaultHeight: 60,
    hasInputHandle: false,
    hasOutputHandle: false
  },
  department: {
    type: "department",
    label: "Department",
    labelRu: "Отдел",
    description: "A department or team",
    descriptionRu: "Отдел или команда",
    icon: "Users",
    color: "#0891b2",
    category: "PARTICIPANTS",
    defaultWidth: 160,
    defaultHeight: 60,
    hasInputHandle: false,
    hasOutputHandle: false
  },
  external_system: {
    type: "external_system",
    label: "External System",
    labelRu: "Внешняя система",
    description: "An external system",
    descriptionRu: "Внешняя система",
    icon: "Server",
    color: "#475569",
    category: "PARTICIPANTS",
    defaultWidth: 160,
    defaultHeight: 60,
    hasInputHandle: true,
    hasOutputHandle: true
  }
};

// Connection metadata
export const CONNECTION_METADATA: Record<ConnectionType, {
  label: string;
  labelRu: string;
  color: string;
  strokeStyle: "solid" | "dashed" | "dotted";
}> = {
  sequence_flow: {
    label: "Sequence Flow",
    labelRu: "Последовательный поток",
    color: "#64748b",
    strokeStyle: "solid"
  },
  data_flow: {
    label: "Data Flow",
    labelRu: "Поток данных",
    color: "#3b82f6",
    strokeStyle: "dashed"
  },
  conditional_flow: {
    label: "Conditional Flow",
    labelRu: "Условный поток",
    color: "#f59e0b",
    strokeStyle: "solid"
  }
};

// Predefined process categories
export const PROCESS_CATEGORIES = [
  { id: "hr", label: "HR & Personnel", labelRu: "HR и управление персоналом", icon: "Users", color: "#06b6d4" },
  { id: "sales", label: "Sales & Marketing", labelRu: "Продажи и маркетинг", icon: "TrendingUp", color: "#22c55e" },
  { id: "finance", label: "Finance & Accounting", labelRu: "Финансы и бухгалтерия", icon: "DollarSign", color: "#f59e0b" },
  { id: "production", label: "Production & Logistics", labelRu: "Производство и логистика", icon: "Package", color: "#8b5cf6" },
  { id: "it", label: "IT & Technical Support", labelRu: "IT и техническая поддержка", icon: "Monitor", color: "#3b82f6" },
  { id: "project", label: "Project Management", labelRu: "Управление проектами", icon: "Calendar", color: "#ec4899" },
  { id: "customer", label: "Customer Service", labelRu: "Обслуживание клиентов", icon: "Headphones", color: "#14b8a6" }
] as const;

// Validation error types
export interface ValidationError {
  type: "error" | "warning";
  blockId?: string;
  connectionId?: string;
  code: string;
  message: string;
  messageRu: string;
}

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  UNDO: { key: "z", ctrl: true, description: "Undo", descriptionRu: "Отменить" },
  REDO: { key: "y", ctrl: true, description: "Redo", descriptionRu: "Повторить" },
  COPY: { key: "c", ctrl: true, description: "Copy", descriptionRu: "Копировать" },
  PASTE: { key: "v", ctrl: true, description: "Paste", descriptionRu: "Вставить" },
  DELETE: { key: "Delete", description: "Delete selected", descriptionRu: "Удалить выбранное" },
  SELECT_ALL: { key: "a", ctrl: true, description: "Select all", descriptionRu: "Выбрать всё" },
  SAVE: { key: "s", ctrl: true, description: "Save", descriptionRu: "Сохранить" },
  ZOOM_IN: { key: "+", ctrl: true, description: "Zoom in", descriptionRu: "Увеличить" },
  ZOOM_OUT: { key: "-", ctrl: true, description: "Zoom out", descriptionRu: "Уменьшить" },
  FIT_VIEW: { key: "0", ctrl: true, description: "Fit to view", descriptionRu: "Вписать в экран" }
} as const;
