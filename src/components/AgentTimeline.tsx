'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useReportStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, Clock, AlertCircle, Brain, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Streaming "thinking" messages per agent for gamification effect
const AGENT_THOUGHTS: Record<string, string[]> = {
  'Planner Agent': [
    'Analyzing problem dimensions...',
    'Identifying key stakeholders...',
    'Breaking down into sub-components...',
    'Mapping dependency chains...',
    'Evaluating strategic priorities...',
    'Structuring problem framework...',
    'Defining success metrics...',
    'Building execution tracks...',
  ],
  'Insight Agent': [
    'Researching market landscape...',
    'Analyzing competitive dynamics...',
    'Identifying risk vectors...',
    'Evaluating growth opportunities...',
    'Cross-referencing industry patterns...',
    'Synthesizing strategic insights...',
    'Mapping stakeholder alignment...',
    'Building recommendation matrix...',
  ],
  'Executor Agent': [
    'Structuring deliverables...',
    'Formatting action frameworks...',
    'Building implementation timeline...',
    'Organizing KPI dashboards...',
    'Compiling resource requirements...',
    'Finalizing professional report...',
    'Generating executive summary...',
    'Polishing final output...',
  ],
};

const agentIcons: Record<string, React.ReactNode> = {
  'Planner Agent': <Brain className="w-3.5 h-3.5" />,
  'Insight Agent': <Search className="w-3.5 h-3.5" />,
  'Executor Agent': <Zap className="w-3.5 h-3.5" />,
};

// Component for streaming thought text animation
function StreamingThoughts({ agentName, isActive }: { agentName: string; isActive: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const thoughts = AGENT_THOUGHTS[agentName] || ['Processing...'];

  const typeText = useCallback(() => {
    const targetText = thoughts[currentIndex % thoughts.length];
    let charIndex = 0;
    setIsTyping(true);
    setDisplayText('');

    const typeInterval = setInterval(() => {
      if (charIndex <= targetText.length) {
        setDisplayText(targetText.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        // Wait, then move to next thought
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 1200);
      }
    }, 35);

    return () => clearInterval(typeInterval);
  }, [currentIndex, thoughts]);

  useEffect(() => {
    if (!isActive) return;
    const cleanup = typeText();
    return cleanup;
  }, [isActive, typeText]);

  if (!isActive) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-xs text-primary/80 font-mono tracking-tight">
          {displayText}
          {isTyping && <span className="inline-block w-[2px] h-3 bg-primary ml-[1px] animate-pulse" />}
        </p>
      </div>
      
      {/* Progress bar animation */}
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min((currentIndex / thoughts.length) * 85 + 10, 95)}%`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}

// Past thoughts that have been "completed" — shown as fading log entries
function CompletedThoughts({ agentName, count }: { agentName: string; count: number }) {
  const thoughts = AGENT_THOUGHTS[agentName] || [];
  const displayThoughts = thoughts.slice(0, Math.min(count, 3));

  if (displayThoughts.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-0.5">
      {displayThoughts.map((thought, i) => (
        <p 
          key={i} 
          className="text-[10px] text-slate-400 font-mono line-through decoration-slate-300"
          style={{ opacity: 0.4 + (i * 0.2) }}
        >
          ✓ {thought}
        </p>
      ))}
    </div>
  );
}

export function AgentTimeline() {
  const { agentSteps, isGenerating } = useReportStore();
  const [completedCounts, setCompletedCounts] = useState<Record<string, number>>({});

  // Track which agents have just transitioned from running to completed
  useEffect(() => {
    agentSteps.forEach((step) => {
      if (step.status === 'completed' && !completedCounts[step.agentName]) {
        setCompletedCounts((prev) => ({
          ...prev,
          [step.agentName]: (AGENT_THOUGHTS[step.agentName] || []).length,
        }));
      }
    });
  }, [agentSteps, completedCounts]);

  // Reset when generation starts fresh
  useEffect(() => {
    if (agentSteps.length === 0) {
      setCompletedCounts({});
    }
  }, [agentSteps.length]);

  if (agentSteps.length === 0 && !isGenerating) return null;

  return (
    <Card className="bg-white border-slate-200 shadow-md overflow-hidden relative">
      {/* Animated top bar */}
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
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
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

            return (
              <div key={index} className="relative pl-8">
                {/* Connecting line */}
                {!isLast && (
                  <div 
                    className={cn(
                      "absolute left-[13px] top-7 bottom-[-20px] w-[2px] transition-all duration-500",
                      isDone ? "bg-emerald-400" : isRunning ? "bg-primary/30" : "bg-slate-200"
                    )} 
                  />
                )}
                
                {/* Status node with glow effect */}
                <div className={cn(
                  "absolute left-0 top-0.5 w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all duration-500",
                  isRunning && "border-primary text-primary bg-primary/10 shadow-[0_0_12px_rgba(124,58,237,0.4)] scale-110",
                  isDone && "border-emerald-500 text-emerald-500 bg-emerald-50",
                  isError && "border-red-500 text-red-500 bg-red-50",
                  isPending && "border-slate-200 text-slate-300 bg-slate-50"
                )}>
                  {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isDone && <CheckCircle2 className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {isPending && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>

                <div className={cn(
                  "transition-all duration-500",
                  isRunning && "opacity-100",
                  isDone && "opacity-100",
                  isPending && "opacity-40",
                  isError && "opacity-100"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {agentIcons[step.agentName] && (
                        <span className={cn(
                          "transition-colors duration-300",
                          isRunning && "text-primary",
                          isDone && "text-emerald-600",
                          isError && "text-red-500",
                          isPending && "text-slate-400"
                        )}>
                          {agentIcons[step.agentName]}
                        </span>
                      )}
                      <h4 className={cn(
                        "text-sm font-bold transition-colors duration-300",
                        isRunning && "text-primary",
                        isDone && "text-slate-800",
                        isError && "text-red-600",
                        isPending && "text-slate-500"
                      )}>
                        {step.agentName}
                      </h4>
                    </div>
                    
                    {step.duration && (
                      <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        ✓ {(step.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  
                  <p className={cn(
                    "text-xs mt-1 transition-colors duration-300",
                    isRunning && "text-primary/70 font-medium",
                    isDone && "text-slate-500",
                    isError && "text-red-500",
                    isPending && "text-slate-400"
                  )}>
                    {step.description}
                  </p>

                  {/* Streaming thoughts — the gamification layer */}
                  <StreamingThoughts agentName={step.agentName} isActive={isRunning} />
                  
                  {/* Completed agent's thought log */}
                  {isDone && <CompletedThoughts agentName={step.agentName} count={completedCounts[step.agentName] || 3} />}
                </div>
              </div>
            );
          })}
          
          {isGenerating && agentSteps.length === 0 && (
            <div className="flex items-center gap-3 text-sm text-slate-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="animate-pulse">Initializing AI workflow...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
