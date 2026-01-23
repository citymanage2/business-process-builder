import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "../../../server/routers";

type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  tokenBalance: number;
  createdAt: string;
};

type Company = {
  id: number;
  userId: number;
  name: string;
  industry?: string;
  region?: string;
  format?: "B2B" | "B2C" | "mixed";
  averageCheck?: string;
  productsServices?: string;
  itSystems?: string;
  createdAt: string;
  updatedAt: string;
};

type ProcessStage = {
  id: string;
  name: string;
  description?: string;
  order: number;
};

type ProcessRole = {
  id: string;
  name: string;
  description?: string;
  color?: string;
};

type ProcessStep = {
  id: string;
  stageId: string;
  roleId: string;
  type: string;
  name: string;
  description?: string;
  order: number;
  duration?: string;
  actions?: string[];
  previousSteps?: string[];
  nextSteps?: string[];
};

type BusinessProcess = {
  id: number;
  companyId: number;
  interviewId?: number | null;
  title: string;
  description?: string;
  status?: "draft" | "in_review" | "approved";
  startEvent?: string;
  endEvent?: string;
  stages?: ProcessStage[];
  roles?: ProcessRole[];
  steps?: ProcessStep[];
  branches?: any[];
  documents?: any[];
  itIntegration?: any;
  diagramData?: any;
  stageDetails?: any[];
  totalTime?: number | null;
  totalCost?: number | null;
  crmFunnels?: any[];
  requiredDocuments?: any[];
  salaryData?: any[];
  createdAt: string;
  updatedAt: string;
};

type Recommendation = {
  id: number;
  businessProcessId: number;
  category: "optimization" | "automation" | "risk" | "metric";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  toolsSuggested: string[];
};

type DraftInterview = {
  id: number;
  companyId: number;
  interviewType: "voice" | "form_full" | "form_short";
  status: "draft" | "in_progress" | "completed";
  answers?: string;
  progress?: number;
  createdAt: string;
  updatedAt: string;
};

type Document = {
  id: number;
  companyId: number;
  userId: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  createdAt: string;
};

type SupportChat = {
  id: number;
  userId: number;
  status: "open" | "closed";
  lastMessageAt: string;
  createdAt: string;
};

type SupportMessage = {
  id: number;
  chatId: number;
  senderId: number;
  senderRole: "user" | "admin";
  message: string;
  isRead: number;
  createdAt: string;
};

type FaqArticle = {
  id: number;
  question: string;
  answer: string;
  keywords: string;
  category?: string;
  order?: number;
};

