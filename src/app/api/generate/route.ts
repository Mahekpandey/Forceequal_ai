import { NextResponse } from 'next/server';
import { runPlannerAgent } from '@/lib/agents/planner';
import { runInsightAgent } from '@/lib/agents/insight';
import { runExecutorAgent } from '@/lib/agents/executor';
import { getCached, setCache, hashInput } from '@/lib/agents/config';
import { Report, GenerateRequest, GenerateResponse, AgentStep } from '@/lib/types';

export const maxDuration = 60; // Set max duration for Vercel

export async function POST(req: Request) {
  try {
    const { problemStatement } = (await req.json()) as GenerateRequest;

    if (!problemStatement || problemStatement.trim().length === 0) {
      return NextResponse.json(
        { error: 'Problem statement is required' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = hashInput(problemStatement);
    const cachedResponse = getCached<GenerateResponse>(cacheKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const steps: AgentStep[] = [];

    // Transform helper
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

    // Finalize report object
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
    
    // Save to cache
    setCache(cacheKey, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Generation pipeline error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
