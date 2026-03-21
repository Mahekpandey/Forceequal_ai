import { getModel, cleanJSON } from './config';
import { PlannerOutput } from '../types';

const SYSTEM_PROMPT = `You are a Product Manager and Strategic Planner. Your job is to take a user's problem statement and break it down into a structured, actionable plan.

CRITICAL JSON INSTRUCTIONS:
- You MUST return ONLY a valid JSON object.
- Keys must be exactly: "problemBreakdown", "stakeholders", "solutionApproach", "actionPlan".
- Values must be strings containing the markdown content.
- Escape ALL newlines inside string values strictly as \\n.
- Escape ALL double quotes inside string values strictly as \\".
- Do not include markdown blocks (\`\`\`json). Just return the raw JSON.

Content Requirements:
- "problemBreakdown": Detailed analysis, problem definition, scope, challenges. Use ## headings and bullet points.
- "stakeholders": Identify all stakeholders, roles, interests. Use a markdown table and a Mermaid.js pie chart.
- "solutionApproach": High-level outline, components, and a Mermaid.js diagram.
- "actionPlan": Structured phases, milestones, timeline table, and a Mermaid.js Gantt chart.

CRITICAL MERMAID INSTRUCTION: You MUST wrap all Mermaid diagrams exactly in \\\`\\\`\\\`mermaid and \\\`\\\`\\\` tags. Do NOT start the diagram text with the word 'mermaid'. Start directly with 'graph', 'pie', or 'gantt'.

Make each section substantive (at least 150 words each). Use professional business language.`;

export async function runPlannerAgent(problemStatement: string): Promise<PlannerOutput> {
  const model = getModel();

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Problem Statement: ${problemStatement}` },
  ]);

  let text = result.response.text();
  text = cleanJSON(text);

  try {
    return JSON.parse(text) as PlannerOutput;
  } catch (error) {
    console.error("Planner Agent JSON Error:", error);
    throw new Error("Planner Agent failed to return valid JSON.");
  }
}