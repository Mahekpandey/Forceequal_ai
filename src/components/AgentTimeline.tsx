'use client';

import * as React from 'react';
import { useReportStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AgentTimeline() {
  const { agentSteps, isGenerating } = useReportStore();

  if (agentSteps.length === 0 && !isGenerating) return null;

  return (
    <Card className="bg-muted/30 border-primary/10 shadow-sm overflow-hidden backdrop-blur-sm relative">
      {/* Subtle background pulse for active generation */}
      {isGenerating && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse" />
      )}
      
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Multi-Agent Pipeline Activity
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="space-y-4">
          {agentSteps.map((step, index) => {
            const isLast = index === agentSteps.length - 1;
            const isRunning = step.status === 'running';
            const isDone = step.status === 'completed';
            const isError = step.status === 'error';

            return (
              <div key={index} className="relative pl-6">
                {/* Connecting line */}
                {!isLast && (
                  <div 
                    className={cn(
                      "absolute left-[11px] top-6 bottom-[-16px] w-[2px]",
                      isDone ? "bg-primary/50" : "bg-border"
                    )} 
                  />
                )}
                
                {/* Status node */}
                <div className={cn(
                  "absolute left-0 top-1 w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center bg-background shrink-0 z-10",
                  isRunning && "border-primary text-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]",
                  isDone && "border-emerald-500 text-emerald-500 bg-emerald-500/10",
                  isError && "border-destructive text-destructive",
                  !isRunning && !isDone && !isError && "border-muted-foreground/30 text-muted-foreground"
                )}>
                  {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isDone && <CheckCircle2 className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {!isRunning && !isDone && !isError && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>

                <div className={cn(
                  "transition-opacity duration-500",
                  (isRunning || isDone) ? "opacity-100" : "opacity-40"
                )}>
                  <div className="flex items-center justify-between">
                    <h4 className={cn(
                      "text-sm font-semibold",
                      isRunning && "text-primary dark:text-primary animate-pulse"
                    )}>
                      {step.agentName}
                    </h4>
                    
                    {step.duration && (
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-md">
                        {(step.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
          
          {isGenerating && agentSteps.length === 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Initializing AI workflow...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
