export interface SourceFile {
  id: string;
  name: string;
  size: number;
  type: string; // MIME type
  base64: string; // Base64 data of the file
  objectUrl: string; // Object URL for preview/work
  pageCount?: number; // Calculated page count if PDF
  isConverting: boolean;
  isOcrLoading: boolean;
  error?: string;
  ocrResult?: string;
  formattedHtml?: string; // HTML representation of tabular/doc file from Gemini
  summary?: string; // OCR or document summary from Gemini
  convertedPdfBlob?: Blob; // If converted to PDF already, the PDF blob
}

export interface PDFOperationResult {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  size: number;
  createdAt: string;
  type: "application/pdf";
  fromOperation: "convert" | "merge" | "split" | "extract" | "compress";
}

export type ToolTab = "convert" | "merge" | "split" | "ocr" | "compress" | "history";

export interface CompressionSettings {
  quality: "low" | "medium" | "high"; // low quality = maximum compression, high quality = minimum compression
}
