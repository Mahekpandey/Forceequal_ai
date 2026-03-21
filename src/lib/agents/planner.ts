import { getModel } from './config';
import { PlannerOutput } from '../types';

const SYSTEM_PROMPT = `You are a Product Manager and Strategic Planner. Your job is to take a user's problem statement and break it down into a structured, actionable plan.

CRITICAL JSON INSTRUCTIONS:
You MUST respond with a valid JSON object containing exactly these four fields: "problemBreakdown", "stakeholders", "solutionApproach", "actionPlan".
- Ensure ALL newlines inside your string values are strictly escaped as \\n. DO NOT use raw/literal newlines inside the strings.
- Do not include markdown blocks (\`\`\`json). Just return the raw JSON.

Content Requirements:
- "problemBreakdown": Detailed analysis, problem definition, scope, challenges. Use ## headings and bullet points.
- "stakeholders": Identify all stakeholders, roles, interests. Use a markdown table.
- "solutionApproach": High-level outline, components, tech considerations.
- "actionPlan": Structured phases, milestones, timeline table.

Make each section substantive (at least 150 words each). Use professional business language.`;

export async function runPlannerAgent(problemStatement: string): Promise<PlannerOutput> {
  const model = getModel();

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Problem Statement: ${problemStatement}` },
  ]);

  let text = result.response.text();
  // Strip markdown backticks if the model ignored the instruction
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(text) as PlannerOutput;
  } catch (error) {
    console.error("Planner Agent JSON Error:", error);
    throw new Error("Planner Agent failed to return valid JSON.");
  }
}