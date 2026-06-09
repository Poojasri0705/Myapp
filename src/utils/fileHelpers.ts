// Helper to format bytes cleanly
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Convert native File to base64 string
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Strip any prefix metadata header (e.g., "data:image/png;base64,")
      const cleaned = base64String.split(",")[1];
      resolve(cleaned);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Convert native File to raw data URL string
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export function isImageMime(type: string): boolean {
  return type.startsWith("image/");
}

export function isPdfMime(type: string): boolean {
  return type === "application/pdf";
}

export function isOfficeDocMime(type: string): boolean {
  return (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || // docx
    type === "application/msword" || // doc
    type === "text/plain" ||
    type === "text/markdown"
  );
}

export function isSpreadsheetMime(type: string): boolean {
  return (
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || // xlsx
    type === "application/vnd.ms-excel" || // xls
    type === "text/csv"
  );
}
