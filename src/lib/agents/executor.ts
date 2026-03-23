import { getModel, safeParseJson } from './config';
import { InsightOutput, ExecutorOutput } from '../types';
import { ensureTimelineFields } from './timeline-meta';

export async function runExecutorAgent(insightOutput: InsightOutput): Promise<ExecutorOutput> {
  const model = getModel();
  
  const prompt = `You are an Executive Report Writer. Transform this enriched data into four polished markdown report sections.
  
FORMATTING RULES FOR ALL SECTIONS:
- Use ## for main subsection headers, ### for sub-subsections.
- Use **bold** for key terms.
- Use markdown tables with proper headers for all tabular data.
- Include exactly one Mermaid.js diagram per section (simple, valid syntax).
- CRITICAL: You MUST wrap all Mermaid diagrams exactly in \\\`\\\`\\\`mermaid and \\\`\\\`\\\` tags. Do NOT start the diagram text with the word 'mermaid'. Start directly with 'graph', 'pie', or 'gantt'.
- Keep each section detailed and comprehensive (200-300 words) so the document is thorough.

[1. Problem Breakdown]
Raw Data: ${insightOutput.problemBreakdown}
Specific Rules: Include a "Key Findings" callout box (use > blockquote). Include a simple Mermaid pie chart.

[2. Stakeholders]
Raw Data: ${insightOutput.stakeholders}
Specific Rules: Include one stakeholder matrix table and a simple Mermaid relationship graph.

[3. Solution Approach]
Raw Data: ${insightOutput.solutionApproach}
Specific Rules: Include phased approach, compact tech table, and a simple Mermaid flowchart.

[4. Action Plan]
Raw Data: ${insightOutput.actionPlan}
Specific Rules: Include short timeline table, budget highlights, and a simple Mermaid gantt chart.

CRITICAL JSON INSTRUCTIONS:
- You MUST return ONLY a valid JSON object.
- Keys must be exactly: "problemBreakdown", "stakeholders", "solutionApproach", "actionPlan", "progressNote", "thinkingSteps".
- The four report keys must be strings containing the markdown content.
- "progressNote": one sentence (max 220 characters) on how you polished the deliverable (plain text).
- "thinkingSteps": JSON array of exactly 5 short strings (each max 120 characters), ordered sub-steps of formatting and synthesis (present tense).
- Escape ALL newlines inside string values strictly as \\n.
- Escape ALL double quotes inside string values strictly as \\".
- Do not include markdown blocks (\`\`\`json).

You MUST return a complete JSON object in one response and avoid truncation.`;

  const compactRetryPrompt = `${prompt}

If the previous attempt is too long, regenerate a compact version:
- each section 150-200 words
- use short tables (max 4 rows)
- Mermaid diagrams max 6 lines each.`;

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
    try {
      const retry = await model.generateContent(compactRetryPrompt);
      const parsed = safeParseJson<Record<string, unknown>>(retry.response.text());
      const { progressNote, thinkingSteps } = ensureTimelineFields(parsed);
      return {
        problemBreakdown: String(parsed.problemBreakdown ?? ''),
        stakeholders: String(parsed.stakeholders ?? ''),
        solutionApproach: String(parsed.solutionApproach ?? ''),
        actionPlan: String(parsed.actionPlan ?? ''),
        progressNote,
        thinkingSteps,
      };
    } catch (retryError) {
      console.error("Executor Agent Retry Error:", retryError);
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
}