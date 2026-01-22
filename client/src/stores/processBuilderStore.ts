import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  addEdge,
} from 'reactflow';
import { nanoid } from 'nanoid';
import {
  ProcessNodeData,
  BlockType,
  ConnectionType,
  BLOCK_LIBRARY,
  getBlockDefinition,
  CONNECTION_TYPES,
  ValidationResult,
  ValidationError,
  BLOCK_TYPES,
} from '@shared/processBuilder';

// History state for undo/redo
interface HistoryState {
  nodes: Node<ProcessNodeData>[];
  edges: Edge[];
}

interface ProcessBuilderState {
  // Process metadata
  processId: number | null;
  processName: string;
  processDescription: string;
  
  // ReactFlow state
  nodes: Node<ProcessNodeData>[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  
  // Selection state
  selectedNodes: string[];
  selectedEdges: string[];
  
  // UI state
  isPanelOpen: boolean;
  activePanel: 'blocks' | 'properties' | 'comments' | 'versions' | null;
  selectedBlockForProperties: string | null;
  
  // Validation state
  validationResult: ValidationResult | null;
  
  // History for undo/redo
  history: HistoryState[];
  historyIndex: number;
  
  // Auto-save state
  isDirty: boolean;
  lastSavedAt: Date | null;
  
  // Actions
  setProcessId: (id: number | null) => void;
  setProcessName: (name: string) => void;
  setProcessDescription: (description: string) => void;
  
  // Node actions
  onNodesChange: (changes: NodeChange[]) => void;
  addNode: (type: BlockType, position: { x: number; y: number }, data?: Partial<ProcessNodeData>) => string;
  updateNodeData: (nodeId: string, data: Partial<ProcessNodeData>) => void;
  removeNodes: (nodeIds: string[]) => void;
  duplicateNodes: (nodeIds: string[]) => void;
  
  // Edge actions
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateEdgeData: (edgeId: string, data: Partial<Edge['data']>) => void;
  setEdgeType: (edgeId: string, type: ConnectionType) => void;
  removeEdges: (edgeIds: string[]) => void;
  
  // Viewport actions
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  
  // Selection actions
  setSelectedNodes: (nodeIds: string[]) => void;
  setSelectedEdges: (edgeIds: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // UI actions
  setIsPanelOpen: (isOpen: boolean) => void;
  setActivePanel: (panel: 'blocks' | 'properties' | 'comments' | 'versions' | null) => void;
  setSelectedBlockForProperties: (nodeId: string | null) => void;
  
  // Validation
  validate: () => ValidationResult;
  clearValidation: () => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;
  
  // Load/Reset actions
  loadProcess: (data: {
    id: number;
    name: string;
    description?: string;
    nodes: Node<ProcessNodeData>[];
    edges: Edge[];
    viewport?: { x: number; y: number; zoom: number };
  }) => void;
  resetProcess: () => void;
  
  // Dirty state
  markAsDirty: () => void;
  markAsSaved: () => void;
  
  // Export data for saving
  getProcessData: () => {
    nodes: string;
    edges: string;
    viewport: string;
  };
}

const initialState = {
  processId: null,
  processName: '',
  processDescription: '',
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodes: [],
  selectedEdges: [],
  isPanelOpen: true,
  activePanel: 'blocks' as const,
  selectedBlockForProperties: null,
  validationResult: null,
  history: [],
  historyIndex: -1,
  isDirty: false,
  lastSavedAt: null,
};

export const useProcessBuilderStore = create<ProcessBuilderState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // Metadata setters
    setProcessId: (id) => set({ processId: id }),
    setProcessName: (name) => {
      set({ processName: name, isDirty: true });
    },
    setProcessDescription: (description) => {
      set({ processDescription: description, isDirty: true });
    },
    
    // Node actions
    onNodesChange: (changes) => {
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes) as Node<ProcessNodeData>[],
        isDirty: true,
      }));
    },
    
    addNode: (type, position, data) => {
      const blockDef = getBlockDefinition(type);
      if (!blockDef) {
        console.error(`Unknown block type: ${type}`);
        return '';
      }
      
      const nodeId = nanoid();
      const newNode: Node<ProcessNodeData> = {
        id: nodeId,
        type: 'processBlock',
        position,
        data: {
          id: nodeId,
          type,
          name: blockDef.name.ru,
          description: '',
          color: blockDef.color,
          icon: blockDef.icon,
          ...data,
        },
        width: blockDef.defaultWidth,
        height: blockDef.defaultHeight,
      };
      
      const state = get();
      state.saveToHistory();
      
      set((state) => ({
        nodes: [...state.nodes, newNode],
        isDirty: true,
        selectedNodes: [nodeId],
        selectedBlockForProperties: nodeId,
        activePanel: 'properties',
      }));
      
      return nodeId;
    },
    
    updateNodeData: (nodeId, data) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        ),
        isDirty: true,
      }));
    },
    
    removeNodes: (nodeIds) => {
      const state = get();
      state.saveToHistory();
      
      set((state) => ({
        nodes: state.nodes.filter((node) => !nodeIds.includes(node.id)),
        edges: state.edges.filter(
          (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
        ),
        selectedNodes: state.selectedNodes.filter((id) => !nodeIds.includes(id)),
        selectedBlockForProperties:
          state.selectedBlockForProperties && nodeIds.includes(state.selectedBlockForProperties)
            ? null
            : state.selectedBlockForProperties,
        isDirty: true,
      }));
    },
    
    duplicateNodes: (nodeIds) => {
      const state = get();
      state.saveToHistory();
      
      const nodesToDuplicate = state.nodes.filter((n) => nodeIds.includes(n.id));
      const newNodes: Node<ProcessNodeData>[] = [];
      const nodeIdMap = new Map<string, string>();
      
      // Create new nodes with offset position
      nodesToDuplicate.forEach((node) => {
        const newId = nanoid();
        nodeIdMap.set(node.id, newId);
        newNodes.push({
          ...node,
          id: newId,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          data: {
            ...node.data,
            id: newId,
            name: `${node.data.name} (copy)`,
          },
          selected: false,
        });
      });
      
      // Duplicate edges between selected nodes
      const newEdges: Edge[] = [];
      state.edges.forEach((edge) => {
        if (nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target)) {
          newEdges.push({
            ...edge,
            id: nanoid(),
            source: nodeIdMap.get(edge.source)!,
            target: nodeIdMap.get(edge.target)!,
          });
        }
      });
      
      set((state) => ({
        nodes: [...state.nodes, ...newNodes],
        edges: [...state.edges, ...newEdges],
        selectedNodes: newNodes.map((n) => n.id),
        isDirty: true,
      }));
    },
    
    // Edge actions
    onEdgesChange: (changes) => {
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
        isDirty: true,
      }));
    },
    
    onConnect: (connection) => {
      const state = get();
      state.saveToHistory();
      
      const newEdge: Edge = {
        ...connection,
        id: nanoid(),
        type: 'processEdge',
        data: {
          connectionType: CONNECTION_TYPES.SEQUENCE_FLOW,
        },
        animated: false,
      } as Edge;
      
      set((state) => ({
        edges: addEdge(newEdge, state.edges),
        isDirty: true,
      }));
    },
    
    updateEdgeData: (edgeId, data) => {
      set((state) => ({
        edges: state.edges.map((edge) =>
          edge.id === edgeId
            ? { ...edge, data: { ...edge.data, ...data } }
            : edge
        ),
        isDirty: true,
      }));
    },
    
    setEdgeType: (edgeId, type) => {
      set((state) => ({
        edges: state.edges.map((edge) => {
          if (edge.id !== edgeId) return edge;
          
          let style = {};
          let animated = false;
          
          switch (type) {
            case CONNECTION_TYPES.DATA_FLOW:
              style = { strokeDasharray: '5,5' };
              break;
            case CONNECTION_TYPES.CONDITIONAL_FLOW:
              style = { stroke: '#f59e0b' };
              animated = true;
              break;
            default:
              style = {};
          }
          
          return {
            ...edge,
            data: { ...edge.data, connectionType: type },
            style,
            animated,
          };
        }),
        isDirty: true,
      }));
    },
    
    removeEdges: (edgeIds) => {
      const state = get();
      state.saveToHistory();
      
      set((state) => ({
        edges: state.edges.filter((edge) => !edgeIds.includes(edge.id)),
        selectedEdges: state.selectedEdges.filter((id) => !edgeIds.includes(id)),
        isDirty: true,
      }));
    },
    
    // Viewport
    setViewport: (viewport) => set({ viewport }),
    
    // Selection
    setSelectedNodes: (nodeIds) => set({ selectedNodes: nodeIds }),
    setSelectedEdges: (edgeIds) => set({ selectedEdges: edgeIds }),
    selectAll: () =>
      set((state) => ({
        selectedNodes: state.nodes.map((n) => n.id),
        selectedEdges: state.edges.map((e) => e.id),
      })),
    clearSelection: () => set({ selectedNodes: [], selectedEdges: [] }),
    
    // UI
    setIsPanelOpen: (isOpen) => set({ isPanelOpen: isOpen }),
    setActivePanel: (panel) => set({ activePanel: panel }),
    setSelectedBlockForProperties: (nodeId) => {
      set({
        selectedBlockForProperties: nodeId,
        activePanel: nodeId ? 'properties' : get().activePanel,
      });
    },
    
    // Validation
    validate: () => {
      const state = get();
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [];
      
      // Check for start node
      const startNodes = state.nodes.filter((n) => n.data.type === BLOCK_TYPES.START);
      if (startNodes.length === 0) {
        errors.push({
          type: 'error',
          message: { en: 'Process must have a Start block', ru: 'Процесс должен иметь блок "Начало"' },
          code: 'MISSING_START',
        });
      } else if (startNodes.length > 1) {
        warnings.push({
          type: 'warning',
          message: { en: 'Process has multiple Start blocks', ru: 'Процесс имеет несколько блоков "Начало"' },
          code: 'MULTIPLE_START',
        });
      }
      
      // Check for end node
      const endNodes = state.nodes.filter((n) => n.data.type === BLOCK_TYPES.END);
      if (endNodes.length === 0) {
        errors.push({
          type: 'error',
          message: { en: 'Process must have an End block', ru: 'Процесс должен иметь блок "Завершение"' },
          code: 'MISSING_END',
        });
      }
      
      // Check for isolated nodes
      const connectedNodeIds = new Set<string>();
      state.edges.forEach((edge) => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });
      
      state.nodes.forEach((node) => {
        const isStartOrEntry = node.data.type === BLOCK_TYPES.START || node.data.type === BLOCK_TYPES.ENTRY_POINT;
        const isEndOrExit = node.data.type === BLOCK_TYPES.END || node.data.type === BLOCK_TYPES.EXIT_POINT;
        
        if (isStartOrEntry) {
          if (!state.edges.some((e) => e.source === node.id)) {
            warnings.push({
              type: 'warning',
              nodeId: node.id,
              message: { en: `"${node.data.name}" has no outgoing connections`, ru: `"${node.data.name}" не имеет исходящих связей` },
              code: 'NO_OUTPUTS',
            });
          }
        } else if (isEndOrExit) {
          if (!state.edges.some((e) => e.target === node.id)) {
            warnings.push({
              type: 'warning',
              nodeId: node.id,
              message: { en: `"${node.data.name}" has no incoming connections`, ru: `"${node.data.name}" не имеет входящих связей` },
              code: 'NO_INPUTS',
            });
          }
        } else if (!connectedNodeIds.has(node.id)) {
          warnings.push({
            type: 'warning',
            nodeId: node.id,
            message: { en: `"${node.data.name}" is isolated`, ru: `"${node.data.name}" изолирован` },
            code: 'ISOLATED_NODE',
          });
        }
        
        // Check for required name
        if (!node.data.name || node.data.name.trim() === '') {
          errors.push({
            type: 'error',
            nodeId: node.id,
            message: { en: 'Block must have a name', ru: 'Блок должен иметь название' },
            code: 'MISSING_NAME',
          });
        }
      });
      
      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
      
      set({ validationResult: result });
      return result;
    },
    
    clearValidation: () => set({ validationResult: null }),
    
    // History
    saveToHistory: () => {
      const state = get();
      const newHistoryState: HistoryState = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      
      // Remove any future history if we're not at the end
      const history = state.history.slice(0, state.historyIndex + 1);
      
      // Add new state
      history.push(newHistoryState);
      
      // Limit history size
      if (history.length > 50) {
        history.shift();
      }
      
      set({
        history,
        historyIndex: history.length - 1,
      });
    },
    
    undo: () => {
      const state = get();
      if (state.historyIndex <= 0) return;
      
      const newIndex = state.historyIndex - 1;
      const historyState = state.history[newIndex];
      
      set({
        nodes: JSON.parse(JSON.stringify(historyState.nodes)),
        edges: JSON.parse(JSON.stringify(historyState.edges)),
        historyIndex: newIndex,
        isDirty: true,
      });
    },
    
    redo: () => {
      const state = get();
      if (state.historyIndex >= state.history.length - 1) return;
      
      const newIndex = state.historyIndex + 1;
      const historyState = state.history[newIndex];
      
      set({
        nodes: JSON.parse(JSON.stringify(historyState.nodes)),
        edges: JSON.parse(JSON.stringify(historyState.edges)),
        historyIndex: newIndex,
        isDirty: true,
      });
    },
    
    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,
    
    // Load/Reset
    loadProcess: (data) => {
      set({
        processId: data.id,
        processName: data.name,
        processDescription: data.description || '',
        nodes: data.nodes,
        edges: data.edges,
        viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
        selectedNodes: [],
        selectedEdges: [],
        selectedBlockForProperties: null,
        validationResult: null,
        history: [{ nodes: data.nodes, edges: data.edges }],
        historyIndex: 0,
        isDirty: false,
        lastSavedAt: new Date(),
      });
    },
    
    resetProcess: () => {
      set({
        ...initialState,
        history: [],
        historyIndex: -1,
      });
    },
    
    // Dirty state
    markAsDirty: () => set({ isDirty: true }),
    markAsSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),
    
    // Export
    getProcessData: () => {
      const state = get();
      return {
        nodes: JSON.stringify(state.nodes),
        edges: JSON.stringify(state.edges),
        viewport: JSON.stringify(state.viewport),
      };
    },
  }))
);

// Subscribe to node selection changes to update properties panel
useProcessBuilderStore.subscribe(
  (state) => state.selectedNodes,
  (selectedNodes) => {
    const store = useProcessBuilderStore.getState();
    if (selectedNodes.length === 1) {
      store.setSelectedBlockForProperties(selectedNodes[0]);
    } else if (selectedNodes.length === 0) {
      store.setSelectedBlockForProperties(null);
    }
  }
);
