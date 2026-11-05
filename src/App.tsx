/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { examSets } from './data/examSets';
import { ExamSet, StudentAnswers, ExamPart, PartScoreDetail, LeaderboardEntry } from './types/exam';
import { calculateScore } from './utils/scoring';
import { Header } from './components/Header';
import { Timer } from './components/Timer';
import { QuestionNav } from './components/QuestionNav';
import { Part1MultipleChoice } from './components/Part1MultipleChoice';
import { Part2TrueFalse } from './components/Part2TrueFalse';
import { Part3ShortAnswer } from './components/Part3ShortAnswer';
import { Part4StepOrdering } from './components/Part4StepOrdering';
import { ResultReport } from './components/ResultReport';
import { FormulaSheetModal } from './components/FormulaSheetModal';
import { ScratchpadModal } from './components/ScratchpadModal';
import { ImportWordModal } from './components/ImportWordModal';
import {
  LeaderboardModal,
  INITIAL_LEADERBOARD_ENTRIES,
  sortLeaderboardEntries,
  formatDuration,
} from './components/LeaderboardModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import {
  getSavedGoogleSheetUrl,
  saveGoogleSheetUrl,
  getSavedAutoSyncSheet,
  saveAutoSyncSheet,
  sendEntryToGoogleSheet,
} from './utils/googleSheetWebhook';
import { usePWAInstall } from './hooks/usePWAInstall';
import { playSubmitFanfare, playCorrectSound, playWrongSound, stopSpeech } from './utils/audio';
import {
  Send,
  AlertTriangle,
  Play,
  RotateCcw,
  Trash2,
  Trophy,
  ChevronRight,
  User,
  UserCheck,
  BookOpen,
  PenTool,
  CheckCircle2,
  Sparkles,
  X,
  LayoutGrid,
  WifiOff,
  Smartphone,
  Clock,
} from 'lucide-react';

const LEADERBOARD_STORAGE_KEY = 'math10_leaderboard_v2_clean';
const STUDENT_INFO_STORAGE_KEY = 'math10_student_info_v1';
const CUSTOM_EXAMS_STORAGE_KEY = 'math10_custom_exams_v1';
const ACTIVE_PROGRESS_STORAGE_KEY = 'math10_active_progress_v1';

const EMPTY_EXAM: ExamSet = {
  id: 'empty-exam',
  title: 'Chưa có đề thi',
  subtitle: '',
  grade: 10,
  durationMinutes: 90,
  totalPoints: 10,
  description:
    'Hiện chưa có đề thi nào được chọn. Hãy nhấn "Tạo Đề Word / PDF" hoặc "Khôi phục đề mặc định" để bắt đầu.',
  part1: [],
  part2: [],
  part3: [],
  part4: [],
};

