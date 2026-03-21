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
}

export interface InsightOutput {
  problemBreakdown: string;
  stakeholders: string;
  solutionApproach: string;
  actionPlan: string;
}

export interface ExecutorOutput {
  problemBreakdown: string;
  stakeholders: string;
  solutionApproach: string;
  actionPlan: string;
}
