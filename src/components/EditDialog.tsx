'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useId } from 'react';
import { Sparkles, ArrowRight, Loader2, Undo2, CheckCircle2, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose', htmlLabels: false });

let renderQueue = Promise.resolve();

const MermaidChart = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const reactId = useId();
  const id = useRef(`mermaid-${reactId.replace(/:/g, '')}`);
  
  useEffect(() => {
    let isMounted = true;
    
    renderQueue = renderQueue.then(() => {
      if (!isMounted) return;
      return mermaid.render(id.current, chart)
        .then(result => {
          if (isMounted) setSvg(result.svg);
        })
        .catch(e => {
          console.error('Mermaid render error line:', e);
          if (isMounted) setError(true);
        });
    });

    return () => { isMounted = false; };
  }, [chart]);

  if (error) return <div className="text-red-400 text-sm py-8 flex justify-center border border-red-200 bg-red-50 rounded-lg my-4">Error Rendering Diagram</div>;
  if (!svg) return <div className="text-slate-400 text-sm py-8 animate-pulse flex justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50 my-4">Rendering diagram...</div>;
  return <div className="mermaid-chart flex justify-center py-6 overflow-x-auto w-full my-4 text-sm" dangerouslySetInnerHTML={{ __html: svg }} />;
};

const MarkdownComponents: any = {
  code({node, className, children, ...props}: any) {
    const match = /language-(\w+)/.exec(className || '');
    if (match && match[1] === 'mermaid') {
      return <MermaidChart chart={String(children).replace(/\\n$/, '')} />;
    }
    return <code className={className} {...props}>{children}</code>;
  }
};

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReportStore } from '@/lib/store';
import { sanitizeMarkdown } from '@/lib/markdown/sanitize';

const QUICK_ACTIONS = [
  "Make this more actionable",
  "Write in a more executive tone",
  "Shorten this section significantly",
  "Add more specific examples",
  "Focus on technical details",
];

