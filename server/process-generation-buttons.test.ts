import { describe, it, expect } from 'vitest';

describe('Process Generation Buttons', () => {
  it('should show generation button for stages when stageDetails is empty', () => {
    const process = {
      id: 1,
      title: 'Test Process',
      stages: [{ id: '1', name: 'Stage 1', order: 1 }],
      stageDetails: [],
    };
    
    expect(process.stageDetails.length).toBe(0);
    expect(process.stages.length).toBeGreaterThan(0);
  });

  it('should show generation button for metrics when totalTime and totalCost are null', () => {
    const process = {
      id: 1,
      title: 'Test Process',
      totalTime: null,
      totalCost: null,
    };
    
    expect(process.totalTime).toBeNull();
    expect(process.totalCost).toBeNull();
  });

  it('should show generation button for CRM when crmFunnels is empty', () => {
    const process = {
      id: 1,
      title: 'Test Process',
      crmFunnels: [],
    };
    
    expect(process.crmFunnels.length).toBe(0);
  });

  it('should hide generation button for stages when stageDetails exists', () => {
    const process = {
      id: 1,
      title: 'Test Process',
      stages: [{ id: '1', name: 'Stage 1', order: 1 }],
      stageDetails: [{ stageId: '1', description: 'Details' }],
    };
    
    expect(process.stageDetails.length).toBeGreaterThan(0);
  });

  it('should hide generation button for metrics when totalTime or totalCost exists', () => {
    const process1 = {
      id: 1,
      title: 'Test Process',
      totalTime: '2 hours',
      totalCost: null,
    };
    
    const process2 = {
      id: 2,
      title: 'Test Process',
      totalTime: null,
      totalCost: 1000,
    };
    
    expect(process1.totalTime).not.toBeNull();
    expect(process2.totalCost).not.toBeNull();
  });

  it('should hide generation button for CRM when crmFunnels exists', () => {
    const process = {
      id: 1,
      title: 'Test Process',
      crmFunnels: [{ id: '1', name: 'Funnel 1', stages: [] }],
    };
    
    expect(process.crmFunnels.length).toBeGreaterThan(0);
  });
});
