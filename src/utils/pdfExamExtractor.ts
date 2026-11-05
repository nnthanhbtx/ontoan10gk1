import * as pdfjsLib from 'pdfjs-dist';

// Cấu hình worker cho pdfjs-dist trong Vite
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  // Fallback CDN nếu môi trường trình duyệt chặn URL worker cục bộ
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Chuyển ArrayBuffer sang chuỗi Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Trích xuất văn bản trực tiếp từ file PDF ngay trên trình duyệt bằng pdfjs-dist (nhanh, dùng cho PDF có sẵn mã LaTeX hoặc làm dự phòng)
 */
export async function extractTextFromPdfLocal(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Sắp xếp các phần tử text theo tọa độ Y (từ trên xuống dưới) và X (từ trái sang phải)
    interface PositionedItem {
      str: string;
      x: number;
      y: number;
    }

    const items: PositionedItem[] = [];
    for (const item of textContent.items as any[]) {
      if (typeof item.str === 'string' && item.str.trim().length > 0 && Array.isArray(item.transform)) {
        items.push({
          str: item.str,
          x: item.transform[4] || 0,
          y: item.transform[5] || 0,
        });
      }
    }

    // Gom các item có cùng độ cao Y (sai số <= 3.5pt) vào cùng 1 dòng
    const lines: { y: number; items: PositionedItem[] }[] = [];
    for (const it of items) {
      const existingLine = lines.find((l) => Math.abs(l.y - it.y) <= 3.5);
      if (existingLine) {
        existingLine.items.push(it);
      } else {
        lines.push({ y: it.y, items: [it] });
      }
    }

    // Sắp xếp các dòng từ trên xuống dưới (Y giảm dần trong hệ tọa độ PDF)
    lines.sort((a, b) => b.y - a.y);

    const renderedLines = lines.map((line) => {
      line.items.sort((a, b) => a.x - b.x);
      return line.items.map((i) => i.str).join(' ');
    });

    pageTexts.push(renderedLines.join('\n'));
  }

  return pageTexts.join('\n\n').trim();
}

/**
 * Nhận diện đề Toán từ file PDF:
 * - Ưu tiên sử dụng API nhận diện tài liệu PDF thông minh (/api/parse-pdf) để giữ nguyên công thức Toán LaTeX $...$ và nét gạch chân đáp án đúng <u>...</u>.
 * - Nếu chế độ trích xuất nhanh được chọn hoặc khi server bận, tự động trích xuất bằng pdfjs-dist cục bộ.
 */
export async function extractMathExamFromPdf(
  file: File,
  mode: 'smart' | 'fast' = 'smart'
): Promise<{ text: string; usedSmartMode: boolean }> {
  const arrayBuffer = await file.arrayBuffer();

  if (mode === 'fast') {
    const localText = await extractTextFromPdfLocal(arrayBuffer.slice(0));
    return { text: localText, usedSmartMode: false };
  }

  try {
    const base64Pdf = arrayBufferToBase64(arrayBuffer.slice(0));
    const response = await fetch('/api/parse-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Pdf }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.text === 'string' && data.text.trim().length > 0) {
        return { text: data.text.trim(), usedSmartMode: true };
      }
    }
  } catch (err) {
    console.warn('Chuyển sang trích xuất PDF cục bộ do lỗi kết nối API:', err);
  }

  // Fallback tự động sang bộ đọc PDF cục bộ pdfjs-dist
  const fallbackText = await extractTextFromPdfLocal(arrayBuffer.slice(0));
  return { text: fallbackText, usedSmartMode: false };
}