export function EditDialog() {
  const { 
    report, 
    editingSection, 
    setEditingSection, 
    updateSection, 
    addVersion,
    highlightedText,
    setHighlightedText
  } = useReportStore();
  
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('edit');

  const section = report?.sections.find((s) => s.id === editingSection);
  const safeSectionContent = section ? sanitizeMarkdown(section.content) : '';
  
  // Get history for this specific section, newest first
  const sectionHistory = report?.versions.filter(v => v.sectionId === editingSection).reverse() || [];

  const handleClose = () => {
    if (!isProcessing) {
      setEditingSection(null);
      setHighlightedText(null);
      setInstruction('');
      setPreviewContent(null);
      setActiveTab('edit');
    }
  };

  const handleGeneratePreview = async () => {
    if (!section || !instruction.trim()) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: section.id,
          currentContent: section.content,
          instruction,
          highlightedText
        }),
      });

      if (!response.ok) throw new Error('Edit failed');
      
      const data = await response.json();
      setPreviewContent(data.newContent);
      setActiveTab('preview');
    } catch (error) {
      console.error('Failed to edit section:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyChanges = () => {
    if (!section || !previewContent) return;

    addVersion({
      id: crypto.randomUUID(),
      sectionId: section.id,
      previousContent: section.content,
      newContent: previewContent,
      editPrompt: instruction,
      timestamp: new Date().toISOString(),
    });

    updateSection(section.id, previewContent);
    handleClose();
  };

  const handleRestoreVersion = (content: string) => {
    if (!section) return;
    updateSection(section.id, content);
    handleClose();
  };

  if (!section) return null;

  return (
    <Dialog open={!!editingSection} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[850px] w-[95vw] max-h-[90vh] overflow-y-auto flex flex-col p-0 bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Editor: {section.title}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {highlightedText 
              ? "Instruct the AI how to modify your selected text." 
              : "Instruct the AI how to modify this entire section, or restore a previous version."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col bg-white h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="bg-slate-100 w-full justify-start rounded-lg p-1">
                <TabsTrigger value="edit" className="flex-1 rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                  1. Instruct AI
                </TabsTrigger>
                <TabsTrigger value="preview" disabled={!previewContent} className="flex-1 rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                  2. Review & Apply
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                  <History className="w-4 h-4 mr-2" /> 3. Version History
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 relative pb-20">
              
              {/* TAB 1: EDIT */}
              <TabsContent value="edit" className="m-0 p-6 flex flex-col gap-6 border-none outline-none">
                <div className="space-y-4 shrink-0">
                  {highlightedText && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mb-2 shadow-sm">
                      <p className="text-xs font-semibold text-primary uppercase mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3"/> Target Edit
                      </p>
                      <p className="text-sm italic text-slate-700 line-clamp-3">"{highlightedText}"</p>
                    </div>
                  )}

                  <label className="text-sm font-medium leading-none text-slate-800">Your Instruction</label>
                  <Textarea
                    placeholder="e.g., Rewrite this in a more professional tone and add specific technical examples..."
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    className="min-h-[100px] resize-none bg-white focus-visible:ring-primary/30 border-slate-200"
                  />
                  
                  <div className="flex flex-wrap gap-2 pt-1 items-center">
                    {QUICK_ACTIONS.map((action) => (
                      <Badge 
                        key={action}
                        variant="secondary"
                        className="cursor-pointer bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary font-normal border-transparent transition-colors py-1.5 px-3"
                        onClick={() => setInstruction(action)}
                      >
                        {action}
                      </Badge>
                    ))}
                  </div>

                  {/* Easy access to history section */}
                  {sectionHistory.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg mt-4">
                      <History className="w-5 h-5 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">Version History Available</p>
                        <p className="text-xs text-slate-500">You have {sectionHistory.length} previous version{sectionHistory.length > 1 ? 's' : ''} of this section.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('history')} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                        View History
                      </Button>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
                  <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-medium text-slate-500 flex justify-between shrink-0">
                    <span>Current Content Reference</span>
                    <span>Read Only</span>
                  </div>
                  <div className="p-5 prose prose-slate prose-sm max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
                      {safeSectionContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: PREVIEW */}
              <TabsContent value="preview" className="m-0 p-6 flex flex-col border-none outline-none">
                <div className="rounded-lg border border-primary/20 bg-white flex flex-col shadow-inner">
                  <div className="px-3 py-2 bg-primary/5 border-b border-primary/10 text-xs font-semibold text-primary flex items-center gap-2 shrink-0">
                    <Sparkles className="w-3 h-3" />
                    AI Edited Preview
                  </div>
                  <div className="p-6 prose prose-slate max-w-none bg-gradient-to-b from-transparent to-primary/5">
                    {previewContent && (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents}
                      >
                        {sanitizeMarkdown(previewContent)}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: HISTORY */}
              <TabsContent value="history" className="m-0 p-6 flex flex-col border-none outline-none">
                <div className="space-y-4">
                  {sectionHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <History className="w-8 h-8 mb-2 opacity-50" />
                      <p>No edits have been made to this section yet.</p>
                    </div>
                  ) : (
                    <>
                      {sectionHistory.map((version, index) => (
                        <div key={version.id} className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className="inline-block text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20 mb-2">
                                Edit {sectionHistory.length - index}
                              </span>
                              <p className="text-sm font-medium text-slate-800 line-clamp-2">
                                Prompt: "{version.editPrompt}"
                              </p>
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                              {new Date(version.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-fit gap-2 border-slate-200 hover:bg-slate-50"
                            onClick={() => handleRestoreVersion(version.newContent)}
                          >
                            <Undo2 className="w-4 h-4" /> Restore this version
                          </Button>
                        </div>
                      ))}

                      {/* Original Version Block */}
                      <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="inline-block text-xs font-bold text-slate-600 bg-slate-200 px-2 py-1 rounded border border-slate-300 mb-2">
                              Original Base
                            </span>
                            <p className="text-sm text-slate-600 italic">
                              The very first generation created by the AI pipeline.
                            </p>
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-fit gap-2 border-slate-300 hover:bg-slate-200"
                          onClick={() => handleRestoreVersion(sectionHistory[sectionHistory.length - 1].previousContent)}
                        >
                          <Undo2 className="w-4 h-4" /> Restore Original Generation
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>

        <DialogFooter className="sticky bottom-0 z-10 px-6 py-4 border-t border-slate-200 bg-slate-50/95 backdrop-blur-md shrink-0 flex items-center gap-2 sm:justify-between">
          <Button variant="ghost" onClick={handleClose} disabled={isProcessing} className="text-slate-500 hover:text-slate-700">
            Close
          </Button>
          
          <div className="flex gap-2">
            {activeTab === 'preview' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('edit')}
                  className="gap-2 bg-white border-slate-200"
                >
                  <Undo2 className="w-4 h-4" /> Discard
                </Button>
                <Button onClick={handleApplyChanges} className="gap-2 group shadow-md bg-primary hover:bg-primary/90 text-white">
                  Apply Changes <CheckCircle2 className="w-4 h-4 group-hover:text-white transition-colors" />
                </Button>
              </>
            )}
            
            {activeTab === 'edit' && (
              <Button 
                onClick={handleGeneratePreview} 
                disabled={!instruction.trim() || isProcessing}
                className="gap-2 min-w-[140px] shadow-md bg-primary hover:bg-primary/90 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> 
                    AI Editor Working...
                  </>
                ) : (
                  <>
                    Generate Edit <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}