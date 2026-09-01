import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Downloads a DOM element strictly as a single-page high-resolution A4 PDF.
 */
export async function downloadPdfFromElement(
  element: HTMLElement,
  filename: string = 'document.pdf'
): Promise<boolean> {
  try {
    // Clone the element into a temporary clean offscreen container with explicit standard styling
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '800px';
    clone.style.maxWidth = '800px';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#0f172a';
    clone.style.zIndex = '99999';

    // Remove any no-print elements inside the clone
    const noPrintItems = clone.querySelectorAll('.no-print');
    noPrintItems.forEach((el) => el.remove());

    // Sanitize any images in clone to avoid CORS breaks
    const images = clone.querySelectorAll('img');
    images.forEach((img) => {
      img.crossOrigin = 'anonymous';
    });

    document.body.appendChild(clone);

    // Render canvas from sanitized clone
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 850,
      onclone: (clonedDoc) => {
        // Strip any unsupported modern css variables
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style) {
            htmlEl.style.backdropFilter = 'none';
            (htmlEl.style as unknown as Record<string, string>)['webkitBackdropFilter'] = 'none';
          }
        });
      },
    });

    // Remove cloned element
    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const marginX = 8;
    const marginY = 8;
    const availableWidth = pdfWidth - marginX * 2;
    const availableHeight = pdfHeight - marginY * 2;

    // Calculate dimensions to fit completely on single page
    let imgWidth = availableWidth;
    let imgHeight = (canvas.height * availableWidth) / canvas.width;

    // If height exceeds available single page height, scale down proportionally to fit 1 single page
    if (imgHeight > availableHeight) {
      const ratio = availableHeight / imgHeight;
      imgHeight = availableHeight;
      imgWidth = imgWidth * ratio;
    }

    const posX = marginX + (availableWidth - imgWidth) / 2;
    const posY = marginY;

    // Render single high-quality page
    pdf.addImage(imgData, 'JPEG', posX, posY, imgWidth, imgHeight, undefined, 'FAST');

    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);
    return true;
  } catch (error) {
    console.error('downloadPdfFromElement error:', error);
    triggerPrint(element);
    return true;
  }
}

/**
 * Triggers completely isolated print mode for an element.
 * Creates an isolated print iframe so background modals, parent tables, or backdrop layers
 * are NEVER included in the print preview. Only the single desired document is printed!
 */
export function triggerPrint(
  target: HTMLElement | string | null = null,
  documentTitle: string = 'طباعة المستند'
): void {
  let element: HTMLElement | null = null;
  if (typeof target === 'string') {
    element = document.getElementById(target);
  } else if (target instanceof HTMLElement) {
    element = target;
  }

  // If no specific element provided, try to find any active printable modal element
  if (!element) {
    element = 
      document.getElementById('employee-monthly-statement-printable') ||
      document.getElementById('advance-receipt-printable') ||
      document.getElementById('monthly-payroll-table-printable') ||
      document.getElementById('attendance-ledger-printable');
  }

  if (!element) {
    window.print();
    return;
  }

  try {
    // Remove any existing print iframe
    const existingIframe = document.getElementById('isolated-print-iframe');
    if (existingIframe && existingIframe.parentNode) {
      existingIframe.parentNode.removeChild(existingIframe);
    }

    // Create an isolated hidden iframe
    const iframe = document.createElement('iframe');
    iframe.setAttribute('id', 'isolated-print-iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc || !iframe.contentWindow) {
      window.print();
      return;
    }

    // Collect all stylesheet tags from the parent document
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${documentTitle}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-shadow: none !important;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              font-family: inherit;
            }
            .no-print, button, [data-no-print] {
              display: none !important;
            }
            #isolated-print-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            #isolated-print-wrapper > div {
              margin: 0 !important;
              box-shadow: none !important;
            }
          </style>
        </head>
        <body class="bg-white text-slate-900">
          <div id="isolated-print-wrapper">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Allow styles to parse and render, then invoke isolated print dialog
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 300);
  } catch (e) {
    console.error('triggerPrint error:', e);
    window.print();
  }
}
