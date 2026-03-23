import { getModel, safeParseJson } from './config';
import { InsightOutput, ExecutorOutput } from '../types';
import { ensureTimelineFields } from './timeline-meta';

export async function runExecutorAgent(insightOutput: InsightOutput): Promise<ExecutorOutput> {
  const model = getModel();
  
  const prompt = `You are an Executive Report Writer. Transform this enriched data into four highly polished, client-ready markdown report sections.
  
FORMATTING RULES FOR ALL SECTIONS:
- Use ## for main subsection headers, ### for sub-subsections.
- Use **bold** for key terms.
- Use markdown tables with proper headers for all tabular data.
- MUST include at least one Mermaid.js diagram per section.
- CRITICAL: You MUST wrap all Mermaid diagrams exactly in \\\`\\\`\\\`mermaid and \\\`\\\`\\\` tags. Do NOT start the diagram text with the word 'mermaid'. Start directly with 'graph', 'pie', or 'gantt'.
- Make the content feel like a premium consulting report (minimum 250 words per section).

[1. Problem Breakdown]
Raw Data: ${insightOutput.problemBreakdown}
Specific Rules: Start with a compelling opening paragraph. Include well-formatted subsections. Add a "Key Findings" callout box (use > blockquote). Include a Mermaid.js pie chart of problem distribution.

[2. Stakeholders]
Raw Data: ${insightOutput.stakeholders}
Specific Rules: Include a professional stakeholder matrix table, detailed profiles, and a Mermaid.js relationship or mindmap graph.

[3. Solution Approach]
Raw Data: ${insightOutput.solutionApproach}
Specific Rules: Include a phased approach, tech stack recommendations in a table, and a detailed Mermaid.js architecture flowchart.

[4. Action Plan]
Raw Data: ${insightOutput.actionPlan}
Specific Rules: Include a detailed Gantt-style timeline table, budget breakdown, and a complex Mermaid.js Gantt chart visualizing the schedule.

CRITICAL JSON INSTRUCTIONS:
- You MUST return ONLY a valid JSON object.
- Keys must be exactly: "problemBreakdown", "stakeholders", "solutionApproach", "actionPlan", "progressNote", "thinkingSteps".
- The four report keys must be strings containing the markdown content.
- "progressNote": one sentence (max 220 characters) on how you polished the deliverable (plain text).
- "thinkingSteps": JSON array of exactly 5 short strings (each max 120 characters), ordered sub-steps of formatting and synthesis (present tense).
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
    console.error("Executor Agent Generate/Parse Error:", error);
    // Ultimate fallback: return insight content rather than crashing the pipeline
    return {
      ...insightOutput,
      progressNote: insightOutput.progressNote || 'Reused prior sections after executor error.',
      thinkingSteps:
        insightOutput.thinkingSteps?.length > 0
          ? insightOutput.thinkingSteps
          : ['Skipped final polish pass; using prior sections.'],
    };
  }
}