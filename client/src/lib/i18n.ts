// Simple i18n localization system

export type Language = 'en' | 'ru';

export const translations = {
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    reset: 'Reset',
    
    // Auth
    login: 'Login',
    logout: 'Logout',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    
    // Navigation
    home: 'Home',
    processes: 'Processes',
    analytics: 'Analytics',
    profile: 'Profile',
    settings: 'Settings',
    
    // Process Builder
    processBuilder: 'Process Builder',
    newProcess: 'New Process',
    myProcesses: 'My Processes',
    publicProcesses: 'Public Processes',
    templates: 'Templates',
    blocks: 'Blocks',
    properties: 'Properties',
    comments: 'Comments',
    versions: 'Versions',
    
    // Block Categories
    startEnd: 'Start & End',
    actions: 'Actions',
    decisions: 'Decisions',
    data: 'Data',
    events: 'Events',
    participants: 'Participants',
    
    // Block Types
    start: 'Start',
    end: 'End',
    task: 'Task',
    condition: 'Condition',
    subprocess: 'Subprocess',
    timer: 'Timer',
    
    // Properties
    name: 'Name',
    description: 'Description',
    responsible: 'Responsible',
    duration: 'Duration',
    tags: 'Tags',
    
    // Actions
    undo: 'Undo',
    redo: 'Redo',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fitView: 'Fit View',
    validate: 'Validate',
    export: 'Export',
    import: 'Import',
    share: 'Share',
    duplicate: 'Duplicate',
    
    // Export
    exportPng: 'Export as PNG',
    exportSvg: 'Export as SVG',
    exportPdf: 'Export as PDF',
    exportJson: 'Export as JSON',
    exportBpmn: 'Export as BPMN',
    
    // Validation
    processValid: 'Process is valid',
    missingStart: 'Process must have a Start block',
    missingEnd: 'Process must have an End block',
    isolatedNode: 'Block has no connections',
    
    // Status
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived',
    
    // Collaboration
    invite: 'Invite',
    collaborators: 'Collaborators',
    owner: 'Owner',
    editor: 'Editor',
    viewer: 'Viewer',
    commenter: 'Commenter',
    
    // Notifications
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    markAllRead: 'Mark all as read',
    
    // Analytics
    totalProcesses: 'Total Processes',
    totalViews: 'Total Views',
    activity: 'Activity',
  },
  
  ru: {
    // Common
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    create: 'Создать',
    search: 'Поиск',
    filter: 'Фильтр',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    confirm: 'Подтвердить',
    close: 'Закрыть',
    back: 'Назад',
    next: 'Далее',
    previous: 'Назад',
    submit: 'Отправить',
    reset: 'Сбросить',
    
    // Auth
    login: 'Войти',
    logout: 'Выйти',
    signup: 'Регистрация',
    email: 'Email',
    password: 'Пароль',
    forgotPassword: 'Забыли пароль?',
    
    // Navigation
    home: 'Главная',
    processes: 'Процессы',
    analytics: 'Аналитика',
    profile: 'Профиль',
    settings: 'Настройки',
    
    // Process Builder
    processBuilder: 'Конструктор процессов',
    newProcess: 'Новый процесс',
    myProcesses: 'Мои процессы',
    publicProcesses: 'Публичные процессы',
    templates: 'Шаблоны',
    blocks: 'Блоки',
    properties: 'Свойства',
    comments: 'Комментарии',
    versions: 'Версии',
    
    // Block Categories
    startEnd: 'Начало и завершение',
    actions: 'Действия',
    decisions: 'Решения',
    data: 'Данные',
    events: 'События',
    participants: 'Участники',
    
    // Block Types
    start: 'Начало',
    end: 'Завершение',
    task: 'Задача',
    condition: 'Условие',
    subprocess: 'Подпроцесс',
    timer: 'Таймер',
    
    // Properties
    name: 'Название',
    description: 'Описание',
    responsible: 'Ответственный',
    duration: 'Длительность',
    tags: 'Теги',
    
    // Actions
    undo: 'Отменить',
    redo: 'Повторить',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    fitView: 'Вместить',
    validate: 'Проверить',
    export: 'Экспорт',
    import: 'Импорт',
    share: 'Поделиться',
    duplicate: 'Дублировать',
    
    // Export
    exportPng: 'Экспорт в PNG',
    exportSvg: 'Экспорт в SVG',
    exportPdf: 'Экспорт в PDF',
    exportJson: 'Экспорт в JSON',
    exportBpmn: 'Экспорт в BPMN',
    
    // Validation
    processValid: 'Процесс валиден',
    missingStart: 'Процесс должен иметь блок "Начало"',
    missingEnd: 'Процесс должен иметь блок "Завершение"',
    isolatedNode: 'Блок не имеет связей',
    
    // Status
    draft: 'Черновик',
    published: 'Опубликован',
    archived: 'В архиве',
    
    // Collaboration
    invite: 'Пригласить',
    collaborators: 'Участники',
    owner: 'Владелец',
    editor: 'Редактор',
    viewer: 'Читатель',
    commenter: 'Комментатор',
    
    // Notifications
    notifications: 'Уведомления',
    noNotifications: 'Нет уведомлений',
    markAllRead: 'Отметить все как прочитанные',
    
    // Analytics
    totalProcesses: 'Всего процессов',
    totalViews: 'Всего просмотров',
    activity: 'Активность',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

// Get translation for a key
export function t(key: TranslationKey, language: Language = 'ru'): string {
  return translations[language][key] || translations.en[key] || key;
}

// Create a hook for using translations
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LanguageStore {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: 'ru',
      setLanguage: (language) => set({ language }),
      t: (key) => t(key, get().language),
    }),
    {
      name: 'language-storage',
    }
  )
);
