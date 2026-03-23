import { NextResponse } from 'next/server';
import { runPlannerAgent } from '@/lib/agents/planner';
import {
  requireGeminiKey,
  checkRateLimit,
  getCachedGeneration,
  isPlannerPayload,
} from '@/lib/api/pipeline-shared';
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

  if (!isPlannerPayload(body)) {
    return NextResponse.json({ error: 'problemStatement is required' }, { status: 400 });
  }

  const problemStatement = body.problemStatement.trim();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const rl = checkRateLimit(ip);
  if (rl) return rl;

  const cached = getCachedGeneration(problemStatement);
  if (cached) {
    return NextResponse.json({ cached: true, report: cached.report, agentSteps: cached.agentSteps });
  }

  const plannerStart = Date.now();
  try {
    const plannerOutput = await runPlannerAgent(problemStatement);
    const step: AgentStep = {
      agentName: 'Planner Agent',
      status: 'completed',
      description: plannerOutput.progressNote,
      duration: Date.now() - plannerStart,
      thinkingSteps: plannerOutput.thinkingSteps,
    };
    return NextResponse.json({ cached: false, plannerOutput, step });
  } catch (error: unknown) {
    console.error('Planner route error:', error);
    const message = error instanceof Error ? error.message : 'Planner failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