type ProcessBuilderProcess = {
  id: number;
  ownerId: number;
  title: string;
  description?: string;
  categoryId?: number | null;
  status: "draft" | "published" | "archived";
  visibility: "private" | "public";
  thumbnail?: string | null;
  viewCount: number;
  version: number;
  content: any;
  archivedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProcessBuilderVersion = {
  id: number;
  processId: number;
  versionNumber: number;
  content: any;
  comment?: string;
  createdBy?: number | null;
  createdAt: string;
};

type ProcessBuilderBlock = {
  id: number;
  processId: number;
  blockId: string;
  type: string;
  title: string;
  description?: string;
  properties?: any;
  positionX?: number;
  positionY?: number;
  createdAt: string;
  updatedAt: string;
};

type ProcessBuilderConnection = {
  id: number;
  processId: number;
  sourceBlockId: string;
  targetBlockId: string;
  type: "sequence" | "data" | "conditional";
  label?: string;
  properties?: any;
  createdAt: string;
};

type ProcessBuilderCategory = {
  id: number;
  name: string;
  description?: string;
  parentId?: number | null;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
};

type ProcessBuilderTag = {
  id: number;
  name: string;
  createdAt: string;
};

type ProcessBuilderTemplate = {
  id: number;
  title: string;
  description?: string;
  categoryId?: number | null;
  content: any;
  authorId: number;
  isPublic: boolean;
  usageCount: number;
  rating?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProcessBuilderCollaborator = {
  id: number;
  processId: number;
  userId: number;
  role: "owner" | "editor" | "viewer" | "commenter";
  invitedBy?: number | null;
  invitedAt: string;
  acceptedAt?: string | null;
};

type ProcessBuilderComment = {
  id: number;
  processId: number;
  blockId?: string;
  userId: number;
  content: string;
  parentId?: number | null;
  createdAt: string;
  updatedAt: string;
};

type ProcessBuilderNotification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  content?: string;
  relatedProcessId?: number | null;
  isRead: boolean;
  createdAt: string;
};

type ProcessBuilderSettings = {
  userId: number;
  language: string;
  theme: "light" | "dark" | "auto";
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: "instant" | "daily" | "weekly";
  updatedAt: string;
};

type Store = {
  users: User[];
  companies: Company[];
  processes: BusinessProcess[];
  recommendations: Recommendation[];
  drafts: DraftInterview[];
  documents: Document[];
  supportChats: SupportChat[];
  supportMessages: SupportMessage[];
  faqArticles: FaqArticle[];
  errorLogs: Array<{ id: number; errorType: string; errorMessage: string; createdAt: string }>;
  processBuilder: {
    processes: ProcessBuilderProcess[];
    versions: ProcessBuilderVersion[];
    blocks: ProcessBuilderBlock[];
    connections: ProcessBuilderConnection[];
    categories: ProcessBuilderCategory[];
    tags: ProcessBuilderTag[];
    templates: ProcessBuilderTemplate[];
    collaborators: ProcessBuilderCollaborator[];
    comments: ProcessBuilderComment[];
    notifications: ProcessBuilderNotification[];
    settings: ProcessBuilderSettings[];
  };
};

const STORAGE_KEY = "front-only-store-v1";

const now = () => new Date().toISOString();

const defaultStore: Store = {
  users: [
    {
      id: 1,
      name: "Demo User",
      email: "demo@example.com",
      role: "admin",
      tokenBalance: 1000,
      createdAt: now(),
    },
  ],
  companies: [
    {
      id: 1,
      userId: 1,
      name: "Demo Company",
      industry: "SaaS",
      region: "Remote",
      format: "B2B",
      averageCheck: "1000 USD",
      productsServices: "Workflow automation",
      itSystems: "CRM, ERP",
      createdAt: now(),
      updatedAt: now(),
    },
  ],
  processes: [],
  recommendations: [],
  drafts: [],
  documents: [],
  supportChats: [],
  supportMessages: [],
  faqArticles: [
    {
      id: 1,
      question: "How does the builder work?",
      answer: "Drag blocks to the canvas and connect them to model your process.",
      keywords: "builder,process",
      category: "Getting started",
      order: 1,
    },
    {
      id: 2,
      question: "Can I export a process?",
      answer: "Export options are available in full backend mode.",
      keywords: "export,process",
      category: "Processes",
      order: 2,
    },
  ],
  errorLogs: [],
  processBuilder: {
    processes: [],
    versions: [],
    blocks: [],
    connections: [],
    categories: [
      {
        id: 1,
        name: "Operations",
        description: "Operational workflows",
        parentId: null,
        color: "#3B82F6",
        icon: "settings",
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    tags: [
      { id: 1, name: "core", createdAt: now() },
      { id: 2, name: "draft", createdAt: now() },
    ],
    templates: [],
    collaborators: [],
    comments: [],
    notifications: [],
    settings: [
      {
        userId: 1,
        language: "en",
        theme: "auto",
        emailNotifications: true,
        pushNotifications: false,
        notificationFrequency: "instant",
        updatedAt: now(),
      },
    ],
  },
};

const loadStore = (): Store => {
  if (typeof window === "undefined") return defaultStore;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultStore;
    return { ...defaultStore, ...JSON.parse(stored) };
  } catch (error) {
    console.warn("[FrontOnly] Failed to parse store", error);
    return defaultStore;
  }
};

let store: Store = loadStore();

const persistStore = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn("[FrontOnly] Failed to persist store", error);
  }
};

const nextId = (items: Array<{ id: number }>) =>
  items.length === 0 ? 1 : Math.max(...items.map(item => item.id)) + 1;

