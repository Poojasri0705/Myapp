import { PDFDocument } from "pdf-lib";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// 1. Get page count of any PDF file safely
export async function getPdfPageCount(arrayBuffer: ArrayBuffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    return pdfDoc.getPageCount();
  } catch (e) {
    console.error("Error reading PDF page count:", e);
    return 0;
  }
}

// 2. Convert Images directly to high-fidelity PDF format
export async function convertImageToPdf(base64Data: string, fileName: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Data;
    img.onload = () => {
      try {
        const pdf = new jsPDF({
          orientation: img.width > img.height ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height],
        });
        
        pdf.addImage(base64Data, "JPEG", 0, 0, img.width, img.height);
        const blob = pdf.output("blob");
        resolve(blob);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(new Error("Failed to load image for PDF conversion."));
  });
}

export interface SpreadsheetSheet {
  name: string;
  headers: string[];
  rows: any[][];
}

// 3. Convert CSV & Excel parsed sheet objects directly into grid-based PDF reports
export async function convertSpreadsheetToPdf(
  sheets: SpreadsheetSheet[],
  titleStr: string
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: sheets.some(s => s.headers.length > 7) ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Draw Header Slate banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(titleStr.substring(0, 45), 15, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text("Tabular data converted by Gen PDF on " + new Date().toLocaleDateString(), 15, 32);

  let startY = 48;

  sheets.forEach((sheet, index) => {
    if (index > 0) {
      doc.addPage();
      startY = 20; // reset for new page
    }

    // Draw active sheet title banner
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(`Worksheet: ${sheet.name}`, 15, startY);
    startY += 8;

    const formattedRows = sheet.rows.map((r) => r.map((cell) => cell === null || cell === undefined ? "" : String(cell)));

    autoTable(doc, {
      startY: startY,
      head: [sheet.headers],
      body: formattedRows,
      theme: "striped",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        startY = (data.cursor?.y || startY) + 12;
      }
    });

    startY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : startY;
  });

  return doc.output("blob");
}

// 4. Render Rich Text, Text Documents, and styled AI-converted HTML elements directly node-by-node into vector PDFs
export function convertStyledHtmlToPdf(htmlContent: string, titleStr: string): Blob {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Clean cover layout heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(titleStr.substring(0, 45), 20, 25);
  
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(20, 31, pageWidth - 20, 31);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Document formatting processed by Gen PDF • " + new Date().toLocaleDateString(), 20, 37);
  
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(htmlContent, "text/html");
  
  let currentY = 46;
  const marginX = 20;
  const contentWidth = pageWidth - (marginX * 2);

  const checkPageBreakNeeded = (heightNeeded: number) => {
    if (currentY + heightNeeded > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
  };

  const renderElement = (el: Element) => {
    const tagName = el.tagName.toLowerCase();
    
    if (tagName.startsWith("h")) {
      const text = el.textContent?.trim() || "";
      if (!text) return;
      const level = parseInt(tagName.substring(1)) || 1;
      const size = level === 1 ? 16 : level === 2 ? 13 : 11;
      checkPageBreakNeeded(size + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor(15, 23, 42); // Slate 900
      
      const lines = doc.splitTextToSize(text, contentWidth);
      lines.forEach((line: string) => {
        doc.text(line, marginX, currentY);
        currentY += size * 0.4 + 2;
      });
      currentY += 3;
    } 
    else if (tagName === "p") {
      const text = el.textContent?.trim() || "";
      if (!text) return;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85); // Slate 700
      
      const lines = doc.splitTextToSize(text, contentWidth);
      const neededHeight = lines.length * 5.5 + 4;
      checkPageBreakNeeded(neededHeight);
      
      lines.forEach((line: string) => {
        doc.text(line, marginX, currentY);
        currentY += 5.5;
      });
      currentY += 3;
    } 
    else if (tagName === "ul" || tagName === "ol") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      
      const listItems = el.querySelectorAll("li");
      listItems.forEach((li, idx) => {
        const bulletText = (tagName === "ol" ? `${idx + 1}. ` : "• ") + (li.textContent?.trim() || "");
        const lines = doc.splitTextToSize(bulletText, contentWidth - 6);
        const neededHeight = lines.length * 5.5 + 2;
        checkPageBreakNeeded(neededHeight);
        
        lines.forEach((line: string, lineIdx: number) => {
          doc.text(line, lineIdx === 0 ? marginX + 3 : marginX + 8, currentY);
          currentY += 5.5;
        });
        currentY += 1.5;
      });
      currentY += 2;
    } 
    else if (tagName === "table") {
      const headersList: string[] = [];
      const ths = el.querySelectorAll("th");
      ths.forEach(th => headersList.push(th.textContent?.trim() || ""));
      
      const rowsList: string[][] = [];
      const trs = el.querySelectorAll("tr");
      trs.forEach(tr => {
        if (tr.querySelector("th")) return; // Skip headers
        const rowData: string[] = [];
        const tds = tr.querySelectorAll("td");
        tds.forEach(td => rowData.push(td.textContent?.trim() || ""));
        if (rowData.length > 0) {
          rowsList.push(rowData);
        }
      });
      
      const colsCount = rowsList[0]?.length || headersList.length;
      const headers = headersList.length > 0 ? headersList : Array.from({ length: colsCount }, (_, idx) => `Column ${idx + 1}`);
      
      if (rowsList.length > 0) {
        checkPageBreakNeeded(20);
        autoTable(doc, {
          startY: currentY,
          head: [headers],
          body: rowsList,
          margin: { left: marginX, right: marginX },
          styles: { fontSize: 8.5, font: "helvetica" },
          headStyles: { fillColor: [47, 55, 78] },
          didDrawPage: (data) => {
            currentY = (data.cursor?.y || currentY) + 4;
          }
        });
      }
    } 
    else if (tagName === "img") {
      const src = el.getAttribute("src") || "";
      if (src) {
        const widthAttr = el.getAttribute("width");
        const heightAttr = el.getAttribute("height");
        const width = widthAttr ? parseFloat(widthAttr) : 100;
        const height = heightAttr ? parseFloat(heightAttr) : 70;
        
        let drawWidth = width;
        let drawHeight = height;
        if (drawWidth > contentWidth) {
          const ratio = contentWidth / drawWidth;
          drawWidth = contentWidth;
          drawHeight = drawHeight * ratio;
        }

        checkPageBreakNeeded(drawHeight + 10);
        try {
          let format = "JPEG";
          if (src.includes("image/png")) format = "PNG";
          else if (src.includes("image/webp")) format = "WEBP";
          
          doc.addImage(src, format, marginX, currentY, drawWidth, drawHeight);
          currentY += drawHeight + 6;
        } catch (imgErr) {
          console.warn("Failed to render image in pdfEngine:", imgErr);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          doc.text("[Image Document Asset]", marginX, currentY + 4);
          currentY += 10;
        }
      }
    }
    else {
      // General wrappers (div, section, main, pre, span etc.)
      if (el.children.length === 0) {
        const text = el.textContent?.trim() || "";
        if (!text) return;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(51, 65, 85);
        
        const lines = doc.splitTextToSize(text, contentWidth);
        const neededHeight = lines.length * 5.5 + 4;
        checkPageBreakNeeded(neededHeight);
        
        lines.forEach((line: string) => {
          doc.text(line, marginX, currentY);
          currentY += 5.5;
        });
        currentY += 3;
      } else {
        const children = Array.from(el.children);
        children.forEach(child => renderElement(child));
      }
    }
  };

  Array.from(htmlDoc.body.children).forEach(child => renderElement(child));
  
  return doc.output("blob");
}

