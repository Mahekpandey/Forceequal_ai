import { getModel, safeParseJson } from './config';
import { PlannerOutput, InsightOutput } from '../types';
import { ensureTimelineFields } from './timeline-meta';

export async function runInsightAgent(plannerOutput: PlannerOutput): Promise<InsightOutput> {
  const model = getModel();
  
  const prompt = `You are a Business Strategist and Research Analyst. Improve this draft quickly and concisely.
  
Add strategic depth while staying brief so the response completes fast.

[1. Problem Breakdown]
Original: ${plannerOutput.problemBreakdown}
Instructions: Add market context and key risks. Keep to 90-140 words.

[2. Stakeholders]
Original: ${plannerOutput.stakeholders}
Instructions: Add a concise power/interest view and one small stakeholder priority table. Keep to 80-130 words.

[3. Solution Approach]
Original: ${plannerOutput.solutionApproach}
Instructions: Add feasibility, resources, and one compact pros/cons table. Keep to 90-140 words.

[4. Action Plan]
Original: ${plannerOutput.actionPlan}
Instructions: Add budget/KPI notes and a short practical timeline. Keep to 90-140 words.

Do NOT include Mermaid diagrams in insight output.

CRITICAL JSON INSTRUCTIONS:
- You MUST return ONLY a valid JSON object.
- Keys must be exactly: "problemBreakdown", "stakeholders", "solutionApproach", "actionPlan", "progressNote", "thinkingSteps".
- The four report keys must be strings containing the markdown content.
- "progressNote": one sentence (max 220 characters) summarizing how you enriched the plan (plain text).
- "thinkingSteps": JSON array of exactly 5 short strings (each max 120 characters), ordered sub-steps of your analysis (present tense).
- Escape ALL newlines inside string values strictly as \\n.
- Escape ALL double quotes inside string values strictly as \\".
- Do not include markdown blocks (\`\`\`json).`;

  try {
    const result = await model.generateContent(prompt);
    const parsed = safeParseJson<Record<string, unknown>>(result.response.text());
    const { progressNote, thinkingSteps } = ensureTimelineFields(parsed);
    return {
      problemBreakdown: String(parsed.problemBreakdown ?? ''),
      stakeholders: String(parsed.stakeholders ?? ''),
      solutionApproach: String(parsed.solutionApproach ?? ''),
      actionPlan: String(parsed.actionPlan ?? ''),
      progressNote,
      thinkingSteps,
    };
  } catch (error) {
    console.error("Insight Agent Generate/Parse Error:", error);
    // Ultimate fallback: return original content rather than crashing the pipeline
    return {
      ...plannerOutput,
      progressNote: plannerOutput.progressNote || 'Reused planner output after insight error.',
      thinkingSteps:
        plannerOutput.thinkingSteps?.length > 0
          ? plannerOutput.thinkingSteps
          : ['Skipped deep insight pass; using planner draft.'],
    };
  }
}