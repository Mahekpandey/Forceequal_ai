export function sanitizeMarkdown(input: string): string {
  if (!input) return '';

  let text = input.replace(/\r\n/g, '\n');

  // Some model outputs accidentally include literal escaped newlines.
  text = text.replace(/\\n/g, '\n');

  // Normalize malformed mermaid fences: ``` mermaid -> ```mermaid
  text = text.replace(/```+\s+mermaid/gi, '```mermaid');

  // Remove stray wrapping quotes around whole content.
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }

  return text.trim();
}

