import { getEditModel } from './config';

const SYSTEM_PROMPT = `You are an Expert Copyeditor. You will receive a full markdown section and a user instruction. 

RULES:
1. Maintain the original markdown structure (headers, tables, lists, bold).
2. ONLY modify the content according to the instruction.
3. Keep the same level of professionalism.
4. Return ONLY the fully updated section content in markdown format.

You MUST respond with a JSON object containing exactly one field: "content"`;

export async function runEditorAgent(
  currentContent: string,
  instruction: string,
  highlightedText?: string | null
): Promise<string> {
  const model = getEditModel();
  
  let promptText = `Current Section Content:\n\n${currentContent}\n\nUser's Editing Instruction: ${instruction}`;
  
  if (highlightedText) {
    promptText += `\n\nCRITICAL INSTRUCTION: The user has highlighted the following specific text to edit: "${highlightedText}". \nModify ONLY this highlighted text based on the instruction. Keep the rest of the section EXACTLY as it is. Return the FULL updated section content.`;
  }

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: promptText },
  ]);

  let text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
  
  try {
    const parsed = JSON.parse(text) as { content: string };
    return parsed.content;
  } catch (e) {
    const match = text.match(/"content"\s*:\s*"([\s\S]*)"/);
    if (match) return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    return currentContent; 
  }
}