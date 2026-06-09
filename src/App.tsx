import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  FileText, 
  Combine, 
  Scissors, 
  CheckSquare, 
  Sliders, 
  Languages, 
  History, 
  Clock, 
  User,
  ShieldCheck,
  ChevronRight,
  Monitor
} from "lucide-react";
import { PDFOperationResult, ToolTab } from "./types";

// Inner Pages Imports
import ConvertTab from "./components/ConvertTab";
import MergeTab from "./components/MergeTab";
import SplitTab from "./components/SplitTab";
import ExtractTab from "./components/ExtractTab";
import CompressTab from "./components/CompressTab";
import OcrTab from "./components/OcrTab";
import HistoryTab from "./components/HistoryTab";

export default function App() {
  const [activeTab, setActiveTab] = useState<ToolTab>("convert");
  const [history, setHistory] = useState<PDFOperationResult[]>([]);
  const [currentUtcTime, setCurrentUtcTime] = useState("");
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Maintain active current UTC and API health status
  useEffect(() => {
    // Live realistic running UTC ticks
    const updateTime = () => {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        timeZone: "UTC", 
        hour12: true, 
        year: "numeric", 
        month: "short", 
        day: "numeric", 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      };
      setCurrentUtcTime(date.toLocaleDateString("en-US", options) + " UTC");
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Verify Gemini API health status
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setApiOnline(data.status === "ok");
      })
      .catch((err) => {
        console.warn("Backend API status offline:", err);
        setApiOnline(false);
      });

    return () => clearInterval(interval);
  }, []);

  const handleAddHistory = (result: PDFOperationResult) => {
    setHistory((prev) => [result, ...prev]);
  };

  const handleRemoveHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to delete all generated PDF artifacts in this session?")) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-indigo-100 selection:text-indigo-900 leading-normal text-slate-800">
      
      {/* 1. Global Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Title Logo Grouping */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("convert")}>
              <div className="bg-gradient-to-tr from-indigo-500 to-indigo-600 p-2.5 rounded-xl text-white shadow-md">
                <FileText className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="font-display font-black text-lg tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-100">
                  Gen PDF
                </span>
                <span className="text-[10px] block text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
                  Universal Compiler
                </span>
              </div>
            </div>

            {/* Middle running stats block */}
            <div className="hidden lg:flex items-center space-x-6 text-xs text-slate-405 font-medium">
              <div className="flex items-center space-x-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono text-slate-350">{currentUtcTime || "loading..."}</span>
              </div>
              
              <div className="flex items-center space-x-1.5 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800">
                <div className={`w-1.5 h-1.5 rounded-full ${apiOnline === true ? "bg-emerald-500 animate-ping" : apiOnline === false ? "bg-amber-500 animate-pulse" : "bg-slate-500"}`} />
                <span className="text-slate-350">
                  {apiOnline === true ? "Gemini Engine Online" : apiOnline === false ? "AI Offline" : "System Handshake..."}
                </span>
              </div>
            </div>

            {/* Active Operator Badge */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-xs bg-slate-850 border border-slate-800 px-2.5 py-1.5 rounded-xl text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mr-1" />
                <span className="text-[10px] font-sans font-extrabold uppercase">PRO v1.0</span>
              </div>
            </div>

          </div>
        </div>
      </nav>

      {/* Modern Horizontal Tabs Bar for Large screens and scrollable layout for small */}
      <div className="bg-white border-b border-slate-200/80 sticky top-16 z-30 shadow-2xs font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 overflow-x-auto py-2.5 scrollbar-thin">
            
            {/* Convert Tab Button */}
            <button
              onClick={() => setActiveTab("convert")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition shrink-0 cursor-pointer ${
                activeTab === "convert" 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Convert to PDF</span>
            </button>

            {/* Merge Tab Button */}
            <button
              onClick={() => setActiveTab("merge")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition shrink-0 cursor-pointer ${
                activeTab === "merge" 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Combine className="w-3.5 h-3.5 shrink-0" />
              <span>Merge PDFs</span>
            </button>

            {/* Split Tab Button */}
            <button
              onClick={() => setActiveTab("split")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition shrink-0 cursor-pointer ${
                activeTab === "split" 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Scissors className="w-3.5 h-3.5 shrink-0" />
              <span>Split PDF Chunks</span>
            </button>

            {/* Extract Tab Button */}
            <button
              onClick={() => setActiveTab("extract")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition shrink-0 cursor-pointer ${
                activeTab === "extract" 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Extract Pages</span>
            </button>

            {/* Compress Tab Button */}
            <button
              onClick={() => setActiveTab("compress")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition shrink-0 cursor-pointer ${
                activeTab === "compress" 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span>Compress PDF Size</span>
            </button>

            {/* OCR Tab Button */}
            <button
              onClick={() => setActiveTab("ocr")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition shrink-0 cursor-pointer ${
                activeTab === "ocr" 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Languages className="w-3.5 h-3.5 shrink-0" />
              <span>AI OCR Text Scan</span>
            </button>

            <div className="w-px h-6 bg-slate-200 shrink-0 mx-2" />

            {/* History Tab Button */}
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition shrink-0 cursor-pointer relative ${
                activeTab === "history" 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Saved PDFs</span>
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1.5 w-5 h-5 bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-xs">
                  {history.length}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* 2. Main Body Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          {/* Dynamic Tab Switchboard */}
          {activeTab === "convert" && (
            <ConvertTab onAddHistory={handleAddHistory} onSelectTab={setActiveTab} />
          )}

          {activeTab === "merge" && (
            <MergeTab onAddHistory={handleAddHistory} onSelectTab={setActiveTab} />
          )}

          {activeTab === "split" && (
            <SplitTab onAddHistory={handleAddHistory} onSelectTab={setActiveTab} />
          )}

          {activeTab === "extract" && (
            <ExtractTab onAddHistory={handleAddHistory} onSelectTab={setActiveTab} />
          )}

          {activeTab === "compress" && (
            <CompressTab onAddHistory={handleAddHistory} onSelectTab={setActiveTab} />
          )}

          {activeTab === "ocr" && (
            <OcrTab />
          )}

          {activeTab === "history" && (
            <HistoryTab 
              history={history} 
              onRemoveHistory={handleRemoveHistory} 
              onClearHistory={handleClearHistory} 
            />
          )}

        </div>
      </main>

      {/* 3. Sleek Minimalist Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 mt-12 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-display font-black text-white text-sm">Gen PDF</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">• Unified Cloud Document Workspace</span>
          </div>
          
          <div className="flex items-center space-x-4 text-slate-500">
            <span>Powered by Gemini 3.5 AI Engine</span>
            <span>•</span>
            <span>Secure SSL Sandbox</span>
            <span>•</span>
            <span>Local Web Persistence</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
