import React from 'react';
import { TrueFalseQuestion } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { TikzFigure } from './TikzFigure';
import {
  Check,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { playAnswerFeedbackSound } from '../utils/audio';

interface Part2TrueFalseProps {
  questions: TrueFalseQuestion[];
  answers: Record<string, Record<'a' | 'b' | 'c' | 'd', boolean | null>>;
  onSelectStatement: (
    questionId: string,
    statementLabel: 'a' | 'b' | 'c' | 'd',
    value: boolean
  ) => void;
  isSubmitted: boolean;
  examMode: 'exam' | 'practice';
  bookmarkedQuestions: Set<string>;
  onToggleBookmark: (qId: string) => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  totalQuestions?: number;
}

export const Part2TrueFalse: React.FC<Part2TrueFalseProps> = ({
  questions,
  answers,
  onSelectStatement,
  isSubmitted,
  examMode,
  fontSize,
  totalQuestions = 22,
}) => {
  // Cỡ chữ đề bài to rõ trên mọi điện thoại
  const promptTextSizeClass =
    fontSize === 'xlarge'
      ? 'text-[22px] sm:text-3xl md:text-3xl'
      : fontSize === 'large'
      ? 'text-[20px] sm:text-2xl md:text-2xl'
      : 'text-[18px] sm:text-xl md:text-xl';

  // Cỡ chữ nội dung mệnh đề a, b, c, d to rõ
  const statementTextSizeClass =
    fontSize === 'xlarge'
      ? 'text-[20px] sm:text-2xl'
      : fontSize === 'large'
      ? 'text-[18px] sm:text-xl'
      : 'text-[17px] sm:text-lg';

  const handleSelect = (
    qId: string,
    st: { label: 'a' | 'b' | 'c' | 'd'; isCorrect: boolean },
    val: boolean
  ) => {
    if (isSubmitted) return;

    // Phát âm thanh khi làm đúng và khi làm sai
    const isCorrect = val === st.isCorrect;
    playAnswerFeedbackSound(isCorrect);

    onSelectStatement(qId, st.label, val);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {questions.map((q, idx) => {
        const currentAns = answers[q.id] || { a: null, b: null, c: null, d: null };
        const showSolution = isSubmitted || examMode === 'practice';

        // Count correct statements
        let correctCount = 0;
        let answeredCount = 0;
        q.statements.forEach((st) => {
          if (currentAns[st.label] !== null) {
            answeredCount++;
            if (currentAns[st.label] === st.isCorrect) {
              correctCount++;
            }
          }
        });

        return (
          <div key={q.id} id={`q-part2-${idx}`} className="space-y-3 transition-all scroll-mt-20">
            {/* Top Question Card (Màn hình câu hỏi màu xanh đậm & chữ trắng to rõ) */}
            <div className="rounded-2xl border border-sky-900/60 bg-[#071126] p-3.5 sm:p-6 md:p-7 shadow-2xl">
              {/* Header with Pills */}
              <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-sky-950/80 flex-wrap">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {/* Pill 1: Câu ... / total */}
                  <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border-2 border-amber-400 bg-amber-500/15 text-amber-300 font-extrabold text-xs sm:text-base tracking-tight shadow-md">
                    <span>
                      Câu {q.number} / {totalQuestions}
                    </span>
                  </div>

                  {/* Pill 2: PHẦN II: Trắc nghiệm đúng sai */}
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full border-2 border-cyan-400 bg-cyan-500/15 text-cyan-300 font-extrabold text-[11px] sm:text-sm uppercase tracking-wide shadow-md">
                    <span>PHẦN II: Đúng / Sai</span>
                  </div>

                  {answeredCount > 0 && (
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        showSolution
                          ? correctCount === 4
                            ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-300'
                            : 'border-amber-400/80 bg-amber-500/20 text-amber-300'
                          : 'border-cyan-400/80 bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      <span>
                        {showSolution
                          ? `Đúng ${correctCount}/4 ý`
                          : `Đã làm ${answeredCount}/4 ý`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Problem Prompt (Chữ trắng to rõ nổi bật, font Times New Roman) */}
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

            {/* Statements List Container (Khung chứa các mệnh đề nền xanh sẫm) */}
            <div className="rounded-2xl border border-sky-900/60 bg-[#071026] p-3 sm:p-6 shadow-2xl space-y-4">
              <div className="space-y-3">
                {q.statements.map((st) => {
                  const userChoice = currentAns[st.label];
                  const hasAnswered = userChoice !== null;
                  const isStatementCorrect = hasAnswered && userChoice === st.isCorrect;

                  let borderState =
                    'border-sky-800/60 bg-[#0b1739] hover:bg-[#112353] hover:border-sky-400';
                  if (showSolution && hasAnswered) {
                    borderState = isStatementCorrect
                      ? 'border-emerald-500/80 bg-emerald-950/40 ring-1 ring-emerald-500/40'
                      : 'border-rose-500/80 bg-rose-950/40 ring-1 ring-rose-500/40';
                  } else if (hasAnswered) {
                    borderState = 'border-cyan-500/70 bg-[#0d2250] ring-1 ring-cyan-500/30';
                  }

                  return (
                    <div
                      key={st.label}
                      className={`p-3.5 sm:p-5 rounded-2xl border transition-all ${borderState} flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4`}
                    >
                      {/* Statement badge & Content */}
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        {/* Huy hiệu chữ cái a), b), c), d) màu vàng hổ phách to rõ */}
                        <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#f59e0b] text-[#0f172a] font-black font-times text-base sm:text-lg flex items-center justify-center shrink-0 border-2 border-amber-300 shadow-md">
                          {st.label})
                        </span>

                        <div
                          className={`flex-1 min-w-0 break-words overflow-visible py-0.5 text-white font-bold font-times leading-relaxed ${statementTextSizeClass} [&_.katex]:text-white [&_.katex]:text-[1.1em]`}
                        >
                          <MathRenderer content={st.statement} />
                        </div>
                      </div>

                      {/* True / False Buttons: Full-width 2-col grid on mobile for easy thumb tapping */}
                      <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 shrink-0 w-full md:w-auto">
                        {/* Button ĐÚNG */}
                        <button
                          type="button"
                          disabled={isSubmitted}
                          onClick={() => handleSelect(q.id, st, true)}
                          className={`min-h-[46px] flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-black text-base transition-all ${
                            userChoice === true
                              ? showSolution
                                ? st.isCorrect
                                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-lg shadow-emerald-950/50'
                                  : 'bg-rose-500 text-white ring-2 ring-rose-300 shadow-lg shadow-rose-950/50'
                                : 'bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-300'
                              : 'bg-sky-950/80 text-sky-200 border border-sky-800 hover:border-emerald-400 hover:text-white hover:bg-emerald-950/60'
                          } ${
                            !isSubmitted
                              ? 'cursor-pointer active:scale-95'
                              : 'cursor-default'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Đúng</span>
                        </button>

                        {/* Button SAI */}
                        <button
                          type="button"
                          disabled={isSubmitted}
                          onClick={() => handleSelect(q.id, st, false)}
                          className={`min-h-[46px] flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-black text-base transition-all ${
                            userChoice === false
                              ? showSolution
                                ? !st.isCorrect
                                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-lg shadow-emerald-950/50'
                                  : 'bg-rose-500 text-white ring-2 ring-rose-300 shadow-lg shadow-rose-950/50'
                                : 'bg-rose-500 text-white shadow-lg ring-2 ring-rose-300'
                              : 'bg-sky-950/80 text-sky-200 border border-sky-800 hover:border-rose-400 hover:text-white hover:bg-rose-950/60'
                          } ${
                            !isSubmitted
                              ? 'cursor-pointer active:scale-95'
                              : 'cursor-default'
                          }`}
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                          <span>Sai</span>
                        </button>

                        {/* Feedback Icon */}
                        {showSolution && hasAnswered && (
                          <div className="col-span-2 sm:col-span-1 flex justify-end sm:ml-1">
                            {isStatementCorrect ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            ) : (
                              <XCircle className="w-6 h-6 text-rose-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanations for each statement when submitted */}
              {showSolution && (
                <div className="mt-5 pt-4 border-t border-sky-900/60 space-y-2.5">
                  <div className="p-4 rounded-xl bg-sky-950/70 border border-sky-800/80 text-sky-200 text-sm sm:text-base">
                    <div className="font-bold text-cyan-300 mb-2 flex items-center gap-2 text-base sm:text-lg">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                      <span>Hướng dẫn giải chi tiết từng ý:</span>
                    </div>
                    <div className="space-y-2">
                      {q.statements.map((st) => (
                        <div
                          key={st.label}
                          className="flex items-start gap-2.5 p-2 rounded-lg bg-[#071126]/60 border border-sky-900/40"
                        >
                          <span
                            className={`font-black px-2 py-0.5 rounded text-xs sm:text-sm uppercase ${
                              st.isCorrect
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            Ý {st.label}: {st.isCorrect ? 'ĐÚNG' : 'SAI'}
                          </span>
                          <div className="flex-1 font-times text-slate-200 leading-relaxed [&_.katex]:text-cyan-200 [&_.katex]:text-[1.12em]">
                            <MathRenderer content={st.explanation} />
                          </div>
                        </div>
                      ))}
                    </div>
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
