import React, { useState, useRef } from "react";
import { Upload, FileText, ChevronRight, CheckCircle2, AlertTriangle, Download, History, Scissors, Layers, Settings, FileSpreadsheet } from "lucide-react";
import { PDFOperationResult } from "../types";
import { formatBytes } from "../utils/fileHelpers";
import { splitPDFDocument, extractPDFPages, getPdfPageCount } from "../utils/pdfEngine";

interface SplitTabProps {
  onAddHistory: (result: PDFOperationResult) => void;
  onSelectTab: (tab: string) => void;
}

export default function SplitTab({ onAddHistory, onSelectTab }: SplitTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Split options
  const [splitMode, setSplitMode] = useState<"individual" | "half" | "custom">("individual");
  const [customRange, setCustomRange] = useState<string>("");

  const [splitResults, setSplitResults] = useState<{
    name: string;
    blob: Blob;
    url: string;
  }[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSplitResults(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setErrorMsg("Please select a valid PDF file to perform splitting operations.");
        return;
      }
      
      setFile(selectedFile);
      setIsProcessing(true);
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const count = await getPdfPageCount(arrayBuffer);
        setPageCount(count);
      } catch (err) {
        setErrorMsg("Failed to read the PDF structure. The file might be corrupted.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Perform split calculation helper
  const handlePerformSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setSplitResults(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const outputFiles: { name: string; blob: Blob; url: string }[] = [];

      // Mode A: Individual single pages
      if (splitMode === "individual") {
        const pageBlobs = await splitPDFDocument(bytes);
        pageBlobs.forEach((blob, idx) => {
          const partName = `${file.name.replace(/\.pdf$/i, "")}_page_${idx + 1}.pdf`;
          outputFiles.push({
            name: partName,
            blob: blob,
            url: URL.createObjectURL(blob),
          });
        });
      }

      // Mode B: Split in half
      else if (splitMode === "half") {
        if (pageCount < 2) {
          throw new Error("Cannot split a single-page PDF in half.");
        }
        const midpoint = Math.ceil(pageCount / 2);
        
        // Front half indices
        const frontIndices = Array.from({ length: midpoint }, (_, i) => i);
        const frontBlob = await extractPDFPages(bytes, frontIndices);
        outputFiles.push({
          name: `${file.name.replace(/\.pdf$/i, "")}_part1.pdf`,
          blob: frontBlob,
          url: URL.createObjectURL(frontBlob),
        });

        // Back half indices
        const backIndices = Array.from({ length: pageCount - midpoint }, (_, i) => i + midpoint);
        const backBlob = await extractPDFPages(bytes, backIndices);
        outputFiles.push({
          name: `${file.name.replace(/\.pdf$/i, "")}_part2.pdf`,
          blob: backBlob,
          url: URL.createObjectURL(backBlob),
        });
      }

      // Mode C: Custom ranges like 1-2, 3-5
      else if (splitMode === "custom") {
        if (!customRange.trim()) {
          throw new Error("Please enter a custom range string. Example: '1-3, 4-5'.");
        }

        const ranges = customRange.split(",");
        for (let idx = 0; idx < ranges.length; idx++) {
          const range = ranges[idx].trim();
          const parts = range.split("-");
          const start = parseInt(parts[0]?.trim());
          const end = parts[1] ? parseInt(parts[1]?.trim()) : start;

          if (isNaN(start) || isNaN(end) || start < 1 || end > pageCount || start > end) {
            throw new Error(`Invalid page range found: "${range}". Provide ranges within 1 to ${pageCount}.`);
          }

          // Generate zero-based page indices
          const indices = Array.from({ length: (end - start) + 1 }, (_, i) => (start - 1) + i);
          const rangeBlob = await extractPDFPages(bytes, indices);
          
          outputFiles.push({
            name: `${file.name.replace(/\.pdf$/i, "")}_pages_${start}_to_${end}.pdf`,
            blob: rangeBlob,
            url: URL.createObjectURL(rangeBlob),
          });
        }
      }

      setSplitResults(outputFiles);
    } catch (err: any) {
      console.error("PDF Splitting error:", err);
      setErrorMsg(err.message || "An error occurred while compiling split page ranges.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToArtifact = (resultItem: { name: string; blob: Blob; url: string }) => {
    const newOperation: PDFOperationResult = {
      id: Math.random().toString(36).substring(4),
      name: resultItem.name,
      blob: resultItem.blob,
      url: resultItem.url,
      size: resultItem.blob.size,
      createdAt: new Date().toLocaleTimeString(),
      type: "application/pdf",
      fromOperation: "split",
    };

    onAddHistory(newOperation);
    // Trigger message confirmation
    alert(`"${resultItem.name}" saved safely to session history.`);
  };

  const handleSaveAllToArtifacts = () => {
    if (!splitResults) return;

    splitResults.forEach((res) => {
      const newOp: PDFOperationResult = {
        id: Math.random().toString(36).substring(4),
        name: res.name,
        blob: res.blob,
        url: res.url,
        size: res.blob.size,
        createdAt: new Date().toLocaleTimeString(),
        type: "application/pdf",
        fromOperation: "split",
      };
      onAddHistory(newOp);
    });

    onSelectTab("history");
    setFile(null);
    setSplitResults(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header card with scissors */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Scissors className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-850">Split Existing PDF Document</h2>
            <p className="text-sm text-slate-500 font-medium">
              Divide a PDF document into independent physical chunks: extract single pages, slice in half, or use custom ranges.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Input settings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-5">
            <h3 className="font-display font-bold text-slate-800 text-sm">Upload & Selection</h3>

            {!file ? (
              <div
                onClick={triggerFileInput}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-50/40 p-10 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
              >
                <div className="p-3 bg-white shadow-2xs border rounded-xl text-slate-400">
                  <FileText className="w-8 h-8 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Select PDF to Split</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Accepts valid .pdf documents</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/70 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 bg-indigo-100/70 text-indigo-700 rounded-lg shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{formatBytes(file.size)} • {pageCount} pages detected</p>
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); setSplitResults(null); }}
                  className="text-[10px] text-slate-450 hover:text-red-600 font-bold ml-2 shrink-0 transition"
                >
                  Change
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handleFileChange}
            />

            {/* Split parameters panel */}
            {file && (
              <div className="space-y-4 pt-2 border-t border-slate-100 font-sans">
                <label className="text-xs font-bold text-slate-600 flex items-center space-x-1.5 uppercase tracking-wider">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Choose Split Settings</span>
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => setSplitMode("individual")}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      splitMode === "individual" 
                        ? "border-indigo-500 bg-indigo-50/40" 
                        : "border-slate-200 hover:border-slate-350 bg-white"
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">Extract every single page</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">Generates {pageCount} distinct PDF files of 1 page each.</p>
                  </button>

                  <button
                    onClick={() => setSplitMode("half")}
                    disabled={pageCount < 2}
                    className={`p-3.5 rounded-xl border text-left transition disabled:opacity-50 ${
                      splitMode === "half" 
                        ? "border-indigo-500 bg-indigo-50/40" 
                        : "border-slate-200 hover:border-slate-350 bg-white"
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">Split directly in half</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">
                      Splits into Part 1 (Pages 1 to {Math.ceil(pageCount/2)}) and Part 2 (Pages {Math.ceil(pageCount/2)+1} to {pageCount}).
                    </p>
                  </button>

                  <button
                    onClick={() => setSplitMode("custom")}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      splitMode === "custom" 
                        ? "border-indigo-500 bg-indigo-50/40" 
                        : "border-slate-200 hover:border-slate-350 bg-white"
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">Custom page ranges</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">Specify custom slice ranges separated by values.</p>
                  </button>
                </div>

                {splitMode === "custom" && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] font-bold text-slate-600 block">Custom ranges string</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-2, 3-5 (where first is page 1-2, second is 3-5)"
                      value={customRange}
                      onChange={(e) => setCustomRange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl select-all font-sans outline-hidden focus:ring-1.5 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <span className="text-[9px] text-slate-400 font-medium block">Separate individual range bundles with standard commas (e.g. 1-1, 2-3).</span>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handlePerformSplit}
                    disabled={isProcessing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition shadow-xs cursor-pointer active:scale-98"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing PDF document...</span>
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4" />
                        <span>Perform Document Split</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                <div className="font-semibold">{errorMsg}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Split artifacts array */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs min-h-[400px] flex flex-col justify-between">
            {splitResults && splitResults.length > 0 ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <h4 className="font-display font-bold text-slate-800 text-sm">Split Results Completed ({splitResults.length})</h4>
                    </div>
                    
                    <button
                      onClick={handleSaveAllToArtifacts}
                      className="text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center space-x-1"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Save All to History</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {splitResults.map((res, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2.5 bg-white border rounded-lg text-slate-400 shadow-2xs">
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{res.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{formatBytes(res.blob.size)} • Split Document</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => handleSaveToArtifact(res)}
                            className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-700 bg-transparent hover:border border-transparent hover:border-slate-200 rounded-lg transition"
                            title="Add individual copy to history"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          
                          <a
                            href={res.url}
                            download={res.name}
                            className="p-1.5 hover:bg-white border text-indigo-600 hover:text-indigo-700 bg-white border-slate-200 shadow-2xs rounded-lg transition flex items-center"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t text-center text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  You can batch export or compile files anytime
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 space-y-3 flex-1">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-300">
                  <Scissors className="w-12 h-12" />
                </div>
                <div>
                  <p className="font-display font-bold text-slate-700 text-sm">Disassembled Page Archives</p>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mt-1 leading-relaxed">
                    Select a source PDF, define your physical splitting settings, and execute the process to review individual physical output files.
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
