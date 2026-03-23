'use client';

import * as React from 'react';
import { FileText, FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { saveAs } from 'file-saver';
import { useReportStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { sanitizeMarkdown } from '@/lib/markdown/sanitize';
import * as htmlToImage from 'html-to-image';

export function ExportButtons() {
  const report = useReportStore((state) => state.report);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!report) return null;

  const exportDocx = async () => {
    setIsExportingDocx(true);
    try {
      // We must rasterize the Mermaid SVGs into PNGs on the client-side because 
      // the server cannot natively process SVG documents into the DOCX buffer.
      // We use a blazing fast native SVG-to-Canvas API approach to entirely bypass html2canvas parsing bugs!
      const enrichedReport = {
        ...report,
        sections: await Promise.all(
          report.sections.map(async (section) => {
            const sectionEl = document.querySelector(`[data-section-id="${section.id}"]`);
            const mermaidEls = sectionEl ? Array.from(sectionEl.querySelectorAll('.mermaid-chart')) : [];
            
            const diagrams = [];
            for (const wrapper of mermaidEls) {
               const svg = wrapper.querySelector('svg');
               if (!svg) continue;

               const bounds = svg.getBoundingClientRect();

               try {
                 const dataUrl = await htmlToImage.toPng(svg as unknown as HTMLElement, {
                   backgroundColor: 'white',
                   pixelRatio: 2,
                   style: { margin: '0' }
                 });

                 diagrams.push({
                   base64: dataUrl,
                   width: bounds.width,
                   height: bounds.height
                 });
               } catch (e) {
                 console.error('Failed to rasterize SVG for DOCX', e);
               }
            }
            return {
              ...section,
              content: sanitizeMarkdown(section.content),
              diagramImages: diagrams
            };
          })
        )
      };

      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: enrichedReport }),
      });

      if (!response.ok) throw new Error('Export failed');

      const data = await response.json();
      
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      saveAs(blob, data.filename || 'Strategic-Plan.docx');
    } catch (error) {
      console.error('Failed to export DOCX:', error);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const exportPdf = async () => {
    setIsExportingPdf(true);
    try {
      // Small timeout to allow any UI state updates to settle before capturing
      await new Promise((resolve) => setTimeout(resolve, 300));

      // We use the browser's highly-optimized native PDF printing pipeline!
      // This automatically applies all @media print CSS rules, uses standard A4 pages, 
      // prevents text from being sliced in half, and outputs true selectable text vectors!
      window.print();
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('PDF export failed. Please try again after the report fully renders.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex gap-3 print:hidden">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportDocx} 
        disabled={isExportingDocx || isExportingPdf}
        className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary bg-background/50 shadow-sm"
      >
        {isExportingDocx ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 text-blue-500" />
        )}
        Download DOCX
      </Button>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportPdf} 
        disabled={isExportingDocx || isExportingPdf}
        className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary bg-background/50 shadow-sm"
      >
        {isExportingPdf ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4 text-rose-500" />
        )}
        Download PDF
      </Button>
    </div>
  );
}