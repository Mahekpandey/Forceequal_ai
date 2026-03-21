'use client';

import * as React from 'react';
import { useState } from 'react';
import { Sparkles, ArrowRight, FileSignature, Target, Bot, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useReportStore } from '@/lib/store';
import { ReportSection } from '@/components/ReportSection';
import { AgentTimeline } from '@/components/AgentTimeline';
import { EditDialog } from '@/components/EditDialog';
import { ExportButtons } from '@/components/ExportButtons';

const SUGGESTIONS = [
  "Build a creator marketplace platform",
  "Launch a B2B SaaS for dental clinics",
  "Design an AI compliance tool for fintech",
];

export default function Home() {
  const [problem, setProblem] = useState('');
  const { 
    report, 
    setReport, 
    isGenerating, 
    setIsGenerating, 
    setAgentSteps, 
    reset 
  } = useReportStore();

  const handleGenerate = async (query: string = problem) => {
    if (!query.trim() || isGenerating) return;

    reset();
    setIsGenerating(true);
    setProblem(query);
    
    // Initial timeline state
    setAgentSteps([
      { agentName: 'Planner Agent', status: 'pending', description: 'Waiting into queue...' },
      { agentName: 'Insight Agent', status: 'pending', description: 'Waiting into queue...' },
      { agentName: 'Executor Agent', status: 'pending', description: 'Waiting into queue...' },
    ]);

    try {
      // In a real app we'd use SSE (Server-Sent Events) to stream the 
      // timeline steps. For simplicity, we just fetch the whole thing 
      // and fake the sequence visually.
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemStatement: query }),
      });

      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      
      // Simulate timeline sequence visually for the WOW effect
      setAgentSteps([
        { agentName: 'Planner Agent', status: 'running', description: 'Deconstructing the problem...' },
        { agentName: 'Insight Agent', status: 'pending', description: 'Waiting into queue...' },
        { agentName: 'Executor Agent', status: 'pending', description: 'Waiting into queue...' },
      ]);
      await new Promise(r => setTimeout(r, 1500));
      
      setAgentSteps([
        { agentName: 'Planner Agent', status: 'completed', description: 'Problem broken into 4 core tracks', duration: data.agentSteps[0].duration },
        { agentName: 'Insight Agent', status: 'running', description: 'Enriching with market research and strategic risks...' },
        { agentName: 'Executor Agent', status: 'pending', description: 'Waiting into queue...' },
      ]);
      await new Promise(r => setTimeout(r, 2000));
      
      setAgentSteps([
        { agentName: 'Planner Agent', status: 'completed', description: 'Problem broken into 4 core tracks', duration: data.agentSteps[0].duration },
        { agentName: 'Insight Agent', status: 'completed', description: 'Added 12 strategic insights and risk paths', duration: data.agentSteps[1].duration },
        { agentName: 'Executor Agent', status: 'running', description: 'Formatting final professional report...' },
      ]);
      await new Promise(r => setTimeout(r, 1800));

      setAgentSteps(data.agentSteps);
      setReport(data.report);
      
    } catch (error) {
      console.error('Failed to generate report:', error);
      setAgentSteps([
        { agentName: 'Planner Agent', status: 'error', description: 'Failed to generate report.' },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container py-12 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-2 shadow-sm shadow-primary/20 backdrop-blur-xl">
          <Sparkles className="mr-2 h-4 w-4" />
          Multi-Agent Strategy Pipeline
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-primary/60">
          Turn problems into execution plans.
        </h1>
        <p className="text-lg text-muted-foreground">
          Enter a problem statement. Watch three distinct AI agents break it down, enrich it with insights, and prepare a professional, editable report.
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-12 max-w-5xl mx-auto">
        {/* Left Column: Input Panel */}
        <div className="md:col-span-5 space-y-6 animate-in fade-in slide-in-from-left-8 duration-700 delay-150">
          <div className="relative group rounded-xl overflow-hidden p-1 shadow-xl">
            {/* Animated border pulse */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-blue-500 to-purple-600 opacity-20 group-hover:opacity-40 transition-opacity blur duration-500" />
            
            <div className="relative bg-background/80 backdrop-blur-xl rounded-lg border border-border/50 p-6 flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Define your goal / problem
                </label>
                <Textarea 
                  placeholder="e.g. Build a creator marketplace platform..."
                  className="min-h-[140px] resize-none text-base bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/40 focus-visible:border-primary/50 shadow-inner"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => handleGenerate()} 
                  disabled={!problem.trim() || isGenerating}
                  className="w-full h-12 text-md gap-2 shadow-lg shadow-primary/20 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Agents Orchestrating...
                    </>
                  ) : (
                    <>
                      Generate Strategic Plan 
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>

              {!isGenerating && !report && (
                <div className="pt-4 border-t border-border/40">
                  <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">Try an example</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setProblem(suggestion);
                          handleGenerate(suggestion);
                        }}
                        className="text-left text-xs bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20 rounded-md px-3 py-2"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <AgentTimeline />
        </div>

        {/* Right Column: Output / Report */}
        <div className="md:col-span-7 animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
          {!report && !isGenerating && (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 rounded-xl border-2 border-dashed border-border/50 bg-muted/10 text-muted-foreground">
              <div className="p-4 bg-muted rounded-full mb-4">
                <FileSignature className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">Awaiting problem statement</h3>
              <p className="max-w-xs mx-auto text-sm">
                Enter your problem on the left to initialize the multi-agent pipeline and generate your report.
              </p>
            </div>
          )}

          {isGenerating && !report && (
            <div className="space-y-6 opacity-60 pointer-events-none">
              <div className="h-10 w-full bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-48 w-full bg-muted/30 rounded-xl animate-pulse" />
              <div className="h-48 w-full bg-muted/30 rounded-xl animate-pulse" />
            </div>
          )}

          {report && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 rounded-xl border border-primary/20 bg-background shadow-2xl overflow-hidden p-[1px]">
              {/* Report Header */}
              <div className="bg-muted/30 p-6 border-b border-border/50 flex flex-col gap-4 sticky top-16 z-10 backdrop-blur-xl">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Strategic Plan</h2>
                    <p className="text-sm font-medium italic mt-1 text-muted-foreground border-l-2 border-primary/40 pl-3">
                      "{report.problemStatement}"
                    </p>
                  </div>
                  <ExportButtons />
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> 3 Agents Orchestrated</div>
                  <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Complete</div>
                </div>
              </div>

              {/* Report Body (Printable container) */}
              <div id="report-container" className="p-6 md:p-8 space-y-6">
                {report.sections.map((section) => (
                  <ReportSection key={section.id} section={section} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <EditDialog />
    </div>
  );
}
