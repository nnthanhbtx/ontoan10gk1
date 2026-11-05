import { ExamSet, StudentAnswers, PartScoreDetail } from '../types/exam';

export function calculateScore(exam: ExamSet, answers: StudentAnswers): PartScoreDetail {
  // 1. Chấm Phần I (12 câu - mỗi câu 0.25đ, tối đa 3.0đ)
  let p1Correct = 0;
  exam.part1.forEach((q) => {
    if (answers.part1[q.id] === q.correctAnswer) {
      p1Correct++;
    }
  });
  const part1Score = Math.round(p1Correct * 0.25 * 100) / 100;
  const part1Max = 3.0;

  // 2. Chấm Phần II (4 câu - Chuẩn quy chế Bộ GD&ĐT 2025: 1 ý đúng = 0.1đ; 2 ý = 0.25đ; 3 ý = 0.5đ; 4 ý = 1.0đ)
  let part2Score = 0;
  const part2Details = exam.part2.map((q) => {
    let correctInQuestion = 0;
    const userAnswersForQ = answers.part2[q.id] || { a: null, b: null, c: null, d: null };

    q.statements.forEach((st) => {
      const userChoice = userAnswersForQ[st.label];
      if (userChoice !== null && userChoice === st.isCorrect) {
        correctInQuestion++;
      }
    });

    let qScore = 0;
    if (correctInQuestion === 1) qScore = 0.1;
    else if (correctInQuestion === 2) qScore = 0.25;
    else if (correctInQuestion === 3) qScore = 0.5;
    else if (correctInQuestion === 4) qScore = 1.0;

    part2Score += qScore;
    return {
      questionId: q.number,
      correctStatementsCount: correctInQuestion,
      scoreAwarded: qScore,
    };
  });
  part2Score = Math.round(part2Score * 100) / 100;
  const part2Max = Math.round(exam.part2.length * 1.0 * 100) / 100;

  // 3. Chấm Phần III (4 câu trả lời ngắn - mỗi câu 0.5đ, tối đa 2.0đ)
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

  let p3Correct = 0;
  exam.part3.forEach((q) => {
    const rawUserAns = (answers.part3[q.id] || '').trim().toLowerCase().replace(',', '.');
    if (!rawUserAns) return;
    const numUser = parseMathNumber(rawUserAns);

    const isCorrect = q.acceptableAnswers.some((ans) => {
      const formattedAns = ans.trim().toLowerCase().replace(',', '.');
      if (rawUserAns === formattedAns) return true;
      const numAns = parseMathNumber(formattedAns);
      if (!isNaN(numUser) && !isNaN(numAns)) {
        return Math.abs(numUser - numAns) <= 0.015;
      }
      return false;
    });

    if (isCorrect) {
      p3Correct++;
    }
  });
  const part3Score = Math.round(p3Correct * 0.5 * 100) / 100;
  const part3Max = Math.round(exam.part3.length * 0.5 * 100) / 100;

  // 4. Chấm Phần IV (4 câu sắp xếp các dòng lời giải theo thứ tự đúng - 3.0đ tổng, 0.75đ/câu)
  let part4Score = 0;
  const part4Details = exam.part4.map((q) => {
    const userStepIds = answers.part4[q.id] || [];
    const correctStepIds = q.steps
      .slice()
      .sort((a, b) => a.originalIndex - b.originalIndex)
      .map((s) => s.id);

    // Kiểm tra xem thứ tự có hoàn toàn khớp 100% không
    let isFullyCorrect = false;
    let correctPositions = 0;

    if (userStepIds.length === correctStepIds.length) {
      userStepIds.forEach((id, idx) => {
        if (id === correctStepIds[idx]) {
          correctPositions++;
        }
      });
      isFullyCorrect = correctPositions === correctStepIds.length;
    }

    let qScore = 0;
    if (isFullyCorrect) {
      qScore = 0.75;
    } else if (correctPositions > 0 && correctStepIds.length > 0) {
      // Điểm từng phần tương ứng
      qScore = Math.round((correctPositions / correctStepIds.length) * 0.75 * 100) / 100;
    }

    part4Score += qScore;
    return {
      questionId: q.number,
      isFullyCorrect,
      correctPositionsCount: correctPositions,
      scoreAwarded: qScore,
    };
  });
  part4Score = Math.round(part4Score * 100) / 100;
  const part4Max = 3.0;

  const totalScore = Math.round((part1Score + part2Score + part3Score + part4Score) * 100) / 100;
  const totalMax = 10.0;

  // Xếp loại học lực
  let rank: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Cần cố gắng' = 'Trung bình';
  if (totalScore >= 9.0) rank = 'Xuất sắc';
  else if (totalScore >= 8.0) rank = 'Giỏi';
  else if (totalScore >= 6.5) rank = 'Khá';
  else if (totalScore >= 5.0) rank = 'Trung bình';
  else rank = 'Cần cố gắng';

  // Phân tích năng lực (%)
  const knowledgeRecall = Math.min(100, Math.round((p1Correct / Math.max(1, exam.part1.length)) * 100));
  const understanding = Math.min(100, Math.round((part2Score / Math.max(1, part2Max)) * 100));
  const application = Math.min(100, Math.round((p3Correct / Math.max(1, exam.part3.length)) * 100));
  const logicalReasoning = Math.min(100, Math.round((part4Score / part4Max) * 100));

  return {
    part1Score,
    part1Max,
    part1CorrectCount: p1Correct,

    part2Score,
    part2Max,
    part2Details,

    part3Score,
    part3Max,
    part3CorrectCount: p3Correct,

    part4Score,
    part4Max,
    part4Details,

    totalScore,
    totalMax,
    rank,
    competencyAnalysis: {
      knowledgeRecall,
      understanding,
      application,
      logicalReasoning,
    },
  };
}
