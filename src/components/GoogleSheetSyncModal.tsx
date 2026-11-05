import React, { useState } from 'react';
import { LeaderboardEntry } from '../types/exam';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  testGoogleSheetConnection,
  syncAllEntriesToGoogleSheet,
  fetchEntriesFromGoogleSheet,
  formatDurationVi,
} from '../utils/googleSheetWebhook';
import {
  FileSpreadsheet,
  X,
  Copy,
  Check,
  Link2,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Code2,
  Sparkles,
  Loader2,
  Download,
} from 'lucide-react';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webAppUrl: string;
  onChangeWebAppUrl: (url: string) => void;
  autoSync: boolean;
  onChangeAutoSync: (enabled: boolean) => void;
  entries: LeaderboardEntry[];
  onMergeEntriesFromSheet: (sheetEntries: LeaderboardEntry[]) => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  webAppUrl,
  onChangeWebAppUrl,
  autoSync,
  onChangeAutoSync,
  entries,
  onMergeEntriesFromSheet,
}) => {
  const [activeTab, setActiveTab] = useState<'code_guide' | 'connect'>('code_guide');
  const [copiedCode, setCopiedCode] = useState(false);
  const [urlInput, setUrlInput] = useState(webAppUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  React.useEffect(() => {
    setUrlInput(webAppUrl);
  }, [webAppUrl, isOpen]);

  if (!isOpen) return null;

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveAndTestUrl = async () => {
    const clean = urlInput.trim();
    onChangeWebAppUrl(clean);
    if (!clean) {
      setStatusBanner({
        type: 'info',
        text: 'Đã xoá đường dẫn liên kết Google Sheet.',
      });
      return;
    }

    setIsLoading(true);
    setStatusBanner(null);
    const result = await testGoogleSheetConnection(clean);
    setIsLoading(false);
    setStatusBanner({
      type: result.ok ? 'success' : 'error',
      text: result.message,
    });
  };

  const handlePushAllToSheet = async () => {
    const clean = urlInput.trim();
    onChangeWebAppUrl(clean);
    if (entries.length === 0) {
      setStatusBanner({
        type: 'info',
        text: 'Hiện chưa có học sinh nào trong Bảng xếp hạng để đồng bộ lên Google Sheet.',
      });
      return;
    }

    setIsLoading(true);
    setStatusBanner(null);
    const result = await syncAllEntriesToGoogleSheet(clean, entries);
    setIsLoading(false);
    setStatusBanner({
      type: result.ok ? 'success' : 'error',
      text: result.message,
    });
  };

  const handlePullFromSheet = async () => {
    const clean = urlInput.trim();
    onChangeWebAppUrl(clean);
    setIsLoading(true);
    setStatusBanner(null);
    const result = await fetchEntriesFromGoogleSheet(clean);
    setIsLoading(false);

    if (result.ok && result.entries) {
      onMergeEntriesFromSheet(result.entries);
      setStatusBanner({
        type: 'success',
        text: result.message,
      });
    } else {
      setStatusBanner({
        type: 'error',
        text: result.message,
      });
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'STT',
      'Thời gian nộp bài',
      'Họ và tên học sinh',
      'Lớp',
      'Đề thi',
      'Điểm Phần I',
      'Điểm Phần II',
      'Điểm Phần III',
      'Điểm Phần IV',
      'Tổng điểm',
      'Thời gian làm bài',
      'Xếp loại',
    ];
    const rows = entries.map((item, idx) => [
      idx + 1,
      new Date(item.submittedAt || Date.now()).toLocaleString('vi-VN', { hour12: false }),
      `"${(item.studentName || '').replace(/"/g, '""')}"`,
      `"${(item.className || '').replace(/"/g, '""')}"`,
      `"Đề ${item.examTitle}"`,
      item.part1Score,
      item.part2Score,
      item.part3Score,
      item.part4Score,
      item.totalScore,
      `"${formatDurationVi(item.durationSeconds)}"`,
      `"${item.rank}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bang_Diem_Toan_10_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2.5 sm:p-5 overflow-y-auto">
      <div className="bg-[#071126] border border-emerald-500/40 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-gradient-to-r from-[#06241c] via-[#092c25] to-[#071630] border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[#04120e] shadow-lg shadow-emerald-500/20 shrink-0">
              <FileSpreadsheet className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                  Liên Kết Dữ Liệu Với Google Sheet
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    webAppUrl.trim()
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  {webAppUrl.trim() ? 'Đã cấu hình URL Sheet' : 'Chưa dán URL Web App'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Tự động ghi điểm học sinh ngay khi nộp bài và đồng bộ Bảng xếp hạng 2 chiều với Google Sheet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0b1739] hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-800 transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-[#091530] border-b border-sky-900/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('code_guide')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'code_guide'
                ? 'bg-emerald-500 text-[#04120e] shadow-md'
                : 'bg-[#0b1739] text-sky-200 hover:text-white border border-sky-800/70'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>1. Mã Code dán vào Mã.gs & Hướng dẫn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'connect'
                ? 'bg-emerald-500 text-[#04120e] shadow-md'
                : 'bg-[#0b1739] text-sky-200 hover:text-white border border-sky-800/70'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>2. Dán URL Kết Nối & Đồng Bộ Điểm ({entries.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-white">
          {activeTab === 'code_guide' ? (
            <div className="space-y-5">
              {/* 4 Bước Hướng Dẫn Trực Quan */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0b1739] border border-emerald-500/30 space-y-3">
                <h3 className="text-sm sm:text-base font-extrabold text-emerald-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Hướng dẫn 4 bước kết nối Google Sheet (chỉ mất 1 phút):</span>
                </h3>
                <ol className="space-y-2 text-xs sm:text-sm text-sky-100 leading-relaxed list-decimal list-inside">
                  <li>
                    Mở file <strong>Google Sheet</strong> của thầy/cô $\rightarrow$ chọn menu{' '}
                    <strong className="text-amber-300">Tiện ích mở rộng (Extensions)</strong>{' '}
                    $\rightarrow$ <strong className="text-amber-300">Apps Script</strong>.
                  </li>
                  <li>
                    Tại ô soạn thảo tệp <strong className="text-cyan-300">Mã.gs</strong>,{' '}
                    <strong className="text-rose-300">
                      xoá bỏ dòng <code>function myFunction() &#123; &#125;</code>
                    </strong>{' '}
                    mặc định, rồi nhấn nút{' '}
                    <strong className="text-emerald-300">"Sao chép mã Mã.gs"</strong> bên dưới để
                    dán vào và bấm biểu tượng đĩa mềm <strong>Lưu dự án (Ctrl + S)</strong>.
                  </li>
                  <li>
                    Nhấn nút màu xanh{' '}
                    <strong className="text-sky-300">Triển khai (Deploy)</strong> ở góc trên bên
                    phải $\rightarrow$ chọn{' '}
                    <strong className="text-amber-300">Tùy chọn triển khai mới</strong>{' '}
                    $\rightarrow$ bấm biểu tượng bánh răng chọn{' '}
                    <strong className="text-amber-300">Ứng dụng web (Web app)</strong>:
                    <ul className="pl-6 mt-1 space-y-1 list-disc text-sky-200">
                      <li>
                        Mục <em>Thực thi dưới dạng</em>: chọn <strong>Tôi (Me)</strong>.
                      </li>
                      <li>
                        Mục <em>Ai có quyền truy cập</em>: bắt buộc chọn{' '}
                        <strong className="text-emerald-300">Bất kỳ ai (Anyone)</strong>{' '}
                        $\rightarrow$ bấm <strong>Triển khai</strong> (nếu Google hỏi cấp quyền: bấm{' '}
                        <em>Ủy quyền truy cập $\rightarrow$ chọn tài khoản $\rightarrow$ Nâng cao (Advanced) $\rightarrow$ Đi tới Dự án... $\rightarrow$ Cho phép</em>).
                      </li>
                    </ul>
                  </li>
                  <li>
                    Sao chép đường link <strong>URL ứng dụng web</strong> (có dạng{' '}
                    <code className="text-cyan-300">
                      https://script.google.com/macros/s/.../exec
                    </code>
                    ) rồi chuyển sang thẻ{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('connect')}
                      className="underline font-bold text-emerald-300 hover:text-emerald-200"
                    >
                      2. Dán URL Kết Nối & Đồng Bộ Điểm
                    </button>{' '}
                    để dán vào App!
                  </li>
                </ol>
              </div>

              {/* Code Box */}
              <div className="rounded-2xl border border-sky-800 bg-[#040917] overflow-hidden shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#091534] border-b border-sky-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-xs sm:text-sm font-bold text-white font-mono">
                      Mã.gs — Toàn bộ mã nguồn dán vào Google Apps Script
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyAppsScript}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#04120e] font-extrabold text-xs transition-all shadow-md active:scale-95"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Đã sao chép mã Mã.gs!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Sao chép mã Mã.gs</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('connect')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 font-bold text-xs transition-colors"
                    >
                      Tiếp theo: Dán URL Web App →
                    </button>
                  </div>
                </div>

                <pre className="p-4 text-[11px] sm:text-xs font-mono text-cyan-200 overflow-x-auto max-h-[340px] leading-relaxed selection:bg-emerald-500 selection:text-black">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* URL Input Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0b1739] border border-sky-800/80 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-emerald-300 mb-1.5">
                    Đường dẫn URL ứng dụng web Google Apps Script (kết thúc bằng /exec):
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#050c1d] border border-sky-700/80 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleSaveAndTestUrl}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#04120e] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Lưu & Kiểm Tra Kết Nối</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-sky-300 mt-1.5">
                    Khi bấm <strong>Lưu & Kiểm Tra Kết Nối</strong>, hệ thống sẽ tự động tạo dòng
                    tiêu đề cột (STT, Họ tên, Lớp, Đề thi, Điểm từng phần, Tổng điểm, Thời gian, Xếp
                    loại) trên trang tính của thầy/cô.
                  </p>
                </div>

                {/* Auto-sync toggle */}
                <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#071126] border border-sky-900 cursor-pointer">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white">
                      Tự động gửi kết quả lên Google Sheet khi học sinh bấm "Nộp Bài Thi"
                    </div>
                    <div className="text-[11px] text-sky-300">
                      Mỗi khi học sinh hoàn thành bài thi, điểm số và thời gian làm bài sẽ tự động
                      ghi thêm 1 dòng mới vào Google Sheet.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => onChangeAutoSync(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                </label>
              </div>

              {/* Status Banner */}
              {statusBanner && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm font-semibold ${
                    statusBanner.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                      : statusBanner.type === 'error'
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                      : 'bg-sky-950/60 border-sky-500/50 text-sky-200'
                  }`}
                >
                  {statusBanner.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <span>{statusBanner.text}</span>
                </div>
              )}

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handlePushAllToSheet}
                  className="p-4 rounded-2xl bg-[#0b1739] hover:bg-[#112454] border border-emerald-500/40 text-left space-y-1.5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                      <UploadCloud className="w-5 h-5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {entries.length} học sinh
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                    Đẩy Bảng Xếp Hạng lên Sheet
                  </div>
                  <p className="text-xs text-sky-300 leading-relaxed">
                    Gửi toàn bộ danh sách điểm hiện có trên máy lên Google Sheet (không bị trùng lặp).
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handlePullFromSheet}
                  className="p-4 rounded-2xl bg-[#0b1739] hover:bg-[#112454] border border-cyan-500/40 text-left space-y-1.5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                      <DownloadCloud className="w-5 h-5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                      Đồng bộ 2 chiều
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                    Tải Điểm Từ Sheet Về App
                  </div>
                  <p className="text-xs text-sky-300 leading-relaxed">
                    Lấy danh sách điểm của học sinh các máy khác từ Google Sheet về Bảng xếp hạng.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="p-4 rounded-2xl bg-[#0b1739] hover:bg-[#112454] border border-amber-500/40 text-left space-y-1.5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                      <Download className="w-5 h-5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      File .CSV / Excel
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors">
                    Tải Bảng Điểm Excel (.CSV)
                  </div>
                  <p className="text-xs text-sky-300 leading-relaxed">
                    Xuất ngay danh sách kết quả ra file bảng tính chuẩn tiếng Việt để lưu trữ trên máy.
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#09132e] border-t border-sky-800/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-sky-300">
            Mẹo: Nếu chưa có URL Web App, thầy/cô hãy sao chép mã ở mục{' '}
            <strong>1. Mã Code dán vào Mã.gs</strong> trước.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#04120e] font-extrabold text-xs transition-colors"
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
