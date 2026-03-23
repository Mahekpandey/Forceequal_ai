import { NextResponse } from 'next/server';
import { runInsightAgent } from '@/lib/agents/insight';
import { requireGeminiKey, isInsightPayload } from '@/lib/api/pipeline-shared';
import type { AgentStep } from '@/lib/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const keyErr = requireGeminiKey();
  if (keyErr) return keyErr;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isInsightPayload(body)) {
    return NextResponse.json({ error: 'plannerOutput is required' }, { status: 400 });
  }

  const insightStart = Date.now();
  try {
    const insightOutput = await runInsightAgent(body.plannerOutput);
    const step: AgentStep = {
      agentName: 'Insight Agent',
      status: 'completed',
      description: insightOutput.progressNote,
      duration: Date.now() - insightStart,
      thinkingSteps: insightOutput.thinkingSteps,
    };
    return NextResponse.json({ insightOutput, step });
  } catch (error: unknown) {
    console.error('Insight route error:', error);
    const message = error instanceof Error ? error.message : 'Insight failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
