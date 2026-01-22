export type BlockCategory = 
  | 'start_end'
  | 'actions'
  | 'decisions'
  | 'data'
  | 'events'
  | 'participants';

export type BlockType = 
  // Start/End
  | 'start' | 'end' | 'entry' | 'exit'
  // Actions
  | 'task' | 'subprocess' | 'manual' | 'automated' | 'notification' | 'api'
  // Decisions
  | 'condition' | 'multiple_choice' | 'parallel' | 'exclusive'
  // Data
  | 'data_input' | 'data_output' | 'data_store' | 'document'
  // Events
  | 'timer' | 'signal' | 'error' | 'escalation'
  // Participants
  | 'role' | 'department' | 'external_system';

export interface ProcessBlock {
  type: BlockType;
  label: string;
  category: BlockCategory;
  icon?: string; // Icon name or component
}

export const BLOCKS: ProcessBlock[] = [
  // Start/End
  { type: 'start', label: 'Начало', category: 'start_end' },
  { type: 'end', label: 'Конец', category: 'start_end' },
  
  // Actions
  { type: 'task', label: 'Задача', category: 'actions' },
  { type: 'subprocess', label: 'Подпроцесс', category: 'actions' },
  { type: 'manual', label: 'Ручное действие', category: 'actions' },
  { type: 'automated', label: 'Автоматическое', category: 'actions' },
  { type: 'notification', label: 'Уведомление', category: 'actions' },
  { type: 'api', label: 'API вызов', category: 'actions' },

  // Decisions
  { type: 'condition', label: 'Условие', category: 'decisions' },
  { type: 'parallel', label: 'Параллельно', category: 'decisions' },
  { type: 'exclusive', label: 'Эксклюзивно', category: 'decisions' },

  // Data
  { type: 'document', label: 'Документ', category: 'data' },
  { type: 'data_store', label: 'База данных', category: 'data' },

  // Events
  { type: 'timer', label: 'Таймер', category: 'events' },
  
  // Participants
  { type: 'role', label: 'Роль', category: 'participants' },
  { type: 'department', label: 'Отдел', category: 'participants' },
];

export interface NodeData {
  label: string;
  description?: string;
  type: BlockType;
  [key: string]: any;
}
