import React, { useEffect } from 'react';
import { PartScoreDetail } from '../types/exam';
import confetti from 'canvas-confetti';
import { Award, Printer, RotateCcw, ArrowDownCircle, Star, Trophy, User, Clock } from 'lucide-react';
import { formatDuration } from './LeaderboardModal';

interface ResultReportProps {
  scoreDetail: PartScoreDetail;
  examTitle: string;
  studentName?: string;
  studentClass?: string;
  durationSeconds?: number;
  rankPosition?: number;
  totalRanked?: number;
  onResetExam: () => void;
  onScrollToQuestions: () => void;
  onOpenLeaderboard?: () => void;
}

export const ResultReport: React.FC<ResultReportProps> = ({
  scoreDetail,
  examTitle,
  studentName,
  studentClass,
  durationSeconds,
  rankPosition,
  totalRanked,
  onResetExam,
  onScrollToQuestions,
  onOpenLeaderboard,
}) => {
  useEffect(() => {
    if (scoreDetail.totalScore >= 7.0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [scoreDetail.totalScore]);

  // Sinh lời nhận xét chuẩn ngôn ngữ sư phạm và chuẩn chính tả tiếng Việt dựa trên kết quả chi tiết từng phần
  const getTeacherFeedback = (detail: PartScoreDetail) => {
    const score = detail.totalScore;
    const p1Ratio = detail.part1Max > 0 ? detail.part1Score / detail.part1Max : 1;
    const p2Ratio = detail.part2Max > 0 ? detail.part2Score / detail.part2Max : 1;
    const p3Ratio = detail.part3Max > 0 ? detail.part3Score / detail.part3Max : 1;
    const p4Ratio = detail.part4Max > 0 ? detail.part4Score / detail.part4Max : 1;

    // Phân tích chi tiết các phần làm tốt và phần cần rèn luyện thêm
    const strongParts: string[] = [];
    const weakParts: string[] = [];

    if (p1Ratio >= 0.8) strongParts.push('Phần I (Trắc nghiệm nhiều phương án lựa chọn)');
    else if (p1Ratio < 0.6) weakParts.push('Phần I (Trắc nghiệm nhiều phương án lựa chọn)');

    if (p2Ratio >= 0.8) strongParts.push('Phần II (Trắc nghiệm đúng/sai)');
    else if (p2Ratio < 0.6) weakParts.push('Phần II (Trắc nghiệm đúng/sai)');

    if (p3Ratio >= 0.75) strongParts.push('Phần III (Trắc nghiệm trả lời ngắn)');
    else if (p3Ratio < 0.5) weakParts.push('Phần III (Trắc nghiệm trả lời ngắn)');

    if (detail.part4Max > 0) {
      if (p4Ratio >= 0.75) strongParts.push('Phần IV (Tự luận sắp xếp các bước giải)');
      else if (p4Ratio < 0.5) weakParts.push('Phần IV (Tự luận sắp xếp các bước giải)');
    }

    const strengthDetail =
      strongParts.length > 0
        ? ` Đặc biệt, em đã thể hiện sự nắm vững kiến thức và kỹ năng làm bài rất tốt ở ${strongParts.join(', ')}.`
        : '';

    const improvementDetail =
      weakParts.length > 0
        ? ` Bên cạnh đó, em cần dành thêm thời gian rà soát và củng cố kỹ năng làm bài ở ${weakParts.join(', ')} để nâng cao kết quả một cách đồng đều hơn.`
        : ' Em cần tiếp tục duy trì thói quen kiểm tra lại kết quả và các bước biến đổi đại số trước khi nộp bài để hạn chế tối đa những sai sót đáng tiếc.';

    if (score >= 9.0) {
      return {
        badge: 'Xuất sắc',
        title: 'Nắm vững kiến thức toàn diện, tư duy toán học chặt chẽ và mạch lạc',
        strengths:
          `Thầy/Cô tuyên dương tinh thần học tập nghiêm túc và kết quả xuất sắc của em! Em đã nắm rất vững hệ thống kiến thức cốt lõi chương trình Toán lớp 10 (Mệnh đề và Tập hợp, Bất phương trình và Hệ bất phương trình bậc nhất hai ẩn, Hệ thức lượng trong tam giác). Khả năng vận dụng công thức, phân tích tính đúng/sai của các mệnh đề toán học và trình bày các bước suy luận tự luận đều đạt độ chính xác rất cao.${strengthDetail}`,
        limitations:
          score === 10
            ? 'Bài làm của em đạt điểm tuyệt đối ở tất cả các phần thi, thể hiện kỹ năng tính toán cẩn thận và tư duy lập luận rất vững vàng.'
            : 'Em chỉ còn một vài sai sót rất nhỏ ở các bước tính toán chi tiết; chỉ cần rà soát kỹ hơn điều kiện của bài toán và quy tắc làm tròn số là bài làm sẽ hoàn thiện trọn vẹn.',
        recommendation:
          'Em hãy tiếp tục phát huy năng lực tự học, chủ động rèn luyện thêm các bài toán vận dụng cao gắn với thực tiễn (bài toán tối ưu trong quy hoạch tuyến tính, bài toán đo đạc chiều cao và khoảng cách trong hình học) để chuẩn bị tốt nhất cho các kỳ thi học sinh giỏi và kỳ thi đánh giá năng lực.',
      };
    } else if (score >= 8.0) {
      return {
        badge: 'Giỏi',
        title: 'Nền tảng kiến thức vững vàng, kỹ năng giải toán và lập luận tốt',
        strengths:
          `Thầy/Cô khen ngợi kết quả học tập của em! Em nắm chắc các khái niệm, định lí và công thức trọng tâm của chương trình Toán lớp 10, đồng thời có khả năng vận dụng linh hoạt vào giải các dạng bài tập từ cơ bản đến vận dụng.${strengthDetail}`,
        limitations:
          `Ở một số câu hỏi đòi hỏi phân tích sâu hoặc kết hợp nhiều bước biến đổi, em còn đôi chỗ sơ suất khi xét dấu bất phương trình, xác định miền nghiệm hoặc làm tròn kết quả ở câu hỏi trả lời ngắn.${improvementDetail}`,
        recommendation:
          'Sau khi xem lại chi tiết bài giải, em nên ghi chú lại những câu làm chưa đúng vào sổ tay học tập, rèn luyện thói quen đọc kỹ đề bài, gạch chân các dữ kiện quan trọng và kiểm tra lại điều kiện xác định trước khi kết luận đáp số.',
      };
    } else if (score >= 6.5) {
      return {
        badge: 'Khá',
        title: 'Nắm được kiến thức cơ bản nhưng cần rèn luyện thêm tính chính xác và chặt chẽ',
        strengths:
          `Em có ý thức làm bài và đã nắm được các kiến thức, công thức cơ bản ở mức độ nhận biết và thông hiểu trong chương trình Toán lớp 10.${strengthDetail}`,
        limitations:
          `Khi giải quyết các câu hỏi yêu cầu suy luận nhiều bước hoặc vận dụng thực tế, em còn nhầm lẫn ở một số phép toán trên tập hợp, cách xác định miền nghiệm của hệ bất phương trình bậc nhất hai ẩn hoặc việc áp dụng định lí côsin, định lí sin trong tam giác.${improvementDetail}`,
        recommendation:
          'Em hãy xem kỹ lời giải chi tiết của từng câu hỏi bên dưới, đối chiếu với bài làm của mình để nhận diện rõ nguyên nhân sai sót. Đồng thời, em nên hệ thống hóa lại các công thức lượng giác và luyện tập thêm các bài toán tự luận theo từng bước để rèn tư duy logic.',
      };
    } else if (score >= 5.0) {
      return {
        badge: 'Trung bình',
        title: 'Đạt yêu cầu cơ bản nhưng cần củng cố thêm kiến thức và kỹ năng tính toán',
        strengths:
          `Em đã cố gắng hoàn thành bài thi và giải quyết đúng một số câu hỏi ở mức độ nhận biết kiến thức nền tảng.${strengthDetail}`,
        limitations:
          `Hệ thống kiến thức của em chưa thật sự vững chắc; em còn gặp lúng túng khi phân tích các ý ở phần trắc nghiệm đúng/sai, tính toán kết quả ở phần trả lời ngắn và sắp xếp trình tự lập luận ở phần tự luận.${improvementDetail}`,
        recommendation:
          'Em cần ôn tập lại một cách có hệ thống các định nghĩa, tính chất và công thức trong sách giáo khoa Toán 10 (đặc biệt là các phép toán tập hợp, cách biểu diễn miền nghiệm bất phương trình và các hệ thức lượng trong tam giác). Em nên chuyển sang "Chế độ Luyện Tập" để làm lại từng phần và đọc kỹ hướng dẫn giải chi tiết.',
      };
    } else {
      return {
        badge: 'Cần cố gắng',
        title: 'Cần ôn tập nghiêm túc và củng cố lại kiến thức nền tảng môn Toán 10',
        strengths:
          'Thầy/Cô ghi nhận sự cố gắng tham gia làm bài của em. Đây là cơ hội quan trọng để em tự đánh giá đúng năng lực hiện tại và kịp thời bổ sung những phần kiến thức còn thiếu hụt.',
        limitations:
          `Kết quả bài làm cho thấy em chưa nắm vững các khái niệm và công thức cơ bản của chương trình Toán lớp 10, dẫn đến việc lúng túng khi lựa chọn phương án đúng cũng như khi thực hiện các phép tính và suy luận toán học.${improvementDetail}`,
        recommendation:
          'Em đừng nản lòng! Hãy bắt đầu ôn tập lại từ các kiến thức cơ bản nhất trong sách giáo khoa theo từng bài học, kết hợp xem kỹ lời giải chi tiết của đề thi này ở "Chế độ Luyện Tập". Khi gặp nội dung chưa hiểu rõ, em hãy chủ động trao đổi với thầy cô hoặc bạn bè để được hướng dẫn kịp thời.',
      };
    }
  };

  const feedback = getTeacherFeedback(scoreDetail);

  return (
    <div className="bg-[#071126] rounded-2xl border border-sky-900/60 shadow-2xl p-6 sm:p-8 space-y-8 animate-fadeIn text-white">
      {/* Banner Điểm Số */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-sky-950/80">
        <div className="space-y-3 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>Phiếu Kết Quả Đánh Giá Năng Lực Toán Học</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {examTitle.toLowerCase().startsWith('đề') ? examTitle : `Đề ${examTitle}`}
          </h2>

          {/* Thông tin Học sinh & Thứ hạng BXH */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-0.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1739] border border-sky-800/80 text-xs">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-sky-300">Họ và tên:</span>
              <span className="font-bold text-white">
                {studentName && studentName.trim() ? studentName.trim() : 'Học sinh Lớp 10'}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1739] border border-sky-800/80 text-xs">
              <span className="text-sky-300">Lớp:</span>
              <span className="font-bold text-amber-300">
                {studentClass && studentClass.trim() ? studentClass.trim() : '10'}
              </span>
            </div>

            {typeof durationSeconds === 'number' && durationSeconds > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1739] border border-sky-800/80 text-xs">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-sky-300">Thời gian làm bài:</span>
                <span className="font-mono font-bold text-white">
                  {formatDuration(durationSeconds)}
                </span>
              </div>
            )}

            {rankPosition && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-xs text-amber-300 font-bold transition-colors"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Hạng #{rankPosition}
                  {totalRanked ? ` / ${totalRanked}` : ''} trên Bảng Xếp Hạng
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Điểm tổng Score Badge */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-br from-[#0c1a40] to-[#060e24] text-white min-w-[190px] border border-cyan-500/40 shadow-xl text-center">
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            Tổng Điểm Bài Thi
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight my-1 text-white tabular-nums">
            {scoreDetail.totalScore}
            <span className="text-xl text-cyan-300 font-sans font-medium">/10</span>
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-bold px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>Xếp loại: {scoreDetail.rank}</span>
          </div>
        </div>
      </div>

      {/* 4 Phần Chi Tiết Điểm Số */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Phần I */}
        <div className="p-4 rounded-2xl bg-[#0b1739] border border-sky-800/60 space-y-1.5 shadow-md">
          <div className="text-xs font-bold text-cyan-300">Phần I: Trắc nghiệm nhiều lựa chọn</div>
          <div className="text-2xl font-black font-mono text-white tabular-nums">
            {scoreDetail.part1Score}
            <span className="text-sm text-sky-400 font-normal"> / 3.0đ</span>
          </div>
          <div className="text-xs text-sky-300">
            Đúng {scoreDetail.part1CorrectCount}/12 câu (0,25 điểm/câu)
          </div>
        </div>

        {/* Phần II */}
        <div className="p-4 rounded-2xl bg-[#0b1739] border border-sky-800/60 space-y-1.5 shadow-md">
          <div className="text-xs font-bold text-cyan-300">
            Phần II: Trắc nghiệm đúng / sai ({scoreDetail.part2Details.length} câu)
          </div>
          <div className="text-2xl font-black font-mono text-white tabular-nums">
            {scoreDetail.part2Score}
            <span className="text-sm text-sky-400 font-normal"> / {scoreDetail.part2Max}đ</span>
          </div>
          <div className="text-xs text-sky-300">
            Chấm điểm theo quy chế định dạng mới
          </div>
        </div>

        {/* Phần III */}
        <div className="p-4 rounded-2xl bg-[#0b1739] border border-sky-800/60 space-y-1.5 shadow-md">
          <div className="text-xs font-bold text-cyan-300">Phần III: Trắc nghiệm trả lời ngắn</div>
          <div className="text-2xl font-black font-mono text-white tabular-nums">
            {scoreDetail.part3Score}
            <span className="text-sm text-sky-400 font-normal"> / {scoreDetail.part3Max}đ</span>
          </div>
          <div className="text-xs text-sky-300">
            Đúng {scoreDetail.part3CorrectCount}/4 câu (0,5 điểm/câu)
          </div>
        </div>

        {/* Phần IV */}
        <div className="p-4 rounded-2xl bg-[#0b1739] border border-sky-800/60 space-y-1.5 shadow-md">
          <div className="text-xs font-bold text-cyan-300">Phần IV: Tự luận sắp xếp bước giải</div>
          <div className="text-2xl font-black font-mono text-white tabular-nums">
            {scoreDetail.part4Score}
            <span className="text-sm text-sky-400 font-normal"> / {scoreDetail.part4Max}đ</span>
          </div>
          <div className="text-xs text-sky-300">
            Đánh giá tư duy trình bày lời giải tự luận
          </div>
        </div>
      </div>

      {/* Đánh Giá Năng Lực Toán Học */}
      <div className="p-5 rounded-2xl bg-[#09132c] border border-sky-900 space-y-4">
        <h3 className="text-sm font-bold text-cyan-300">
          Mức Độ Đạt Được Theo Từng Thành Phần Năng Lực Toán Học:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-300">Nhận biết và tái hiện kiến thức cơ bản</span>
              <span className="font-mono text-cyan-300">{scoreDetail.competencyAnalysis.knowledgeRecall}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-sky-950 overflow-hidden border border-sky-900">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${scoreDetail.competencyAnalysis.knowledgeRecall}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-300">Thông hiểu và phân tích mệnh đề toán học</span>
              <span className="font-mono text-sky-300">{scoreDetail.competencyAnalysis.understanding}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-sky-950 overflow-hidden border border-sky-900">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${scoreDetail.competencyAnalysis.understanding}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-300">Vận dụng giải toán và tính toán kết quả</span>
              <span className="font-mono text-emerald-300">{scoreDetail.competencyAnalysis.application}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-sky-950 overflow-hidden border border-sky-900">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${scoreDetail.competencyAnalysis.application}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-300">Tư duy lập luận và trình bày lời giải tự luận</span>
              <span className="font-mono text-purple-300">{scoreDetail.competencyAnalysis.logicalReasoning}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-sky-950 overflow-hidden border border-sky-900">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${scoreDetail.competencyAnalysis.logicalReasoning}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Nhận Xét Sư Phạm Của Giáo Viên */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0b1739] border border-amber-500/35 space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap border-b border-sky-900/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-[#071126] font-black text-sm flex items-center justify-center shrink-0 shadow-md">
              ★
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-amber-300">
                Nhận Xét Và Đánh Giá Sư Phạm Sau Bài Làm
              </h3>
              <p className="text-xs text-amber-200/90 font-semibold">{feedback.title}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
            Mức đánh giá: {feedback.badge}
          </span>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-100 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[#071126]/80 border border-emerald-500/30">
            <span className="font-bold text-emerald-300">1. Ưu điểm đạt được: </span>
            <span>{feedback.strengths}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#071126]/80 border border-sky-700/40">
            <span className="font-bold text-sky-300">2. Nội dung cần lưu ý và khắc phục: </span>
            <span>{feedback.limitations}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#071126] border border-amber-500/30 text-amber-100">
            <span className="font-bold text-amber-300">3. Định hướng ôn tập và rèn luyện: </span>
            <span>{feedback.recommendation}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onScrollToQuestions}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#071126] font-bold text-xs transition-colors shadow-md"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Xem Lại Chi Tiết Từng Câu Hỏi & Lời Giải</span>
          </button>
          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-400/50 transition-colors shadow-sm"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Xem Bảng Xếp Hạng</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0b1739] hover:bg-sky-900 text-sky-200 font-semibold text-xs border border-sky-800 transition-colors"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>In Phiếu Kết Quả</span>
          </button>
        </div>

        <button
          onClick={onResetExam}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-white font-bold text-xs transition-colors shadow-sm ml-auto border border-sky-700"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Làm Lại Bài Thi Này</span>
        </button>
      </div>
    </div>
  );
};
