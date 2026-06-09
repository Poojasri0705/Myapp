import React, { useState, useRef } from "react";
import { Upload, FileText, ArrowUp, ArrowDown, Trash2, Combine, CheckCircle2, AlertTriangle, Download, History, ListOrdered, Layers } from "lucide-react";
import { PDFOperationResult } from "../types";
import { formatBytes, fileToDataUrl, isImageMime, isPdfMime } from "../utils/fileHelpers";
import { convertImageToPdf, mergePDFDocuments } from "../utils/pdfEngine";

interface MergeTabProps {
  onAddHistory: (result: PDFOperationResult) => void;
  onSelectTab: (tab: string) => void;
}

interface MergeItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

export default function MergeTab({ onAddHistory, onSelectTab }: MergeTabProps) {
  const [mergeList, setMergeList] = useState<MergeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [mergeResult, setMergeResult] = useState<{
    name: string;
    blob: Blob;
    url: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setMergeResult(null);
    if (e.target.files) {
      const newItems: MergeItem[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        newItems.push({
          id: Math.random().toString(36).substring(4),
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          file: file,
        });
      }
      setMergeList((prev) => [...prev, ...newItems]);
    }
  };

  const removeFile = (id: string) => {
    setMergeList((prev) => prev.filter((item) => item.id !== id));
    setMergeResult(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setMergeList((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      return list;
    });
    setMergeResult(null);
  };

  const moveDown = (index: number) => {
    if (index === mergeList.length - 1) return;
    setMergeList((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      return list;
    });
    setMergeResult(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Run the merging operations (converting images internally as pages)
  const handlePerformMerge = async () => {
    if (mergeList.length < 2) {
      setErrorMsg("Please upload at least 2 files to perform a merge.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setMergeResult(null);

    try {
      const arrayBuffersToMerge: Uint8Array[] = [];

      for (let i = 0; i < mergeList.length; i++) {
        const item = mergeList[i];
        
        // A. If already.pdf, take its raw array buffer
        if (isPdfMime(item.type) || item.name.toLowerCase().endsWith(".pdf")) {
          const buffer = await item.file.arrayBuffer();
          arrayBuffersToMerge.push(new Uint8Array(buffer));
        } 
        // B. If image, compile and print to temporary client PDF, then grab array buffer
        else if (isImageMime(item.type)) {
          const dataUrl = await fileToDataUrl(item.file);
          const pdfBlob = await convertImageToPdf(dataUrl, item.name);
          const buffer = await pdfBlob.arrayBuffer();
          arrayBuffersToMerge.push(new Uint8Array(buffer));
        }
        // C. Otherwise throw warning
        else {
          throw new Error(
            `Format "${item.name}" not supported inside compiling loops. Standardize your files to PDF or Image prior to merging.`
          );
        }
      }

      const mergedPdfBlob = await mergePDFDocuments(arrayBuffersToMerge);
      const outUrl = URL.createObjectURL(mergedPdfBlob);

      setMergeResult({
        name: "merged_document.pdf",
        blob: mergedPdfBlob,
        url: outUrl,
      });
    } catch (err: any) {
      console.error("Merging error:", err);
      setErrorMsg(err.message || "Failed to process and merge your document arrays.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToArtifacts = () => {
    if (!mergeResult) return;

    const newOperation: PDFOperationResult = {
      id: Math.random().toString(36).substring(4),
      name: mergeResult.name,
      blob: mergeResult.blob,
      url: mergeResult.url,
      size: mergeResult.blob.size,
      createdAt: new Date().toLocaleTimeString(),
      type: "application/pdf",
      fromOperation: "merge",
    };

    onAddHistory(newOperation);
    onSelectTab("history");

    // Clear state
    setMergeList([]);
    setMergeResult(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-850">Merge Documents into PDF</h2>
            <p className="text-sm text-slate-500 font-medium">
              Combine multiple PDFs and images into a single professional PDF document. Adjust order and merge instantly.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Upload & Order Operations */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-800 text-sm flex items-center space-x-2">
                <ListOrdered className="w-4 h-4 text-indigo-500" />
                <span>Document Queue ({mergeList.length})</span>
              </h3>
              
              <button
                onClick={triggerFileInput}
                className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Add Files</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
            />

            {mergeList.length > 0 ? (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {mergeList.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 p-3 rounded-xl transition group"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-400 shrink-0 shadow-2xs">
                        <FileText className={`w-4 h-4 ${isPdfMime(item.type) ? "text-indigo-500" : "text-emerald-500"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{formatBytes(item.size)} • {item.type.split("/")[1]?.toUpperCase() || "PDF"}</p>
                      </div>
                    </div>

                    {/* Order Controls */}
                    <div className="flex items-center space-x-1 shrink-0 ml-4">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-white border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded transition"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === mergeList.length - 1}
                        className="p-1 hover:bg-white border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded transition"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      
                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      <button
                        onClick={() => removeFile(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                        title="Remove File"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={triggerFileInput}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-50/40 p-12 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
              >
                <div className="p-3 bg-white shadow-2xs border rounded-xl text-slate-400">
                  <Combine className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Queue is empty</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Click here to batch upload PDFs and Images to begin merging</p>
                </div>
              </div>
            )}

            {mergeList.length >= 2 && (
              <div className="pt-3">
                <button
                  onClick={handlePerformMerge}
                  disabled={isProcessing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer active:scale-98"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing & Merging...</span>
                    </>
                  ) : (
                    <>
                      <Combine className="w-4 h-4" />
                      <span>Merge Documents Now</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div className="font-semibold">{errorMsg}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Merged Result View */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs min-h-[300px] flex flex-col justify-between">
            {mergeResult ? (
              <div className="flex flex-col h-full justify-between flex-1 space-y-6">
                <div className="text-center space-y-4 py-6">
                  <div className="flex justify-center">
                    <div className="p-5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-bounce">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-slate-800 text-base">Merge Operation Successful</h4>
                    <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
                      All files in your queue have been unified into a single high-quality document sequence.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl text-left inline-block w-full max-w-xs">
                    <p className="text-xs font-bold text-slate-800 truncate">{mergeResult.name}</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5">{formatBytes(mergeResult.blob.size)} • PDF Document</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={handleSaveToArtifacts}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer active:scale-95"
                  >
                    <History className="w-4 h-4" />
                    <span>Save to History Artifacts</span>
                  </button>

                  <a
                    href={mergeResult.url}
                    download={mergeResult.name}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 border"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Download Merged PDF</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-16 space-y-3 flex-1">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-300">
                  <Combine className="w-12 h-12" />
                </div>
                <div>
                  <p className="font-display font-bold text-slate-700 text-sm">Compiled Document</p>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mt-1 leading-relaxed">
                    Set up at least 2 files in your queue, adjust their final arrangement, and perform the merge to compile.
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
