import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";

dotenv.config();

const app = express();
const PORT = 3000;

// Configure body-parser limit to handle moderate PDF and image files
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Google Gemini Client on server-side
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Successfully initialized server-side Gemini client.");
  } else {
    console.warn("GEMINI_API_KEY is not configured. AI-powered conversion and OCR will be offline.");
  }
} catch (e) {
  console.error("Failure while initializing Gemini client:", e);
}

// Function to guarantee safe Gemini client access with clear errors
function getAi(): GoogleGenAI {
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY is missing or invalid. Please add your key in the 'Settings > Secrets' panel within Google AI Studio."
    );
  }
  return ai;
}

// --- API Endpoints ---

// Check API status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", apiConfigured: !!process.env.GEMINI_API_KEY });
});

// Perform detailed OCR Scan
app.post("/api/ocr", async (req, res) => {
  try {
    const { base64, mimeType } = req.body;
    if (!base64 || !mimeType) {
      return res.status(400).json({ error: "Missing required fields: base64 file data or mimeType" });
    }

    const gemini = getAi();
    
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64,
            mimeType: mimeType
          }
        },
        "Perform optical character recognition (OCR) on this document or image. Extract and transcribe all readable text, tabular columns, indices, and numerical records with absolute precision. Maintain clean paragraphs and outline headings. Provide a 2-sentence visual summary of the content at the very start, preceded by '=== SUMMARY ===', followed by '=== RAW TEXT ===' and the full transcription."
      ],
      config: {
        systemInstruction: "You are an expert OCR, scanner, and document transcription system. Read any uploaded document or image, retrieve all alphanumeric details with 100% accuracy, and structure headings and pages flawlessly."
      }
    });

    const transcribedText = response.text || "No text content detected inside this document.";
    res.json({ text: transcribedText });
  } catch (error: any) {
    console.error("API /api/ocr error:", error);
    res.status(500).json({ error: error.message || "Failed to parse document text correctly through OCR" });
  }
});

