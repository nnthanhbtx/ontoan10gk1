import React, { useState, useMemo } from 'react';
import { ExamSet, LeaderboardEntry } from '../types/exam';
import {
  Trophy,
  X,
  Medal,
  Clock,
  Search,
  Trash2,
  RotateCcw,
  Plus,
  Sparkles,
  Users,
  Award,
  Filter,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

export const INITIAL_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [];

export const formatDuration = (seconds: number): string => {
  const safeSec = Math.max(1, Math.floor(seconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${mins}p ${secs < 10 ? '0' : ''}${secs}s`;
};

export const sortLeaderboardEntries = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
  return [...entries].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.durationSeconds - b.durationSeconds;
  });
};

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  allExams: ExamSet[];
  selectedExamId: string;
  defaultStudentName?: string;
  defaultStudentClass?: string;
  onAddManualEntry: (entry: Omit<LeaderboardEntry, 'id' | 'submittedAt'>) => void;
  onDeleteEntry: (id: string) => void;
  onResetDefault: () => void;
  onOpenGoogleSheetSync?: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  allExams,
  selectedExamId,
  defaultStudentName = '',
  defaultStudentClass = '10A1',
  onAddManualEntry,
  onDeleteEntry,
  onResetDefault,
  onOpenGoogleSheetSync,
}) => {
  const [examFilter, setExamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // Form states for adding manual entry
  const [newName, setNewName] = useState<string>(defaultStudentName);
  const [newClass, setNewClass] = useState<string>(defaultStudentClass || '10A1');
  const [newExamId, setNewExamId] = useState<string>(selectedExamId);
  const [newPart1, setNewPart1] = useState<string>('3.0');
  const [newPart2, setNewPart2] = useState<string>('2.0');
  const [newPart3, setNewPart3] = useState<string>('1.5');
  const [newPart4, setNewPart4] = useState<string>('2.5');
  const [newMinutes, setNewMinutes] = useState<string>('65');

  React.useEffect(() => {
    setNewExamId(selectedExamId);
  }, [selectedExamId]);

  React.useEffect(() => {
    if (defaultStudentName && !newName) setNewName(defaultStudentName);
    if (defaultStudentClass) setNewClass(defaultStudentClass);
  }, [defaultStudentName, defaultStudentClass]);

  const filteredEntries = useMemo(() => {
    const filtered = entries.filter((item) => {
      const matchesExam = examFilter === 'all' || item.examId === examFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.studentName.toLowerCase().includes(q) ||
        item.className.toLowerCase().includes(q) ||
        item.examTitle.toLowerCase().includes(q);
      return matchesExam && matchesQuery;
    });
    return sortLeaderboardEntries(filtered);
  }, [entries, examFilter, searchQuery]);

  if (!isOpen) return null;

  const top3 = filteredEntries.slice(0, 3);

  const avgScore =
    filteredEntries.length > 0
      ? Math.round(
          (filteredEntries.reduce((acc, cur) => acc + cur.totalScore, 0) /
            filteredEntries.length) *
            100
        ) / 100
      : 0;

  const highestScore =
    filteredEntries.length > 0 ? filteredEntries[0].totalScore : 0;

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const p1 = Math.min(3, Math.max(0, parseFloat(newPart1) || 0));
    const p2 = Math.min(4, Math.max(0, parseFloat(newPart2) || 0));
    const p3 = Math.min(3, Math.max(0, parseFloat(newPart3) || 0));
    const p4 = Math.min(4, Math.max(0, parseFloat(newPart4) || 0));
    const total = Math.min(10, Math.round((p1 + p2 + p3 + p4) * 100) / 100);
    const mins = Math.max(1, Math.min(180, parseInt(newMinutes, 10) || 60));

    let rank: LeaderboardEntry['rank'] = 'Cần cố gắng';
    if (total >= 9.0) rank = 'Xuất sắc';
    else if (total >= 8.0) rank = 'Giỏi';
    else if (total >= 6.5) rank = 'Khá';
    else if (total >= 5.0) rank = 'Trung bình';

    const examObj = allExams.find((ex) => ex.id === newExamId);

    onAddManualEntry({
      studentName: newName.trim(),
      className: newClass.trim() || '10A1',
      examId: newExamId,
      examTitle: examObj ? examObj.title : '02',
      totalScore: total,
      part1Score: p1,
      part2Score: p2,
      part3Score: p3,
      part4Score: p4,
      durationSeconds: mins * 60,
      rank,
      isCurrentUser: true,
    });

    setNewName('');
    setShowAddForm(false);
  };

  const getRankBadgeStyle = (rank: LeaderboardEntry['rank']) => {
    switch (rank) {
      case 'Xuất sắc':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/40';
      case 'Giỏi':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40';
      case 'Khá':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40';
      case 'Trung bình':
        return 'bg-sky-500/20 text-sky-300 border-sky-400/40';
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-400/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#071126] border border-sky-800/80 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 bg-gradient-to-r from-[#091534] via-[#0c1d47] to-[#091534] border-b border-sky-800/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[#040817] shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Bảng Xếp Hạng Thành Tích Toán 10
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <Sparkles className="w-3 h-3" />
                  Vinh danh Top Học Sinh
                </span>
              </div>
              <p className="text-xs text-sky-300 mt-0.5">
                Xếp hạng theo Tổng điểm cao nhất và Thời gian hoàn thành bài thi nhanh nhất
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenGoogleSheetSync && (
              <button
                type="button"
                onClick={onOpenGoogleSheetSync}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors"
                title="Hướng dẫn & Liên kết dữ liệu với Google Sheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Liên kết Google Sheet</span>
              </button>
            )}

            <button
              onClick={() => setShowAddForm((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi danh kết quả</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0b1739] hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-800 transition-colors"
              title="Đóng bảng xếp hạng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Manual Add Entry Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateEntry}
              className="p-4 sm:p-5 rounded-2xl bg-[#0b1739] border border-cyan-500/40 space-y-4 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-sky-900/80 pb-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <UserCheck className="w-4 h-4" />
                  <span>Thêm / Ghi Danh Học Sinh Vào Bảng Xếp Hạng</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-sky-400 hover:text-white"
                >
                  Đóng biểu mẫu
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-sky-300 mb-1">
                    Họ và tên học sinh *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="VD: Nguyễn Văn An"
                    className="w-full px-3 py-2 rounded-xl bg-[#071126] border border-sky-800 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sky-300 mb-1">
                    Lớp
                  </label>
                  <input
                    type="text"
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    placeholder="VD: 10A1"
                    className="w-full px-3 py-2 rounded-xl bg-[#071126] border border-sky-800 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sky-300 mb-1">
                    Đề thi
                  </label>
                  <select
                    value={newExamId}
                    onChange={(e) => setNewExamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#071126] border border-sky-800 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {allExams.map((ex) => (
                      <option key={ex.id} value={ex.id} className="bg-[#071126]">
                        Đề: {ex.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-sky-300 mb-1">
                    Điểm Phần I (Tối đa 3.0)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="3"
                    value={newPart1}
                    onChange={(e) => setNewPart1(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#071126] border border-sky-800 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-sky-300 mb-1">
                    Điểm Phần II (Tối đa 4.0)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="4"
                    value={newPart2}
                    onChange={(e) => setNewPart2(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#071126] border border-sky-800 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-sky-300 mb-1">
                    Điểm Phần III (Tối đa 2.0)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="3"
                    value={newPart3}
                    onChange={(e) => setNewPart3(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#071126] border border-sky-800 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-sky-300 mb-1">
                    Điểm Phần IV (Tối đa 3.0)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="4"
                    value={newPart4}
                    onChange={(e) => setNewPart4(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#071126] border border-sky-800 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-sky-300 mb-1">
                    Thời gian làm (phút)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#071126] border border-sky-800 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl bg-[#071126] text-sky-300 text-xs font-semibold border border-sky-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#040817] text-xs font-bold transition-colors shadow-md"
                >
                  Lưu Vào Bảng Xếp Hạng
                </button>
              </div>
            </form>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#0b1739] border border-sky-800/70 flex items-center justify-between">
              <div>
                <span className="text-xs text-sky-300 font-medium">Tổng lượt ghi danh</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5 tabular-nums">
                  {filteredEntries.length}{' '}
                  <span className="text-xs font-sans font-normal text-sky-400">học sinh</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b1739] border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-200/90 font-medium">Điểm cao nhất (Top 1)</span>
                <div className="text-2xl font-black font-mono text-amber-300 mt-0.5 tabular-nums">
                  {highestScore.toFixed(2)}{' '}
                  <span className="text-xs font-sans font-normal text-amber-200/70">/ 10đ</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b1739] border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-cyan-200/90 font-medium">Điểm trung bình</span>
                <div className="text-2xl font-black font-mono text-cyan-300 mt-0.5 tabular-nums">
                  {avgScore.toFixed(2)}{' '}
                  <span className="text-xs font-sans font-normal text-cyan-200/70">/ 10đ</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {top3.map((item, idx) => {
                const isFirst = idx === 0;
                const isSecond = idx === 1;
                const cardStyle = isFirst
                  ? 'bg-gradient-to-b from-amber-500/20 via-[#0d1c42] to-[#09132e] border-amber-400/60 shadow-lg shadow-amber-500/10'
                  : isSecond
                  ? 'bg-gradient-to-b from-slate-300/15 via-[#0b1838] to-[#08122b] border-slate-400/50'
                  : 'bg-gradient-to-b from-orange-400/15 via-[#0b1838] to-[#08122b] border-orange-400/50';

                const badgeColor = isFirst
                  ? 'bg-amber-400 text-[#040817]'
                  : isSecond
                  ? 'bg-slate-200 text-[#040817]'
                  : 'bg-orange-400 text-[#040817]';

                const medalLabel = isFirst
                  ? 'Hạng Nhất (Quán Quân)'
                  : isSecond
                  ? 'Hạng Nhì (Á Quân)'
                  : 'Hạng Ba';

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-transform ${cardStyle}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-sm ${badgeColor}`}
                      >
                        <Medal className="w-3.5 h-3.5" />
                        #{idx + 1} · {medalLabel}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#071126]/80 border border-sky-800 text-sky-300 text-xs font-bold">
                        Lớp {item.className}
                      </span>
                    </div>

                    <div className="my-4">
                      <div className="text-base sm:text-lg font-extrabold text-white truncate">
                        {item.studentName}
                      </div>
                      <div className="text-xs text-sky-300 mt-0.5 truncate">
                        Đề thi: <span className="font-semibold text-cyan-300">{item.examTitle}</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-3 border-t border-sky-800/60">
                      <div>
                        <div className="text-[11px] text-sky-300 uppercase font-semibold">
                          Tổng điểm
                        </div>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
                          {item.totalScore.toFixed(2)}
                          <span className="text-xs font-sans font-normal text-sky-300">/10</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 text-xs text-sky-300 font-mono">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{formatDuration(item.durationSeconds)}</span>
                        </div>
                        <div className="text-[11px] text-amber-300 font-semibold mt-0.5">
                          P1: {item.part1Score} · P2: {item.part2Score} · P3: {item.part3Score} · P4:{' '}
                          {item.part4Score}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0b1739] p-3.5 rounded-2xl border border-sky-800/70">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 mr-1">
                <Filter className="w-4 h-4 text-cyan-400" />
                <span>Lọc theo đề:</span>
              </div>
              <button
                onClick={() => setExamFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  examFilter === 'all'
                    ? 'bg-cyan-500 text-[#040817] shadow-sm'
                    : 'bg-[#071126] text-sky-300 hover:text-white border border-sky-800'
                }`}
              >
                Tất cả đề ({entries.length})
              </button>
              {allExams.map((ex) => {
                const count = entries.filter((e) => e.examId === ex.id).length;
                return (
                  <button
                    key={ex.id}
                    onClick={() => setExamFilter(ex.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      examFilter === ex.id
                        ? 'bg-cyan-500 text-[#040817] shadow-sm'
                        : 'bg-[#071126] text-sky-300 hover:text-white border border-sky-800'
                    }`}
                  >
                    Đề {ex.title.length > 12 ? ex.title.slice(0, 12) + '…' : ex.title} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh, lớp..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#071126] border border-sky-800 text-xs text-white placeholder-sky-400/70 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Full Leaderboard Table */}
          <div className="rounded-2xl border border-sky-800/70 bg-[#0b1739] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#09132e] border-b border-sky-800/80 text-[11px] font-bold uppercase tracking-wider text-sky-300">
                    <th className="py-3.5 px-4 text-center w-16">Hạng</th>
                    <th className="py-3.5 px-4">Họ và Tên Học Sinh</th>
                    <th className="py-3.5 px-3 text-center">Lớp</th>
                    <th className="py-3.5 px-3">Đề Thi</th>
                    <th className="py-3.5 px-3 text-center hidden md:table-cell">
                      Điểm Từng Phần (I / II / III / IV)
                    </th>
                    <th className="py-3.5 px-4 text-center">Tổng Điểm</th>
                    <th className="py-3.5 px-3 text-center">Thời Gian</th>
                    <th className="py-3.5 px-3 text-center hidden sm:table-cell">Xếp Loại</th>
                    <th className="py-3.5 px-3 text-center w-12">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-900/60 text-xs sm:text-sm">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-sky-400">
                        Chưa có học sinh nào trong bảng xếp hạng. Kết quả sẽ tự động được ghi danh ngay sau khi học sinh hoàn thành và nộp bài thi.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry, index) => {
                      const rankNum = index + 1;
                      return (
                        <tr
                          key={entry.id}
                          className={`transition-colors hover:bg-sky-900/30 ${
                            entry.isCurrentUser ? 'bg-cyan-500/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center font-mono font-black">
                            {rankNum === 1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400 text-[#040817] text-xs font-black shadow-sm">
                                1
                              </span>
                            ) : rankNum === 2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-200 text-[#040817] text-xs font-black">
                                2
                              </span>
                            ) : rankNum === 3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-400 text-[#040817] text-xs font-black">
                                3
                              </span>
                            ) : (
                              <span className="text-sky-300 font-bold">#{rankNum}</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{entry.studentName}</span>
                              {entry.isCurrentUser && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                                  Bạn
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="px-2.5 py-1 rounded-lg bg-[#071126] border border-sky-800/80 text-sky-200 text-xs font-semibold">
                              {entry.className}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-cyan-300 font-semibold text-xs">
                            Đề {entry.examTitle}
                          </td>

                          <td className="py-3 px-3 text-center hidden md:table-cell font-mono text-xs text-sky-200">
                            <span className="px-1.5 py-0.5 rounded bg-[#071126] border border-sky-900">
                              {entry.part1Score}
                            </span>{' '}
                            /{' '}
                            <span className="px-1.5 py-0.5 rounded bg-[#071126] border border-sky-900">
                              {entry.part2Score}
                            </span>{' '}
                            /{' '}
                            <span className="px-1.5 py-0.5 rounded bg-[#071126] border border-sky-900">
                              {entry.part3Score}
                            </span>{' '}
                            /{' '}
                            <span className="px-1.5 py-0.5 rounded bg-[#071126] border border-sky-900">
                              {entry.part4Score}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-mono font-black text-base text-amber-300 tabular-nums">
                            {entry.totalScore.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-xs text-sky-300">
                            {formatDuration(entry.durationSeconds)}
                          </td>

                          <td className="py-3 px-3 text-center hidden sm:table-cell">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getRankBadgeStyle(
                                entry.rank
                              )}`}
                            >
                              {entry.rank}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => onDeleteEntry(entry.id)}
                              className="p-1.5 rounded-lg text-sky-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Xóa kết quả này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#09132e] border-t border-sky-800/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-sky-300">
            Khi học sinh hoàn thành và nộp bài thi, kết quả sẽ tự động được ghi danh vào Bảng xếp hạng.
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {entries.length > 0 &&
              (!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1739] hover:bg-rose-950/60 text-sky-300 hover:text-rose-300 border border-sky-800 text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xoá toàn bộ danh sách</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 px-3 py-1 rounded-xl">
                  <span className="text-xs text-rose-200 font-semibold">Xác nhận xoá tất cả?</span>
                  <button
                    onClick={() => {
                      onResetDefault();
                      setConfirmReset(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold"
                  >
                    Đồng ý
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-2 py-1 text-xs text-sky-300"
                  >
                    Hủy
                  </button>
                </div>
              ))}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#040817] font-bold text-xs transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
