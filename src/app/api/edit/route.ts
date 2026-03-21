import { NextResponse } from 'next/server';
import { runEditorAgent } from '@/lib/agents/editor';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { sectionId, currentContent, instruction, highlightedText } = await req.json();

    if (!sectionId || !currentContent || !instruction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newContent = await runEditorAgent(currentContent, instruction, highlightedText);

    return NextResponse.json({ newContent });
  } catch (error) {
    console.error('Editing error:', error);
    return NextResponse.json({ error: 'Failed to edit section' }, { status: 500 });
  }
}