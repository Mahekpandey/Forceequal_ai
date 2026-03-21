import { getEditModel } from './config';

const SYSTEM_PROMPT = `You are an Expert Copyeditor and Content Specialist. You will be given a section of a business report and a user's editing instruction. Your job is to rewrite ONLY this section according to the instruction.

RULES:
1. Maintain the original markdown structure (headers, tables, lists, bold, etc.)
2. Only modify the content as instructed — do not add unrelated information
3. Keep the same level of professionalism
4. If the instruction says "make it detailed", expand with more depth and examples
5. If the instruction says "shorten", condense while keeping key points
6. If the instruction says "professional tone", elevate the language
7. Preserve all markdown tables and formatting
8. Return ONLY the rewritten section content, not the entire report

You MUST respond with a JSON object containing exactly one field:
- "content": The rewritten section content in markdown format`;

export async function runEditorAgent(
  currentContent: string,
  instruction: string
): Promise<string> {
  const model = getEditModel();

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    {
      text: `Current Section Content:\n\n${currentContent}\n\nUser's Editing Instruction: ${instruction}`,
    },
  ]);

  const response = result.response;
  const text = response.text();
  const parsed = JSON.parse(text) as { content: string };

  return parsed.content;
}
