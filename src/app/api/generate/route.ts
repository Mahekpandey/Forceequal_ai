import { NextResponse } from 'next/server';
import { runPlannerAgent } from '@/lib/agents/planner';
import { runInsightAgent } from '@/lib/agents/insight';
import { runExecutorAgent } from '@/lib/agents/executor';
import { getCached, setCache, hashInput } from '@/lib/agents/config';
import { Report, GenerateRequest, GenerateResponse, AgentStep } from '@/lib/types';

// Force Vercel Node.js Serverless to allow 60 seconds. DO NOT use 'edge' here.
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const rateLimitCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 1000 * 60 * 60; // 1 hour

export async function POST(req: Request) {
  try {
    // Failsafe check: If API key is totally missing, return immediate error instead of 504 hang
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'CRITICAL: GEMINI_API_KEY is missing in Vercel Environment Variables!' },
        { status: 500 }
      );
    }

    const { problemStatement } = (await req.json()) as GenerateRequest;

    if (!problemStatement || problemStatement.trim().length === 0) {
      return NextResponse.json(
        { error: 'Problem statement is required' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const rl = rateLimitCache.get(ip);
    
    if (rl) {
      if (now > rl.resetTime) {
        rateLimitCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      } else if (rl.count >= 5) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Maximum 5 generations per hour. Please try again later.' },
          { status: 429 }
        );
      } else {
        rl.count++;
      }
    } else {
      rateLimitCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    const cacheKey = hashInput(problemStatement);
    const cachedResponse = getCached<GenerateResponse>(cacheKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const steps: AgentStep[] = [];

    const addStep = (name: string, desc: string) => {
      const step: AgentStep = { agentName: name, status: 'running', description: desc };
      steps.push(step);
      return steps.length - 1;
    };

    const updateStep = (index: number, updates: Partial<AgentStep>) => {
      steps[index] = { ...steps[index], ...updates };
    };

    // 1. Planner Agent
    const plannerIndex = addStep('Planner Agent', 'Breaking down the problem...');
    const plannerStart = Date.now();
    const plannerOutput = await runPlannerAgent(problemStatement);
    updateStep(plannerIndex, { 
      status: 'completed', 
      duration: Date.now() - plannerStart,
      output: JSON.stringify(plannerOutput)
    });

    // 2. Insight Agent
    const insightIndex = addStep('Insight Agent', 'Adding strategic depth and analysis...');
    const insightStart = Date.now();
    const insightOutput = await runInsightAgent(plannerOutput);
    updateStep(insightIndex, {
      status: 'completed',
      duration: Date.now() - insightStart,
      output: JSON.stringify(insightOutput)
    });

    // 3. Executor Agent
    const executorIndex = addStep('Executor Agent', 'Formatting final professional report...');
    const executorStart = Date.now();
    const executorOutput = await runExecutorAgent(insightOutput);
    updateStep(executorIndex, {
      status: 'completed',
      duration: Date.now() - executorStart,
      output: JSON.stringify(executorOutput)
    });

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
          agentSource: 'executor'
        },
        {
          id: 'stakeholders',
          title: 'Stakeholders',
          content: executorOutput.stakeholders,
          icon: 'Users',
          agentSource: 'executor'
        },
        {
          id: 'solution',
          title: 'Solution Approach',
          content: executorOutput.solutionApproach,
          icon: 'Lightbulb',
          agentSource: 'executor'
        },
        {
          id: 'action',
          title: 'Action Plan',
          content: executorOutput.actionPlan,
          icon: 'ListChecks',
          agentSource: 'executor'
        }
      ],
      versions: []
    };

    const response: GenerateResponse = { report, agentSteps: steps };
    setCache(cacheKey, response);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Generation pipeline error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}