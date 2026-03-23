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
      const reportContainer = document.getElementById('report-container');
      if (!reportContainer) throw new Error('Report container not found');

      const [{ default: jsPDF }] = await Promise.all([
        import('jspdf')
      ]);
      const previousBg = reportContainer.style.backgroundColor;
      reportContainer.style.backgroundColor = '#ffffff';

      // Let mermaid finishes paint before raster capture.
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Temporarily rasterize SVGs to images to bypass rendering issues with html-to-image
      const originalSvgs = new Map<Element, Element>();
      const mermaidEls = reportContainer.querySelectorAll('.mermaid-chart svg');

      for (const svg of Array.from(mermaidEls)) {
        const bounds = svg.getBoundingClientRect();

        try {
          const dataUrl = await htmlToImage.toPng(svg as unknown as HTMLElement, {
            backgroundColor: 'white',
            pixelRatio: 2,
            style: { margin: '0' }
          });

          const img = new Image();
          img.src = dataUrl;
          img.style.width = `${bounds.width}px`;
          img.style.height = `${bounds.height}px`;

          originalSvgs.set(svg, img);
          svg.replaceWith(img);
        } catch (e) {
          console.error('Failed to rasterize SVG for PDF', e);
        }
      }

      // We use html-to-image which properly supports oklch and modern CSS natively in the browser via foreignObject
      const dataUrl = await htmlToImage.toJpeg(reportContainer, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${reportContainer.offsetWidth}px`,
        }
      });

      // Restore original SVGs
      for (const [svg, img] of originalSvgs.entries()) {
        img.replaceWith(svg);
      }

      reportContainer.style.backgroundColor = previousBg;

      // Create PDF in landscape A4
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const canvas = { width: imgProps.width, height: imgProps.height };

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
        pdf.addImage(dataUrl, 'JPEG', pdfMargin, position, imgWidth, imgHeight);

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