const ensureProcessSeed = (companyId: number, interviewId?: number) => {
  if (store.processes.length > 0) return store.processes[0];

  const processId = nextId(store.processes);
  const process: BusinessProcess = {
    id: processId,
    companyId,
    interviewId: interviewId ?? null,
    title: "Sample Process",
    description: "Generated in front-only mode.",
    status: "draft",
    startEvent: "Start",
    endEvent: "End",
    stages: [
      { id: "stage-1", name: "Stage 1", description: "Initial stage", order: 1 },
    ],
    roles: [{ id: "role-1", name: "Owner", description: "Process owner", color: "#E3F2FD" }],
    steps: [
      {
        id: "step-1",
        stageId: "stage-1",
        roleId: "role-1",
        type: "Start",
        name: "Start",
        description: "Process start",
        order: 1,
      },
      {
        id: "step-2",
        stageId: "stage-1",
        roleId: "role-1",
        type: "Action",
        name: "Do work",
        description: "Main action",
        order: 2,
      },
      {
        id: "step-3",
        stageId: "stage-1",
        roleId: "role-1",
        type: "End",
        name: "Finish",
        description: "Process end",
        order: 3,
      },
    ],
    branches: [],
    documents: [],
    itIntegration: { crmStatuses: [], automations: [] },
    diagramData: null,
    stageDetails: [],
    totalTime: 120,
    totalCost: 5000,
    crmFunnels: [],
    requiredDocuments: [],
    salaryData: [],
    createdAt: now(),
    updatedAt: now(),
  };

  store.processes.push(process);
  persistStore();
  return process;
};

const getCurrentUser = () => store.users[0];

