// ============================================
// Type definitions for the AI Planning Agent
// ============================================

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  icon: string;
  agentSource: 'planner' | 'insight' | 'executor';
}

export interface VersionEntry {
  id: string;
  sectionId: string;
  previousContent: string;
  newContent: string;
  editPrompt: string;
  timestamp: string;
}

export interface Report {
  id: string;
  problemStatement: string;
  sections: ReportSection[];
  versions: VersionEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentStep {
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  description: string;
  duration?: number;
  output?: string;
  /** Short reasoning beats returned by the model for the timeline UI */
  thinkingSteps?: string[];
}

// API Request/Response types
export interface GenerateRequest {
  problemStatement: string;
}

export interface GenerateResponse {
  report: Report;
  agentSteps: AgentStep[];
}

export interface EditRequest {
  sectionId: string;
  currentContent: string;
  instruction: string;
}

export interface EditResponse {
  newContent: string;
}

export interface ExportRequest {
  report: Report;
}

// Agent internal types
export interface PlannerOutput {
  problemBreakdown: string;
  stakeholders: string;
  solutionApproach: string;
  actionPlan: string;
  /** One-line summary from the model for the activity timeline */
  progressNote: string;
  /** 4–6 short strings the UI can show as this agent's reasoning trail */
  thinkingSteps: string[];
}

export interface InsightOutput {
  problemBreakdown: string;
  stakeholders: string;
  solutionApproach: string;
  actionPlan: string;
  progressNote: string;
  thinkingSteps: string[];
}

export interface ExecutorOutput {
  problemBreakdown: string;
  stakeholders: string;
  solutionApproach: string;
  actionPlan: string;
  progressNote: string;
  thinkingSteps: string[];
}
