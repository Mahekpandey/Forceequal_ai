'use client';

import * as React from 'react';
import { FileText, FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { saveAs } from 'file-saver';
import { Packer, Document, Paragraph, HeadingLevel, TextRun } from 'docx';

import { useReportStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function ExportButtons() {
  const report = useReportStore((state) => state.report);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  if (!report) return null;

  const exportDocx = async () => {
    setIsExportingDocx(true);
    try {
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
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

  const exportPdf = () => {
    // Triggers the browser's native, high-quality "Save as PDF" dialog
    window.print();
  };

  return (
    <div className="flex gap-3 print:hidden">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportDocx} 
        disabled={isExportingDocx}
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
        disabled={isExportingDocx}
        className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary bg-background/50 shadow-sm"
      >
        <FileDown className="w-4 h-4 text-rose-500" />
        Download PDF
      </Button>
    </div>
  );
}