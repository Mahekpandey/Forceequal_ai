'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { PencilLine, Users, Lightbulb, ListChecks, AlertCircle, Sparkles } from 'lucide-react';

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose', htmlLabels: false });

// Global render queue to completely prevent concurrent rendering crashes in Mermaid.js
let renderQueue = Promise.resolve();

const MermaidChart = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const id = useRef(`mermaid-${Math.random().toString(36).substring(7)}`);
  
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

// Extracted globally to prevent React from unmounting code blocks on every parent re-render
const MarkdownComponents: any = {
  code({node, className, children, ...props}: any) {
    const match = /language-(\w+)/.exec(className || '');
    if (match && match[1] === 'mermaid') {
      return <MermaidChart chart={String(children).replace(/\\n$/, '')} />;
    }
    return <code className={className} {...props}>{children}</code>;
  }
};

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportSection as ReportSectionType } from '@/lib/types';
import { useReportStore } from '@/lib/store';

const iconMap = {
  AlertCircle: AlertCircle,
  Users: Users,
  Lightbulb: Lightbulb,
  ListChecks: ListChecks,
};

export function ReportSection({ section }: { section: ReportSectionType }) {
  const { setEditingSection, setHighlightedText, report } = useReportStore();
  const IconComponent = iconMap[section.icon as keyof typeof iconMap] || AlertCircle;
  const versionCount = report?.versions.filter(v => v.sectionId === section.id).length || 0;
  
  const [popupPos, setPopupPos] = useState<{ top: number, left: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('#ai-float-btn')) return;

    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        setPopupPos(null);
        return;
      }

      if (contentRef.current && contentRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setPopupPos({
          top: rect.top - 55, 
          left: rect.left + (rect.width / 2) - 50,
        });
      }
    }, 10);
  };

  const handleHighlightEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (text) {
      setHighlightedText(text);
      setEditingSection(section.id);
      setPopupPos(null);
    }
  };

  useEffect(() => {
    const hidePopup = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#ai-float-btn')) {
        setPopupPos(null);
      }
    };
    document.addEventListener('mousedown', hidePopup);
    return () => document.removeEventListener('mousedown', hidePopup);
  }, []);

  return (
    <div className="relative" data-section-id={section.id}>
      {popupPos && (
        <div 
          id="ai-float-btn"
          className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-200 drop-shadow-2xl print:hidden"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <Button 
            onMouseDown={handleHighlightEdit} 
            size="sm" 
            className="gap-2 bg-slate-900 text-white hover:bg-slate-800 rounded-full h-10 px-5 shadow-xl border border-slate-700 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-400" /> AI Edit
          </Button>
        </div>
      )}

      {/* Added print:border-none and print:shadow-none to remove the card look in PDF */}
      <Card className="mb-8 overflow-hidden border-slate-200 bg-white shadow-sm transition-all group print:border-none print:shadow-none print:m-0">
        
        {/* Added print:bg-white and print:border-none to remove the gray header in PDF */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-100 bg-slate-50/50 print:bg-white print:border-none print:p-0">
          <div className="flex items-center space-x-3">
            {/* Added print:hidden to hide the icon in the PDF */}
            <div className="p-2 bg-primary/10 text-primary rounded-lg ring-1 ring-primary/20 print:hidden">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 print:text-xl print:mb-2">
                {section.title}
              </CardTitle>
              {/* Added print:hidden to hide the badges in the PDF */}
              <div className="flex items-center space-x-2 mt-1 print:hidden">
                <Badge variant="secondary" className="text-xs font-normal border-primary/20 bg-primary/5 text-primary">
                  Generated by {section.agentSource} agent
                </Badge>
                {versionCount > 0 && (
                  <Badge variant="outline" className="text-xs font-normal text-slate-500 border-slate-200 bg-white">
                    {versionCount} AI edit{versionCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Added print:hidden to hide the Edit button in the PDF */}
          <Button 
            variant="outline" size="sm" 
            className="h-9 gap-2 shadow-sm bg-white hover:bg-slate-50 border-slate-200 text-slate-700 print:hidden"
            onClick={() => {
              setHighlightedText(null); 
              setEditingSection(section.id);
            }}
          >
            <PencilLine className="w-4 h-4" /> Edit Full Section
          </Button>
        </CardHeader>
        
        {/* Adjusted padding for the PDF */}
        <CardContent 
          ref={contentRef}
          onMouseUp={handleMouseUp}
          className="pt-8 pb-8 prose prose-slate max-w-none cursor-text selection:bg-purple-200 selection:text-purple-900 print:p-0 print:pt-4"
        >
          <div className="markdown-body">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {section.content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}