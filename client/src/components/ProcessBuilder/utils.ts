import { Node, Edge, MarkerType } from 'reactflow';
import { NodeData, BlockType } from './types';

export function convertStepsToFlow(steps: any[], roles: any[], stages: any[]) {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];
  
  const stageWidth = 350;
  const stageGap = 50;
  const roleHeight = 300;
  
  // Group steps by cell (stage + role)
  const cells: Record<string, any[]> = {};
  steps.forEach(step => {
      const key = `${step.stageId}_${step.roleId}`;
      if (!cells[key]) cells[key] = [];
      cells[key].push(step);
  });
  
  steps.forEach(step => {
      const stageIndex = stages.findIndex(s => s.id === step.stageId);
      const roleIndex = roles.findIndex(r => r.id === step.roleId);
      
      const col = stageIndex >= 0 ? stageIndex : 0;
      const row = roleIndex >= 0 ? roleIndex : 0;
      
      const key = `${step.stageId}_${step.roleId}`;
      const indexInCell = cells[key].indexOf(step);
      
      const x = col * (stageWidth + stageGap) + 50;
      const y = row * roleHeight + indexInCell * 120 + 50;
      
      // Map legacy/AI types to BlockType
      let type: BlockType = 'task';
      if (step.type) {
         const t = step.type.toLowerCase();
         if (t.includes('start')) type = 'start';
         else if (t.includes('end')) type = 'end';
         else if (t.includes('decision') || t.includes('condition')) type = 'condition';
         else if (t.includes('notification')) type = 'notification';
         else if (t.includes('api')) type = 'api';
         else if (t.includes('document')) type = 'document';
         else type = 'task';
      }
      
      nodes.push({
          id: step.id,
          type,
          position: { x, y },
          data: { 
              label: step.name, 
              type, 
              description: step.description,
              roleId: step.roleId,
              stageId: step.stageId
          }
      });
  });

  // Create edges
  steps.forEach(step => {
      if (step.nextSteps && Array.isArray(step.nextSteps)) {
          step.nextSteps.forEach((nextId: string) => {
              if (steps.find(s => s.id === nextId)) {
                  edges.push({
                      id: `e${step.id}-${nextId}`,
                      source: step.id,
                      target: nextId,
                      type: 'smoothstep',
                      animated: true,
                      markerEnd: { type: MarkerType.ArrowClosed }
                  });
              }
          });
      }
      // Also check branches if any
      if (step.branches && Array.isArray(step.branches)) {
           // Branch structure might be complex
           // For now ignore or try to parse
      }
  });

  return { nodes, edges };
}
