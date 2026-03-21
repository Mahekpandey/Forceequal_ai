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
    
    setAgentSteps([
      { agentName: 'Planner Agent', status: 'pending', description: 'Waiting into queue...' },
      { agentName: 'Insight Agent', status: 'pending', description: 'Waiting into queue...' },
      { agentName: 'Executor Agent', status: 'pending', description: 'Waiting into queue...' },
    ]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemStatement: query }),
      });

      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      
      // Simulate timeline sequence visually
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
    // EXPANDED WIDTH HERE! max-w-[1400px]
    <div className="container py-12 max-w-[1400px] w-full px-4 md:px-8 mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-2 shadow-sm">
          <Sparkles className="mr-2 h-4 w-4" />
          Multi-Agent Strategy Pipeline
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-slate-900">
          Turn problems into execution plans.
        </h1>
        <p className="text-lg text-slate-600">
          Enter a problem statement. Watch three distinct AI agents break it down, enrich it with insights, and prepare a professional, editable report.
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-12 w-full">
        {/* Left Column: Input Panel (Takes up 4 columns) */}
        <div className="md:col-span-4 space-y-6 animate-in fade-in slide-in-from-left-8 duration-700 delay-150">
          <div className="relative group rounded-xl overflow-hidden p-1 shadow-md bg-white border border-slate-200">
            <div className="relative bg-white rounded-lg p-6 flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <Target className="w-4 h-4 text-primary" />
                  Define your goal / problem
                </label>
                <Textarea 
                  placeholder="e.g. Build a creator marketplace platform..."
                  className="min-h-[140px] resize-none text-base bg-slate-50 border-slate-200 focus-visible:ring-primary/40 shadow-inner text-slate-900 placeholder:text-slate-400"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => handleGenerate()} 
                  disabled={!problem.trim() || isGenerating}
                  className="w-full h-12 text-md gap-2 shadow-md bg-primary hover:bg-primary/90 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Agents Orchestrating...
                    </>
                  ) : (
                    <>
                      Generate Strategic Plan 
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>

              {!isGenerating && !report && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wider">Try an example</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setProblem(suggestion);
                          handleGenerate(suggestion);
                        }}
                        className="text-left text-xs bg-slate-50 text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors border border-slate-200 hover:border-primary/30 rounded-md px-3 py-2"
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

        {/* Right Column: Output / Report (Takes up 8 columns for massive width!) */}
        <div className="md:col-span-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
          {!report && !isGenerating && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500">
              <div className="p-4 bg-white shadow-sm rounded-full mb-4">
                <FileSignature className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-slate-700">Awaiting problem statement</h3>
              <p className="max-w-sm mx-auto text-sm">
                Enter your problem on the left to initialize the multi-agent pipeline and generate your report.
              </p>
            </div>
          )}

          {isGenerating && !report && (
            <div className="space-y-6 opacity-60 pointer-events-none">
              <div className="h-16 w-full bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-64 w-full bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-64 w-full bg-slate-100 rounded-xl animate-pulse" />
            </div>
          )}

          {report && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 rounded-xl border border-slate-200 bg-slate-50/30 shadow-xl overflow-hidden pb-12">
              <div className="bg-white p-6 border-b border-slate-200 flex flex-col gap-4 sticky top-16 z-10 shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Strategic Plan</h2>
                    <p className="text-sm font-medium italic mt-1 text-slate-600 border-l-2 border-primary/40 pl-3">
                      "{report.problemStatement}"
                    </p>
                  </div>
                  <ExportButtons />
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> 3 Agents Orchestrated</div>
                  <div className="flex items-center gap-1.5 text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Complete</div>
                </div>
              </div>

              <div id="report-container" className="p-6 md:p-8 lg:p-10 space-y-8">
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