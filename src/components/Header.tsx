import React, { useState } from 'react';
import {
  RotateCcw,
  Send,
  Sparkles,
  FileText,
  Play,
  Volume2,
  VolumeX,
  Trophy,
  WifiOff,
  Smartphone,
  FileSpreadsheet,
} from 'lucide-react';
import { ExamSet } from '../types/exam';
import { isAudioEnabled, setAudioEnabled, playClickSound } from '../utils/audio';

interface HeaderProps {
  currentExam: ExamSet;
  allExams: ExamSet[];
  onSelectExam: (examId: string) => void;
  onDeleteExam?: (examId: string) => void;
  examMode: 'exam' | 'practice';
  onToggleExamMode: () => void;
  isStarted: boolean;
  onStartExam: () => void;
  isSubmitted: boolean;
  onSubmitExam: () => void;
  onResetExam: () => void;
  onOpenImportWord: () => void;
  onOpenLeaderboard: () => void;
  leaderboardCount: number;
  onOpenFormulaSheet?: () => void;
  onOpenScratchpad?: () => void;
  fontSize?: 'normal' | 'large' | 'xlarge';
  onChangeFontSize?: (size: 'normal' | 'large' | 'xlarge') => void;
  isOnline?: boolean;
  onOpenPWAInfo?: () => void;
  onOpenGoogleSheetSync?: () => void;
  isGoogleSheetConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentExam,
  allExams,
  onSelectExam,
  examMode,
  onToggleExamMode,
  isStarted,
  onStartExam,
  isSubmitted,
  onSubmitExam,
  onResetExam,
  onOpenImportWord,
  onOpenLeaderboard,
  leaderboardCount,
  isOnline = true,
  onOpenPWAInfo,
  onOpenGoogleSheetSync,
  isGoogleSheetConnected = false,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(() => isAudioEnabled());

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setAudioEnabled(next);
    if (next) playClickSound();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070f24]/95 backdrop-blur-md border-b border-sky-950 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 md:gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-950/60 border border-cyan-400/30">
            <span className="font-mono text-sm sm:text-base font-black">∑10</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Toán 10
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation & Quick Tools (Desktop) */}
        <nav className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-300">
          {/* Chọn Đề Thi */}
          <div className="flex items-center gap-1.5 bg-[#0b1739] px-3 py-1.5 rounded-xl border border-sky-800/60 shadow-xs">
            <span className="text-sky-300 font-medium">Đề:</span>
            {allExams.length > 0 ? (
              <select
                value={currentExam.id}
                onChange={(e) => onSelectExam(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer pr-1"
              >
                {allExams.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-[#071126] text-white">
                    {ex.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-slate-400 italic">Trống</span>
            )}
          </div>

          {/* Tạo Đề Từ File Word / PDF */}
          <button
            onClick={onOpenImportWord}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/20 hover:text-white transition-all whitespace-nowrap font-bold"
            title="Tạo đề bằng file Word (.docx) hoặc PDF (.pdf)"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tạo Đề Word / PDF</span>
          </button>

          {/* Bảng Xếp Hạng */}
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-400/50 hover:bg-amber-500/25 hover:text-white transition-all whitespace-nowrap font-bold shadow-xs"
            title="Xem Bảng Xếp Hạng Thành Tích Học Sinh"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Bảng Xếp Hạng</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400/25 text-amber-200 text-[10px] font-mono">
              {leaderboardCount}
            </span>
          </button>

          {/* Liên kết Google Sheet */}
          {onOpenGoogleSheetSync && (
            <button
              type="button"
              onClick={onOpenGoogleSheetSync}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold border shadow-xs ${
                isGoogleSheetConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/30 hover:text-white'
                  : 'bg-teal-500/15 text-teal-200 border-teal-400/40 hover:bg-teal-500/25 hover:text-white'
              }`}
              title="Hướng dẫn & Liên kết dữ liệu điểm thi với Google Sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Sheet</span>
              {isGoogleSheetConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          )}

          {/* Chế độ thi / Luyện tập */}
          <button
            onClick={onToggleExamMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold ${
              examMode === 'exam'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title="Nhấp để đổi giữa chế độ thi tính giờ hoặc ôn tập có giải thích tức thì"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{examMode === 'exam' ? 'Chế độ Thi Tính Giờ' : 'Chế độ Luyện Tập'}</span>
          </button>

          {/* Âm thanh khi làm bài */}
          <button
            onClick={handleToggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold border ${
              soundOn
                ? 'bg-sky-500/15 text-sky-200 border-sky-400/50 hover:bg-sky-500/25'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
            }`}
            title={soundOn ? 'Âm thanh: Đang bật (Bấm để tắt)' : 'Âm thanh: Đang tắt (Bấm để bật)'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-cyan-300" /> : <VolumeX className="w-3.5 h-3.5 text-rose-300" />}
            <span>{soundOn ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</span>
          </button>

          {/* Nút Offline / Điện thoại */}
          {onOpenPWAInfo && (
            <button
              type="button"
              onClick={onOpenPWAInfo}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold border ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/60 animate-pulse'
              }`}
              title="Chế độ Điện thoại & Hoạt động không cần Wi-Fi"
            >
              {isOnline ? (
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{isOnline ? 'App ĐT / Offline' : 'Đang Offline'}</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Action & Mobile Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick tools on small screens */}
          <div className="flex lg:hidden items-center gap-1">
            {allExams.length > 0 && (
              <div className="flex items-center gap-0.5 bg-[#0b1739] px-2 py-1.5 rounded-xl border border-sky-800/60 text-xs">
                <select
                  value={currentExam.id}
                  onChange={(e) => onSelectExam(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer max-w-[72px] sm:max-w-[110px] truncate"
                >
                  {allExams.map((ex) => (
                    <option key={ex.id} value={ex.id} className="bg-[#071126] text-white">
                      {ex.title.toLowerCase().startsWith('đề') ? ex.title : `Đề ${ex.title}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onOpenLeaderboard}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-300 hover:bg-amber-500/25"
              title="Bảng Xếp Hạng"
            >
              <Trophy className="w-4 h-4" />
            </button>

            {onOpenGoogleSheetSync && (
              <button
                type="button"
                onClick={onOpenGoogleSheetSync}
                className={`min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border ${
                  isGoogleSheetConnected
                    ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                    : 'bg-teal-950/80 border-teal-700/70 text-teal-300'
                }`}
                title="Liên kết dữ liệu Google Sheet"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleToggleSound}
              className={`min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border ${
                soundOn
                  ? 'bg-sky-950/80 border-sky-800 text-sky-300'
                  : 'bg-rose-950/80 border-rose-800 text-rose-300'
              }`}
              title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenImportWord}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl bg-[#0b1739] border border-sky-800/60 text-cyan-300 hover:bg-sky-900/60"
              title="Tạo đề từ Word / PDF"
            >
              <FileText className="w-4 h-4" />
            </button>

            {onOpenPWAInfo && (
              <button
                type="button"
                onClick={onOpenPWAInfo}
                className={`min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border ${
                  isOnline
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-500/25 border-amber-400 text-amber-300 animate-pulse'
                }`}
                title="Chế độ Điện thoại & Không cần Wi-Fi"
              >
                {isOnline ? <Smartphone className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </button>
            )}
          </div>

          {isSubmitted ? (
            <button
              onClick={onResetExam}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#0b1739] hover:bg-sky-900 border border-sky-800/80 rounded-xl transition-all whitespace-nowrap shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Làm Lại Đề</span>
              <span className="sm:hidden">Làm lại</span>
            </button>
          ) : !isStarted ? (
            <button
              onClick={onStartExam}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-950/60 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Bắt Đầu Làm Bài</span>
            </button>
          ) : (
            <button
              onClick={onSubmitExam}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-950/60 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp Bài Thi</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

