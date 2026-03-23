import { getModel, safeParseJson } from './config';
import { PlannerOutput, InsightOutput } from '../types';
import { ensureTimelineFields } from './timeline-meta';

export async function runInsightAgent(plannerOutput: PlannerOutput): Promise<InsightOutput> {
  const model = getModel();
  
  const prompt = `You are a Business Strategist and Research Analyst. ENRICH and DEEPEN the following strategic outline.
  
Please expand upon all four sections simultaneously. Keep original points but add strategic depth. Make each section robust (at least 200 words).

[1. Problem Breakdown]
Original: ${plannerOutput.problemBreakdown}
Instructions: Add market context, industry trends, competitive landscape analysis, and potential risks. Add a 'Key Risks' subsection with a markdown table.

[2. Stakeholders]
Original: ${plannerOutput.stakeholders}
Instructions: Enrich with power/interest grid analysis. Add a stakeholder priority matrix as a markdown table and a Mermaid.js relationship graph.

[3. Solution Approach]
Original: ${plannerOutput.solutionApproach}
Instructions: Add technical feasibility assessment, resource requirements, alternative approaches (with pros/cons table), and a detailed Mermaid.js architecture diagram.

[4. Action Plan]
Original: ${plannerOutput.actionPlan}
Instructions: Add detailed resource allocation, budget considerations, KPIs. Enhance the timeline with a detailed Mermaid.js Gantt chart.

CRITICAL MERMAID INSTRUCTION: You MUST wrap all Mermaid diagrams exactly in \\\`\\\`\\\`mermaid and \\\`\\\`\\\` tags. Do NOT start the diagram text with the word 'mermaid'. Start directly with 'graph', 'pie', or 'gantt'.

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