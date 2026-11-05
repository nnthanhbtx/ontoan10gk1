import React, { useState } from 'react';
import { ShortAnswerQuestion } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { TikzFigure } from './TikzFigure';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import {
  playAnswerFeedbackSound,
  playClickSound,
} from '../utils/audio';

interface Part3ShortAnswerProps {
  questions: ShortAnswerQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, val: string) => void;
  isSubmitted: boolean;
  examMode: 'exam' | 'practice';
  bookmarkedQuestions: Set<string>;
  onToggleBookmark: (qId: string) => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  totalQuestions?: number;
}

export const Part3ShortAnswer: React.FC<Part3ShortAnswerProps> = ({
  questions,
  answers,
  onAnswerChange,
  isSubmitted,
  examMode,
  fontSize,
  totalQuestions = 22,
}) => {
  const [checkedStatus, setCheckedStatus] = useState<Record<string, boolean>>({});

  // Cỡ chữ đề bài to rõ trên mọi điện thoại
  const promptTextSizeClass =
    fontSize === 'xlarge'
      ? 'text-[22px] sm:text-3xl md:text-3xl'
      : fontSize === 'large'
      ? 'text-[20px] sm:text-2xl md:text-2xl'
      : 'text-[18px] sm:text-xl md:text-xl';

  const parseMathNumber = (str: string): number => {
    const s = str.trim().replace(/\s+/g, '').replace(',', '.');
    if (/^-?\d+(\.\d+)?$/.test(s)) {
      return parseFloat(s);
    }
    const fracMatch = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
    if (fracMatch) {
      const denom = parseFloat(fracMatch[2]);
      if (denom !== 0) return parseFloat(fracMatch[1]) / denom;
    }
    return NaN;
  };

  const checkIsCorrect = (q: ShortAnswerQuestion, val: string): boolean => {
    if (!val || val.trim() === '') return false;
    const raw = val.trim().toLowerCase().replace(',', '.');
    const numUser = parseMathNumber(raw);
    const answersList = q.acceptableAnswers || [];

    return answersList.some((ans: string) => {
      const formattedAns = ans.trim().toLowerCase().replace(',', '.');
      if (raw === formattedAns) return true;
      const numAns = parseMathNumber(formattedAns);
      if (!isNaN(numUser) && !isNaN(numAns)) {
        return Math.abs(numUser - numAns) <= 0.015;
      }
      return false;
    });
  };

  // Kiểm tra đáp số và phát âm thanh đúng/sai
  const handleCheckAnswer = (q: ShortAnswerQuestion) => {
    const userVal = answers[q.id] || '';
    if (!userVal.trim()) return;

    const isCorrect = checkIsCorrect(q, userVal);
    setCheckedStatus((prev) => ({ ...prev, [q.id]: isCorrect }));
    playAnswerFeedbackSound(isCorrect);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {questions.map((q, idx) => {
        const userVal = answers[q.id] || '';
        const isCorrect = checkIsCorrect(q, userVal);
        const hasChecked = checkedStatus[q.id] !== undefined;
        const showSolution = isSubmitted || examMode === 'practice' || hasChecked;

        return (
          <div key={q.id} id={`q-part3-${idx}`} className="space-y-3 transition-all scroll-mt-20">
            {/* Top Question Card (Màu xanh đậm, chữ trắng to nổi bật) */}
            <div className="rounded-2xl border border-sky-900/60 bg-[#071126] p-3.5 sm:p-6 md:p-7 shadow-2xl">
              {/* Header with Pills */}
              <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-sky-950/80 flex-wrap">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {/* Pill 1 */}
                  <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border-2 border-amber-400 bg-amber-500/15 text-amber-300 font-extrabold text-xs sm:text-base tracking-tight shadow-md">
                    <span>
                      Câu {q.number} / {totalQuestions}
                    </span>
                  </div>

                  {/* Pill 2 */}
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full border-2 border-cyan-400 bg-cyan-500/15 text-cyan-300 font-extrabold text-[11px] sm:text-sm uppercase tracking-wide shadow-md">
                    <span>PHẦN III: Trả lời ngắn</span>
                  </div>

                  {userVal && (
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        showSolution
                          ? isCorrect
                            ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-300'
                            : 'border-rose-400/80 bg-rose-500/20 text-rose-300'
                          : 'border-cyan-400/80 bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {showSolution ? (
                        isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đáp số đúng</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Chưa chính xác</span>
                          </>
                        )
                      ) : (
                        <span>Đã nhập: {userVal}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Prompt (Chữ trắng to rõ ràng, font Times New Roman chuẩn đề thi) */}
              <div
                className={`py-3.5 sm:py-5 text-white font-bold font-times leading-relaxed tracking-wide ${promptTextSizeClass} [&_.katex]:text-white [&_.katex]:font-semibold [&_.katex]:text-[1.1em]`}
              >
                <MathRenderer content={q.prompt} />
              </div>

              {/* Hình vẽ chuẩn TikZ nếu có */}
              {(q.tikzType || q.tikzCode) && (
                <TikzFigure
                  type={q.tikzType as any}
                  tikzCode={q.tikzCode}
                  caption={`Hình vẽ minh hoạ Câu ${q.number}`}
                />
              )}
            </div>

            {/* Answer Input Area (Khung nhập đáp số nền xanh sẫm với chữ lớn) */}
            <div className="rounded-2xl border border-sky-900/60 bg-[#071026] p-3.5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
                <div className="relative flex-1 sm:max-w-md">
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={isSubmitted}
                    value={userVal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCheckAnswer(q);
                      }
                    }}
                    onChange={(e) => {
                      playClickSound();
                      onAnswerChange(q.id, e.target.value);
                      if (checkedStatus[q.id] !== undefined) {
                        setCheckedStatus((prev) => {
                          const next = { ...prev };
                          delete next[q.id];
                          return next;
                        });
                      }
                    }}
                    placeholder="Nhập kết quả số (VD: -3, 2.5)..."
                    className={`w-full min-h-[52px] px-4 sm:px-5 py-3 rounded-2xl border text-lg sm:text-2xl font-mono font-black tracking-wider transition-all focus:outline-none ${
                      showSolution && userVal
                        ? isCorrect
                          ? 'bg-emerald-950/70 border-2 border-emerald-400 text-emerald-200'
                          : 'bg-rose-950/70 border-2 border-rose-400 text-rose-200'
                        : 'bg-[#0b1739] border-sky-700/60 text-white placeholder-sky-400/50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30'
                    }`}
                  />
                  {showSolution && userVal && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Nút Kiểm Tra Đáp Số (kèm âm thanh đúng/sai) */}
                {!isSubmitted && (
                  <button
                    type="button"
                    onClick={() => handleCheckAnswer(q)}
                    disabled={!userVal.trim()}
                    className="min-h-[48px] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm sm:text-base transition-all shadow-lg shadow-cyan-950/60 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Kiểm tra đáp số và nghe âm thanh Đúng/Sai"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>Kiểm tra đáp số</span>
                  </button>
                )}

              </div>

              {/* Lời giải chi tiết khi nộp bài hoặc kiểm tra */}
              {showSolution && (
                <div className="mt-5 pt-4 border-t border-sky-900/60 space-y-2">
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-sm sm:text-base">
                    <div className="font-bold text-emerald-300 mb-1.5 flex items-center gap-2 text-base sm:text-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>
                        Đáp án chuẩn: {q.acceptableAnswers.join(' hoặc ')}
                      </span>
                    </div>
                    {q.explanation && (
                      <div className="leading-relaxed font-times text-slate-200 [&_.katex]:text-emerald-200 [&_.katex]:text-[1.12em]">
                        <MathRenderer content={q.explanation} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
