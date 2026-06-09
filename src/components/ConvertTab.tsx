import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, Table, Image as ImageIcon, Sparkles, Eye, Download, History, Share2 } from "lucide-react";
import { SourceFile, PDFOperationResult } from "../types";
import { formatBytes, fileToBase64, fileToDataUrl, isImageMime, isSpreadsheetMime, isOfficeDocMime } from "../utils/fileHelpers";
import { convertImageToPdf, convertSpreadsheetToPdf, convertStyledHtmlToPdf } from "../utils/pdfEngine";
import * as XLSX from "xlsx";

interface ConvertTabProps {
  onAddHistory: (result: PDFOperationResult) => void;
  onSelectTab: (tab: string) => void;
}

export default function ConvertTab({ onAddHistory, onSelectTab }: ConvertTabProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Converted result preview details
  const [convertedResult, setConvertedResult] = useState<{
    title: string;
    summary: string;
    htmlPreview?: string;
    blob: Blob | null;
    objectUrl: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);
    setConvertedResult(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadFile(file);
      handleStartConversion(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setConvertedResult(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      handleStartConversion(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Convert Core Logic
  const handleStartConversion = async (fileToProcess?: File) => {
    const file = fileToProcess || uploadFile;
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    const fileName = file.name;
    const fileType = file.type || "application/octet-stream";
    const fileSize = file.size;

    try {
      // 1. Handle Images (Client-side, lightning fast)
      if (isImageMime(fileType)) {
        const dataUrl = await fileToDataUrl(file);
        const pdfBlob = await convertImageToPdf(dataUrl, fileName);
        const outUrl = URL.createObjectURL(pdfBlob);
        
        setConvertedResult({
          title: fileName.substring(0, fileName.lastIndexOf(".")) || fileName,
          summary: "Converted direct high-density image format safely into a visual static PDF layout.",
          htmlPreview: `<div class="flex items-center justify-center p-4"><img src="${dataUrl}" class="max-h-96 rounded-lg shadow-md border" /></div>`,
          blob: pdfBlob,
          objectUrl: outUrl,
        });
      } 
      
      // 2. Handle Spreadsheets (XLSX / CSV) (Client-side, clean, vector-rendered)
      else if (isSpreadsheetMime(fileType)) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        
        const sheetsData: { name: string; headers: string[]; rows: any[][] }[] = [];
        let totalRows = 0;
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const records = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          if (records.length > 0) {
            const headers = records[0].map(h => String(h || "Col"));
            const bodyRows = records.slice(1);
            sheetsData.push({
              name: sheetName,
              headers,
              rows: bodyRows
            });
            totalRows += bodyRows.length;
          }
        });
        
        if (sheetsData.length === 0) {
          throw new Error("The uploaded spreadsheet is empty.");
        }

        const cleanTitle = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
        const pdfBlob = await convertSpreadsheetToPdf(sheetsData, cleanTitle);
        const outUrl = URL.createObjectURL(pdfBlob);

        // Build elegant visual preview of the first sheet (or first few sheets)
        const firstSheet = sheetsData[0];
        let previewHtml = `<div class="space-y-4 font-sans">`;
        previewHtml += `<div class="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Sheet Preview: ${firstSheet.name} (${sheetsData.length} sheets total)</span>
        </div>`;
        previewHtml += `<div class="overflow-x-auto max-h-60 border rounded-xl"><table class="w-full text-left text-xs border-collapse">`;
        previewHtml += `<thead class="bg-slate-800 text-white font-semibold"><tr>`;
        firstSheet.headers.forEach(h => previewHtml += `<th class="p-3 border-r border-slate-700 whitespace-nowrap">${h}</th>`);
        previewHtml += `</tr></thead><tbody class="divide-y text-slate-700 bg-white">`;
        firstSheet.rows.slice(0, 10).forEach((row, rIdx) => {
          previewHtml += `<tr class="${rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}">`;
          firstSheet.headers.forEach((_, colIdx) => {
            previewHtml += `<td class="p-2.5 border-r border-slate-100 whitespace-nowrap">${row[colIdx] === undefined ? "" : row[colIdx]}</td>`;
          });
          previewHtml += `</tr>`;
        });
        previewHtml += `</tbody></table></div>`;
        if (firstSheet.rows.length > 10 || sheetsData.length > 1) {
          previewHtml += `<p class="text-xs text-slate-400 mt-2 text-center font-medium">
            Showing top 10 rows and 1st sheet preview (${totalRows} total rows converted across ${sheetsData.length} sheets)
          </p>`;
        }
        previewHtml += `</div>`;

        setConvertedResult({
          title: cleanTitle,
          summary: `Extracted ${totalRows} spreadsheet records across ${sheetsData.length} sheets ("${sheetsData.map(s => s.name).join('", "')}") and converted them directly into structured PDF data layout tables.`,
          htmlPreview: previewHtml,
          blob: pdfBlob,
          objectUrl: outUrl,
        });
      }

      // 3. Handle Word documents / TXT files / General inputs (Gemini AI-assisted, highly styled)
      else {
        const base64Str = await fileToBase64(file);
        const response = await fetch("/api/smart-convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: base64Str,
            mimeType: fileType,
            fileName: fileName
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to structure document layout on the server.");
        }

        const data = await response.json();
        
        // Compile styled html into real vector PDF file
        const pdfBlob = convertStyledHtmlToPdf(data.htmlContent, data.title);
        const outUrl = URL.createObjectURL(pdfBlob);

        setConvertedResult({
          title: data.title,
          summary: data.summary || "AI-powered optical outline conversion successfully formulated.",
          htmlPreview: `<div class="prose prose-sm max-w-none text-slate-800 line-break max-h-96 overflow-y-auto p-4 bg-slate-50 rounded-xl border">${data.htmlContent}</div>`,
          blob: pdfBlob,
          objectUrl: outUrl,
        });
      }
    } catch (err: any) {
      console.error("Conversion error detail:", err);
      setErrorMsg(err.message || "An error occurred while compiling your library file.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Dispatch the converted artifact to the app-level session state
  const handleSaveToArtifacts = () => {
    if (!convertedResult || !convertedResult.blob) return;
    
    const outputName = `${convertedResult.title || "converted"}.pdf`;
    
    const newOperation: PDFOperationResult = {
      id: Math.random().toString(36).substring(4),
      name: outputName,
      blob: convertedResult.blob,
      url: convertedResult.objectUrl,
      size: convertedResult.blob.size,
      createdAt: new Date().toLocaleTimeString(),
      type: "application/pdf",
      fromOperation: "convert"
    };

    onAddHistory(newOperation);
    // Auto pivot to the list tab
    onSelectTab("history");
    
    // Reset file fields
    setUploadFile(null);
    setConvertedResult(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header card with subtle design badge */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-slate-850">Smart Convert Documents to PDF</h2>
              <p className="text-sm text-slate-500 font-medium">
                Perfect formatting for Word docs (DOCX), Excel tables (XLSX), text arrays, and high-contrast images.
              </p>
            </div>
          </div>
          
          {/* Xerox replication badge */}
          <div className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold self-start md:self-auto font-sans">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold">Xerox Verbatim Mode Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Upload Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
            <h3 className="font-display font-bold text-slate-800 text-sm mb-4">Upload File</h3>

            {/* Dnd Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-4 ${
                isDragging 
                  ? "border-indigo-500 bg-indigo-50/50" 
                  : "border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-50/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".docx,.doc,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
              />

              <div className="p-4 bg-white shadow-xs rounded-2xl border border-slate-100 text-slate-400">
                {uploadFile ? (
                  isImageMime(uploadFile.type) ? (
                    <ImageIcon className="w-10 h-10 text-indigo-500" />
                  ) : isSpreadsheetMime(uploadFile.type) ? (
                    <Table className="w-10 h-10 text-emerald-500" />
                  ) : (
                    <FileText className="w-10 h-10 text-indigo-600" />
                  )
                ) : (
                  <Upload className="w-10 h-10 text-slate-400" />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {uploadFile ? uploadFile.name : "Choose document, table or image"}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {uploadFile ? formatBytes(uploadFile.size) : "Standard Drag and Drop, or click here"}
                </p>
              </div>

              {!uploadFile && (
                <div className="text-[10px] text-slate-400 font-medium bg-slate-100/80 border border-slate-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  DOCX · XLSX · CSV · TXT · JPEG · PNG
                </div>
              )}
            </div>

            {/* Actions Panel */}
            {uploadFile && (
              <div className="mt-5 space-y-3">
                <button
                  onClick={handleStartConversion}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium text-sm rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98 shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Synthesizing Document Layout...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Convert File to Vector PDF</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => { setUploadFile(null); setConvertedResult(null); }}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded-xl transition cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* Error messaging state */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl mt-4 flex items-start space-x-2 text-red-700 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <div className="font-medium">
                  {errorMsg}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs min-h-[360px] flex flex-col justify-between">
            {convertedResult ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                
                {/* Result Title & details */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h4 className="font-display font-bold text-slate-800 text-base">{convertedResult.title}</h4>
                  </div>
                  
                  <blockquote className="border-l-3 border-indigo-500 pl-3 py-1 bg-slate-50 text-slate-600 text-xs italic font-medium leading-relaxed rounded-r-lg">
                    {convertedResult.summary}
                  </blockquote>
                </div>

                {/* HTML Render Panel */}
                {convertedResult.htmlPreview && (
                  <div className="space-y-1.5 flex-1 mt-4">
                    <div className="flex items-center space-x-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Converted Screen Representation</span>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: convertedResult.htmlPreview }} />
                  </div>
                )}

                {/* Action panel to output to register */}
                <div className="pt-6 border-t border-slate-100 flex items-center space-x-3 shrink-0">
                  <button
                    onClick={handleSaveToArtifacts}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer shadow-sm"
                  >
                    <History className="w-4 h-4" />
                    <span>Save to History Artifacts</span>
                  </button>
                  
                  <a
                    href={convertedResult.objectUrl}
                    download={`${convertedResult.title}.pdf`}
                    className="px-5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-medium text-xs py-3 rounded-xl flex items-center space-x-1.5 transition active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </a>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-16 space-y-3 flex-1">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-300">
                  <FileText className="w-12 h-12" />
                </div>
                <div>
                  <p className="font-display font-bold text-slate-700 text-sm">Converted File Preview</p>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mt-1 leading-relaxed">
                    Once you upload and run conversions, an live visual snapshot and structured PDF preview will populate here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
