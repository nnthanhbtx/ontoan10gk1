import React from 'react';
import { MultipleChoiceQuestion } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { TikzFigure } from './TikzFigure';
import { CheckCircle2, XCircle } from 'lucide-react';
import { playAnswerFeedbackSound } from '../utils/audio';

interface Part1MultipleChoiceProps {
  questions: MultipleChoiceQuestion[];
  selectedAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  onSelectAnswer: (questionId: string, answer: 'A' | 'B' | 'C' | 'D') => void;
  isSubmitted: boolean;
  examMode: 'exam' | 'practice';
  bookmarkedQuestions: Set<string>;
  onToggleBookmark: (qId: string) => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  totalQuestions?: number;
}

export const Part1MultipleChoice: React.FC<Part1MultipleChoiceProps> = ({
  questions,
  selectedAnswers,
  onSelectAnswer,
  isSubmitted,
  examMode,
  fontSize,
  totalQuestions = 22,
}) => {
  // Cỡ chữ lớn, rõ ràng hơn hẳn cho đề bài trên mọi màn hình điện thoại
  const promptTextSizeClass =
    fontSize === 'xlarge'
      ? 'text-[22px] sm:text-3xl md:text-3xl'
      : fontSize === 'large'
      ? 'text-[20px] sm:text-2xl md:text-2xl'
      : 'text-[18px] sm:text-xl md:text-xl';

  // Cỡ chữ lớn, rõ cho nội dung các phương án A, B, C, D trên điện thoại
  const optionTextSizeClass =
    fontSize === 'xlarge'
      ? 'text-[20px] sm:text-2xl'
      : fontSize === 'large'
      ? 'text-[18px] sm:text-xl'
      : 'text-[17px] sm:text-lg';

  const handleOptionClick = (q: MultipleChoiceQuestion, optKey: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return;

    // Phát âm thanh khi làm đúng và khi làm sai
    const isCorrect = optKey === q.correctAnswer;
    playAnswerFeedbackSound(isCorrect);

    onSelectAnswer(q.id, optKey);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {questions.map((q, idx) => {
        const currentAnswer = selectedAnswers[q.id];
        const showSolution = isSubmitted || examMode === 'practice';
        const isCorrect = currentAnswer === q.correctAnswer;

        return (
          <div
            key={q.id}
            id={`q-part1-${idx}`}
            className="space-y-3 transition-all scroll-mt-20"
          >
            {/* Top Question Card (Khung câu hỏi nền xanh đậm, chữ trắng lớn nổi bật, vừa khít màn hình ĐT) */}
            <div
              className={`rounded-2xl border transition-all p-3.5 sm:p-6 md:p-7 shadow-2xl ${
                showSolution
                  ? isCorrect
                    ? 'bg-[#08152e] border-emerald-500/70 ring-1 ring-emerald-500/30'
                    : currentAnswer
                    ? 'bg-[#130d1d] border-rose-500/70 ring-1 ring-rose-500/30'
                    : 'bg-[#071126] border-sky-900/60'
                  : currentAnswer
                  ? 'bg-[#091535] border-cyan-500/60 ring-1 ring-cyan-500/20'
                  : 'bg-[#071126] border-sky-900/60 hover:border-sky-700/80'
              }`}
            >
              {/* Question Header: Pills */}
              <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-sky-950/80 flex-wrap">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {/* Pill 1: Câu ... / total */}
                  <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border-2 border-amber-400 bg-amber-500/15 text-amber-300 font-extrabold text-xs sm:text-base tracking-tight shadow-md">
                    <span>
                      Câu {q.number} / {totalQuestions}
                    </span>
                  </div>

                  {/* Pill 2: PHẦN I: Trắc nghiệm... */}
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full border-2 border-cyan-400 bg-cyan-500/15 text-cyan-300 font-extrabold text-[11px] sm:text-sm uppercase tracking-wide shadow-md">
                    <span className="sm:hidden">PHẦN I: Trắc nghiệm</span>
                    <span className="hidden sm:inline">PHẦN I: Trắc nghiệm nhiều phương án</span>
                  </div>

                  {/* Phản hồi trạng thái Đúng/Sai nếu đã làm */}
                  {currentAnswer && (
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                        isCorrect
                          ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-300'
                          : showSolution
                          ? 'border-rose-400/80 bg-rose-500/20 text-rose-300'
                          : 'border-cyan-400/80 bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {showSolution ? (
                        isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Làm đúng</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Chưa đúng</span>
                          </>
                        )
                      ) : (
                        <span>Đã chọn ({currentAnswer})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Question Prompt (Chữ trắng to rõ ràng, font Times New Roman chuẩn đề thi) */}
              <div
                className={`py-3.5 sm:py-5 text-white font-bold font-times leading-relaxed tracking-wide ${promptTextSizeClass} [&_.katex]:text-white [&_.katex]:font-semibold [&_.katex]:text-[1.1em]`}
              >
                <MathRenderer content={q.prompt} />
              </div>

              {/* Hình vẽ chuẩn TikZ (nếu câu hỏi có hình minh hoạ) */}
              {(q.tikzType || q.tikzCode) && (
                <TikzFigure
                  type={q.tikzType as any}
                  tikzCode={q.tikzCode}
                  caption={`Hình vẽ minh hoạ Câu ${q.number}`}
                />
              )}
            </div>

            {/* Bottom Options Container */}
            <div className="rounded-2xl border border-sky-900/60 bg-[#071026] p-3 sm:p-6 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                {q.options.map((opt) => {
                  const isSelected = currentAnswer === opt.key;
                  const isOptionCorrect = opt.key === q.correctAnswer;

                  // Khung lựa chọn
                  let containerStyle =
                    'border-sky-800/60 bg-[#0b1739] hover:bg-[#112353] hover:border-sky-400 hover:shadow-xl hover:shadow-sky-950/60';
                  // Huy hiệu chữ cái A, B, C, D (Màu vàng rực rỡ, kích thước lớn)
                  let badgeStyle =
                    'bg-[#f59e0b] text-[#0f172a] shadow-lg border-amber-300';
                  // Nội dung chữ trắng to nổi bật
                  let contentTextStyle =
                    'text-white font-bold font-times tracking-wide [&_.katex]:text-white [&_.katex]:text-[1.1em]';

                  if (showSolution) {
                    if (isOptionCorrect) {
                      containerStyle =
                        'border-2 border-emerald-400 bg-emerald-950/70 ring-2 ring-emerald-500/40 shadow-emerald-950/60';
                      badgeStyle = 'bg-emerald-500 text-white border-emerald-300';
                      contentTextStyle = 'text-emerald-200 font-extrabold font-times [&_.katex]:text-emerald-200 [&_.katex]:text-[1.1em]';
                    } else if (isSelected) {
                      containerStyle =
                        'border-2 border-rose-500 bg-rose-950/70 ring-2 ring-rose-500/40 shadow-rose-950/60';
                      badgeStyle = 'bg-rose-500 text-white border-rose-300';
                      contentTextStyle = 'text-rose-200 font-extrabold font-times [&_.katex]:text-rose-200 [&_.katex]:text-[1.1em]';
                    } else {
                      containerStyle = 'border-sky-950 bg-[#071126]/60 opacity-60';
                      badgeStyle = 'bg-slate-700 text-slate-300 border-slate-600';
                      contentTextStyle = 'text-slate-400 font-medium font-times [&_.katex]:text-slate-400 [&_.katex]:text-[1.08em]';
                    }
                  } else if (isSelected) {
                    containerStyle =
                      'border-2 border-amber-400 bg-[#0f2358] shadow-xl shadow-amber-950/50 ring-2 ring-amber-400/50';
                    badgeStyle =
                      'bg-[#f59e0b] text-[#0f172a] ring-2 ring-white/90 scale-105';
                    contentTextStyle =
                      'text-amber-200 font-extrabold font-times [&_.katex]:text-amber-200 [&_.katex]:text-[1.1em]';
                  }

                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleOptionClick(q, opt.key)}
                      disabled={isSubmitted}
                      className={`flex items-center gap-3 sm:gap-4 min-h-[56px] p-3.5 sm:p-5 rounded-2xl border text-left transition-all min-w-0 w-full ${containerStyle} ${
                        !isSubmitted
                          ? 'cursor-pointer active:scale-[0.98]'
                          : 'cursor-default'
                      }`}
                    >
                      {/* Huy hiệu A, B, C, D */}
                      <span
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full font-black font-times text-lg sm:text-xl flex items-center justify-center shrink-0 border-2 transition-all ${badgeStyle}`}
                      >
                        {opt.key}
                      </span>

                      {/* Nội dung phương án */}
                      <div
                        className={`flex-1 min-w-0 break-words leading-relaxed overflow-visible py-0.5 ${optionTextSizeClass} ${contentTextStyle}`}
                      >
                        <MathRenderer content={opt.content} />
                      </div>

                      {showSolution && isOptionCorrect && (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 ml-1" />
                      )}
                      {showSolution && isSelected && !isOptionCorrect && (
                        <XCircle className="w-6 h-6 text-rose-400 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Lời giải chi tiết khi nộp bài */}
              {showSolution && (
                <div className="mt-5 pt-4 border-t border-sky-900/60 space-y-2">
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-sm sm:text-base">
                    <div className="font-bold text-emerald-300 mb-1.5 flex items-center gap-2 text-base sm:text-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Hướng dẫn giải chi tiết (Đáp án đúng: {q.correctAnswer}):</span>
                    </div>
                    <div className="leading-relaxed font-times text-slate-200 [&_.katex]:text-emerald-200 [&_.katex]:text-[1.12em]">
                      <MathRenderer content={q.explanation} />
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
