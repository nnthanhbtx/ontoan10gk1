export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'step_ordering';

export type ExamPart = 'part1' | 'part2' | 'part3' | 'part4';

// Phần I: Trắc nghiệm 4 lựa chọn (12 câu)
export interface MultipleChoiceQuestion {
  id: string;
  part: 'part1';
  number: number;
  topic: string;
  prompt: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    content: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  pedagogicalTip: string; // Lời khuyên/Bẫy sai lầm của chuyên gia
  points: number; // Thường là 0.25 điểm
  tikzType?: string;
  tikzCode?: string;
}

// Phần II: Trắc nghiệm Đúng/Sai (4 câu, mỗi câu 4 ý a, b, c, d)
export interface TrueFalseStatement {
  id: string; // 'a' | 'b' | 'c' | 'd'
  label: 'a' | 'b' | 'c' | 'd';
  statement: string;
  isCorrect: boolean; // true = Đúng, false = Sai
  explanation: string;
}

export interface TrueFalseQuestion {
  id: string;
  part: 'part2';
  number: number;
  topic: string;
  prompt: string;
  statements: TrueFalseStatement[];
  pedagogicalTip: string;
  tikzType?: string;
  tikzCode?: string;
  // Điểm tính theo chuẩn Bộ GD&ĐT 2025: đúng 1 ý = 0.1đ, 2 ý = 0.25đ, 3 ý = 0.5đ, 4 ý = 1.0đ (tổng 1.0đ/câu)
}

// Phần III: Trả lời ngắn (6 câu)
export interface ShortAnswerQuestion {
  id: string;
  part: 'part3';
  number: number;
  topic: string;
  prompt: string;
  acceptableAnswers: string[]; // Các đáp án được chấp nhận (ví dụ: ["5", "5.0"], ["-3/2", "-1.5"])
  explanation: string;
  pedagogicalTip: string;
  unit?: string;
  points: number; // 0.25đ/câu
  tikzType?: string;
  tikzCode?: string;
}

// Phần IV: Tự luận ghép/sắp xếp thứ tự các dòng lời giải (4 câu)
export interface SolutionStep {
  id: string;
  originalIndex: number; // Thứ tự đúng (1, 2, 3, 4, 5, ...)
  content: string;
  roleDescription: string; // Ví dụ: "Tìm điều kiện xác định", "Áp dụng định lý cô-sin", v.v.
}

export interface StepOrderingQuestion {
  id: string;
  part: 'part4';
  number: number;
  topic: string;
  problemStatement: string; // Đề bài toán tự luận
  conclusionTarget: string; // Yêu cầu chứng minh/kết luận cần đạt được
  steps: SolutionStep[]; // Danh sách các bước theo thứ tự CHUẨN
  pedagogicalTip: string;
  teacherAnalysis: string; // Phân tích phương pháp tư duy suy luận ngược/xuôi
  points: number; // 0.375 hoặc 0.5đ/câu
  tikzType?: string;
  tikzCode?: string;
}

export interface ExamSet {
  id: string;
  title: string;
  subtitle: string;
  grade: number;
  durationMinutes: number;
  totalPoints: number;
  description: string;
  part1: MultipleChoiceQuestion[];
  part2: TrueFalseQuestion[];
  part3: ShortAnswerQuestion[];
  part4: StepOrderingQuestion[];
}

export interface StudentAnswers {
  part1: Record<string, 'A' | 'B' | 'C' | 'D'>; // questionId -> selected key
  part2: Record<string, Record<'a' | 'b' | 'c' | 'd', boolean | null>>; // questionId -> statementId -> true/false
  part3: Record<string, string>; // questionId -> typed text
  part4: Record<string, string[]>; // questionId -> array of step ids in current arranged order
}

export interface PartScoreDetail {
  part1Score: number;
  part1Max: number;
  part1CorrectCount: number;

  part2Score: number;
  part2Max: number;
  part2Details: {
    questionId: number;
    correctStatementsCount: number;
    scoreAwarded: number;
  }[];

  part3Score: number;
  part3Max: number;
  part3CorrectCount: number;

  part4Score: number;
  part4Max: number;
  part4Details: {
    questionId: number;
    isFullyCorrect: boolean;
    correctPositionsCount: number;
    scoreAwarded: number;
  }[];

  totalScore: number;
  totalMax: number;
  rank: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Cần cố gắng';
  competencyAnalysis: {
    knowledgeRecall: number; // Tái hiện kiến thức (%)
    understanding: number; // Thông hiểu (%)
    application: number; // Vận dụng (%)
    logicalReasoning: number; // Suy luận logic & tự luận (%)
  };
}

export interface LeaderboardEntry {
  id: string;
  studentName: string;
  className: string;
  examId: string;
  examTitle: string;
  totalScore: number;
  part1Score: number;
  part2Score: number;
  part3Score: number;
  part4Score: number;
  durationSeconds: number;
  rank: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Cần cố gắng';
  submittedAt: string;
  isCurrentUser?: boolean;
}

