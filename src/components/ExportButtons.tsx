'use client';

import * as React from 'react';
import { FileText, FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { saveAs } from 'file-saver';
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

      // Dynamically import jsPDF and html2canvas
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // Create a completely isolated container with NO inherited CSS
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-10000px';
      iframe.style.top = '0';
      iframe.style.width = '1200px';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe');

      // Write clean HTML into the iframe with ONLY hex/rgb colors (no oklch/lab)
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html>
<html><head><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b; background: white; padding: 40px; width: 1200px;
    line-height: 1.6; font-size: 14px;
  }
  .pdf-header { margin-bottom: 32px; border-bottom: 3px solid #7C3AED; padding-bottom: 20px; }
  .pdf-header h1 { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
  .pdf-header .subtitle { font-size: 13px; color: #64748b; margin-bottom: 8px; }
  .pdf-header .problem { font-size: 14px; color: #475569; font-style: italic; border-left: 3px solid #7C3AED; padding-left: 12px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  h1, h2, h3, h4, h5, h6 { color: #0f172a; font-weight: 700; margin-top: 20px; margin-bottom: 10px; }
  h2 { font-size: 20px; }
  h3 { font-size: 17px; }
  p { margin-bottom: 10px; color: #334155; line-height: 1.7; }
  strong, b { color: #0f172a; font-weight: 700; }
  em, i { font-style: italic; }
  ul, ol { padding-left: 24px; margin-bottom: 12px; }
  li { margin-bottom: 6px; color: #334155; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; table-layout: auto; }
  th { background-color: #7C3AED; color: white; font-weight: 600; padding: 10px 14px; text-align: left; border: 1px solid #6D28D9; font-size: 13px; }
  td { padding: 10px 14px; border: 1px solid #e2e8f0; color: #334155; font-size: 13px; }
  tr:nth-child(even) td { background-color: #f8fafc; }
  blockquote { border-left: 4px solid #7C3AED; background: #f3f4f6; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; font-style: italic; color: #475569; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
</style></head><body></body></html>`);
      iframeDoc.close();

      // Build the PDF content in the iframe
      const container = iframeDoc.createElement('div');
      
      // Add header
      container.innerHTML = `
        <div class="pdf-header">
          <h1>Strategic Execution Plan</h1>
          <div class="subtitle">Generated by ForceEqual AI — ${new Date().toLocaleDateString()}</div>
          <div class="problem">"${report.problemStatement}"</div>
        </div>
      `;

      // Add each section
      report.sections.forEach((section) => {
        const sectionDiv = iframeDoc.createElement('div');
        sectionDiv.className = 'section';
        sectionDiv.innerHTML = `<div class="section-title">${section.title}</div>`;
        
        // Convert markdown to HTML using a simple approach
        const sectionEl = reportContainer.querySelector(`[data-section-id="${section.id}"]`);
        if (sectionEl) {
          const markdownBody = sectionEl.querySelector('.markdown-body');
          if (markdownBody) {
            sectionDiv.innerHTML += markdownBody.innerHTML;
          }
        }
        container.appendChild(sectionDiv);
      });

      // If no sections found via data attributes, fall back to grabbing all markdown bodies
      if (container.querySelectorAll('.section').length === 0 || 
          container.querySelectorAll('.section').length === 1) {
        container.innerHTML = `
          <div class="pdf-header">
            <h1>Strategic Execution Plan</h1>
            <div class="subtitle">Generated by ForceEqual AI — ${new Date().toLocaleDateString()}</div>
            <div class="problem">"${report.problemStatement}"</div>
          </div>
        `;
        
        const allCards = reportContainer.querySelectorAll('[data-slot="card"]');
        allCards.forEach((card) => {
          const sectionDiv = iframeDoc.createElement('div');
          sectionDiv.className = 'section';
          
          // Get the title
          const titleEl = card.querySelector('[data-slot="card-title"]');
          if (titleEl) {
            sectionDiv.innerHTML += `<div class="section-title">${titleEl.textContent}</div>`;
          }
          
          // Get the content
          const markdownBody = card.querySelector('.markdown-body');
          if (markdownBody) {
            sectionDiv.innerHTML += markdownBody.innerHTML;
          }
          container.appendChild(sectionDiv);
        });
      }

      iframeDoc.body.appendChild(container);

      // Smart pagination script: Push elements down if they straddle a page break!
      // A4 Landscape: 297mm x 210mm. 15mm margins -> Effective: 267 x 180. Ratio = 1.4833
      // iframe width = 1200px -> Effective page height = 1200 / 1.4833 = 808.99px -> 809px
      const pageHeightPx = 809;

      // Give browser a moment to layout the DOM
      await new Promise(resolve => setTimeout(resolve, 800));

      const avoidElements = Array.from(iframeDoc.querySelectorAll('.section-title, h1, h2, h3, h4, table, .mermaid-chart, blockquote, img'));
      
      let elementsShifted = false;
      for (let i = 0; i < avoidElements.length; i++) {
        const el = avoidElements[i] as HTMLElement;
        const rect = el.getBoundingClientRect();
        
        // Logical page indexes
        const topPage = Math.floor(rect.top / pageHeightPx);
        const bottomPage = Math.floor(rect.bottom / pageHeightPx);
        
        // If element crosses a boundary, push it perfectly to the next page!
        if (topPage !== bottomPage && rect.bottom - rect.top < pageHeightPx) {
          elementsShifted = true;
          const currentMarginTop = parseInt(iframeDoc.defaultView?.getComputedStyle(el).marginTop || '0');
          // Add enough margin to push the element's top to the start of the next page (plus a tiny safety buffer)
          const shiftAmount = ((topPage + 1) * pageHeightPx) - rect.top;
          el.style.marginTop = `${currentMarginTop + shiftAmount + 24}px`;
        }
      }

      // If we shifted things, the DOM needs a split second to repaint
      if (elementsShifted) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Capture with html2canvas inside the iframe context
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1200,
        windowWidth: 1200,
      });

      // Remove iframe
      document.body.removeChild(iframe);

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
      window.print();
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