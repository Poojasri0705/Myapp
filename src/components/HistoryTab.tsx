import React, { useState } from "react";
import { FileText, Eye, Download, Share2, Trash2, Calendar, ClipboardList, CheckCircle2 } from "lucide-react";
import { PDFOperationResult } from "../types";
import { formatBytes } from "../utils/fileHelpers";
import ShareModal from "./ShareModal";

interface HistoryTabProps {
  history: PDFOperationResult[];
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
}

export default function HistoryTab({ history, onRemoveHistory, onClearHistory }: HistoryTabProps) {
  const [previewItem, setPreviewItem] = useState<PDFOperationResult | null>(null);
  const [shareItem, setShareItem] = useState<PDFOperationResult | null>(null);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header section */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-850">Saved Documents & History</h2>
            <p className="text-sm text-slate-500 font-medium">
              Access previously generated compiled PDFs, extract archives, inspect sizes, preview internally or trigger sharing channels.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs font-semibold text-red-650 bg-red-50 hover:bg-red-100 px-3.5 py-2.5 rounded-xl border border-red-100 transition cursor-pointer self-start sm:self-auto"
          >
            Clear All History
          </button>
        )}
      </div>

      {/* Grid inventory */}
      {history.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-150 rounded-2xl hover:border-slate-300 p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3.5">
                {/* File Title and Badge */}
                <div className="flex items-start justify-between">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                    {item.fromOperation}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 truncate" title={item.name}>
                    {item.name}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-450 font-semibold mt-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Compiled {item.createdAt} • {formatBytes(item.size)}</span>
                  </div>
                </div>
              </div>

              {/* Action grid bottom */}
              <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-1 text-slate-500 text-xs">
                {/* Preview Button */}
                <button
                  onClick={() => setPreviewItem(item)}
                  className="flex items-center space-x-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => setShareItem(item)}
                  className="flex items-center space-x-1 py-1.5 px-2 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold rounded-lg transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Forward</span>
                </button>

                {/* Download Button */}
                <a
                  href={item.url}
                  download={item.name}
                  className="flex items-center space-x-1 py-1.5 px-2 hover:bg-indigo-50 hover:text-indigo-700 text-slate-750 font-bold rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Get PDF</span>
                </a>

                {/* Delete Individual */}
                <button
                  onClick={() => onRemoveHistory(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                  title="Delete from workspace"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 p-16 rounded-2xl shadow-xs text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-slate-50 border rounded-2xl text-slate-300">
            <ClipboardList className="w-12 h-12" />
          </div>
          <div>
            <p className="font-display font-bold text-slate-700 text-sm">Workspace registry is clean</p>
            <p className="text-xs text-slate-400 font-medium max-w-sm mt-1 leading-relaxed">
              Every PDF you create, split, extract, or compress will be cataloged here securely in memory for fast sharing and preview access.
            </p>
          </div>
        </div>
      )}

      {/* 1. Share Modal Integration */}
      {shareItem && (
        <ShareModal
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          fileName={shareItem.name}
          fileSize={formatBytes(shareItem.size)}
          fileBlobUrl={shareItem.url}
        />
      )}

      {/* 2. Visual PDF Preview Modal (Using secure iframe embedding) */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl h-[90vh] flex flex-col justify-between border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Top Header */}
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-800 text-sm truncate max-w-md">{previewItem.name}</h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
              >
                Close Preview
              </button>
            </div>

            {/* Modal PDF iframe Viewer */}
            <div className="flex-1 bg-slate-100 p-1">
              <iframe
                src={previewItem.url}
                title={previewItem.name}
                className="w-full h-full border-0 rounded-lg shadow-inner"
              />
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-white border-t flex items-center justify-between">
              <span className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Processed with Gen PDF v1.0</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const temp = previewItem;
                    setPreviewItem(null);
                    setShareItem(temp);
                  }}
                  className="py-2 px-4 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Forward via Email / WhatsApp
                </button>
                <a
                  href={previewItem.url}
                  download={previewItem.name}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Download PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
