import React, { useState, useRef } from "react";
import { Upload, FileText, CheckSquare, Square, CheckCircle2, AlertTriangle, Download, History, RefreshCw, Layers, Sparkles } from "lucide-react";
import { PDFOperationResult } from "../types";
import { formatBytes } from "../utils/fileHelpers";
import { extractPDFPages, getPdfPageCount } from "../utils/pdfEngine";

interface ExtractTabProps {
  onAddHistory: (result: PDFOperationResult) => void;
  onSelectTab: (tab: string) => void;
}

export default function ExtractTab({ onAddHistory, onSelectTab }: ExtractTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]); // Zero-based indices
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [extractResult, setExtractResult] = useState<{
    name: string;
    blob: Blob;
    url: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setExtractResult(null);
    setSelectedPages([]);

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setErrorMsg("Please select a valid PDF file for page extraction.");
        return;
      }

      setFile(selectedFile);
      setIsProcessing(true);
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const count = await getPdfPageCount(arrayBuffer);
        setPageCount(count);
      } catch (err) {
        setErrorMsg("Failed to read PDF pages properly. The document could be corrupt.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const togglePageSelection = (idx: number) => {
    setExtractResult(null);
    setSelectedPages((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((p) => p !== idx);
      } else {
        // Keep order sorted logically
        return [...prev, idx].sort((a, b) => a - b);
      }
    });
  };

  const selectAllPages = () => {
    setExtractResult(null);
    const all = Array.from({ length: pageCount }, (_, i) => i);
    setSelectedPages(all);
  };

  const clearPageSelection = () => {
    setExtractResult(null);
    setSelectedPages([]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePerformExtraction = async () => {
    if (!file) return;
    if (selectedPages.length === 0) {
      setErrorMsg("Please select at least 1 page to extract from this document.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setExtractResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      const newPdfBlob = await extractPDFPages(bytes, selectedPages);
      const outUrl = URL.createObjectURL(newPdfBlob);
      
      const rangeText = selectedPages.map(p => p + 1).slice(0, 4).join("_") + (selectedPages.length > 4 ? "_etc" : "");
      const outputName = `${file.name.replace(/\.pdf$/i, "")}_extracted_${rangeText}.pdf`;

      setExtractResult({
        name: outputName,
        blob: newPdfBlob,
        url: outUrl,
      });
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorMsg(err.message || "Failed to parse and extract the pages from your PDF file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToArtifacts = () => {
    if (!extractResult) return;

    const newOperation: PDFOperationResult = {
      id: Math.random().toString(36).substring(4),
      name: extractResult.name,
      blob: extractResult.blob,
      url: extractResult.url,
      size: extractResult.blob.size,
      createdAt: new Date().toLocaleTimeString(),
      type: "application/pdf",
      fromOperation: "extract",
    };

    onAddHistory(newOperation);
    onSelectTab("history");

    // Clear state
    setFile(null);
    setExtractResult(null);
    setSelectedPages([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Header card with visual layout theme */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-850">Select & Extract PDF Pages</h2>
            <p className="text-sm text-slate-500 font-medium">
              View individual cataloged pages from your uploaded PDF, checkmark specific pages, and generate a new isolated document.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Upload and status page count */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-5">
            <h3 className="font-display font-bold text-slate-800 text-sm">Document Input</h3>

            {!file ? (
              <div
                onClick={triggerFileInput}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-50/40 p-10 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
              >
                <div className="p-3 bg-white shadow-2xs border rounded-xl text-slate-400">
                  <FileText className="w-8 h-8 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Select Source PDF</p>
                  <p className="text-[10px] text-slate-450 font-medium mt-0.5">Loads individual page index models</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/70 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2 bg-indigo-100/70 text-indigo-700 rounded-lg shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{formatBytes(file.size)} • {pageCount} pages</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setFile(null); setExtractResult(null); setSelectedPages([]); }}
                    className="text-[10px] text-slate-450 hover:text-red-650 font-bold ml-2 shrink-0 transition"
                  >
                    Change
                  </button>
                </div>

                {/* Operations checklist numbers */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 font-sans">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-750">
                    <span>Selection Overview</span>
                    <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      {selectedPages.length} checked
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={selectAllPages}
                      className="py-1.5 px-2 bg-white hover:bg-slate-100 border text-slate-700 font-semibold text-[10px] rounded-lg transition"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearPageSelection}
                      className="py-1.5 px-2 bg-white hover:bg-slate-100 border text-slate-700 font-semibold text-[10px] rounded-lg transition"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Checked pages will be gathered in order and compiled into a single consolidated PDF format.
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={handlePerformExtraction}
                    disabled={isProcessing || selectedPages.length === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition shadow-xs cursor-pointer active:scale-98"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Slicing PDF Document...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Extract Selected Pages</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handleFileChange}
            />

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2 text-red-700 text-xs mt-4">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div className="font-semibold">{errorMsg}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Grid selector list or extracted files */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs min-h-[420px] flex flex-col justify-between">
            {extractResult ? (
              <div className="space-y-6 text-center py-10 flex-1 flex flex-col justify-center max-w-md mx-auto">
                <div className="flex justify-center">
                  <div className="p-5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full animate-pulse">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                </div>
                <div>
                  <h4 className="font-display font-bold text-slate-800 text-base">Page Extraction Succeeded</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    We gathered pages ({selectedPages.map((p) => p + 1).join(", ")}) and compiled them into a clean standalone vector PDF file.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-left">
                  <p className="text-xs font-bold text-slate-850 truncate">{extractResult.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{formatBytes(extractResult.blob.size)} • PDF Document</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={handleSaveToArtifacts}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-3 rounded-xl transition active:scale-95 shadow-xs flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    <span>Save to History</span>
                  </button>

                  <a
                    href={extractResult.url}
                    download={extractResult.name}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs py-3 rounded-xl transition active:scale-95 border flex items-center justify-center space-x-1"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Download File</span>
                  </a>
                </div>
              </div>
            ) : file && pageCount > 0 ? (
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="font-display font-bold text-slate-800 text-sm">Select Pages to Extract</h4>
                  <p className="text-xs text-slate-500 font-medium">Click on page tiles block sequences</p>
                </div>

                {/* Grid pages viewer */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5 max-h-[360px] overflow-y-auto pr-1">
                  {Array.from({ length: pageCount }).map((_, i) => {
                    const isSelected = selectedPages.includes(i);
                    return (
                      <div
                        key={i}
                        onClick={() => togglePageSelection(i)}
                        className={`border-2 rounded-xl p-4 text-center cursor-pointer transition select-none flex flex-col justify-between items-center min-h-[96px] ${
                          isSelected 
                            ? "border-indigo-600 bg-indigo-50/40 text-indigo-700 shadow-sm" 
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="w-full flex justify-end">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-350" />
                          )}
                        </div>

                        <div className="mt-2 text-center">
                          <FileText className={`w-6 h-6 mx-auto ${isSelected ? "text-indigo-500" : "text-slate-350"}`} />
                          <p className="text-xs font-bold text-slate-800 mt-1">Page {i + 1}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-24 space-y-3 flex-1">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-300">
                  <CheckSquare className="w-12 h-12" />
                </div>
                <div>
                  <p className="font-display font-bold text-slate-700 text-sm">Interactive Page Catalog</p>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mt-1 leading-relaxed">
                    Upload a multi-page PDF document to render the interactive grid snapshot cards and specify exact extracting indexes.
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
