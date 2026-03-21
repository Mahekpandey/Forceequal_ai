import { getModel } from './config';
import { InsightOutput, ExecutorOutput } from '../types';

async function processExecutorSection(sectionName: string, content: string, formatRules: string): Promise<string> {
  const model = getModel();
  const prompt = `You are an Executive Report Writer. Transform this enriched data into a polished, client-ready markdown report section.
  
  Section: ${sectionName}
  Raw Data:\n${content}

  FORMATTING RULES for this section:
  ${formatRules}
  - Use ## for main subsection headers, ### for sub-subsections.
  - Use **bold** for key terms.
  - Use markdown tables with proper headers for all tabular data.
  - Make the content feel like a premium consulting report (minimum 300 words).

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
    console.warn(`Executor Agent Parse Warning [${sectionName}]. Using fallback regex.`);
    // Robust fallback
    const match = text.match(/"content"\s*:\s*"([\s\S]*)"/);
    if (match) return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    return content; // Ultimate fallback: return raw insight content rather than crashing
  }
}

export async function runExecutorAgent(insightOutput: InsightOutput): Promise<ExecutorOutput> {
  const pbRules = `Start with a compelling opening paragraph. Include well-formatted subsections. Add a "Key Findings" callout box (use > blockquote).`;
  const shRules = `Include a professional stakeholder matrix table, detailed profiles, a RACI-style responsibility table, and communication plan.`;
  const saRules = `Include a phased approach with clear deliverables, tech stack recommendations in a table, integration points, scalability and security notes.`;
  const apRules = `Include a detailed Gantt-style timeline table (Phase | Tasks | Duration | Dependencies | Resources | KPIs), budget breakdown table, and risk register table.`;

  // Run all 4 sections simultaneously!
  const [pb, sh, sa, ap] = await Promise.all([
    processExecutorSection('Problem Breakdown', insightOutput.problemBreakdown, pbRules),
    processExecutorSection('Stakeholders', insightOutput.stakeholders, shRules),
    processExecutorSection('Solution Approach', insightOutput.solutionApproach, saRules),
    processExecutorSection('Action Plan', insightOutput.actionPlan, apRules)
  ]);

  return {
    problemBreakdown: pb,
    stakeholders: sh,
    solutionApproach: sa,
    actionPlan: ap
  };
}