// Leverage Multimodal AI to convert any non-PDF files into visual PDFs (HTML layouts)
app.post("/api/smart-convert", async (req, res) => {
  try {
    const { base64, mimeType, fileName } = req.body;
    if (!base64 || !mimeType) {
      return res.status(400).json({ error: "Missing required data: base64 template or mimeType" });
    }

    const gemini = getAi();

    let finalBase64 = base64;
    let finalMimeType = mimeType;
    const imageMap: Record<string, string> = {};
    let placeholderCounter = 0;

    // Check if DOCX (unsupported by Gemini inlineData API)
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName?.toLowerCase().endsWith(".docx")
    ) {
      try {
        const buffer = Buffer.from(base64, "base64");
        const docHtmlResult = await mammoth.convertToHtml({ buffer });
        let docHtml = docHtmlResult.value || "";
        
        // Extract embedded base64 images and substitute with placeholder tokens to keep token size compact
        docHtml = docHtml.replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, (match, srcValue) => {
          if (srcValue && (srcValue.startsWith("data:") || srcValue.length > 200)) {
            const placeholder = `IMAGE_PLACEHOLDER_${placeholderCounter++}`;
            imageMap[placeholder] = srcValue;
            return `<img src="${placeholder}" alt="Embedded Asset ${placeholder}" />`;
          }
          return match;
        });

        finalBase64 = Buffer.from(docHtml).toString("base64");
        finalMimeType = "text/html";
      } catch (docxErr: any) {
        console.warn("Docx parsing via mammoth failed, falling back to raw text extract:", docxErr);
        // Clean non-printable characters for standard plain text fallback
        const textContent = Buffer.from(base64, "base64")
          .toString("utf8")
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
         finalBase64 = Buffer.from(textContent).toString("base64");
         finalMimeType = "text/plain";
      }
    } else if (
      mimeType === "application/msword" ||
      fileName?.toLowerCase().endsWith(".doc")
    ) {
      // Legacy .doc is binary compound layout, let's extract raw text representing printable chars
      try {
        const textContent = Buffer.from(base64, "base64")
          .toString("utf8")
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
         finalBase64 = Buffer.from(textContent).toString("base64");
         finalMimeType = "text/plain";
      } catch (docErr) {
        console.warn("Legacy .doc raw text extraction failed:", docErr);
      }
    } else {
      // Whitelist of natively supported input MIME types for Gemini.
      // If the incoming query isn't in this list, we decode and send it as text/plain
      const supportedMimeTypes = [
        "image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif",
        "audio/wav", "audio/mp3", "audio/aac", "audio/ogg", "audio/flac",
        "video/mp4", "video/mpeg", "video/mov", "video/avi", "video/flv", "video/webm", "video/wmv", "video/3gpp",
        "application/pdf", "text/plain", "text/html", "text/markdown", "text/csv", "application/json", "application/xml"
      ];

      if (!supportedMimeTypes.includes(mimeType)) {
        try {
          const textContent = Buffer.from(base64, "base64")
            .toString("utf8")
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
          finalBase64 = Buffer.from(textContent).toString("base64");
          finalMimeType = "text/plain";
        } catch (err) {
          console.warn(`Unrecognized MIME type conversion failed: ${mimeType}`, err);
          finalMimeType = "text/plain";
        }
      }
    }

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: finalBase64,
            mimeType: finalMimeType
          }
        },
        `You are converting the file "${fileName || 'uploaded_document'}" of MIME type "${mimeType}" into a beautifully styled document layout. 
        Analyze the file's tabular formats, raw records, headings, images, or structures, and convert it into high-fidelity web HTML code.
        
        CRITICAL DIRECTIVE (XEROX / VERBATIM COPY MODE):
        You MUST act as a high-fidelity physical xerox copier machine. Under no circumstance are you allowed to paraphrase, summarize, shorten, edit, translate, improve, or modify any words or content from the original file. 
        Every single heading, bullet point, sentence, paragraph, table row, list item, and numeric value MUST be extracted and preserved EXACTLY as written, word-for-word, with 100% absolute precision.
        
        Formatting & Style Rules:
        1. If it's a Spreadsheet (Excel/CSV), convert it to an elegant, grid-aligned HTML table with headers (th), columns, borders, and modern striped rows. Do not leave out any cells or truncate row indices.
        2. If it's a Text/Office Document, preserve the original visual structure and headings verbatim, translating them into proportional HTML headers (h1, h2, h3), custom lists, or structured paragraph blocks.
        3. If it's an Image, do maximum-fidelity optical character recognition (OCR) transcription of all embedded text, layouts, and logos, and organize it as a complete verbatim report.
        4. Style using standard modern Tailwind classes to ensure it looks extremely premium, sleek, clean, and professional for a corporate document. Use generous padding, balanced spacing, thin gray borders, and clear typography. Do not add any placeholder commentary or unsolicited AI summaries within the document body.
        5. Crucial Image Rule: If the source HTML contains image placeholders formatted as "IMAGE_PLACEHOLDER_X", you must copy and keep those same image tags exact verbatim (e.g., <img src="IMAGE_PLACEHOLDER_X" />) in their proportional chronological positions. Do not drop, alter or skip them.
        
        Strict Output Format:
        Return ONLY valid JSON with this format:
        {
          "title": "A suitable professional title for the generated document",
          "htmlContent": "High-fidelity styled HTML wrapper markup. Use clean HTML structure like h1, h2, h3, p, strong, ul, ol, li, table, thead, tbody, tr, th, td, img. Do not include outer doctype/html/head/body. Leverage clean Tailwind utility classes directly for beautiful spacing, text colors, margins, borders, and alternating stripes (e.g. bg-gray-50/bg-white, text-gray-800, font-sans, etc.). No triple-backticks.",
          "summary": "Brief summary outlining the processed document contents"
        }`
      ],
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an exact full-fidelity document styling Xerox API. You copy incoming documents into pristine responsive HTML layouts, keeping every word entirely verbatim without exception."
      }
    });

    const responseText = response.text || "{}";
    try {
      const resultObj = JSON.parse(responseText.trim());
      
      // Restore image placeholders back to their high-fidelity base64 data URLs
      if (resultObj.htmlContent && Object.keys(imageMap).length > 0) {
        let restoredHtml = resultObj.htmlContent;
        for (const [placeholder, originalSrc] of Object.entries(imageMap)) {
          restoredHtml = restoredHtml.replaceAll(placeholder, originalSrc);
        }
        resultObj.htmlContent = restoredHtml;
      }
      
      res.json(resultObj);
    } catch (parseErr) {
      console.warn("JSON parsing of Gemini document converter response failed, serving fallback structure.", parseErr);
      let fallbackHtml = responseText;
      // Also restore placeholders in raw fallback text if any
      if (Object.keys(imageMap).length > 0) {
        for (const [placeholder, originalSrc] of Object.entries(imageMap)) {
          fallbackHtml = fallbackHtml.replaceAll(placeholder, originalSrc);
        }
      }
      res.json({
        title: fileName ? fileName.replace(/\.[^/.]+$/, "") : "Converted Document",
        htmlContent: `<div class="p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm font-sans">
          <h1 class="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">${fileName || "Document Preview"}</h1>
          <div class="whitespace-pre-wrap text-slate-700 leading-relaxed">${fallbackHtml}</div>
        </div>`,
        summary: "Successfully generated raw output representation."
      });
    }
  } catch (error: any) {
    console.error("API /api/smart-convert error:", error);
    res.status(500).json({ error: error.message || "Failed to structure document layout" });
  }
});

// --- Vite Routing Integration ---

async function mountServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite development middlewares
    const viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(viteInstance.middlewares);
    console.log("Vite development server middleware mounted successfully.");
  } else {
    // Serve production build files
    const buildPath = path.join(process.cwd(), "dist");
    app.use(express.static(buildPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
    console.log("Production static directory mapped:", buildPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server listening at http://0.0.0.0:${PORT}`);
  });
}

mountServer().catch((err) => {
  console.error("Fatal exception during server startup:", err);
});