export default function App() {
  const {
    isOnline,
    swReady,
    isInstalled,
    isIOS,
    hasNativePrompt,
    promptInstall,
  } = usePWAInstall();

  const [allExams, setAllExams] = useState<ExamSet[]>(() => {
    try {
      const savedCustom = localStorage.getItem(CUSTOM_EXAMS_STORAGE_KEY);
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultIds = new Set(examSets.map((e) => e.id));
          const defaultTitles = new Set(examSets.map((e) => e.title.trim().toLowerCase()));
          const customOnly = parsed.filter(
            (e: ExamSet) =>
              e &&
              e.id &&
              !defaultIds.has(e.id) &&
              !defaultTitles.has((e.title || '').trim().toLowerCase()) &&
              (e.title || '').trim().toLowerCase() !== 'đề 03' &&
              (e.title || '').trim().toLowerCase() !== 'đề 04' &&
              (e.title || '').trim().toLowerCase() !== 'đề 05' &&
              (e.title || '').trim().toLowerCase() !== 'đề 06'
          );
          return [...customOnly, ...examSets];
        }
      }
    } catch {
      // ignore
    }
    return examSets;
  });

  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    try {
      const savedProgress = localStorage.getItem(ACTIVE_PROGRESS_STORAGE_KEY);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (parsed && parsed.selectedExamId) {
          return parsed.selectedExamId;
        }
      }
    } catch {
      // ignore
    }
    return 'de-so-06';
  });

  const currentExam = useMemo(
    () => allExams.find((ex) => ex.id === selectedExamId) || allExams[0] || EMPTY_EXAM,
    [allExams, selectedExamId]
  );

  const [examMode, setExamMode] = useState<'exam' | 'practice'>('exam');
  const [isExamStarted, setIsExamStarted] = useState<boolean>(() => {
    try {
      const savedProgress = localStorage.getItem(ACTIVE_PROGRESS_STORAGE_KEY);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (parsed && parsed.selectedExamId === currentExam.id) {
          return !!parsed.isExamStarted;
        }
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [examSessionKey, setExamSessionKey] = useState<number>(1);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [activeFilterPart, setActiveFilterPart] = useState<'all' | ExamPart>('all');
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(() => {
    try {
      const savedProgress = localStorage.getItem(ACTIVE_PROGRESS_STORAGE_KEY);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (parsed && parsed.selectedExamId === currentExam.id && Array.isArray(parsed.bookmarked)) {
          return new Set(parsed.bookmarked);
        }
      }
    } catch {
      // ignore
    }
    return new Set();
  });
  const [interactedPart4, setInteractedPart4] = useState<Set<string>>(() => {
    try {
      const savedProgress = localStorage.getItem(ACTIVE_PROGRESS_STORAGE_KEY);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (
          parsed &&
          parsed.selectedExamId === currentExam.id &&
          Array.isArray(parsed.interactedPart4)
        ) {
          return new Set(parsed.interactedPart4);
        }
      }
    } catch {
      // ignore
    }
    return new Set();
  });

  const [isFormulaOpen, setIsFormulaOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isImportWordOpen, setIsImportWordOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => getSavedGoogleSheetUrl());
  const [autoSyncSheet, setAutoSyncSheet] = useState<boolean>(() => getSavedAutoSyncSheet());
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPWAInfoOpen, setIsPWAInfoOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [studentInfoError, setStudentInfoError] = useState<string>('');

  // Student info & Leaderboard state
  const [studentName, setStudentName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STUDENT_INFO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.studentName || '';
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [studentClass, setStudentClass] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STUDENT_INFO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.studentClass || '';
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: LeaderboardEntry) => !item.id.startsWith('seed-'));
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_LEADERBOARD_ENTRIES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(leaderboardEntries));
    } catch {
      // ignore
    }
  }, [leaderboardEntries]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STUDENT_INFO_STORAGE_KEY,
        JSON.stringify({ studentName, studentClass })
      );
    } catch {
      // ignore
    }
  }, [studentName, studentClass]);

  const examStartTimeRef = useRef<number | null>(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState<number>(0);
  const [submittedDurationSeconds, setSubmittedDurationSeconds] = useState<number>(0);
  const studentNameInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize student answers
  const initializeAnswers = (exam: ExamSet): StudentAnswers => {
    const p4Answers: Record<string, string[]> = {};
    if (exam.part4) {
      exam.part4.forEach((q) => {
        const ids = q.steps.map((s) => s.id);
        const shuffled = [...ids].sort(() => Math.random() - 0.5);
        p4Answers[q.id] = shuffled;
      });
    }

    const p2Answers: Record<string, Record<'a' | 'b' | 'c' | 'd', boolean | null>> = {};
    exam.part2.forEach((q) => {
      p2Answers[q.id] = { a: null, b: null, c: null, d: null };
    });

    return {
      part1: {},
      part2: p2Answers,
      part3: {},
      part4: p4Answers,
    };
  };

  const [answers, setAnswers] = useState<StudentAnswers>(() => {
    try {
      const savedProgress = localStorage.getItem(ACTIVE_PROGRESS_STORAGE_KEY);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (parsed && parsed.selectedExamId === currentExam.id && parsed.answers) {
          return parsed.answers;
        }
      }
    } catch {
      // ignore
    }
    return initializeAnswers(currentExam);
  });
  const [scoreDetail, setScoreDetail] = useState<PartScoreDetail | null>(null);

  // Save custom exams to localStorage for full offline persistence
  useEffect(() => {
    try {
      const defaultIds = new Set(examSets.map((e) => e.id));
      const customOnly = allExams.filter((e) => !defaultIds.has(e.id) && e.id !== 'empty-exam');
      localStorage.setItem(CUSTOM_EXAMS_STORAGE_KEY, JSON.stringify(customOnly));
    } catch {
      // ignore
    }
  }, [allExams]);

  // Auto-save active exam progress to localStorage so offline refresh never loses answers
  useEffect(() => {
    try {
      if (!isSubmitted) {
        localStorage.setItem(
          ACTIVE_PROGRESS_STORAGE_KEY,
          JSON.stringify({
            selectedExamId: currentExam.id,
            isExamStarted,
            answers,
            interactedPart4: Array.from(interactedPart4),
            bookmarked: Array.from(bookmarkedQuestions),
          })
        );
      }
    } catch {
      // ignore
    }
  }, [currentExam.id, isExamStarted, isSubmitted, answers, interactedPart4, bookmarkedQuestions]);

  const resultReportRef = useRef<HTMLDivElement | null>(null);
  const questionsContainerRef = useRef<HTMLDivElement | null>(null);
  const studentRegistrationRef = useRef<HTMLDivElement | null>(null);

  const totalExamQuestions = useMemo(() => {
    return (
      currentExam.part1.length +
      currentExam.part2.length +
      currentExam.part3.length +
      (currentExam.part4?.length || 0)
    );
  }, [currentExam]);

  const resetSessionState = (targetExam: ExamSet) => {
    const freshAnswers = initializeAnswers(targetExam);
    setAnswers(freshAnswers);
    setIsExamStarted(false);
    setIsSubmitted(false);
    setScoreDetail(null);
    setBookmarkedQuestions(new Set());
    setInteractedPart4(new Set());
    setActiveFilterPart('all');
    examStartTimeRef.current = null;
    setTimerElapsedSeconds(0);
    setSubmittedDurationSeconds(0);
    setExamSessionKey((prev) => prev + 1);
    try {
      localStorage.removeItem(ACTIVE_PROGRESS_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Khi học sinh chọn "Bắt Đầu Làm Bài" -> Hiện bảng 2 dòng điền Họ và tên & Lớp
  const handleStartExam = () => {
    setStudentInfoError('');
    setIsStudentModalOpen(true);
    setTimeout(() => {
      studentNameInputRef.current?.focus();
    }, 60);
  };

  // Khi học sinh bấm trực tiếp vào câu hỏi khi chưa bắt đầu làm bài
  const ensureExamStarted = (): boolean => {
    if (isExamStarted) return true;
    setStudentInfoError('Vui lòng điền Họ và tên và Lớp để bắt đầu làm bài.');
    setIsStudentModalOpen(true);
    setTimeout(() => {
      studentNameInputRef.current?.focus();
    }, 60);
    return false;
  };

  // Reset answers when changing exam
  const handleSelectExam = (examId: string) => {
    stopSpeech();
    setSelectedExamId(examId);
    const newExam = allExams.find((e) => e.id === examId) || allExams[0] || EMPTY_EXAM;
    resetSessionState(newExam);
  };

  // Xoá đề thi khỏi danh sách
  const handleDeleteExam = (examId: string) => {
    stopSpeech();
    const remaining = allExams.filter((e) => e.id !== examId);
    setAllExams(remaining);
    const nextExam = remaining[0] || EMPTY_EXAM;
    setSelectedExamId(nextExam.id);
    resetSessionState(nextExam);
  };

  // Khôi phục Đề mặc định
  const handleRestoreDefaultExam = () => {
    stopSpeech();
    setAllExams(examSets);
    setSelectedExamId(examSets[0].id);
    resetSessionState(examSets[0]);
  };

  // Áp dụng đề thi mới tạo từ file Word / PDF
  const handleApplyWordExam = (newExam: ExamSet) => {
    stopSpeech();
    setAllExams((prev) => [newExam, ...prev]);
    setSelectedExamId(newExam.id);
    resetSessionState(newExam);
  };

  // Toggle bookmark
  const toggleBookmark = (qId: string) => {
    setBookmarkedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // Submit test
  const handleFinalSubmit = () => {
    stopSpeech();
    setShowSubmitConfirm(false);
    const result = calculateScore(currentExam, answers);
    setScoreDetail(result);
    setIsSubmitted(true);

    // Compute elapsed seconds accurately from Timer or wall clock
    const wallElapsed = examStartTimeRef.current
      ? Math.max(5, Math.round((Date.now() - examStartTimeRef.current) / 1000))
      : 0;
    const elapsedSeconds =
      timerElapsedSeconds > 0 ? timerElapsedSeconds : wallElapsed > 0 ? wallElapsed : 1200;

    setSubmittedDurationSeconds(elapsedSeconds);

    const finalName = studentName.trim() || 'Học sinh Lớp 10';
    const finalClass = studentClass.trim() || '10A1';

    const newEntry: LeaderboardEntry = {
      id: `entry-${Date.now()}`,
      studentName: finalName,
      className: finalClass,
      examId: currentExam.id,
      examTitle: currentExam.title,
      totalScore: result.totalScore,
      part1Score: result.part1Score,
      part2Score: result.part2Score,
      part3Score: result.part3Score,
      part4Score: result.part4Score,
      durationSeconds: elapsedSeconds,
      rank: result.rank,
      submittedAt: new Date().toISOString(),
      isCurrentUser: true,
    };

    setLeaderboardEntries((prev) => [
      newEntry,
      ...prev.map((item) => ({ ...item, isCurrentUser: false })),
    ]);

    // Tự động gửi kết quả lên Google Sheet nếu đã cấu hình URL Web App
    if (googleSheetUrl.trim() && autoSyncSheet) {
      sendEntryToGoogleSheet(googleSheetUrl, newEntry).catch(() => {
        // ignore background network errors
      });
    }

    if (result.totalScore >= 5.0) {
      playCorrectSound();
    } else {
      playWrongSound();
    }
    playSubmitFanfare();

    // Scroll to results
    setTimeout(() => {
      resultReportRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Reset exam
  const handleResetExam = () => {
    stopSpeech();
    resetSessionState(currentExam);
  };

  // Leaderboard helpers
  const handleAddManualLeaderboardEntry = (
    entry: Omit<LeaderboardEntry, 'id' | 'submittedAt'>
  ) => {
    const created: LeaderboardEntry = {
      ...entry,
      id: `manual-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    setLeaderboardEntries((prev) => [
      created,
      ...prev.map((item) => ({ ...item, isCurrentUser: false })),
    ]);
    if (googleSheetUrl.trim() && autoSyncSheet) {
      sendEntryToGoogleSheet(googleSheetUrl, created).catch(() => {});
    }
  };

  const handleDeleteLeaderboardEntry = (id: string) => {
    setLeaderboardEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetLeaderboardDefault = () => {
    setLeaderboardEntries(INITIAL_LEADERBOARD_ENTRIES);
  };

  const handleChangeGoogleSheetUrl = (url: string) => {
    setGoogleSheetUrl(url);
    saveGoogleSheetUrl(url);
  };

  const handleChangeAutoSyncSheet = (enabled: boolean) => {
    setAutoSyncSheet(enabled);
    saveAutoSyncSheet(enabled);
  };

  const handleMergeEntriesFromSheet = (sheetEntries: LeaderboardEntry[]) => {
    setLeaderboardEntries((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const newOnes = sheetEntries.filter((item) => !existingIds.has(item.id));
      return [...newOnes, ...prev];
    });
  };

  const sortedAllEntries = useMemo(() => {
    return sortLeaderboardEntries(leaderboardEntries);
  }, [leaderboardEntries]);

  const topSidebarEntries = useMemo(() => {
    return sortedAllEntries.slice(0, 5);
  }, [sortedAllEntries]);

  const currentUserRankPosition = useMemo(() => {
    const idx = sortedAllEntries.findIndex((e) => e.isCurrentUser);
    return idx >= 0 ? idx + 1 : undefined;
  }, [sortedAllEntries]);

  // Navigation scroll helper
  const handleNavigateQuestion = (part: ExamPart, index: number) => {
    setActiveFilterPart('all');
    setTimeout(() => {
      const el = document.getElementById(`q-${part}-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  // Count answered questions accurately
  const totalAnswered = useMemo(() => {
    const p1Count = Object.keys(answers.part1).length;
    let p2Count = 0;
    currentExam.part2.forEach((q) => {
      const a = answers.part2[q.id];
      if (a && a.a !== null && a.b !== null && a.c !== null && a.d !== null) {
        p2Count++;
      }
    });
    const p3Count = Object.values(answers.part3).filter((v) => v.trim().length > 0).length;
    const p4Count = (currentExam.part4 || []).filter(
      (q) => interactedPart4.has(q.id) || isSubmitted
    ).length;
    return p1Count + p2Count + p3Count + p4Count;
  }, [answers, currentExam, interactedPart4, isSubmitted]);

  return (
    <div className="min-h-screen bg-[#040817] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <Header
        currentExam={currentExam}
        allExams={allExams}
        onSelectExam={handleSelectExam}
        onDeleteExam={handleDeleteExam}
        examMode={examMode}
        onToggleExamMode={() => setExamMode((m) => (m === 'exam' ? 'practice' : 'exam'))}
        isStarted={isExamStarted}
        onStartExam={handleStartExam}
        isSubmitted={isSubmitted}
        onSubmitExam={() => setShowSubmitConfirm(true)}
        onResetExam={handleResetExam}
        onOpenFormulaSheet={() => setIsFormulaOpen(true)}
        onOpenScratchpad={() => setIsScratchpadOpen(true)}
        onOpenImportWord={() => setIsImportWordOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        leaderboardCount={leaderboardEntries.length}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        isOnline={isOnline}
        onOpenPWAInfo={() => setIsPWAInfoOpen(true)}
        onOpenGoogleSheetSync={() => setIsGoogleSheetModalOpen(true)}
        isGoogleSheetConnected={Boolean(googleSheetUrl.trim())}
      />

      {/* Offline Banner Notification (hiển thị gọn gàng khi thiết bị tắt Wi-Fi / 4G) */}
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-400/40 px-3 py-1.5 text-center text-xs text-amber-200 flex items-center justify-center gap-2 no-print">
          <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>
            <strong>Chế độ Không Wi-Fi (Offline):</strong> Toàn bộ câu hỏi, công thức Toán và đáp án
            đang được lưu an toàn trực tiếp trên điện thoại.
          </span>
        </div>
      )}

      {/* Main Content Layout: tối ưu khoảng cách lề trên điện thoại (px-2.5) để khung câu hỏi to rõ vừa màn hình */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 py-3 sm:py-5 pb-24 lg:pb-10 flex-1 w-full">
        {/* Results Report on Top if Submitted */}
        {isSubmitted && scoreDetail && (
          <div ref={resultReportRef} className="mb-8">
            <ResultReport
              scoreDetail={scoreDetail}
              examTitle={currentExam.title}
              studentName={studentName}
              studentClass={studentClass}
              durationSeconds={submittedDurationSeconds}
              rankPosition={currentUserRankPosition}
              totalRanked={leaderboardEntries.length}
              onResetExam={handleResetExam}
              onScrollToQuestions={() => {
                questionsContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Questions Container (8-9 Cols) */}
          <div ref={questionsContainerRef} className="lg:col-span-8 xl:col-span-9 space-y-4 sm:space-y-6">
            {/* Part Filter Tabs, Timer & Font Size Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 no-print">
              <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-[#071126] border border-sky-900/60 rounded-2xl overflow-x-auto no-scrollbar text-xs font-bold shadow-lg">
                <button
                  onClick={() => setActiveFilterPart('all')}
                  className={`min-h-[38px] px-3 sm:px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                    activeFilterPart === 'all'
                      ? 'bg-cyan-500 text-[#071126] font-black shadow-md'
                      : 'text-sky-300 hover:text-white hover:bg-sky-950/60'
                  }`}
                >
                  Tất cả ({totalExamQuestions})
                </button>
                <button
                  onClick={() => setActiveFilterPart('part1')}
                  className={`min-h-[38px] px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                    activeFilterPart === 'part1'
                      ? 'bg-cyan-500 text-[#071126] font-black shadow-md'
                      : 'text-sky-300 hover:text-white hover:bg-sky-950/60'
                  }`}
                >
                  Phần I ({currentExam.part1.length})
                </button>
                <button
                  onClick={() => setActiveFilterPart('part2')}
                  className={`min-h-[38px] px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                    activeFilterPart === 'part2'
                      ? 'bg-cyan-500 text-[#071126] font-black shadow-md'
                      : 'text-sky-300 hover:text-white hover:bg-sky-950/60'
                  }`}
                >
                  Phần II ({currentExam.part2.length})
                </button>
                <button
                  onClick={() => setActiveFilterPart('part3')}
                  className={`min-h-[38px] px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                    activeFilterPart === 'part3'
                      ? 'bg-cyan-500 text-[#071126] font-black shadow-md'
                      : 'text-sky-300 hover:text-white hover:bg-sky-950/60'
                  }`}
                >
                  Phần III ({currentExam.part3.length})
                </button>
                {currentExam.part4 && currentExam.part4.length > 0 && (
                  <button
                    onClick={() => setActiveFilterPart('part4')}
                    className={`min-h-[38px] px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                      activeFilterPart === 'part4'
                        ? 'bg-cyan-500 text-[#071126] font-black shadow-md'
                        : 'text-sky-300 hover:text-white hover:bg-sky-950/60'
                    }`}
                  >
                    Phần IV ({currentExam.part4.length})
                  </button>
                )}
              </div>

              {/* Đồng hồ làm bài & Tuỳ chỉnh cỡ chữ */}
              <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                {allExams.length === 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreDefaultExam}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục đề mặc định</span>
                  </button>
                )}

                {examMode === 'exam' && !isSubmitted && (
                  <Timer
                    initialMinutes={currentExam.durationMinutes}
                    isRunning={isExamStarted && !isSubmitted}
                    onTimeUp={handleFinalSubmit}
                    resetKey={`${currentExam.id}-${examSessionKey}`}
                    onElapsedChange={setTimerElapsedSeconds}
                  />
                )}

                <div className="flex items-center bg-[#071126] border border-sky-900/70 rounded-xl p-1 text-xs ml-auto sm:ml-0">
                  {(
                    [
                      { id: 'normal', label: 'A' },
                      { id: 'large', label: 'A+' },
                      { id: 'xlarge', label: 'A++' },
                    ] as const
                  ).map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setFontSize(sz.id)}
                      className={`min-w-[34px] min-h-[32px] px-2 py-1 rounded-lg font-bold transition-colors ${
                        fontSize === sz.id
                          ? 'bg-cyan-500 text-[#040817]'
                          : 'text-sky-300 hover:text-white'
                      }`}
                      title="Thay đổi cỡ chữ đề thi"
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Phần I: Trắc nghiệm */}
            {(activeFilterPart === 'all' || activeFilterPart === 'part1') && (
              <section id="section-part1">
                <Part1MultipleChoice
                  questions={currentExam.part1}
                  selectedAnswers={answers.part1}
                  onSelectAnswer={(qId, optKey) => {
                    if (!ensureExamStarted()) return;
                    setAnswers((prev) => ({
                      ...prev,
                      part1: { ...prev.part1, [qId]: optKey },
                    }));
                  }}
                  isSubmitted={isSubmitted}
                  examMode={examMode}
                  bookmarkedQuestions={bookmarkedQuestions}
                  onToggleBookmark={toggleBookmark}
                  fontSize={fontSize}
                  totalQuestions={totalExamQuestions}
                />
              </section>
            )}

            {/* Phần II: Đúng / Sai */}
            {(activeFilterPart === 'all' || activeFilterPart === 'part2') && (
              <section id="section-part2">
                <Part2TrueFalse
                  questions={currentExam.part2}
                  answers={answers.part2}
                  onSelectStatement={(qId, label, val) => {
                    if (!ensureExamStarted()) return;
                    setAnswers((prev) => ({
                      ...prev,
                      part2: {
                        ...prev.part2,
                        [qId]: {
                          ...prev.part2[qId],
                          [label]: val,
                        },
                      },
                    }));
                  }}
                  isSubmitted={isSubmitted}
                  examMode={examMode}
                  bookmarkedQuestions={bookmarkedQuestions}
                  onToggleBookmark={toggleBookmark}
                  fontSize={fontSize}
                  totalQuestions={totalExamQuestions}
                />
              </section>
            )}

            {/* Phần III: Trả lời ngắn */}
            {(activeFilterPart === 'all' || activeFilterPart === 'part3') && (
              <section id="section-part3">
                <Part3ShortAnswer
                  questions={currentExam.part3}
                  answers={answers.part3}
                  onAnswerChange={(qId, val) => {
                    if (!ensureExamStarted()) return;
                    setAnswers((prev) => ({
                      ...prev,
                      part3: { ...prev.part3, [qId]: val },
                    }));
                  }}
                  isSubmitted={isSubmitted}
                  examMode={examMode}
                  bookmarkedQuestions={bookmarkedQuestions}
                  onToggleBookmark={toggleBookmark}
                  fontSize={fontSize}
                  totalQuestions={totalExamQuestions}
                />
              </section>
            )}

            {/* Phần IV: Tự luận ghép bước */}
            {currentExam.part4 &&
              currentExam.part4.length > 0 &&
              (activeFilterPart === 'all' || activeFilterPart === 'part4') && (
                <section id="section-part4">
                  <Part4StepOrdering
                    questions={currentExam.part4}
                    answers={answers.part4}
                    onOrderChange={(qId, orderedIds) => {
                      if (!ensureExamStarted()) return;
                      setInteractedPart4((prev) => {
                        const next = new Set(prev);
                        next.add(qId);
                        return next;
                      });
                      setAnswers((prev) => ({
                        ...prev,
                        part4: { ...prev.part4, [qId]: orderedIds },
                      }));
                    }}
                    isSubmitted={isSubmitted}
                    examMode={examMode}
                    bookmarkedQuestions={bookmarkedQuestions}
                    onToggleBookmark={toggleBookmark}
                    fontSize={fontSize}
                    totalQuestions={totalExamQuestions}
                  />
                </section>
              )}

            {/* Bottom Submit Banner */}
            {!isSubmitted && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#071126] via-[#0b1739] to-[#071126] border border-sky-900/60 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-base font-bold text-white">
                    {!isExamStarted
                      ? 'Bạn đã sẵn sàng làm bài thi chưa?'
                      : 'Bạn đã kiểm tra hết các câu hỏi chưa?'}
                  </h3>
                  <p className="text-xs text-sky-300">
                    {!isExamStarted ? (
                      `Thời gian làm bài: ${currentExam.durationMinutes} phút · Đề thi gồm ${totalExamQuestions} câu hỏi`
                    ) : (
                      <>
                        Thí sinh:{' '}
                        <strong className="text-white">{studentName.trim()}</strong> (Lớp{' '}
                        <strong className="text-amber-300">{studentClass.trim()}</strong>) · Đã hoàn
                        thành{' '}
                        <strong className="text-cyan-300 font-mono text-sm">
                          {totalAnswered}
                        </strong>{' '}
                        / {totalExamQuestions} câu hỏi.
                      </>
                    )}
                  </p>
                </div>
                {!isExamStarted ? (
                  <button
                    onClick={handleStartExam}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-[#071126] font-black text-sm shadow-md transition-all whitespace-nowrap active:scale-95 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Bắt Đầu Làm Bài</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#071126] font-black text-sm shadow-md transition-all whitespace-nowrap active:scale-95 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Nộp Bài Ngay</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Sticky Question Bubble Navigator + Leaderboard Widget (3-4 Cols) */}
          <div className="lg:col-span-4 xl:col-span-3 sticky top-20 space-y-4 no-print">
            <QuestionNav
              exam={currentExam}
              answers={answers}
              currentSection={activeFilterPart === 'all' ? 'part1' : activeFilterPart}
              onNavigate={handleNavigateQuestion}
              bookmarkedQuestions={bookmarkedQuestions}
              onToggleBookmark={toggleBookmark}
              isSubmitted={isSubmitted}
              interactedPart4={interactedPart4}
              studentName={studentName}
              studentClass={studentClass}
              onEditStudentInfo={() => setIsStudentModalOpen(true)}
            />

            {/* Bảng Xếp Hạng Sidebar Widget */}
            <div className="bg-[#071126] rounded-2xl border border-sky-900/70 p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-sky-900/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Bảng Xếp Hạng
                    </h3>
                    <p className="text-[11px] text-sky-300">Top 5 điểm cao nhất</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLeaderboardOpen(true)}
                  className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-0.5 transition-colors"
                >
                  <span>Chi tiết</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {topSidebarEntries.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-[#0b1739]/60 border border-sky-900/60 text-center text-xs text-sky-300/90 leading-relaxed">
                    Chưa có học sinh nộp bài. Kết quả sẽ tự động hiển thị tại đây sau khi hoàn thành bài thi.
                  </div>
                ) : (
                  topSidebarEntries.map((entry, idx) => {
                    const rankNum = idx + 1;
                    const rankBadge =
                      rankNum === 1
                        ? 'bg-amber-400 text-[#040817]'
                        : rankNum === 2
                        ? 'bg-slate-200 text-[#040817]'
                        : rankNum === 3
                        ? 'bg-orange-400 text-[#040817]'
                        : 'bg-[#0b1739] text-sky-300 border border-sky-800';

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors ${
                          entry.isCurrentUser
                            ? 'bg-cyan-500/15 border-cyan-500/40'
                            : 'bg-[#0b1739]/90 border-sky-900/60 hover:border-sky-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 ${rankBadge}`}
                          >
                            {rankNum}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                              <span className="truncate">{entry.studentName}</span>
                              {entry.isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shrink-0">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-sky-300 truncate">
                              Lớp {entry.className} · Đề {entry.examTitle} ·{' '}
                              {formatDuration(entry.durationSeconds)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-black text-amber-300 tabular-nums">
                            {entry.totalScore.toFixed(2)}đ
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => setIsLeaderboardOpen(true)}
                className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Mở Bảng Xếp Hạng Đầy Đủ ({leaderboardEntries.length})</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Bảng 2 dòng điền Họ và tên & Lớp khi học sinh chọn Bắt Đầu Làm Bài */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#071126] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-cyan-500/40 space-y-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-[#040817] shadow-md">
                  <UserCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Thông Tin Học Sinh Làm Bài
                  </h3>
                  <p className="text-xs text-sky-300">
                    Điền đầy đủ họ và tên, lớp trước khi bắt đầu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#0b1739] text-sky-300 hover:text-white border border-sky-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {studentInfoError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{studentInfoError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!studentName.trim() || !studentClass.trim()) {
                  setStudentInfoError('Vui lòng điền đầy đủ cả 2 dòng: Họ và tên và Lớp.');
                  return;
                }
                setStudentInfoError('');
                setIsStudentModalOpen(false);
                if (!isExamStarted && !isSubmitted) {
                  examStartTimeRef.current = Date.now();
                  setIsExamStarted(true);
                }
              }}
              className="space-y-4"
            >
              {/* Dòng 1: Họ và tên */}
              <div>
                <label className="block text-xs font-bold text-sky-200 mb-1.5">
                  Họ và tên <span className="text-rose-400">*</span>
                </label>
                <input
                  ref={studentNameInputRef}
                  type="text"
                  autoFocus
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    if (studentInfoError) setStudentInfoError('');
                  }}
                  placeholder="Nhập họ và tên học sinh (ví dụ: Nguyễn Minh Quân)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1739] border border-sky-700 text-sm font-semibold text-white placeholder-sky-400/50 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Dòng 2: Lớp */}
              <div>
                <label className="block text-xs font-bold text-sky-200 mb-1.5">
                  Lớp <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => {
                    setStudentClass(e.target.value);
                    if (studentInfoError) setStudentInfoError('');
                  }}
                  placeholder="Nhập lớp (ví dụ: 10A1)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1739] border border-sky-700 text-sm font-semibold text-amber-300 placeholder-sky-400/50 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-[#040817] bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-lg transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {!isExamStarted && !isSubmitted ? 'Vào Làm Bài' : 'Lưu Thông Tin'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Submit */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#071126] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-sky-800 space-y-4 text-white">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xác Nhận Nộp Bài Thi?</h3>
                <p className="text-xs text-sky-300">
                  Kiểm tra tiến độ làm bài & thông tin ghi danh Bảng Xếp Hạng
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1739] border border-sky-900 text-xs space-y-2 text-slate-200">
              <div className="flex justify-between">
                <span>Số câu đã hoàn thành:</span>
                <span className="font-bold font-mono text-cyan-300">
                  {totalAnswered}/{totalExamQuestions} câu
                </span>
              </div>
              <div className="flex justify-between">
                <span>Số câu còn bỏ trống:</span>
                <span className="font-bold font-mono text-rose-400">
                  {totalExamQuestions - totalAnswered} câu
                </span>
              </div>
              <div className="flex justify-between">
                <span>Câu đánh dấu xem lại:</span>
                <span className="font-bold font-mono text-amber-300">
                  {bookmarkedQuestions.size} câu
                </span>
              </div>
            </div>

            {/* Thông tin học sinh ghi danh Bảng xếp hạng */}
            <div className="p-4 rounded-xl bg-[#0b1739] border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <User className="w-3.5 h-3.5" />
                <span>Thông tin thí sinh ghi danh Bảng Xếp Hạng:</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-[11px] text-sky-300 mb-1">Họ và tên học sinh</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Nhập họ và tên..."
                    className="w-full px-3 py-1.5 rounded-lg bg-[#071126] border border-sky-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-sky-300 mb-1">Lớp</label>
                  <input
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="10A1"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#071126] border border-sky-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sau khi nộp bài, hệ thống sẽ tự động chấm điểm, lưu kết quả vào Bảng xếp hạng và hiển thị toàn bộ lời giải chi tiết.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-sky-950 transition-colors"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#071126] bg-cyan-400 hover:bg-cyan-300 shadow-md transition-colors"
              >
                Đồng ý nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formula Sheet Modal */}
      <FormulaSheetModal isOpen={isFormulaOpen} onClose={() => setIsFormulaOpen(false)} />

      {/* Scratchpad Whiteboard Modal */}
      <ScratchpadModal isOpen={isScratchpadOpen} onClose={() => setIsScratchpadOpen(false)} />

      {/* Import Word Modal */}
      <ImportWordModal
        isOpen={isImportWordOpen}
        onClose={() => setIsImportWordOpen(false)}
        onApplyExam={handleApplyWordExam}
        defaultTitle="Đề tự luyện"
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboardEntries}
        allExams={allExams}
        selectedExamId={selectedExamId}
        defaultStudentName={studentName}
        defaultStudentClass={studentClass}
        onAddManualEntry={handleAddManualLeaderboardEntry}
        onDeleteEntry={handleDeleteLeaderboardEntry}
        onResetDefault={handleResetLeaderboardDefault}
        onOpenGoogleSheetSync={() => {
          setIsLeaderboardOpen(false);
          setIsGoogleSheetModalOpen(true);
        }}
      />

      {/* Google Sheet Sync & Code Guide Modal */}
      <GoogleSheetSyncModal
        isOpen={isGoogleSheetModalOpen}
        onClose={() => setIsGoogleSheetModalOpen(false)}
        webAppUrl={googleSheetUrl}
        onChangeWebAppUrl={handleChangeGoogleSheetUrl}
        autoSync={autoSyncSheet}
        onChangeAutoSync={handleChangeAutoSyncSheet}
        entries={leaderboardEntries}
        onMergeEntriesFromSheet={handleMergeEntriesFromSheet}
      />

      {/* PWA & Offline Info Modal */}
      <PWAInstallModal
        isOpen={isPWAInfoOpen}
        onClose={() => setIsPWAInfoOpen(false)}
        isOnline={isOnline}
        swReady={swReady}
        isInstalled={isInstalled}
        isIOS={isIOS}
        hasNativePrompt={hasNativePrompt}
        onPromptInstall={promptInstall}
      />

      {/* Mobile Question Navigator Bottom Sheet (chỉ hiện khi bấm nút Phiếu Trả Lời trên điện thoại) */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-fadeIn no-print">
          <div
            className="flex-1"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="bg-[#071126] border-t border-cyan-500/40 rounded-t-3xl p-4 pb-safe max-h-[82vh] overflow-y-auto space-y-3 shadow-2xl">
            <div className="w-10 h-1.5 bg-sky-800 rounded-full mx-auto mb-1" />
            <div className="flex items-center justify-between pb-2 border-b border-sky-900/80">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-extrabold text-white">
                  Chuyển Nhanh Câu Hỏi & Tiện Ích
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-[#0b1739] text-sky-300 hover:text-white border border-sky-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick mode switch on mobile */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExamMode((m) => (m === 'exam' ? 'practice' : 'exam'))}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${
                  examMode === 'exam'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{examMode === 'exam' ? 'Chế độ: Thi Tính Giờ' : 'Chế độ: Luyện Tập'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setIsPWAInfoOpen(true);
                }}
                className="min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{isOnline ? 'Cài App Offline' : 'Đang Chạy Offline'}</span>
              </button>
            </div>

            <QuestionNav
              exam={currentExam}
              answers={answers}
              currentSection={activeFilterPart === 'all' ? 'part1' : activeFilterPart}
              onNavigate={(part, index) => {
                setIsMobileNavOpen(false);
                handleNavigateQuestion(part, index);
              }}
              bookmarkedQuestions={bookmarkedQuestions}
              onToggleBookmark={toggleBookmark}
              isSubmitted={isSubmitted}
              interactedPart4={interactedPart4}
              studentName={studentName}
              studentClass={studentClass}
              onEditStudentInfo={() => {
                setIsMobileNavOpen(false);
                setIsStudentModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Thanh Điều Hướng Nhanh Cố Định Đáy Màn Hình Điện Thoại (lg:hidden) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#070f24]/95 backdrop-blur-md border-t border-sky-900/80 px-3 py-2 pb-safe shadow-2xl no-print">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Nút Mở Phiếu Trả Lời Nhanh */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0b1739] hover:bg-sky-900 border border-sky-700/80 text-white flex items-center gap-2 text-xs font-bold active:scale-95 transition-transform"
          >
            <LayoutGrid className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Phiếu TL:{' '}
              <strong className="text-amber-300 font-mono">
                {totalAnswered}/{totalExamQuestions}
              </strong>
            </span>
          </button>

          {/* Hiển thị thời gian đã làm / trạng thái ở giữa trên ĐT */}
          {isExamStarted && !isSubmitted && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-950/80 border border-sky-800/70 text-cyan-300 font-mono text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                {Math.floor(
                  Math.max(0, currentExam.durationMinutes * 60 - timerElapsedSeconds) / 60
                )
                  .toString()
                  .padStart(2, '0')}
                :
                {(Math.max(0, currentExam.durationMinutes * 60 - timerElapsedSeconds) % 60)
                  .toString()
                  .padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Nút Hành Động Chính (Bắt Đầu / Nộp Bài / Làm Lại) */}
          {isSubmitted ? (
            <button
              type="button"
              onClick={handleResetExam}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-500 text-[#040817] font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm Lại</span>
            </button>
          ) : !isExamStarted ? (
            <button
              type="button"
              onClick={handleStartExam}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-[#040817] font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Bắt Đầu Làm Bài</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp Bài</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 bg-[#030612] border-t border-sky-950 text-slate-400 py-6 pb-24 lg:pb-6 text-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">GV Thanhbtx-mn</span>
          </div>
          <div className="text-sky-300/80 text-center sm:text-right">
            Hệ thống luyện thi & Đánh giá năng lực Toán học trực tuyến (Hỗ trợ Offline Mọi Điện Thoại)
          </div>
        </div>
      </footer>
    </div>
  );
}
