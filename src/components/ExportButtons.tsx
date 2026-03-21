'use client';

import * as React from 'react';
import { FileText, FileDown, Loader2, Download } from 'lucide-react';
import { useState } from 'react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { useReportStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function ExportButtons() {
  const report = useReportStore((state) => state.report);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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
      
      // Convert base64 back to blob
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
      // Find the report container
      const element = document.getElementById('report-container');
      if (!element) return;

      // Make it briefly wider/styled for PDF specifically to ensure good layout
      const originalClassNode = element.className;
      element.classList.add('pdf-rendering-mode', 'bg-white', 'text-black', 'w-[1000px]', 'p-8');
      
      // Small delay to let styles apply
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(element, {
        scale: 2, // higher resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Restore original
      element.className = originalClassNode;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Calculate layout for A4 PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`Strategic-Plan-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex gap-3">
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
        disabled={isExportingPdf || isExportingDocx}
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
