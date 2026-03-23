'use client';

import * as React from 'react';
import { useReportStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, Clock, AlertCircle, Brain, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const agentIcons: Record<string, React.ReactNode> = {
  'Planner Agent': <Brain className="w-3.5 h-3.5" />,
  'Insight Agent': <Search className="w-3.5 h-3.5" />,
  'Executor Agent': <Zap className="w-3.5 h-3.5" />,
  Pipeline: <AlertCircle className="w-3.5 h-3.5" />,
};

export function AgentTimeline() {
  const { agentSteps, isGenerating } = useReportStore();

  if (agentSteps.length === 0 && !isGenerating) return null;

  return (
    <Card className="bg-white border-slate-200 shadow-md overflow-hidden relative">
      {isGenerating && (
        <div className="absolute top-0 inset-x-0 h-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{
              animation: 'shimmer 2s ease-in-out infinite',
              width: '200%',
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0%);
          }
        }
      `}</style>

      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Multi-Agent Pipeline Activity
          {isGenerating && (
            <span className="ml-auto text-[10px] uppercase tracking-widest font-bold text-primary animate-pulse">
              Live
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-5">
        <div className="space-y-5">
          {agentSteps.map((step, index) => {
            const isLast = index === agentSteps.length - 1;
            const isRunning = step.status === 'running';
            const isDone = step.status === 'completed';
            const isError = step.status === 'error';
            const isPending = !isRunning && !isDone && !isError;
            const thoughts = step.thinkingSteps ?? [];

            return (
              <div key={`${step.agentName}-${index}`} className="relative pl-8">
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-[13px] top-7 bottom-[-20px] w-[2px] transition-all duration-500',
                      isDone ? 'bg-emerald-400' : isRunning ? 'bg-primary/30' : 'bg-slate-200'
                    )}
                  />
                )}

                <div
                  className={cn(
                    'absolute left-0 top-0.5 w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all duration-500',
                    isRunning && 'border-primary text-primary bg-primary/10 shadow-[0_0_12px_rgba(124,58,237,0.4)] scale-110',
                    isDone && 'border-emerald-500 text-emerald-500 bg-emerald-50',
                    isError && 'border-red-500 text-red-500 bg-red-50',
                    isPending && 'border-slate-200 text-slate-300 bg-slate-50'
                  )}
                >
                  {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isDone && <CheckCircle2 className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {isPending && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>

                <div
                  className={cn(
                    'transition-all duration-500',
                    isRunning && 'opacity-100',
                    isDone && 'opacity-100',
                    isPending && 'opacity-40',
                    isError && 'opacity-100'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {agentIcons[step.agentName] && (
                        <span
                          className={cn(
                            'transition-colors duration-300',
                            isRunning && 'text-primary',
                            isDone && 'text-emerald-600',
                            isError && 'text-red-500',
                            isPending && 'text-slate-400'
                          )}
                        >
                          {agentIcons[step.agentName]}
                        </span>
                      )}
                      <h4
                        className={cn(
                          'text-sm font-bold transition-colors duration-300',
                          isRunning && 'text-primary',
                          isDone && 'text-slate-800',
                          isError && 'text-red-600',
                          isPending && 'text-slate-500'
                        )}
                      >
                        {step.agentName}
                      </h4>
                    </div>

                    {step.duration !== undefined && step.duration > 0 && (
                      <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        ✓ {(step.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>

                  {step.description ? (
                    <p
                      className={cn(
                        'text-xs mt-1 transition-colors duration-300',
                        isRunning && 'text-primary/70 font-medium',
                        isDone && 'text-slate-500',
                        isError && 'text-red-500',
                        isPending && 'text-slate-400'
                      )}
                    >
                      {step.description}
                    </p>
                  ) : null}

                  {isRunning && (
                    <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full animate-pulse" />
                    </div>
                  )}

                  {isDone && thoughts.length > 0 && (
                    <ul className="mt-2 space-y-1 border-l border-emerald-100 pl-2.5">
                      {thoughts.map((t, i) => (
                        <li
                          key={i}
                          className="text-[10px] text-slate-600 font-mono leading-relaxed flex gap-1.5"
                        >
                          <span className="text-emerald-500 shrink-0">✓</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}

          {isGenerating && agentSteps.length === 0 && (
            <div className="flex items-center gap-3 text-sm text-slate-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="animate-pulse">Initializing workflow…</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