const handleQuery = (path: string, input: any) => {
  switch (path) {
    case "auth.me":
      return getCurrentUser();
    case "companies.list":
      return store.companies;
    case "companies.get":
      return store.companies.find(company => company.id === input.id) ?? null;
    case "processes.list":
      return store.processes.filter(process => process.companyId === input.companyId);
    case "processes.get":
      return store.processes.find(process => process.id === input.id) ?? null;
    case "recommendations.list":
      return store.recommendations.filter(rec => rec.businessProcessId === input.processId);
    case "drafts.list":
      return store.drafts.filter(draft => draft.companyId === input.companyId);
    case "documents.list":
      return store.documents.filter(doc => doc.companyId === input.companyId);
    case "faq.getAll":
      return store.faqArticles;
    case "faq.search":
      return store.faqArticles.filter(article =>
        article.question.toLowerCase().includes(input.query.toLowerCase()),
      );
    case "faq.getById":
      return store.faqArticles.find(article => article.id === input.id) ?? null;
    case "admin.getPoolMetrics":
      return {
        totalConnections: 5,
        idleConnections: 3,
        waitingRequests: 0,
        maxConnections: 20,
        status: "active",
      };
    case "admin.getAllUsers":
      return store.users;
    case "admin.getErrorLogs":
      return store.errorLogs.slice(0, input?.limit ?? 100);
    case "support.getOrCreateChat": {
      const existing = store.supportChats.find(chat => chat.userId === getCurrentUser().id);
      if (existing) return existing;
      const chat: SupportChat = {
        id: nextId(store.supportChats),
        userId: getCurrentUser().id,
        status: "open",
        lastMessageAt: now(),
        createdAt: now(),
      };
      store.supportChats.push(chat);
      persistStore();
      return chat;
    }
    case "support.getMessages":
      return store.supportMessages.filter(message => message.chatId === input.chatId);
    case "support.getUnreadCount":
      return store.supportMessages.filter(
        message => message.chatId === input.chatId && message.isRead === 0,
      ).length;
    case "support.getAllChats":
      return store.supportChats.map(chat => ({
        ...chat,
        userName: getCurrentUser().name,
        userEmail: getCurrentUser().email,
      }));
    case "processBuilder.processes.list": {
      const scope = input?.scope ?? "mine";
      const userId = getCurrentUser().id;
      return store.processBuilder.processes.filter(process => {
        if (process.deletedAt) return false;
        if (scope === "public") return process.visibility === "public";
        if (process.ownerId !== userId) return false;
        if (input?.status && process.status !== input.status) return false;
        if (input?.categoryId && process.categoryId !== input.categoryId) return false;
        if (input?.search) {
          const term = input.search.toLowerCase();
          const haystack = `${process.title} ${process.description ?? ""}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });
    }
    case "processBuilder.processes.publicList":
      return store.processBuilder.processes.filter(process => {
        if (process.visibility !== "public") return false;
        if (process.deletedAt) return false;
        if (input?.status && process.status !== input.status) return false;
        if (input?.categoryId && process.categoryId !== input.categoryId) return false;
        if (input?.search) {
          const term = input.search.toLowerCase();
          const haystack = `${process.title} ${process.description ?? ""}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });
    case "processBuilder.processes.get":
    case "processBuilder.processes.publicGet":
      return (
        store.processBuilder.processes.find(process => {
          if (process.id !== input.id) return false;
          if (path === "processBuilder.processes.publicGet" && process.visibility !== "public") return false;
          return true;
        }) ?? null
      );
    case "processBuilder.processVersions.list":
      return store.processBuilder.versions.filter(version => version.processId === input.processId);
    case "processBuilder.processVersions.get":
      return store.processBuilder.versions.find(version => version.id === input.id) ?? null;
    case "processBuilder.blocks.list":
      return store.processBuilder.blocks.filter(block => block.processId === input.processId);
    case "processBuilder.connections.list":
      return store.processBuilder.connections.filter(conn => conn.processId === input.processId);
    case "processBuilder.categories.list":
      return store.processBuilder.categories;
    case "processBuilder.tags.list":
      return store.processBuilder.tags;
    case "processBuilder.tags.search":
      return store.processBuilder.tags.filter(tag =>
        tag.name.toLowerCase().includes(input.query.toLowerCase()),
      );
    case "processBuilder.collaborators.list":
      return store.processBuilder.collaborators.filter(collab => collab.processId === input.processId);
    case "processBuilder.comments.list":
      return store.processBuilder.comments.filter(comment => comment.processId === input.processId);
    case "processBuilder.templates.list":
      return store.processBuilder.templates;
    case "processBuilder.templates.get":
      return store.processBuilder.templates.find(template => template.id === input.id) ?? null;
    case "processBuilder.notifications.list":
      return store.processBuilder.notifications.filter(note => note.userId === getCurrentUser().id);
    case "processBuilder.settings.get":
      return store.processBuilder.settings.find(setting => setting.userId === getCurrentUser().id) ?? null;
    default:
      return null;
  }
};

const handleMutation = (path: string, input: any) => {
  switch (path) {
    case "companies.create": {
      const company: Company = {
        id: nextId(store.companies),
        userId: getCurrentUser().id,
        name: input.name,
        industry: input.industry,
        region: input.region,
        format: input.format,
        averageCheck: input.averageCheck,
        productsServices: input.productsServices,
        itSystems: input.itSystems,
        createdAt: now(),
        updatedAt: now(),
      };
      store.companies.push(company);
      persistStore();
      return { id: company.id };
    }
    case "companies.update": {
      const company = store.companies.find(item => item.id === input.id);
      if (company) {
        Object.assign(company, input, { updatedAt: now() });
        persistStore();
      }
      return { success: true };
    }
    case "companies.delete": {
      store.companies = store.companies.filter(company => company.id !== input.id);
      persistStore();
      return { success: true };
    }
    case "interviews.start": {
      const id = store.drafts.length + 1;
      const draft: DraftInterview = {
        id,
        companyId: input.companyId,
        interviewType: "voice",
        status: "in_progress",
        createdAt: now(),
        updatedAt: now(),
      };
      store.drafts.push(draft);
      persistStore();
      return { id };
    }
    case "interviews.uploadAudio":
      return { url: "front-only://audio" };
    case "interviews.transcribe":
      return { transcript: "Transcription is unavailable in front-only mode." };
    case "interviews.saveAnswers": {
      const draft = store.drafts.find(item => item.id === input.interviewId);
      if (draft) {
        draft.answers = JSON.stringify(input.answers);
        draft.status = "completed";
        draft.updatedAt = now();
      }
      persistStore();
      return { success: true };
    }
    case "drafts.save": {
      if (input.id) {
        const draft = store.drafts.find(item => item.id === input.id);
        if (draft) {
          draft.answers = input.answers;
          draft.progress = input.progress;
          draft.status = "draft";
          draft.updatedAt = now();
        }
        persistStore();
        return { id: input.id };
      }
      const id = nextId(store.drafts);
      store.drafts.push({
        id,
        companyId: input.companyId,
        interviewType: input.interviewType,
        status: "draft",
        answers: input.answers,
        progress: input.progress,
        createdAt: now(),
        updatedAt: now(),
      });
      persistStore();
      return { id };
    }
    case "processes.generate": {
      const process = ensureProcessSeed(input.companyId, input.interviewId);
      const cost = 100;
      const user = getCurrentUser();
      user.tokenBalance = Math.max(0, user.tokenBalance - cost);
      persistStore();
      return { id: process.id, process, tokensDeducted: cost, newBalance: user.tokenBalance };
    }
    case "processes.update": {
      const process = store.processes.find(item => item.id === input.id);
      if (process) {
        if (input.title) process.title = input.title;
        if (input.description) process.description = input.description;
        if (input.status) process.status = input.status;
        if (input.steps) process.steps = input.steps;
        process.updatedAt = now();
      }
      persistStore();
      return { success: true };
    }
    case "processes.delete": {
      store.processes = store.processes.filter(item => item.id !== input.id);
      persistStore();
      return { success: true };
    }
    case "recommendations.generate": {
      const rec: Recommendation = {
        id: nextId(store.recommendations),
        businessProcessId: input.processId,
        category: "optimization",
        priority: "medium",
        title: "Sample recommendation",
        description: "Consider reviewing approval steps to speed up the process.",
        toolsSuggested: ["Automation tool"],
      };
      store.recommendations.push(rec);
      persistStore();
      return { recommendations: [rec] };
    }
    case "documents.upload": {
      const id = nextId(store.documents);
      const document: Document = {
        id,
        companyId: input.companyId,
        userId: getCurrentUser().id,
        fileName: input.fileName,
        fileUrl: "front-only://document",
        fileKey: `front-only-${id}`,
        mimeType: input.mimeType,
        description: input.description,
        createdAt: now(),
      };
      store.documents.push(document);
      persistStore();
      return { url: document.fileUrl, fileKey: document.fileKey };
    }
    case "documents.delete": {
      store.documents = store.documents.filter(doc => doc.id !== input.id);
      persistStore();
      return { success: true };
    }
    case "admin.updateUserBalance": {
      const user = store.users.find(item => item.id === input.userId);
      if (user) {
        user.tokenBalance = input.newBalance;
        persistStore();
        return { success: true };
      }
      return { success: false };
    }
    case "support.sendMessage":
    case "support.adminSendMessage": {
      const message: SupportMessage = {
        id: nextId(store.supportMessages),
        chatId: input.chatId,
        senderId: getCurrentUser().id,
        senderRole: path === "support.adminSendMessage" ? "admin" : "user",
        message: input.message,
        isRead: 0,
        createdAt: now(),
      };
      store.supportMessages.push(message);
      const chat = store.supportChats.find(item => item.id === input.chatId);
      if (chat) {
        chat.lastMessageAt = now();
      }
      persistStore();
      return { success: true };
    }
    case "support.markAsRead":
    case "support.adminMarkAsRead": {
      store.supportMessages = store.supportMessages.map(message =>
        message.chatId === input.chatId ? { ...message, isRead: 1 } : message,
      );
      persistStore();
      return { success: true };
    }
    case "processBuilder.processes.create": {
      const process: ProcessBuilderProcess = {
        id: nextId(store.processBuilder.processes),
        ownerId: getCurrentUser().id,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId ?? null,
        status: input.status ?? "draft",
        visibility: input.visibility ?? "private",
        thumbnail: input.thumbnail ?? null,
        viewCount: 0,
        version: 1,
        content: input.content ?? {},
        createdAt: now(),
        updatedAt: now(),
      };
      store.processBuilder.processes.push(process);
      store.processBuilder.versions.push({
        id: nextId(store.processBuilder.versions),
        processId: process.id,
        versionNumber: 1,
        content: process.content,
        comment: input.versionComment,
        createdBy: getCurrentUser().id,
        createdAt: now(),
      });
      persistStore();
      return { id: process.id };
    }
    case "processBuilder.processes.update": {
      const process = store.processBuilder.processes.find(item => item.id === input.id);
      if (!process) return { success: false };
      if (input.title) process.title = input.title;
      if (input.description !== undefined) process.description = input.description;
      if (input.categoryId !== undefined) process.categoryId = input.categoryId;
      if (input.visibility) process.visibility = input.visibility;
      if (input.status) process.status = input.status;
      if (input.thumbnail !== undefined) process.thumbnail = input.thumbnail;
      if (input.content !== undefined) {
        process.content = input.content;
        process.version += 1;
        store.processBuilder.versions.push({
          id: nextId(store.processBuilder.versions),
          processId: process.id,
          versionNumber: process.version,
          content: input.content,
          comment: input.versionComment,
          createdBy: getCurrentUser().id,
          createdAt: now(),
        });
      }
      process.updatedAt = now();
      persistStore();
      return { success: true };
    }
    case "processBuilder.processes.delete": {
      const process = store.processBuilder.processes.find(item => item.id === input.id);
      if (process) {
        if (input.hard) {
          store.processBuilder.processes = store.processBuilder.processes.filter(item => item.id !== input.id);
        } else {
          process.status = "archived";
          process.deletedAt = now();
          process.archivedAt = now();
        }
      }
      persistStore();
      return { success: true };
    }
    case "processBuilder.processes.restore": {
      const process = store.processBuilder.processes.find(item => item.id === input.id);
      if (process) {
        process.status = "draft";
        process.deletedAt = null;
        process.archivedAt = null;
        process.updatedAt = now();
      }
      persistStore();
      return { success: true };
    }
    case "processBuilder.processes.duplicate": {
      const source = store.processBuilder.processes.find(item => item.id === input.id);
      if (!source) return { id: 0 };
      const process: ProcessBuilderProcess = {
        ...source,
        id: nextId(store.processBuilder.processes),
        title: `${source.title} (Copy)`,
        status: "draft",
        visibility: "private",
        version: 1,
        createdAt: now(),
        updatedAt: now(),
      };
      store.processBuilder.processes.push(process);
      persistStore();
      return { id: process.id };
    }
    case "processBuilder.processes.incrementViewCount": {
      const process = store.processBuilder.processes.find(item => item.id === input.id);
      if (process) process.viewCount += 1;
      persistStore();
      return { success: true };
    }
    case "processBuilder.blocks.bulkUpdate": {
      store.processBuilder.blocks = store.processBuilder.blocks.filter(
        block => block.processId !== input.processId,
      );
      input.blocks.forEach((block: any) => {
        store.processBuilder.blocks.push({
          id: nextId(store.processBuilder.blocks),
          processId: input.processId,
          blockId: block.blockId,
          type: block.type,
          title: block.title,
          description: block.description,
          properties: block.properties,
          positionX: block.positionX,
          positionY: block.positionY,
          createdAt: now(),
          updatedAt: now(),
        });
      });
      persistStore();
      return { success: true };
    }
    case "processBuilder.connections.bulkUpdate": {
      store.processBuilder.connections = store.processBuilder.connections.filter(
        conn => conn.processId !== input.processId,
      );
      input.connections.forEach((connection: any) => {
        store.processBuilder.connections.push({
          id: nextId(store.processBuilder.connections),
          processId: input.processId,
          sourceBlockId: connection.sourceBlockId,
          targetBlockId: connection.targetBlockId,
          type: connection.type,
          label: connection.label,
          properties: connection.properties,
          createdAt: now(),
        });
      });
      persistStore();
      return { success: true };
    }
    case "processBuilder.tags.create": {
      const tag: ProcessBuilderTag = {
        id: nextId(store.processBuilder.tags),
        name: input.name,
        createdAt: now(),
      };
      store.processBuilder.tags.push(tag);
      persistStore();
      return { id: tag.id };
    }
    case "processBuilder.tags.attachToProcess":
    case "processBuilder.tags.detachFromProcess":
      return { success: true };
    case "processBuilder.notifications.markAsRead":
    case "processBuilder.notifications.delete":
    case "processBuilder.notifications.markAllAsRead":
      return { success: true };
    case "processBuilder.settings.update": {
      const settings = store.processBuilder.settings.find(item => item.userId === getCurrentUser().id);
      if (settings) {
        Object.assign(settings, input, { updatedAt: now() });
      } else {
        store.processBuilder.settings.push({
          userId: getCurrentUser().id,
          language: input.language ?? "en",
          theme: input.theme ?? "auto",
          emailNotifications: input.emailNotifications ?? true,
          pushNotifications: input.pushNotifications ?? false,
          notificationFrequency: input.notificationFrequency ?? "instant",
          updatedAt: now(),
        });
      }
      persistStore();
      return { success: true };
    }
    default:
      return { success: true };
  }
};

export const createMockTrpcLink = (): TRPCLink<AppRouter> => {
  return () => {
    return ({ op }) =>
      observable(observer => {
        try {
          const data = op.type === "query" ? handleQuery(op.path, op.input) : handleMutation(op.path, op.input);
          observer.next({ result: { data } });
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      });
  };
};
