'use client';

import * as React from 'react';
import { FileText, FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { saveAs } from 'file-saver';
import { useReportStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { sanitizeMarkdown } from '@/lib/markdown/sanitize';

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

               // Freeze computed dimensions into hard attributes so the canvas parser knows how big to draw it
               const bounds = svg.getBoundingClientRect();
               svg.setAttribute('width', `${bounds.width}px`);
               svg.setAttribute('height', `${bounds.height}px`);

               // Serialize SVG to raw XML
               let svgData = new XMLSerializer().serializeToString(svg);
               
               // Ensure XML namespaces exist so the browser Image parser accepts it
               if (!svgData.includes('xmlns=')) {
                   svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
               }

               // Inject a stark white background underneath the SVG to avoid black-on-transparent DOCX rendering
               svgData = svgData.replace(/<svg([^>]*)>/, `<svg$1><rect width="100%" height="100%" fill="white"/>`);

               // Magically render the raw XML perfectly using the browser's native C++ rendering engine
               const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
               const url = URL.createObjectURL(svgBlob);
               
               const img = new Image();
               await new Promise((resolve) => {
                 img.onload = resolve;
                 img.onerror = resolve; // Continue on error to not break export
                 img.src = url;
               });

               // Blast the high-resolution image into a virtual Canvas
               const canvas = document.createElement('canvas');
               canvas.width = img.width * 2; // Retina scale 2x
               canvas.height = img.height * 2;
               const ctx = canvas.getContext('2d');
               
               if (ctx) {
                 ctx.fillStyle = 'white';
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                 
                 diagrams.push({
                   base64: canvas.toDataURL('image/png'),
                   width: img.width, // Pass logical DOCX dimensions
                   height: img.height
                 });
               }
               
               URL.revokeObjectURL(url);
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
      const reportContainer = document.getElementById('report-container');
      if (!reportContainer) throw new Error('Report container not found');

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const previousBg = reportContainer.style.backgroundColor;
      reportContainer.style.backgroundColor = '#ffffff';

      // Let mermaid finishes paint before raster capture.
      await new Promise((resolve) => setTimeout(resolve, 400));

      const canvas = await html2canvas(reportContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
      });

      reportContainer.style.backgroundColor = previousBg;

      // Create PDF in landscape A4
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfMargin = 15; 
      const pdfWidth = 297; 
      const pdfHeight = 210;
      const imgWidth = pdfWidth - (pdfMargin * 2); 
      const pageHeight = pdfHeight - (pdfMargin * 2); 
      
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = pdfMargin;

      // Loop to slice the image and add pages
      while (heightLeft > 0) {
        // Draw the massive canvas starting from a negative Y offset
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', pdfMargin, position, imgWidth, imgHeight);
        
        // Mask the top and bottom margins with white rectangles so the image doesn't bleed into the physical margins!
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, pdfMargin, 'F'); // Top margin mask
        pdf.rect(0, pdfHeight - pdfMargin, pdfWidth, pdfMargin + 5, 'F'); // Bottom margin mask
        pdf.rect(0, 0, pdfMargin, pdfHeight, 'F'); // Left mask
        pdf.rect(pdfWidth - pdfMargin, 0, pdfMargin + 5, pdfHeight, 'F'); // Right mask

        heightLeft -= pageHeight;
        if (heightLeft > 0) {
          pdf.addPage();
          position -= pageHeight; // Shift the image up by exactly 1 viewable page height for the next page
        }
      }

      pdf.save(`Strategic_Plan_${new Date().getTime()}.pdf`);
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