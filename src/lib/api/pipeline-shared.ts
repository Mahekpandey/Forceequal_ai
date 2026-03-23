import { NextResponse } from 'next/server';
import { getCached, hashInput } from '@/lib/agents/config';
import type { AgentStep, GenerateResponse, PlannerOutput } from '@/lib/types';

export const rateLimitCache = new Map<string, { count: number; resetTime: number }>();
export const RATE_LIMIT_WINDOW = 1000 * 60 * 60; // 1 hour
export const GENERATIONS_PER_WINDOW = 5;

export function requireGeminiKey(): NextResponse | null {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is missing. Add it in Vercel Environment Variables.' },
      { status: 500 }
    );
  }
  return null;
}

export function checkRateLimit(ip: string): NextResponse | null {
  const now = Date.now();
  const rl = rateLimitCache.get(ip);
  if (rl) {
    if (now > rl.resetTime) {
      rateLimitCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else if (rl.count >= GENERATIONS_PER_WINDOW) {
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
  return null;
}

export function getCachedGeneration(problemStatement: string): GenerateResponse | null {
  const cacheKey = hashInput(problemStatement);
  return getCached<GenerateResponse>(cacheKey);
}

export function isPlannerPayload(body: unknown): body is { problemStatement: string } {
  if (!body || typeof body !== 'object') return false;
  const ps = (body as { problemStatement?: unknown }).problemStatement;
  return typeof ps === 'string' && ps.trim().length > 0;
}

export function isInsightPayload(body: unknown): body is { plannerOutput: PlannerOutput } {
  if (!body || typeof body !== 'object') return false;
  const p = (body as { plannerOutput?: unknown }).plannerOutput;
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.problemBreakdown === 'string' &&
    typeof o.stakeholders === 'string' &&
    typeof o.solutionApproach === 'string' &&
    typeof o.actionPlan === 'string'
  );
}

function isAgentStepArray(val: unknown): val is AgentStep[] {
  if (!Array.isArray(val)) return false;
  return val.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as AgentStep).agentName === 'string' &&
      typeof (item as AgentStep).status === 'string' &&
      typeof (item as AgentStep).description === 'string'
  );
}

export function isExecutorPayload(
  body: unknown
): body is { insightOutput: PlannerOutput; problemStatement: string; priorAgentSteps: AgentStep[] } {
  if (!body || typeof body !== 'object') return false;
  const io = (body as { insightOutput?: unknown }).insightOutput;
  const ps = (body as { problemStatement?: unknown }).problemStatement;
  const prior = (body as { priorAgentSteps?: unknown }).priorAgentSteps;
  if (!io || typeof io !== 'object' || typeof ps !== 'string' || !ps.trim()) return false;
  if (prior !== undefined && !isAgentStepArray(prior)) return false;
  const o = io as Record<string, unknown>;
  return (
    typeof o.problemBreakdown === 'string' &&
    typeof o.stakeholders === 'string' &&
    typeof o.solutionApproach === 'string' &&
    typeof o.actionPlan === 'string'
  );
}

export function getPriorAgentSteps(body: { priorAgentSteps?: AgentStep[] }): AgentStep[] {
  return isAgentStepArray(body.priorAgentSteps) ? body.priorAgentSteps : [];
}
