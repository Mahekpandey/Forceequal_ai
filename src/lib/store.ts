'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Report, AgentStep, VersionEntry } from './types';

interface ReportStore {
  // State
  report: Report | null;
  agentSteps: AgentStep[];
  isGenerating: boolean;
  editingSection: string | null;
  isEditing: boolean;
  isExporting: boolean;

  // Actions
  setReport: (report: Report) => void;
  updateSection: (sectionId: string, newContent: string) => void;
  addVersion: (version: VersionEntry) => void;
  setAgentSteps: (steps: AgentStep[]) => void;
  updateAgentStep: (index: number, step: Partial<AgentStep>) => void;
  setIsGenerating: (val: boolean) => void;
  setEditingSection: (sectionId: string | null) => void;
  setIsEditing: (val: boolean) => void;
  setIsExporting: (val: boolean) => void;
  reset: () => void;
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set) => ({
      report: null,
      agentSteps: [],
      isGenerating: false,
      editingSection: null,
      isEditing: false,
      isExporting: false,

      setReport: (report) => set({ report }),

      updateSection: (sectionId, newContent) =>
        set((state) => {
          if (!state.report) return state;
          return {
            report: {
              ...state.report,
              updatedAt: new Date().toISOString(),
              sections: state.report.sections.map((s) =>
                s.id === sectionId ? { ...s, content: newContent } : s
              ),
            },
          };
        }),

      addVersion: (version) =>
        set((state) => {
          if (!state.report) return state;
          return {
            report: {
              ...state.report,
              versions: [...state.report.versions, version],
            },
          };
        }),

      setAgentSteps: (steps) => set({ agentSteps: steps }),

      updateAgentStep: (index, step) =>
        set((state) => ({
          agentSteps: state.agentSteps.map((s, i) =>
            i === index ? { ...s, ...step } : s
          ),
        })),

      setIsGenerating: (val) => set({ isGenerating: val }),
      setEditingSection: (sectionId) => set({ editingSection: sectionId }),
      setIsEditing: (val) => set({ isEditing: val }),
      setIsExporting: (val) => set({ isExporting: val }),

      reset: () =>
        set({
          report: null,
          agentSteps: [],
          isGenerating: false,
          editingSection: null,
          isEditing: false,
          isExporting: false,
        }),
    }),
    {
      name: 'forceequal-report-store',
      partialize: (state) => ({
        report: state.report,
        agentSteps: state.agentSteps,
      }),
    }
  )
);
