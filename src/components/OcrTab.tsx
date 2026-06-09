import React, { useState, useRef } from "react";
import { Upload, Search, FileText, CheckCircle2, AlertTriangle, Copy, Check, Download, Mail, Send, Sparkles, Languages } from "lucide-react";
import { formatBytes, fileToBase64, isImageMime, isPdfMime } from "../utils/fileHelpers";

export default function OcrTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // OCR transcribing states
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedText, setCopiedText] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setOcrText(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Run the premium API-powered multimodal Gemini OCR scan
  const handlePerformOcrScan = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setOcrText(null);

    try {
      const base64Data = await fileToBase64(file);
      const fileMime = file.type || "application/pdf";

      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: base64Data,
          mimeType: fileMime,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to process the OCR scan.");
      }

      const resObj = await response.json();
      setOcrText(resObj.text);
    } catch (err: any) {
      console.error("OCR Scan Failure:", err);
      setErrorMsg(err.message || "An error occurred while connecting to the OCR engine.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy recognized text to clipboard
  const handleCopyClipboard = () => {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Export recognized text as structured TXT
  const handleExportTextFile = () => {
    if (!ocrText) return;
    const blob = new Blob([ocrText], { type: "text/plain;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = u;
    link.download = `${file?.name?.replace(/\.[^/.]+$/, "") || "ocr"}_transcription.txt`;
    link.click();
  };

  // Share text via email
  const handleShareEmail = () => {
    if (!ocrText) return;
    const subject = encodeURIComponent("📄 Extracted Document Text: " + (file?.name || "OCR Scanner"));
    // Slice body because email deep URL characters are capped in some browsers
    const compressedBody = ocrText.substring(0, 1500) + (ocrText.length > 1500 ? "\n\n[Content truncated for email limits...]" : "");
    const body = encodeURIComponent(`Hello,\n\nHere is the scanned and processed text output from Gen PDF:\n\n---\n${compressedBody}\n---`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Share text via whatsapp
  const handleShareWhatsApp = () => {
    if (!ocrText) return;
    const brief = ocrText.substring(0, 400) + (ocrText.length > 400 ? "..." : "");
    const msg = encodeURIComponent(
      `📄 *Gen PDF - OCR Scanned Text Output*\n\nFile Processed: ${file?.name}\n\n*Extracted text:*\n"${brief}"\n\nShared via Gen PDF.`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
  };

  // Search filter
  const highlightSearchText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) 
        ? <mark key={i} className="bg-yellow-250 text-slate-900 rounded-xs font-semibold px-0.5">{part}</mark> 
        : part
    );
  };

  // Split raw text into nice formatted sections if they include the tags we set or double spacing
  const renderFormattedTranscription = () => {
    if (!ocrText) return null;

    const sections = ocrText.split("\n\n");
    return (
      <div className="space-y-4 text-left font-sans text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap select-all">
        {sections.map((sec, idx) => {
          if (sec.includes("=== SUMMARY ===") || sec.includes("=== RAW TEXT ===")) {
            return (
              <div 
                key={idx} 
                className="py-1.5 px-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 font-semibold uppercase tracking-wider text-[11px]"
              >
                {sec.replace(/===/g, "").trim()}
              </div>
            );
          }
          return (
            <p key={idx}>
              {highlightSearchText(sec, searchQuery)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header element */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Languages className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-850">AI-Powered OCR Scanner</h2>
            <p className="text-sm text-slate-500 font-medium">
              Scan images (JPEG, PNG) and PDF documents to recognize, index, search, and transcribe text instantly using Gemini.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Input parameters card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-5">
            <h3 className="font-display font-bold text-slate-850 text-sm">Upload Document</h3>

            {!file ? (
              <div
                onClick={triggerFileInput}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-50/40 p-10 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
              >
                <div className="p-3 bg-white shadow-2xs rounded-xl border text-slate-400">
                  <Upload className="w-8 h-8 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Choose Image or PDF</p>
                  <p className="text-[10px] text-slate-450 font-medium mt-0.5">Scans pixel arrays recursively</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/70 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2.5 bg-indigo-100/75 text-indigo-700 rounded-lg shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{formatBytes(file.size)} • {file.type.split("/")[1]?.toUpperCase() || "PDF"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setFile(null); setOcrText(null); }}
                    className="text-[10px] text-slate-450 hover:text-red-650 font-bold ml-2 shrink-0 transition"
                  >
                    Change
                  </button>
                </div>

                <div className="pt-3">
                  <button
                    onClick={handlePerformOcrScan}
                    disabled={isProcessing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition shadow-xs cursor-pointer active:scale-98"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Scanning Multi-page Text...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span>Scan & Recognize Text</span>
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
              accept=".pdf,.png,.jpg,.jpeg,.webp"
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

        {/* Output scan viewer card */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs min-h-[400px] flex flex-col justify-between">
            {ocrText ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                
                {/* Search / Action bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search recognized text on page..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs pl-9 pr-3 py-2.5 rounded-xl font-sans outline-hidden focus:ring-1.5 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* Actions tools list */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto font-sans">
                    <button
                      onClick={handleCopyClipboard}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 border transition ${
                        copiedText 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText ? "Copied!" : "Copy Raw"}</span>
                    </button>

                    <button
                      onClick={handleExportTextFile}
                      className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center space-x-1 cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Export TXT</span>
                    </button>
                  </div>
                </div>

                {/* Scanned result box scrollable */}
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-5 overflow-y-auto max-h-[320px] shadow-inner">
                  {renderFormattedTranscription()}
                </div>

                {/* Share widgets */}
                <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Fast Sharing Methods:</span>
                  <div className="flex items-center space-x-3 w-full sm:w-auto font-sans">
                    <button
                      onClick={handleShareEmail}
                      className="flex-1 sm:flex-initial py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition"
                    >
                      <Mail className="w-4 h-4 text-indigo-500" />
                      <span>Email Extracted Text</span>
                    </button>
                    
                    <button
                      onClick={handleShareWhatsApp}
                      className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition"
                    >
                      <Send className="w-4 h-4 text-emerald-500" />
                      <span>WhatsApp Share</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 space-y-3 flex-1">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-300">
                  <Languages className="w-12 h-12 animate-pulse" />
                </div>
                <div>
                  <p className="font-display font-bold text-slate-700 text-sm">Transcribed Document Canvas</p>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mt-1 leading-relaxed">
                    Upload an invoice receipt, PDF scans, letters, books, or notes. Press "Scan" to index, search, and export textual content.
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
