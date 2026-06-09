import React, { useState } from "react";
import { Mail, Share2, Copy, Send, Check, X } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileSize: string;
  fileBlobUrl: string;
}

export default function ShareModal({ isOpen, onClose, fileName, fileSize, fileBlobUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [waNumber, setWaNumber] = useState("");

  if (!isOpen) return null;

  // Clipboard copy helper
  const handleCopyLink = () => {
    navigator.clipboard.writeText(fileBlobUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Whatsapp deep-link helper
  const handleWhatsAppShare = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = waNumber.replace(/\D/g, "");
    const textMsg = encodeURIComponent(
      `Hello! I generated and compiled a professional document using *Gen PDF*.\n\n📄 *File Name:* ${fileName}\n⚖️ *File Size:* ${fileSize}\n\nYou can access/download this file directly inside your chat, or use Gen PDF to compile, merge and extract any documents.`
    );
    const url = cleanNumber 
      ? `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${textMsg}`
      : `https://api.whatsapp.com/send?text=${textMsg}`;
    
    window.open(url, "_blank");
  };

  // Direct mailto deep-link helper
  const handleEmailShare = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`📄 Document Reference: ${fileName}`);
    const body = encodeURIComponent(
      `Hello,\n\nPlease find attached the following document processed through Gen PDF.\n\nFile Name: ${fileName}\nFile Size: ${fileSize}\n\nYou can process, split, merge, compress, and scan PDF files on the fly.\n\nBest regards.`
    );
    const mailtoUrl = email 
      ? `mailto:${email}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoUrl;
  };

  // Native navigator share if mobile device supports it
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: fileName,
          text: `Check out this document processed via Gen PDF: ${fileName}`,
          url: window.location.href
        });
      } catch (err) {
        console.warn("Native share dismissed or failed:", err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-800 text-lg">Share Document</h3>
              <p className="text-xs text-slate-500 font-medium">{fileName} ({fileSize})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Quick Copy Link */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fast Links</label>
            <div className="flex items-center space-x-2">
              <div className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                {fileBlobUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition duration-250 flex items-center space-x-2 shrink-0 ${
                  copied 
                    ? "bg-emerald-500 text-white" 
                    : "bg-slate-800 hover:bg-slate-900 text-white active:scale-95"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 animate-bounce" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Share with Email */}
          <form onSubmit={handleEmailShare} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Share via Email</label>
              <span className="text-[10px] text-slate-400 font-medium">Launches standard mail client</span>
            </div>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  placeholder="name@company.com (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-sans"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-medium flex items-center space-x-2 transition active:scale-95 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Compose Mail</span>
              </button>
            </div>
          </form>

          {/* Share with WhatsApp */}
          <form onSubmit={handleWhatsAppShare} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">WhatsApp Direct Forward</label>
              <span className="text-[10px] text-slate-400 font-medium">Sends metadata and details</span>
            </div>
            <div className="flex space-x-2">
              <input
                type="tel"
                placeholder="Phone number with country code (optional)"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-sans"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-medium flex items-center space-x-2 transition active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          </form>

          {/* Browser Share API Support */}
          {navigator.share && (
            <>
              <div className="h-px bg-slate-100" />
              <button
                onClick={handleNativeShare}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-500" />
                <span>Use Device Native Share Menu</span>
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
