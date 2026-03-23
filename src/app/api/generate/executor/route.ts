import { NextResponse } from 'next/server';
import { runExecutorAgent } from '@/lib/agents/executor';
import { setCache, hashInput } from '@/lib/agents/config';
import { requireGeminiKey, isExecutorPayload, getPriorAgentSteps } from '@/lib/api/pipeline-shared';
import type { AgentStep, GenerateResponse, Report } from '@/lib/types';

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

  if (!isExecutorPayload(body)) {
    return NextResponse.json({ error: 'insightOutput and problemStatement are required' }, { status: 400 });
  }

  const { insightOutput, problemStatement } = body;
  const priorAgentSteps = getPriorAgentSteps(body);
  const executorStart = Date.now();

  try {
    const executorOutput = await runExecutorAgent(insightOutput);
    const step: AgentStep = {
      agentName: 'Executor Agent',
      status: 'completed',
      description: executorOutput.progressNote,
      duration: Date.now() - executorStart,
      thinkingSteps: executorOutput.thinkingSteps,
    };

    const report: Report = {
      id: crypto.randomUUID(),
      problemStatement,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: [
        {
          id: 'problem',
          title: 'Problem Breakdown',
          content: executorOutput.problemBreakdown,
          icon: 'AlertCircle',
          agentSource: 'executor',
        },
        {
          id: 'stakeholders',
          title: 'Stakeholders',
          content: executorOutput.stakeholders,
          icon: 'Users',
          agentSource: 'executor',
        },
        {
          id: 'solution',
          title: 'Solution Approach',
          content: executorOutput.solutionApproach,
          icon: 'Lightbulb',
          agentSource: 'executor',
        },
        {
          id: 'action',
          title: 'Action Plan',
          content: executorOutput.actionPlan,
          icon: 'ListChecks',
          agentSource: 'executor',
        },
      ],
      versions: [],
    };

    const agentSteps = [...priorAgentSteps, step];
    const response: GenerateResponse = { report, agentSteps };
    setCache(hashInput(problemStatement), response);

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Executor route error:', error);
    const message = error instanceof Error ? error.message : 'Executor failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