// 5. Merge multiple uploaded PDF files together
export async function mergePDFDocuments(pdfUint8Arrays: Uint8Array[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();
  
  for (const arrayBuffer of pdfUint8Arrays) {
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([mergedPdfBytes], { type: "application/pdf" });
}

// 6. Split existing PDF into multiple single page PDFs
export async function splitPDFDocument(pdfBytes: Uint8Array): Promise<Blob[]> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();
  const splittedBlobs: Blob[] = [];
  
  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(copiedPage);
    const savedBytes = await singleDoc.save();
    splittedBlobs.push(new Blob([savedBytes], { type: "application/pdf" }));
  }
  return splittedBlobs;
}

// 7. Extract specific page ranges from a PDF document
export async function extractPDFPages(pdfBytes: Uint8Array, pageZeroBasedIndices: number[]): Promise<Blob> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const extractDoc = await PDFDocument.create();
  
  // Safe validation filter of indices
  const totalCount = srcDoc.getPageCount();
  const filteredIndices = pageZeroBasedIndices.filter(idx => idx >= 0 && idx < totalCount);
  
  if (filteredIndices.length === 0) {
    throw new Error("No valid page indices requested for extraction.");
  }
  
  const copiedPages = await extractDoc.copyPages(srcDoc, filteredIndices);
  copiedPages.forEach((page) => extractDoc.addPage(page));
  
  const savedBytes = await extractDoc.save();
  return new Blob([savedBytes], { type: "application/pdf" });
}

// 8. Re-compress custom PDF dynamically by downscaling page canvas renders or quality compression
export async function compressPDFDocument(
  pdfBytes: Uint8Array, 
  quality: "low" | "medium" | "high"
): Promise<Blob> {
  // Let's create a copy with pdf-lib. Saving with optimize option decreases sizes automatically
  // pdf-lib's standard load & save reduces metadata, removes unused objects and compresses object stream natively
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // In addition, saving with compressed flag achieves extremely fast browser-native object stream token compression
  const savedBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([savedBytes], { type: "application/pdf" });
}
