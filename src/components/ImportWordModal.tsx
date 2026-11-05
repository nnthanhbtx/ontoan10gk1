import React, { useState, useRef } from 'react';
import {
  parseWordExamContent,
  normalizeWordHtmlToText,
  SAMPLE_WORD_CONTENT,
} from '../utils/wordExamParser';
import {
  extractWordDocxWithMath,
  normalizeMathExpressionsToLatex,
} from '../utils/docxMathExtractor';
import { extractMathExamFromPdf } from '../utils/pdfExamExtractor';
import { ExamSet } from '../types/exam';
import {
  FileText,
  Upload,
  Download,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  X,
  FileCheck,
  Loader2,
} from 'lucide-react';

interface ImportWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExam: (exam: ExamSet) => void;
  defaultTitle?: string;
}

export const ImportWordModal: React.FC<ImportWordModalProps> = ({
  isOpen,
  onClose,
  onApplyExam,
  defaultTitle = 'Đề tự luyện',
}) => {
  const [content, setContent] = useState<string>('');
  const [examTitle, setExamTitle] = useState<string>(defaultTitle);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [pdfMode, setPdfMode] = useState<'smart' | 'fast'>('smart');
  const [copiedSample, setCopiedSample] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setExamTitle(defaultTitle);
      setErrorMsg(null);
    }
  }, [isOpen, defaultTitle]);

  if (!isOpen) return null;

  // Xử lý đọc file .docx, .pdf hoặc .txt
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMsg(null);
    try {
      const lowerName = file.name.toLowerCase();
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

      if (lowerName.endsWith('.docx')) {
        setProcessingStatus(
          'Đang đọc file Word (.docx), chuyển công thức Toán (OMML/Equation) sang chuẩn LaTeX $...$ và giữ nguyên gạch chân...'
        );
        const arrayBuffer = await file.arrayBuffer();
        const extractedText = await extractWordDocxWithMath(arrayBuffer);

        setContent(extractedText);
        if (nameWithoutExt) setExamTitle(nameWithoutExt);
      } else if (lowerName.endsWith('.pdf')) {
        setProcessingStatus(
          pdfMode === 'smart'
            ? 'Đang nhận diện đề Toán từ file PDF (chuyển đổi công thức LaTeX $...$ và gạch chân đáp án)...'
            : 'Đang trích xuất nhanh văn bản từ file PDF...'
        );
        const { text } = await extractMathExamFromPdf(file, pdfMode);
        if (!text || !text.trim()) {
          setErrorMsg(
            'Không trích xuất được nội dung văn bản từ file PDF này. Vui lòng thử chế độ "Nhận diện PDF thông minh" hoặc kiểm tra lại file.'
          );
        } else {
          setContent(text);
          if (nameWithoutExt) setExamTitle(nameWithoutExt);
        }
      } else if (lowerName.endsWith('.doc')) {
        setErrorMsg(
          'Định dạng .doc cũ (Word 97-2003) không hỗ trợ đọc trực tiếp. Vui lòng lưu thành .docx, xuất sang .pdf hoặc Copy (Ctrl+C) rồi Dán (Ctrl+V) vào ô văn bản bên dưới.'
        );
      } else {
        setProcessingStatus('Đang đọc file văn bản...');
        const text = await file.text();
        setContent(normalizeMathExpressionsToLatex(text));
        if (nameWithoutExt) setExamTitle(nameWithoutExt);
      }
    } catch {
      setErrorMsg(
        'Không thể đọc file. Vui lòng chọn file định dạng .docx hoặc .pdf hợp lệ, hoặc sao chép nội dung dán vào ô văn bản bên dưới.'
      );
    } finally {
      setIsProcessingFile(false);
      setProcessingStatus('');
    }
  };

  // Hỗ trợ dán trực tiếp (Ctrl+V) từ Microsoft Word mà vẫn giữ nguyên gạch chân <u>...</u> và số mũ / công thức
  const handlePasteFromWord = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const htmlData = e.clipboardData?.getData('text/html');
    if (
      htmlData &&
      (/<u\b/i.test(htmlData) ||
        /text-decoration\s*:\s*underline/i.test(htmlData) ||
        /<sup\b|<sub\b/i.test(htmlData))
    ) {
      e.preventDefault();
      const converted = normalizeMathExpressionsToLatex(
        normalizeWordHtmlToText(htmlData)
          .replace(/\[U\]/g, '<u>')
          .replace(/\[\/U\]/g, '</u>')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      );

      const target = e.currentTarget;
      const start = target.selectionStart ?? content.length;
      const end = target.selectionEnd ?? content.length;
      const nextValue = content.slice(0, start) + converted + content.slice(end);
      setContent(nextValue);
      setErrorMsg(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Tải file mẫu .txt
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_WORD_CONTENT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'de_mau_toan_10_chuan_word.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sao chép nội dung mẫu
  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_WORD_CONTENT);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  // Nạp mẫu vào trình soạn thảo
  const handleLoadSample = () => {
    setContent(SAMPLE_WORD_CONTENT);
    setExamTitle(defaultTitle || 'Đề tự luyện');
    setErrorMsg(null);
  };

  // Thống kê kết quả nhận diện thời gian thực
  const parseResult = content ? parseWordExamContent(content, examTitle) : null;

  const handleApply = () => {
    if (!parseResult || parseResult.counts.total === 0) {
      setErrorMsg(
        'Chưa nhận diện được câu hỏi nào. Vui lòng kiểm tra lại định dạng câu hỏi (bắt đầu bằng "Câu 1.", "Câu 2.",...) hoặc bấm "Nạp đề mẫu" để xem chuẩn.'
      );
      return;
    }
    onApplyExam(parseResult.exam);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Tạo Đề Thi Bằng File Word (.docx) hoặc PDF (.pdf)
              </h3>
              <p className="text-xs text-slate-500">
                Tự động nhận diện câu hỏi, gạch chân đáp án và công thức LaTeX từ file Word & PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Quy tắc soạn thảo văn bản trong file Word / PDF */}
          <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 space-y-2.5 text-xs text-amber-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                <span>💡 Quy tắc cấu trúc đề Word (.docx) & PDF (.pdf):</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-2.5 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-200 text-amber-900 font-semibold flex items-center gap-1 transition-colors"
                  title="Tải file văn bản mẫu về máy"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải mẫu</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySample}
                  className="px-2.5 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-200 text-amber-900 font-semibold flex items-center gap-1 transition-colors"
                  title="Sao chép nội dung văn bản mẫu"
                >
                  {copiedSample ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSample ? 'Đã sao chép' : 'Chép mẫu'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1 transition-colors"
                  title="Tải văn bản mẫu vào khung nhập"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Nạp đề mẫu</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800 leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-200/80 font-mono text-[11px]">
              <div className="space-y-1">
                <div className="font-bold text-indigo-800">Phần I. ( gạch chân đáp án đúng )</div>
                <div className="pl-2">Câu 1. [Nội dung câu hỏi]</div>
                <div className="pl-4"><u>A. Đáp án đúng</u> &nbsp; B. ... &nbsp; C. ... &nbsp; D. ...</div>
                <div className="pl-2">Câu 2. [Nội dung câu hỏi]</div>
                <div className="font-bold text-sky-800 pt-1">Phần II. ( gạch chân đáp án đúng )</div>
                <div className="pl-2">Câu 1. [Nội dung câu hỏi]</div>
                <div className="pl-4"><u>a) Mệnh đề đúng</u></div>
                <div className="pl-4">b) Mệnh đề sai (không gạch chân)</div>
                <div className="pl-4"><u>c) Mệnh đề đúng</u></div>
                <div className="pl-4">d) Mệnh đề sai (không gạch chân)</div>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-emerald-800">Phần III. ( hoặc Phần II. tiếp theo )</div>
                <div className="pl-2">Câu 1. [Nội dung câu hỏi trả lời ngắn]</div>
                <div className="pl-4">Đáp số: 8 (hoặc gạch chân <u>8</u> ở dòng dưới)</div>
                <div className="font-bold text-purple-800 pt-1">Phần IV.</div>
                <div className="pl-2">Câu 1. [Nội dung bài toán tự luận]</div>
                <div className="pl-4">[Dòng lời giải 1]</div>
                <div className="pl-4">[Dòng lời giải 2]</div>
                <div className="pl-4">[Dòng lời giải 3]</div>
                <div className="text-slate-500 pt-1 font-sans italic">
                  * Với file PDF: Hỗ trợ nhận diện tự động cả công thức Toán thường lẫn LaTeX <code>$...$</code>.
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tên đề thi & Chế độ đọc PDF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tên Đề Thi:</label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Nhập tên đề thi (ví dụ: Đề 01)..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Chế Độ Đọc Khi Tải File PDF (.pdf):</label>
              <select
                value={pdfMode}
                onChange={(e) => setPdfMode(e.target.value as 'smart' | 'fast')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="smart">
                  Nhận diện PDF thông minh (Chuyển công thức Toán sang LaTeX & nhận gạch chân)
                </option>
                <option value="fast">
                  Trích xuất văn bản PDF nhanh (Dành cho PDF đã có sẵn mã LaTeX $...$)
                </option>
              </select>
            </div>
          </div>

          {/* Drag & Drop File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-indigo-600 bg-indigo-50/70'
                : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400'
            }`}
            onClick={() => !isProcessingFile && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                {isProcessingFile ? (
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div className="text-sm font-bold text-slate-800">
                {isProcessingFile
                  ? processingStatus || 'Đang đọc và phân tích file...'
                  : 'Kéo thả file Word (.docx) hoặc PDF (.pdf) vào đây hoặc bấm để chọn file'}
              </div>
              <p className="text-xs text-slate-500">
                Hỗ trợ đầy đủ cả file <strong>.docx</strong> và <strong>.pdf</strong> (tự động nhận diện công thức Toán và đáp án)
              </p>
            </div>
          </div>

          {/* Text Area for manual paste & tweak */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Nội Dung Đề Thi Đã Nhận Diện (Có thể chỉnh sửa hoặc nhấn Ctrl+V dán trực tiếp từ Word):
              </label>
              <button
                type="button"
                onClick={() => {
                  setContent('');
                  setErrorMsg(null);
                }}
                className="text-xs text-rose-600 hover:underline"
              >
                Xóa trắng
              </button>
            </div>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePasteFromWord}
              placeholder="Tải file .docx / .pdf ở trên hoặc dán (Ctrl+V) nội dung từ Word vào đây..."
              className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Real-time Recognition Counter Badge Strip */}
          {parseResult && (
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Kết Quả Nhận Diện Thời Gian Thực:</span>
                </span>
                <span className="text-indigo-700 font-mono font-bold">
                  Tổng {parseResult.counts.total} câu hỏi
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phần I (Trắc nghiệm):</span>
                    <span className="font-bold text-indigo-700 font-mono text-sm">
                      {parseResult.counts.part1} câu
                    </span>
                  </div>
                  {parseResult.unrecognizedByPart.part1.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-rose-100 text-[10px] text-rose-600 font-semibold">
                      Chưa nhận dạng:{' '}
                      {parseResult.unrecognizedByPart.part1.map((u) => u.questionLabel).join(', ')}
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phần II (Đúng / Sai):</span>
                    <span className="font-bold text-sky-700 font-mono text-sm">
                      {parseResult.counts.part2} câu
                    </span>
                  </div>
                  {parseResult.unrecognizedByPart.part2.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-rose-100 text-[10px] text-rose-600 font-semibold">
                      Chưa nhận dạng:{' '}
                      {parseResult.unrecognizedByPart.part2.map((u) => u.questionLabel).join(', ')}
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phần III (Trả lời ngắn):</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      {parseResult.counts.part3} câu
                    </span>
                  </div>
                  {parseResult.unrecognizedByPart.part3.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-rose-100 text-[10px] text-rose-600 font-semibold">
                      Chưa nhận dạng:{' '}
                      {parseResult.unrecognizedByPart.part3.map((u) => u.questionLabel).join(', ')}
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phần IV (Tự luận ghép):</span>
                    <span className="font-bold text-purple-700 font-mono text-sm">
                      {parseResult.counts.part4} câu
                    </span>
                  </div>
                  {parseResult.unrecognizedByPart.part4.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-rose-100 text-[10px] text-rose-600 font-semibold">
                      Chưa nhận dạng:{' '}
                      {parseResult.unrecognizedByPart.part4.map((u) => u.questionLabel).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Mục Câu chưa nhận dạng (cụ thể Câu 1, Câu 2, ...) */}
              <div
                className={`p-3 rounded-lg border text-xs ${
                  parseResult.unrecognizedQuestions.length > 0
                    ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle
                      className={`w-4 h-4 shrink-0 ${
                        parseResult.unrecognizedQuestions.length > 0
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    />
                    <span>Câu chưa nhận dạng:</span>
                  </span>
                  <span className="font-mono">
                    {parseResult.unrecognizedQuestions.length > 0
                      ? `${parseResult.unrecognizedQuestions.length} câu (${parseResult.unrecognizedQuestions
                          .map((u) => `${u.partLabel}: ${u.questionLabel}`)
                          .join(' • ')})`
                      : '0 câu (Đã nhận dạng đầy đủ)'}
                  </span>
                </div>

                {parseResult.unrecognizedQuestions.length > 0 ? (
                  <div className="mt-2 pt-2 border-t border-rose-200/80 space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {(['part1', 'part2', 'part3', 'part4'] as const).map((partKey) => {
                        const list = parseResult.unrecognizedByPart[partKey];
                        if (list.length === 0) return null;
                        const partTitle =
                          partKey === 'part1'
                            ? 'Phần I'
                            : partKey === 'part2'
                            ? 'Phần II'
                            : partKey === 'part3'
                            ? 'Phần III'
                            : 'Phần IV';
                        return (
                          <div
                            key={partKey}
                            className="px-2.5 py-1 rounded-md bg-white border border-rose-200 text-[11px] font-semibold text-rose-800"
                          >
                            <span className="font-bold text-rose-950">{partTitle}:</span>{' '}
                            <span>{list.map((item) => item.questionLabel).join(', ')}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-[11px] text-rose-800 space-y-0.5 max-h-28 overflow-y-auto pt-0.5">
                      {parseResult.unrecognizedQuestions.map((item, idx) => (
                        <div key={`${item.part}_${item.questionNumber}_${idx}`}>
                          • <strong>{item.partLabel} - {item.questionLabel}:</strong> {item.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-emerald-700">
                    Tất cả các câu hỏi trong đề đã được nhận diện đầy đủ nội dung, phương án và đáp án.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessingFile || !content || !parseResult || parseResult.counts.total === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all flex items-center gap-2 ${
              !isProcessingFile && content && parseResult && parseResult.counts.total > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer active:scale-95'
                : 'bg-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Áp Dụng & Tạo Đề Thi ({parseResult?.counts.total || 0} câu)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
