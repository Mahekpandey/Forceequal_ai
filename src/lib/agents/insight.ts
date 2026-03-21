import { getModel } from './config';
import { PlannerOutput, InsightOutput } from '../types';

async function processInsightSection(sectionName: string, content: string, instructions: string): Promise<string> {
  const model = getModel();
  const prompt = `You are a Business Strategist and Research Analyst. ENRICH and DEEPEN the following section.
  
  Section: ${sectionName}
  Original Content:\n${content}

  Instructions for this section: ${instructions}
  EXPAND upon the input, keeping original points but adding strategic depth. Be at least 250 words.

  CRITICAL JSON INSTRUCTIONS:
  You MUST respond with a valid JSON object containing exactly ONE field: "content".
  - Ensure ALL newlines inside your string value are strictly escaped as \\n. DO NOT use raw/literal newlines.
  - Do not include markdown blocks (\`\`\`json).`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
  
  try {
    const parsed = JSON.parse(text);
    return parsed.content;
  } catch (error) {
    console.warn(`Insight Agent Parse Warning [${sectionName}]. Using fallback regex.`);
    // Robust fallback if JSON.parse fails due to unescaped characters
    const match = text.match(/"content"\s*:\s*"([\s\S]*)"/);
    if (match) return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    return content; // Ultimate fallback: return original content rather than crashing
  }
}

export async function runInsightAgent(plannerOutput: PlannerOutput): Promise<InsightOutput> {
  const pbInstructions = "Add market context, industry trends, competitive landscape analysis, and potential risks. Add a 'Key Risks' subsection with a markdown table (Risk | Impact | Mitigation).";
  const shInstructions = "Enrich with power/interest grid analysis, communication strategies, and potential conflicts of interest. Add a stakeholder priority matrix as a markdown table.";
  const saInstructions = "Add technical feasibility assessment, resource requirements, alternative approaches (with pros/cons table).";
  const apInstructions = "Add detailed resource allocation, budget considerations, KPIs, and go/no-go criteria. Enhance the timeline table.";

  // Run all 4 sections simultaneously!
  const [pb, sh, sa, ap] = await Promise.all([
    processInsightSection('Problem Breakdown', plannerOutput.problemBreakdown, pbInstructions),
    processInsightSection('Stakeholders', plannerOutput.stakeholders, shInstructions),
    processInsightSection('Solution Approach', plannerOutput.solutionApproach, saInstructions),
    processInsightSection('Action Plan', plannerOutput.actionPlan, apInstructions)
  ]);

  return {
    problemBreakdown: pb,
    stakeholders: sh,
    solutionApproach: sa,
    actionPlan: ap
  };
}