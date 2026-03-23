import { getPlannerModel, safeParseJson } from './config';
import { PlannerOutput } from '../types';
import { ensureTimelineFields } from './timeline-meta';

const SYSTEM_PROMPT = `You are a Product Manager and Strategic Planner. Your job is to take a user's problem statement and break it down into a structured, actionable plan.

CRITICAL JSON INSTRUCTIONS:
- You MUST return ONLY a valid JSON object.
- Keys must be exactly: "problemBreakdown", "stakeholders", "solutionApproach", "actionPlan", "progressNote", "thinkingSteps".
- The four report keys must be strings containing the markdown content.
- "progressNote": one clear sentence (max 220 characters) describing what you focused on for this specific problem (plain text, no markdown).
- "thinkingSteps": a JSON array of exactly 5 short strings (each max 120 characters). Each string is a concrete planning sub-step you applied, in order, using present tense (e.g. "Mapping constraints and success criteria").
- Escape ALL newlines inside string values strictly as \\n.
- Escape ALL double quotes inside string values strictly as \\".
- Do not include markdown blocks (\`\`\`json). Just return the raw JSON.

Content Requirements (intermediate draft only; keep concise for fast inference):
- "problemBreakdown": 70-120 words, bullets allowed.
- "stakeholders": 60-100 words and one compact markdown table.
- "solutionApproach": 70-120 words with clear phased outline.
- "actionPlan": 70-120 words with short timeline bullets.
- Do NOT include Mermaid diagrams in planner output.

Keep total output concise and focused.

You MUST output a single complete, valid JSON object. Do not stop early or truncate any string value.`;

export async function runPlannerAgent(problemStatement: string): Promise<PlannerOutput> {
  const model = getPlannerModel();

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Problem Statement: ${problemStatement}` },
  ]);

  try {
    const raw = result.response.text();
    const fr = result.response.candidates?.[0]?.finishReason;
    if (fr === 'MAX_TOKENS') {
      console.warn('Planner Agent: finishReason=MAX_TOKENS — output may be truncated; consider raising PLANNER_MAX_OUTPUT.');
    }
    const parsed = safeParseJson<Record<string, unknown>>(raw);
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
    console.error("Planner Agent JSON Error:", error);
    throw new Error("Planner Agent failed to return valid JSON.");
  }
}