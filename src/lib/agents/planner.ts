import { getModel } from './config';
import { PlannerOutput } from '../types';

const SYSTEM_PROMPT = `You are a Product Manager and Strategic Planner. Your job is to take a user's problem statement and break it down into a structured, actionable plan.

You MUST respond with a JSON object containing exactly these four fields:
- "problemBreakdown": A detailed markdown analysis of the problem. Include a clear problem definition, scope, key challenges, and objectives. Use bullet points, sub-headings (##, ###), and bold text for emphasis. Be thorough and insightful.
- "stakeholders": A detailed markdown section identifying all stakeholders. For each stakeholder, describe their role, interests, pain points, and how they relate to the problem. Use a markdown table where appropriate.
- "solutionApproach": A high-level markdown outline of the proposed solution approach. Include key components, technology considerations, and strategic direction. Use numbered lists and sub-sections.
- "actionPlan": A structured markdown action plan with phases, milestones, deliverables, and timelines. Use a markdown table for the timeline. Include dependencies between phases.

Make each section substantive (at least 150 words each). Use professional business language. Include markdown formatting like headers, bold, italic, tables, and bullet points for readability.`;

export async function runPlannerAgent(problemStatement: string): Promise<PlannerOutput> {
  const model = getModel();

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Problem Statement: ${problemStatement}` },
  ]);

  const response = result.response;
  const text = response.text();
  const parsed = JSON.parse(text) as PlannerOutput;

  return parsed;
}
