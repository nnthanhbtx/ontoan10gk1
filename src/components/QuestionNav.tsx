import React from 'react';
import { ExamSet, StudentAnswers, ExamPart } from '../types/exam';
import { UserCheck } from 'lucide-react';

interface QuestionNavProps {
  exam: ExamSet;
  answers: StudentAnswers;
  currentSection: ExamPart;
  onNavigate: (part: ExamPart, questionIndex: number) => void;
  bookmarkedQuestions: Set<string>;
  onToggleBookmark: (qId: string) => void;
  isSubmitted: boolean;
  interactedPart4?: Set<string>;
  studentName?: string;
  studentClass?: string;
  onEditStudentInfo?: () => void;
}

export const QuestionNav: React.FC<QuestionNavProps> = ({
  exam,
  answers,
  onNavigate,
  bookmarkedQuestions,
  isSubmitted,
  interactedPart4,
  studentName,
  studentClass,
  onEditStudentInfo,
}) => {
  // Helper to check answer status
  const isPart1Answered = (id: string) => !!answers.part1[id];

  const getPart2AnsweredCount = (id: string) => {
    const qAns = answers.part2[id];
    if (!qAns) return 0;
    let count = 0;
    if (qAns.a !== null) count++;
    if (qAns.b !== null) count++;
    if (qAns.c !== null) count++;
    if (qAns.d !== null) count++;
    return count;
  };

  const isPart3Answered = (id: string) => {
    const val = answers.part3[id];
    return typeof val === 'string' && val.trim().length > 0;
  };

  const isPart4Answered = (id: string) => {
    if (interactedPart4) {
      return interactedPart4.has(id) || isSubmitted;
    }
    const steps = answers.part4[id];
    return Array.isArray(steps) && steps.length > 0;
  };

  // Total answered questions
  const totalP1 = Object.keys(answers.part1).length;
  const totalP2 = exam.part2.filter((q) => getPart2AnsweredCount(q.id) === 4).length;
  const totalP3 = Object.values(answers.part3).filter((v) => v.trim().length > 0).length;
  const totalP4 = (exam.part4 || []).filter((q) => isPart4Answered(q.id)).length;
  const totalCompleted = totalP1 + totalP2 + totalP3 + totalP4;
  const totalQuestions =
    exam.part1.length + exam.part2.length + exam.part3.length + (exam.part4?.length || 0);

  return (
    <div className="bg-[#071126] rounded-2xl border border-sky-900/60 shadow-xl p-4 space-y-4 text-white">
      {/* Thí sinh info bar trên Phiếu trả lời */}
      <div className="p-2.5 rounded-xl bg-[#0b1739] border border-sky-800/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {studentName && studentName.trim() ? studentName.trim() : 'Chưa điền họ tên'}
            </div>
            <div className="text-[11px] text-sky-300 truncate">
              Lớp:{' '}
              <span className="font-semibold text-amber-300">
                {studentClass && studentClass.trim() ? studentClass.trim() : '---'}
              </span>
            </div>
          </div>
        </div>
        {onEditStudentInfo && (
          <button
            type="button"
            onClick={onEditStudentInfo}
            className="px-2 py-1 rounded-lg bg-[#071126] hover:bg-sky-900 text-cyan-300 border border-sky-800 text-[11px] font-semibold shrink-0 transition-colors"
          >
            {studentName && studentName.trim() ? 'Sửa' : 'Điền tên'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between pb-3 border-b border-sky-950/80">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Phiếu Trả Lời</h3>
          <p className="text-xs text-sky-300">
            Đã làm <span className="font-bold text-amber-300 tabular-nums">{totalCompleted}</span>/
            {totalQuestions} câu
          </p>
        </div>
        <div className="w-16 h-2 rounded-full bg-sky-950 overflow-hidden border border-sky-800/60">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 rounded-full transition-all"
            style={{
              width: `${
                totalQuestions > 0 ? Math.min(100, (totalCompleted / totalQuestions) * 100) : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Phần I: 12 câu */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
          <span>Phần I: Trắc nghiệm</span>
          <span className="text-slate-400 font-medium tabular-nums">
            {totalP1}/{exam.part1.length}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-2 sm:gap-1.5">
          {exam.part1.map((q, idx) => {
            const answered = isPart1Answered(q.id);
            const flagged = bookmarkedQuestions.has(q.id);
            return (
              <button
                key={q.id}
                onClick={() => onNavigate('part1', idx)}
                className={`relative h-10 sm:h-8 rounded-xl text-sm sm:text-xs font-bold transition-all flex items-center justify-center active:scale-95 ${
                  answered
                    ? 'bg-cyan-500 text-[#071126] font-black shadow-md hover:bg-cyan-400'
                    : 'bg-[#0b1739] text-sky-200 hover:bg-[#122557] border border-sky-800/60'
                }`}
                title={`Câu ${idx + 1}: ${
                  answered ? `Đã chọn ${answers.part1[q.id]}` : 'Chưa làm'
                }`}
              >
                <span>{idx + 1}</span>
                {flagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-[#071126]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phần II: 2 câu Đúng/Sai */}
      <div className="space-y-2 pt-2 border-t border-sky-950/80">
        <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
          <span>Phần II: Đúng / Sai</span>
          <span className="text-slate-400 font-medium tabular-nums">
            {totalP2}/{exam.part2.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-1.5">
          {exam.part2.map((q, idx) => {
            const count = getPart2AnsweredCount(q.id);
            const isFull = count === 4;
            const flagged = bookmarkedQuestions.has(q.id);
            return (
              <button
                key={q.id}
                onClick={() => onNavigate('part2', idx)}
                className={`relative h-10 sm:h-8 rounded-xl text-sm sm:text-xs font-bold transition-all flex flex-col items-center justify-center active:scale-95 ${
                  isFull
                    ? 'bg-cyan-500 text-[#071126] font-black shadow-md hover:bg-cyan-400'
                    : count > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 hover:bg-amber-500/30'
                    : 'bg-[#0b1739] text-sky-200 hover:bg-[#122557] border border-sky-800/60'
                }`}
                title={`Câu ${idx + 1} (Phần II): ${count}/4 ý đã chọn`}
              >
                <span>{idx + 1}</span>
                {flagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-[#071126]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phần III: 4 câu Trả lời ngắn */}
      <div className="space-y-2 pt-2 border-t border-sky-950/80">
        <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
          <span>Phần III: Trả lời ngắn</span>
          <span className="text-slate-400 font-medium tabular-nums">
            {totalP3}/{exam.part3.length}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-1.5">
          {exam.part3.map((q, idx) => {
            const answered = isPart3Answered(q.id);
            const flagged = bookmarkedQuestions.has(q.id);
            return (
              <button
                key={q.id}
                onClick={() => onNavigate('part3', idx)}
                className={`relative h-10 sm:h-8 rounded-xl text-sm sm:text-xs font-bold transition-all flex items-center justify-center active:scale-95 ${
                  answered
                    ? 'bg-cyan-500 text-[#071126] font-black shadow-md hover:bg-cyan-400'
                    : 'bg-[#0b1739] text-sky-200 hover:bg-[#122557] border border-sky-800/60'
                }`}
                title={`Câu ${idx + 1} (Phần III): ${answered ? 'Đã nhập đáp số' : 'Chưa làm'}`}
              >
                <span>{idx + 1}</span>
                {flagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-[#071126]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phần IV: 4 câu Ghép dòng lời giải */}
      {exam.part4 && exam.part4.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-sky-950/80">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
            <span>Phần IV: Tự luận ghép bước</span>
            <span className="text-slate-400 font-medium tabular-nums">
              {totalP4}/{exam.part4.length}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-1.5">
            {exam.part4.map((q, idx) => {
              const answered = isPart4Answered(q.id);
              const flagged = bookmarkedQuestions.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => onNavigate('part4', idx)}
                  className={`relative h-10 sm:h-8 rounded-xl text-sm sm:text-xs font-bold transition-all flex flex-col items-center justify-center active:scale-95 ${
                    answered
                      ? 'bg-cyan-500 text-[#071126] font-black shadow-md hover:bg-cyan-400'
                      : 'bg-[#0b1739] text-sky-200 hover:bg-[#122557] border border-sky-800/60'
                  }`}
                  title={`Câu ${idx + 1} (Phần IV): ${
                    answered ? 'Đã sắp xếp lời giải' : 'Chưa sắp xếp'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {flagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-[#071126]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chú thích màu sắc */}
      <div className="pt-3 border-t border-sky-950/80 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-cyan-500" />
          <span>Đã hoàn thành</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-400" />
          <span>Làm một phần</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#0b1739] border border-sky-800" />
          <span>Chưa làm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Đánh dấu</span>
        </div>
      </div>
    </div>
  );
};
