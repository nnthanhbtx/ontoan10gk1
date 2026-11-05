import React from 'react';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  swReady: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  hasNativePrompt: boolean;
  onPromptInstall: () => Promise<boolean>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  swReady,
  isInstalled,
  isIOS,
  hasNativePrompt,
  onPromptInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#071126] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-cyan-500/40 text-white space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-sky-900/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Chế Độ Điện Thoại & Không Cần Wi-Fi
              </h3>
              <p className="text-xs text-sky-300">
                Tối ưu hiển thị mọi dòng máy & tự động lưu bài làm ngoại tuyến
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#0b1739] text-sky-300 hover:text-white border border-sky-800 flex items-center justify-center shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trạng thái kết nối & Bộ nhớ đệm Offline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {isOnline ? 'Đang Có Kết Nối Mạng' : 'Đang Chạy Không Wi-Fi'}
              </div>
              <div className="text-[11px] opacity-90">
                {isOnline
                  ? 'Đã đồng bộ toàn bộ công thức & hình vẽ'
                  : 'Vẫn làm bài, chấm điểm & xem giải bình thường'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border bg-cyan-950/40 border-cyan-500/40 text-cyan-200 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {swReady ? 'Đã Lưu Offline 100%' : 'Tự Động Lưu Tiến Độ'}
              </div>
              <div className="text-[11px] opacity-90">
                Đề thi, công thức LaTeX, hình TikZ & đáp án được lưu trong máy
              </div>
            </div>
          </div>
        </div>

        {/* Tính năng bảo vệ bài thi trên điện thoại */}
        <div className="p-4 rounded-2xl bg-[#0b1739] border border-sky-800/80 space-y-2.5">
          <div className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Cam kết hoạt động mượt mà trên mọi điện thoại:</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Làm bài không cần Wi-Fi / 4G:</strong> Toàn bộ đề thi, font chữ{' '}
                <em>Times New Roman</em>, công thức Toán chuẩn LaTeX và hình vẽ TikZ đều được tải
                sẵn vào bộ nhớ điện thoại.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Tự động lưu đáp án tức thì:</strong> Khi mất mạng hoặc lỡ tay tải lại trang
                trên điện thoại, toàn bộ đáp án học sinh đã chọn vẫn được giữ nguyên.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Giao diện câu hỏi to, rõ, vừa khít màn hình:</strong> Tối ưu cho mọi màn
                hình iPhone, Samsung, Xiaomi, OPPO, Vivo; có thanh chọn câu hỏi nhanh ở đáy màn hình.
              </span>
            </li>
          </ul>
        </div>

        {/* Hướng dẫn cài đặt App ra màn hình chính điện thoại */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Ứng dụng đã được cài đặt lên màn hình chính thiết bị của bạn!</span>
          </div>
        ) : hasNativePrompt ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={async () => {
                const ok = await onPromptInstall();
                if (ok) onClose();
              }}
              className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-[#040817] font-black text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <Download className="w-5 h-5" />
              <span>Cài Đặt Ứng Dụng Vào Điện Thoại (Dùng Offline)</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#050c1d] border border-sky-900 space-y-2.5 text-xs sm:text-sm">
            <div className="font-bold text-amber-300 flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span>
                {isIOS
                  ? 'Cách thêm App vào Màn hình chính iPhone / iPad:'
                  : 'Cách thêm App vào Màn hình chính Điện thoại:'}
              </span>
            </div>
            {isIOS ? (
              <ol className="space-y-2 text-sky-200 list-decimal list-inside">
                <li>
                  Nhấn vào nút <strong>Chia sẻ (Share)</strong>{' '}
                  <Share className="w-3.5 h-3.5 inline text-cyan-400 mx-0.5" /> ở thanh công cụ
                  trình duyệt Safari.
                </li>
                <li>
                  Cuộn xuống và chọn{' '}
                  <strong>
                    &ldquo;Thêm vào MH chính&rdquo; (Add to Home Screen){' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-cyan-400 mx-0.5" />
                  </strong>
                  .
                </li>
                <li>
                  Nhấn <strong>Thêm (Add)</strong> để mở app toàn màn hình bất cứ lúc nào kể cả khi
                  không có Wi-Fi.
                </li>
              </ol>
            ) : (
              <ol className="space-y-1.5 text-sky-200 list-decimal list-inside">
                <li>
                  Mở menu trình duyệt Chrome / Cốc Cốc (biểu tượng <strong>⋮</strong> ở góc trên).
                </li>
                <li>
                  Chọn <strong>&ldquo;Cài đặt ứng dụng&rdquo;</strong> hoặc{' '}
                  <strong>&ldquo;Thêm vào màn hình chính&rdquo;</strong>.
                </li>
              </ol>
            )}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#040817] font-black text-sm transition-colors"
          >
            Đã hiểu & Tiếp tục làm bài
          </button>
        </div>
      </div>
    </div>
  );
};
