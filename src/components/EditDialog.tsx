'use client';

import * as React from 'react';
import { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, Undo2, Ban, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReportStore } from '@/lib/store';

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
    addVersion 
  } = useReportStore();
  
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('edit');

  const section = report?.sections.find((s) => s.id === editingSection);

  const handleClose = () => {
    if (!isProcessing) {
      setEditingSection(null);
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
        }),
      });

      if (!response.ok) throw new Error('Edit failed');
      
      const data = await response.json();
      setPreviewContent(data.newContent);
      setActiveTab('preview');
    } catch (error) {
      console.error('Failed to edit section:', error);
      // In a real app we'd show a toast notification here
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyChanges = () => {
    if (!section || !previewContent) return;

    // Save to version history
    addVersion({
      id: crypto.randomUUID(),
      sectionId: section.id,
      previousContent: section.content,
      newContent: previewContent,
      editPrompt: instruction,
      timestamp: new Date().toISOString(),
    });

    // Update current content
    updateSection(section.id, previewContent);
    
    // Close & reset
    handleClose();
  };

  if (!section) return null;

  return (
    <Dialog open={!!editingSection} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[800px] h-[85vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader className="px-6 py-4 border-b border-border/30 bg-muted/10 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Editor: {section.title}
          </DialogTitle>
          <DialogDescription>
            Tell the Editor Agent how you want to modify this section.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-4 shrink-0 flex justify-between items-center">
              <TabsList className="bg-muted/50 w-full justify-start rounded-lg p-1">
                <TabsTrigger value="edit" className="flex-1 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  1. Instruct AI
                </TabsTrigger>
                <TabsTrigger value="preview" disabled={!previewContent} className="flex-1 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  2. Review & Apply
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden relative">
              <TabsContent value="edit" className="h-full m-0 p-6 flex flex-col gap-4 border-none outline-none overflow-y-auto">
                <div className="space-y-3">
                  <label className="text-sm font-medium leading-none">Your Instruction</label>
                  <Textarea
                    placeholder="e.g., Rewrite this in a more professional tone and add specific technical examples..."
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    className="min-h-[120px] resize-none bg-background/50 focus-visible:ring-primary/30"
                  />
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {QUICK_ACTIONS.map((action) => (
                      <Badge 
                        key={action}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80 font-normal border-border/50 transition-colors py-1.5"
                        onClick={() => setInstruction(action)}
                      >
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex-1 min-h-[200px] rounded-lg border border-border/50 bg-muted/20 flex flex-col overflow-hidden mt-2">
                  <div className="px-3 py-2 bg-muted/50 border-b border-border/50 text-xs font-medium text-muted-foreground flex justify-between">
                    <span>Current Content Reference</span>
                    <span>Read Only</span>
                  </div>
                  <ScrollArea className="flex-1 p-4 prose prose-sm dark:prose-invert max-w-none opacity-80">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="h-full m-0 p-6 flex flex-col border-none outline-none overflow-hidden">
                <div className="flex-1 rounded-lg border border-primary/20 bg-background flex flex-col overflow-hidden relative shadow-inner">
                  <div className="px-3 py-2 bg-primary/10 border-b border-primary/20 text-xs font-semibold text-primary flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    AI Edited Preview
                  </div>
                  <ScrollArea className="flex-1 p-6 prose prose-neutral dark:prose-invert max-w-none bg-gradient-to-b from-transparent to-primary/5">
                    {previewContent && (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/30 bg-muted/10 shrink-0 flex items-center gap-2 sm:justify-between">
          <Button variant="ghost" onClick={handleClose} disabled={isProcessing} className="text-muted-foreground">
            Cancel
          </Button>
          
          <div className="flex gap-2">
            {activeTab === 'preview' ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('edit')}
                  className="gap-2 bg-background/50"
                >
                  <Undo2 className="w-4 h-4" /> Discard
                </Button>
                <Button onClick={handleApplyChanges} className="gap-2 group shadow-md shadow-primary/20">
                  Apply Changes <CheckCircle2 className="w-4 h-4 group-hover:text-primary-foreground/80 transition-colors" />
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleGeneratePreview} 
                disabled={!instruction.trim() || isProcessing}
                className="gap-2 min-w-[140px] shadow-sm shadow-primary/20"
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