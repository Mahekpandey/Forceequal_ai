import { getModel } from './config';
import { PlannerOutput, InsightOutput } from '../types';

const SYSTEM_PROMPT = `You are a Business Strategist and Research Analyst. You will receive a structured project outline from a Planner Agent. Your job is to ENRICH and DEEPEN each section with strategic insights.

You MUST respond with a JSON object containing these four fields (same structure as input, but enriched):
- "problemBreakdown": Take the existing problem analysis and add: market context, industry trends, competitive landscape analysis, and potential risks. Add a "Key Risks" subsection with a markdown table (Risk | Impact | Mitigation).
- "stakeholders": Enrich stakeholder analysis with: power/interest grid analysis, communication strategies per stakeholder group, and potential conflicts of interest. Add a stakeholder priority matrix as a markdown table.
- "solutionApproach": Add: technical feasibility assessment, resource requirements, alternative approaches considered (with pros/cons table), and integration considerations. Include a comparison table of approaches.
- "actionPlan": Add: detailed resource allocation, budget considerations, KPIs for each phase, risk mitigation steps, and go/no-go criteria. Enhance the timeline table with resource and dependency columns.

CRITICAL: You must EXPAND upon the input, not replace it. Keep all original content and ADD your insights. Each section should be at least 250 words. Use rich markdown formatting including tables, bold headers, bullet points, and blockquotes for key insights.`;

export async function runInsightAgent(plannerOutput: PlannerOutput): Promise<InsightOutput> {
  const model = getModel();

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Here is the Planner Agent's output to enrich:\n\n${JSON.stringify(plannerOutput, null, 2)}` },
  ]);

  const response = result.response;
  const text = response.text();
  const parsed = JSON.parse(text) as InsightOutput;

  return parsed;
}
