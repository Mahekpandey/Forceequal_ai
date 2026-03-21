import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { runPlannerAgent } from '@/lib/agents/planner';
import { runInsightAgent } from '@/lib/agents/insight';
import { runExecutorAgent } from '@/lib/agents/executor';
import { getCached, setCache, hashInput } from '@/lib/agents/config';
import { Report, GenerateRequest, GenerateResponse, AgentStep } from '@/lib/types';

// Simple in-memory rate limiter based on IP
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 1000 * 60 * 60; // 1 hour

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

    // Rate Limiting (5 requests per IP per hour)
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

    // 2. Insight Agent (Consolidated into 1 request)
    const insightIndex = addStep('Insight Agent', 'Adding strategic depth and analysis...');
    const insightStart = Date.now();
    const insightOutput = await runInsightAgent(plannerOutput);
    updateStep(insightIndex, {
      status: 'completed',
      duration: Date.now() - insightStart,
      output: JSON.stringify(insightOutput)
    });

    // 3. Executor Agent (Consolidated into 1 request)
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

    // Save to local outputs folder as OP1, OP2, etc.
    try {
      const outputsDir = path.join(process.cwd(), 'outputs');
      if (!fs.existsSync(outputsDir)) {
        fs.mkdirSync(outputsDir, { recursive: true });
      }

      // Count existing OP files to determine next number
      const files = fs.readdirSync(outputsDir);
      const opFiles = files.filter(f => f.startsWith('OP') && f.endsWith('.md'));
      const nextNum = opFiles.length + 1;
      const fileName = `OP${nextNum}.md`;

      // Format the markdown content
      let mdContent = `# Strategic Plan \n**Problem Statement:** ${problemStatement}\n\n`;
      report.sections.forEach(sec => {
        mdContent += `---\n\n## ${sec.title}\n\n${sec.content}\n\n`;
      });

      fs.writeFileSync(path.join(outputsDir, fileName), mdContent, 'utf-8');
      console.log(`Saved local output: ${fileName}`);
    } catch (fsError) {
      console.error('Failed to save local output:', fsError);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Generation pipeline error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}