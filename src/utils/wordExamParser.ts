import {
  ExamSet,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  ShortAnswerQuestion,
  StepOrderingQuestion,
  TrueFalseStatement,
  SolutionStep,
} from '../types/exam';

export interface UnrecognizedQuestionItem {
  part: 'part1' | 'part2' | 'part3' | 'part4';
  partLabel: string;
  questionNumber: number;
  questionLabel: string;
  status: 'missing' | 'incomplete_structure' | 'missing_answer';
  reason: string;
}

export interface ParseResult {
  exam: ExamSet;
  warnings: string[];
  unrecognizedQuestions: UnrecognizedQuestionItem[];
  unrecognizedByPart: {
    part1: UnrecognizedQuestionItem[];
    part2: UnrecognizedQuestionItem[];
    part3: UnrecognizedQuestionItem[];
    part4: UnrecognizedQuestionItem[];
  };
  recognizedByPart: {
    part1: string[];
    part2: string[];
    part3: string[];
    part4: string[];
  };
  counts: {
    part1: number;
    part2: number;
    part3: number;
    part4: number;
    total: number;
  };
}

type SectionHint = 'part1' | 'part2' | 'part3' | 'part4' | null;

const PART_LABELS: Record<'part1' | 'part2' | 'part3' | 'part4', string> = {
  part1: 'Phần I',
  part2: 'Phần II',
  part3: 'Phần III',
  part4: 'Phần IV',
};

/**
 * Tách các phương án A. B. C. D., mệnh đề a) b) c) d), hoặc tiêu đề Câu 1. Câu 2.
 * bị viết chung trên cùng 1 dòng (rất phổ biến trong đề Word dùng phím Tab hoặc PDF gộp dòng).
 * Không tách nếu dấu đó nằm bên trong cặp dấu $...$ của công thức LaTeX.
 */
function splitInlineMarkersOutsideMath(line: string): string[] {
  const segments: string[] = [];
  let inMath = false;
  let lastSplitIndex = 0;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '$' && (i === 0 || line[i - 1] !== '\\')) {
      inMath = !inMath;
      continue;
    }
    if (inMath) continue;

    // Chỉ xét tách khi phía trước là khoảng trắng, tab hoặc ngay sau thẻ đóng [/U]
    const prevChar = i > 0 ? line[i - 1] : '';
    const prevSlice = i >= 4 ? line.slice(i - 4, i).toUpperCase() : '';
    if (i > 0 && (/[\s\t]/.test(prevChar) || prevSlice === '[/U]')) {
      const rest = line.slice(i);
      // Khớp phương án trắc nghiệm: [U]*A.[/U] hoặc *A. hoặc A. / B. / C. / D.
      const mcMatch = rest.match(
        /^(?:(?:\[U\])?\s*\*?\s*(?:\[U\])?[A-D](?:\[\/U\])?\s*[\.\:\)](?:\[\/U\])?(?:\s+|(?=\[U\]|\$)))/
      );
      // Khớp mệnh đề đúng/sai: [U]*a)[/U] hoặc a) / b) / c) / d)
      const tfMatch = rest.match(
        /^(?:(?:\[U\])?\s*\*?\s*(?:\[U\])?[a-d](?:\[\/U\])?\s*\)(?:\[\/U\])?(?:\s+|(?=\[U\]|\$)))/i
      );
      // Khớp tiêu đề Câu X. bị dính trên cùng 1 dòng sau phương án trước đó
      const qHeaderMatch = rest.match(
        /^(?:(?:\[\/?U\])*\s*\*?\s*(?:\[\/?U\])*(?:Câu|CÂU|Bài|BÀI)\s*(?:\[\/?U\])*\s*\d+\s*(?:\[\/?U\])*\s*[\.\:\)]\s+)/
      );

      if (mcMatch || tfMatch || qHeaderMatch) {
        const prevPart = line.slice(lastSplitIndex, i).trim();
        if (prevPart.length > 0) {
          segments.push(prevPart);
          lastSplitIndex = i;
        }
      }
    }
  }

  const finalPart = line.slice(lastSplitIndex).trim();
  if (finalPart.length > 0) {
    segments.push(finalPart);
  }

  return segments.length > 0 ? segments : [line];
}

/**
 * Chuẩn hóa HTML từ Mammoth (.docx) hoặc từ Clipboard Word sang dạng văn bản có đánh dấu [U]...[/U]
 */
export function normalizeWordHtmlToText(rawHtmlOrText: string): string {
  let text = (rawHtmlOrText || '').normalize('NFC');

  // 1. Bảo toàn gạch chân từ inline style của Word/HTML (ví dụ khi paste từ Word)
  text = text.replace(
    /<span\b[^>]*style=["'][^"']*text-decoration\s*:\s*underline[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    '[U]$1[/U]'
  );

  // 2. Đánh dấu các phần tử gạch chân <u>...</u> hoặc <ins>...</ins> bằng [U]...[/U]
  text = text.replace(/<u\b[^>]*>([\s\S]*?)<\/u>/gi, '[U]$1[/U]');
  text = text.replace(/<ins\b[^>]*>([\s\S]*?)<\/ins>/gi, '[U]$1[/U]');

  // 2b. Chuyển đổi chỉ số trên <sup> và chỉ số dưới <sub> từ Word sang chuẩn LaTeX
  text = text
    .replace(/<sup\b[^>]*>\s*(?:o|0|°)\s*<\/sup>/gi, '$^\\circ$')
    .replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
      const cleanInner = inner.replace(/<[^>]+>/g, '').trim();
      return cleanInner ? `$^{${cleanInner}}$` : '';
    })
    .replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (_, inner) => {
      const cleanInner = inner.replace(/<[^>]+>/g, '').trim();
      return cleanInner ? `$_{${cleanInner}}$` : '';
    });

  // 3. Thay thế các thẻ mở/đóng khối, bảng, danh sách thành xuống dòng để không bị dính chữ
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:p|div|tr|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<\/?(?:td|th)\b[^>]*>/gi, '\n');

  // 4. Loại bỏ các thẻ HTML còn lại (trừ thẻ <img> để giữ hình vẽ in-line)
  text = text.replace(/<(?!\/?img\b)[^>]+>/gi, '');

  // 5. Giải mã các ký tự HTML phổ biến
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '-');

  // 5b. Gộp cơ số với số mũ / chỉ số dưới vừa chuyển từ <sup>, <sub>
  text = text
    .replace(/([a-zA-Z0-9\)\}])\$\^\{([^}]+)\}\$/g, '$$$1^{$2}$$')
    .replace(/([a-zA-Z0-9\)\}])\$_\{([^}]+)\}\$/g, '$$$1_{$2}$$')
    .replace(/(\d+)\$\^\\circ\$/g, '$$$1^\\circ$$');

  // 6. Gộp các cặp [/U][U] liền kề và đẩy khoảng trắng thừa ra ngoài thẻ [U]...[/U]
  // để tránh việc bôi đen dư khoảng trắng trong Word làm dính gạch chân sang phương án kế tiếp
  text = text
    .replace(/\[\/U\](\s*)\[U\]/gi, '$1')
    .replace(/\[U\]([ \t]+)/gi, '$1[U]')
    .replace(/([ \t]+)\[\/U\]/gi, '[/U]$1');

  return text;
}

/**
 * Tự động nhận diện loại hình vẽ TikZ minh họa phù hợp cho câu hỏi toán học
 */
function detectAutoTikzType(prompt: string): string | undefined {
  const p = prompt.toLowerCase();
  if (p.includes('a = 7') && p.includes('b = 8') && p.includes('c = 5')) {
    return 'triangle_heron';
  }
  if (p.includes('-x^2 + 4x - 3') || (p.includes('parabol') && p.includes('4x - 3'))) {
    return 'parabola_vertex_2_1';
  }
  if (p.includes('b = 5') && p.includes('c = 8') && p.includes('60')) {
    return 'triangle_60deg';
  }
  if (p.includes('a = 6') && p.includes('30^\\circ') && p.includes('ngoại tiếp')) {
    return 'triangle_sin_circumcircle';
  }
  if (p.includes('b = 3') && p.includes('c = 5') && p.includes('15')) {
    return 'triangle_obtuse_cos';
  }
  if (p.includes('[-2; 3]') && p.includes('(1;')) {
    return 'number_line_intersection';
  }
  if (p.includes('40 học sinh') && p.includes('bóng đá')) {
    return 'venn_diagram_40';
  }
  if (p.includes('100 học sinh') && p.includes('65')) {
    return 'venn_diagram_100';
  }
  if (p.includes('bờ sông') && p.includes('60')) {
    return 'river_triangulation';
  }
  return undefined;
}

/**
 * Kiểm tra xem dòng có phải là tiêu đề Phần (Phần I, Phần II, Phần III, Phần IV) không.
 * Hỗ trợ cả trường hợp người soạn gõ nhầm "Phần II." lần thứ 2 (thay vì Phần III.).
 */
function detectSectionHeader(
  line: string,
  currentSection: SectionHint,
  hasQuestionsInCurrentSection: boolean
): SectionHint {
  const clean = line
    .replace(/\[\/?U\]/gi, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^[\s\*\#\-–—]+/, '')
    .trim();

  // Nhận diện: "Phần I.", "Phần II. (gạch chân đáp án đúng)", "PHẦN III", "Phần IV.", "I. Phần I"
  const match = clean.match(/^(?:[I1234V]+[\.\:\)]\s*)?(?:PHẦN|Phần|PHAN|Phan)\s*(I{1,3}|IV|1|2|3|4)\b/i);
  if (!match) return null;

  const token = match[1].toUpperCase();
  if (token === 'I' || token === '1') return 'part1';
  if (token === 'II' || token === '2') {
    // Nếu trước đó đã ở Phần II và đã có câu hỏi trong Phần II, thì "Phần II." tiếp theo chính là Phần III
    if (currentSection === 'part2' && hasQuestionsInCurrentSection) {
      return 'part3';
    }
    return 'part2';
  }
  if (token === 'III' || token === '3') return 'part3';
  if (token === 'IV' || token === '4') return 'part4';
  return null;
}

/**
 * Kiểm tra dòng có phải là tiêu đề kết thúc đề ("--- HẾT ---", "BẢNG ĐÁP ÁN") không
 */
function isEndOrAnswerTableHeader(line: string): boolean {
  const clean = line
    .replace(/\[\/?U\]/gi, '')
    .replace(/^[\s\*\#\-–—]+|[\s\*\#\-–—]+$/g, '')
    .trim();
  return /^(?:HẾT|BẢNG ĐÁP ÁN|ĐÁP ÁN THAM KHẢO)$/i.test(clean);
}

/**
 * Tạo danh sách đáp án chấp nhận được cho câu trả lời ngắn (hỗ trợ cả dấu phẩy và dấu chấm thập phân)
 */
function buildAcceptableShortAnswers(rawAns: string): string[] {
  const cleaned = rawAns
    .replace(/\[\/?U\]/gi, '')
    .replace(/^\$|\$$/g, '')
    .replace(/[\.\;]$/, '')
    .trim();
  if (!cleaned) return ['0'];

  const parts = cleaned
    .split(/\s*[;|]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  const set = new Set<string>();
  for (const p of parts) {
    set.add(p);
    if (p.includes(',')) {
      set.add(p.replace(/,/g, '.'));
    }
    if (p.includes('.')) {
      set.add(p.replace(/\./g, ','));
    }
  }
  return Array.from(set);
}

/**
 * Làm sạch dòng tiêu đề "Câu 1." để lấy nội dung đề bài trên cùng dòng (nếu có)
 */
function stripQuestionPrefix(line: string): string {
  return line
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(
      /^(?:(?:\[\/?U\])|\s|\*|\#|•|\-)*?(?:Câu|Cau|Bài|Bai|Question)(?:(?:\[\/?U\])|\s)*?\d+(?:(?:\[\/?U\])|\s)*?(?:[\.\:\;\)\-\/](?:(?:\[\/?U\])|\s)*)?/i,
      ''
    )
    .trim();
}

/**
 * Xử lý chuỗi HTML hoặc Text từ file Word (.docx), PDF (.pdf) hoặc clipboard
 */
export function parseWordExamContent(rawHtmlOrText: string, examTitle: string = 'Đề tự luyện'): ParseResult {
  const warnings: string[] = [];
  const unrecognizedQuestions: UnrecognizedQuestionItem[] = [];
  const unrecognizedByPart: ParseResult['unrecognizedByPart'] = {
    part1: [],
    part2: [],
    part3: [],
    part4: [],
  };
  const recognizedByPart: ParseResult['recognizedByPart'] = {
    part1: [],
    part2: [],
    part3: [],
    part4: [],
  };

  const addUnrecognized = (item: UnrecognizedQuestionItem) => {
    const exists = unrecognizedQuestions.some(
      (u) => u.part === item.part && u.questionNumber === item.questionNumber
    );
    if (!exists) {
      unrecognizedQuestions.push(item);
      unrecognizedByPart[item.part].push(item);
    }
  };

  const text = normalizeWordHtmlToText(rawHtmlOrText);

  interface RawQuestionBlock {
    sectionHint: SectionHint;
    explicitQuestionNum: number | null;
    lines: string[];
  }

  const questionBlocks: RawQuestionBlock[] = [];
  const initialLines = text.split(/\r?\n/);

  // Tách sớm các tiêu đề "Câu X." hoặc phương án A. B. C. D. bị dính trên cùng 1 dòng
  const rawLines: string[] = [];
  for (const initLine of initialLines) {
    const trimmedInit = initLine.trim();
    if (!trimmedInit) continue;
    const splitSegments = splitInlineMarkersOutsideMath(trimmedInit);
    for (const seg of splitSegments) {
      if (seg.trim()) rawLines.push(seg.trim());
    }
  }

  let currentBlock: RawQuestionBlock | null = null;
  let currentSectionHint: SectionHint = null;
  let hasQuestionsInCurrentSection = false;
  let isInsideEndTable = false;
  const fallbackAnswerKeyMap: Record<number, 'A' | 'B' | 'C' | 'D'> = {};

  // Lưu lại tất cả các số hiệu "Câu <N>" xuất hiện trong văn bản theo từng phần để phát hiện câu bị sót
  const mentionedNumbersByPart: Record<'part1' | 'part2' | 'part3' | 'part4', Set<number>> = {
    part1: new Set(),
    part2: new Set(),
    part3: new Set(),
    part4: new Set(),
  };
  const parsedNumbersByPart: Record<'part1' | 'part2' | 'part3' | 'part4', Set<number>> = {
    part1: new Set(),
    part2: new Set(),
    part3: new Set(),
    part4: new Set(),
  };

  // Cho phép "Câu 1.", "[U]Câu 1[/U].", "Câu 1:", "Câu 1)", "Câu 1"
  const matchQuestionHeader = (line: string): number | null => {
    const cleanHeader = line
      .replace(/\[\/?U\]/gi, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/^[\s\*\#•\-–—]+/, '')
      .trim();
    const m = cleanHeader.match(/^(?:Câu|Cau|Bài|Bai|Question)\s*(\d+)\s*(?:[\.\:\;\)\-\/]|$|\s+)/i);
    if (!m) return null;
    return parseInt(m[1], 10);
  };

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // 1. Kiểm tra tiêu đề Phần I, Phần II, Phần III, Phần IV
    const detectedSection = detectSectionHeader(
      trimmed,
      currentSectionHint,
      hasQuestionsInCurrentSection
    );
    if (detectedSection) {
      if (currentBlock && currentBlock.lines.length > 0) {
        questionBlocks.push(currentBlock);
        currentBlock = null;
      }
      currentSectionHint = detectedSection;
      hasQuestionsInCurrentSection = false;
      isInsideEndTable = false;
      continue;
    }

    // 2. Kiểm tra dòng "--- HẾT ---" hoặc "BẢNG ĐÁP ÁN"
    if (isEndOrAnswerTableHeader(trimmed)) {
      if (currentBlock && currentBlock.lines.length > 0) {
        questionBlocks.push(currentBlock);
        currentBlock = null;
      }
      isInsideEndTable = true;
      continue;
    }

    if (isInsideEndTable) {
      const matches = trimmed.matchAll(/(\d+)\s*[\.\:\-]?\s*([A-D])\b/gi);
      for (const m of matches) {
        const qNum = parseInt(m[1], 10);
        const ans = m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        if (!fallbackAnswerKeyMap[qNum]) {
          fallbackAnswerKeyMap[qNum] = ans;
        }
      }
      continue;
    }

    // Quét mọi đề cập "Câu <N>" trong dòng để đối chiếu câu bị sót
    const cleanScan = trimmed.replace(/\[\/?U\]/gi, '');
    const inlineMentions = cleanScan.matchAll(/(?:^|\s)(?:Câu|Cau|Bài|Bai|Question)\s*(\d+)\s*(?:[\.\:\;\)\-\/]|$)/gi);
    for (const im of inlineMentions) {
      const num = parseInt(im[1], 10);
      if (num > 0 && num <= 200) {
        const bucket = currentSectionHint || 'part1';
        mentionedNumbersByPart[bucket].add(num);
      }
    }

    // 3. Kiểm tra dòng bắt đầu "Câu 1.", "Câu 2.", ...
    const qHeaderNum = matchQuestionHeader(trimmed);
    if (qHeaderNum !== null) {
      if (currentBlock && currentBlock.lines.length > 0) {
        questionBlocks.push(currentBlock);
      }
      hasQuestionsInCurrentSection = true;
      currentBlock = {
        sectionHint: currentSectionHint,
        explicitQuestionNum: qHeaderNum,
        lines: [trimmed],
      };
    } else if (currentBlock) {
      currentBlock.lines.push(trimmed);
    }
  }

  if (currentBlock && currentBlock.lines.length > 0) {
    questionBlocks.push(currentBlock);
  }

  const part1: MultipleChoiceQuestion[] = [];
  const part2: TrueFalseQuestion[] = [];
  const part3: ShortAnswerQuestion[] = [];
  const part4: StepOrderingQuestion[] = [];

  let qGlobalIndex = 1;

  for (let bIndex = 0; bIndex < questionBlocks.length; bIndex++) {
    const { sectionHint, explicitQuestionNum, lines: rawBlockLines } = questionBlocks[bIndex];
    if (!rawBlockLines || rawBlockLines.length === 0) continue;

    // Tách khối hình vẽ \begin{tikzpicture} ... \end{tikzpicture} nếu có trong câu hỏi
    let extractedTikzCode: string | undefined;
    const joinedBlock = rawBlockLines.join('\n');
    const tikzMatch = joinedBlock.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/);
    const cleanedBlockLines = tikzMatch
      ? joinedBlock
          .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '')
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
      : rawBlockLines;
    if (tikzMatch) {
      extractedTikzCode = tikzMatch[0].replace(/\[\/?U\]/gi, '').trim();
    }

    // Tách các phương án A. B. C. D. hoặc a) b) c) d) nằm trên cùng 1 dòng
    const expandedLines: string[] = [];
    for (const l of cleanedBlockLines) {
      const splitParts = splitInlineMarkersOutsideMath(l);
      for (const sp of splitParts) {
        if (sp.trim()) expandedLines.push(sp.trim());
      }
    }

    if (expandedLines.length === 0) continue;

    const firstLine = expandedLines[0];
    const questionNumber = explicitQuestionNum ?? matchQuestionHeader(firstLine) ?? qGlobalIndex++;

    // Tách phần lời giải nếu có ("Lời giải:", "HD:", "Hướng dẫn giải:")
    let explanation = '';
    const filteredLines: string[] = [];
    let isReadingExp = false;

    for (const l of expandedLines) {
      const cleanForExpCheck = l.replace(/\[\/?U\]/gi, '').trim();
      if (/^(?:Lời giải|Hướng dẫn giải|HDG|HD|Hướng dẫn|Giải)[\:\.]/i.test(cleanForExpCheck)) {
        isReadingExp = true;
        const firstExpLine = cleanForExpCheck
          .replace(/^(?:Lời giải|Hướng dẫn giải|HDG|HD|Hướng dẫn|Giải)[\:\.]/i, '')
          .trim();
        if (firstExpLine) {
          explanation = firstExpLine;
        }
      } else if (isReadingExp) {
        explanation += (explanation ? '\n' : '') + l.replace(/\[\/?U\]/gi, '').trim();
      } else {
        filteredLines.push(l);
      }
    }

    // Các mẫu nhận diện dòng
    const optRegex =
      /^(?:\[U\])?\s*(\*)?\s*(?:\[U\])?([A-D])(?:\[\/U\])?\s*(\*)?\s*[\.\:\)](?:\[\/U\])?\s*(.*)$/i;
    const optStrictUpperRegex =
      /^(?:\[U\])?\s*(\*)?\s*(?:\[U\])?([A-D])(?:\[\/U\])?\s*(\*)?\s*[\.\:\)](?:\[\/U\])?\s*(.*)$/;
    const stRegex =
      /^(?:\[U\])?\s*(\*)?\s*(?:\[U\])?([a-d])(?:\[\/U\])?\s*(\*)?\s*[\.\)\:](?:\[\/U\])?\s*(.*)$/i;
    const shortAnsRegex =
      /^(?:\[\/?U\])*\s*(?:Đáp số|Đáp án|KQ|Kết quả|ĐS|Trả lời)\s*[\:\.\=]\s*(.*)$/i;
    const stepRegex =
      /^(?:\[\/?U\])*\s*(?:[\-\+•]\s*)?(?:Bước|Dòng|Ý)\s*(\d+)\s*[\:\.\-]\s*(.*)$/i;

    let targetPart: 'part1' | 'part2' | 'part3' | 'part4';

    const matchedPart2Count = filteredLines.slice(1).filter((l) => {
      if (/^(?:\[U\])?\s*\*?\s*(?:\[U\])?[a-d](?:\[\/U\])?\s*\*?\s*\)/i.test(l)) return true;
      if (sectionHint === 'part2' && stRegex.test(l)) return true;
      return false;
    }).length;

    const matchedPart1Count = filteredLines
      .slice(1)
      .filter((l) => (sectionHint === 'part1' ? optRegex.test(l) : optStrictUpperRegex.test(l))).length;

    const hasStepLines = filteredLines.slice(1).some((l) => stepRegex.test(l));
    const hasShortAnsLines = filteredLines.slice(1).some((l) => shortAnsRegex.test(l));

    if (sectionHint === 'part1') {
      targetPart = 'part1';
    } else if (sectionHint === 'part2') {
      targetPart = 'part2';
    } else if (sectionHint === 'part3') {
      targetPart = 'part3';
    } else if (sectionHint === 'part4') {
      targetPart = 'part4';
    } else if (matchedPart2Count >= 2) {
      targetPart = 'part2';
    } else if (matchedPart1Count >= 2) {
      targetPart = 'part1';
    } else if (hasStepLines) {
      targetPart = 'part4';
    } else if (hasShortAnsLines) {
      targetPart = 'part3';
    } else {
      targetPart = 'part3';
    }

    parsedNumbersByPart[targetPart].add(questionNumber);
    mentionedNumbersByPart[targetPart].add(questionNumber);

    // --- XỬ LÝ TỪNG PHẦN ---
    if (targetPart === 'part1') {
      const promptLines: string[] = [];
      const options: { key: 'A' | 'B' | 'C' | 'D'; content: string; isCorrect: boolean }[] = [];
      let explicitAnswer: 'A' | 'B' | 'C' | 'D' | null = null;

      const cleanFirst = stripQuestionPrefix(firstLine);
      if (cleanFirst) promptLines.push(cleanFirst);

      for (let i = 1; i < filteredLines.length; i++) {
        const line = filteredLines[i];
        const cleanLineNoU = line.replace(/\[\/?U\]/gi, '').trim();
        const ansLineMatch = cleanLineNoU.match(
          /^(?:Đáp án(?:\s*đúng)?|Chọn)\s*[\:\.\-]?\s*([A-D])\b/i
        );
        if (ansLineMatch) {
          explicitAnswer = ansLineMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          continue;
        }

        const match = line.match(optRegex);
        if (match) {
          const starBefore = Boolean(match[1]);
          const key = match[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          const starAfter = Boolean(match[3]);
          let content = match[4].trim();

          const isUnderlined =
            line.includes('[U]') ||
            line.includes('[/U]') ||
            line.includes('<u>') ||
            starBefore ||
            starAfter ||
            content.startsWith('*');

          content = content
            .replace(/^\*\s*/, '')
            .replace(/\[\/?U\]/gi, '')
            .replace(/<\/?u>/gi, '')
            .trim();

          options.push({ key, content, isCorrect: isUnderlined });
        } else if (options.length === 0) {
          promptLines.push(line);
        } else {
          options[options.length - 1].content += ' ' + line.replace(/\[\/?U\]/gi, '').trim();
        }
      }

      // Trường hợp Word tự động đánh số (Auto-Numbering <ol><li>) làm mất chữ A., B., C., D.
      if (options.length === 0 && promptLines.length >= 5) {
        const optLines = promptLines.splice(promptLines.length - 4, 4);
        const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
        optLines.forEach((ol, idx) => {
          const isUnderlined = ol.includes('[U]') || ol.includes('[/U]') || ol.startsWith('*');
          options.push({
            key: keys[idx],
            content: ol.replace(/^\*\s*/, '').replace(/\[\/?U\]/gi, '').trim(),
            isCorrect: isUnderlined,
          });
        });
      }

      let correctAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
      let hasRecognizedAnswer = false;
      const underlinedOpt = options.find((o) => o.isCorrect);
      if (underlinedOpt) {
        correctAnswer = underlinedOpt.key;
        hasRecognizedAnswer = true;
      } else if (explicitAnswer) {
        correctAnswer = explicitAnswer;
        hasRecognizedAnswer = true;
      } else if (explanation) {
        const expAnsMatch = explanation.match(
          /(?:Chọn(?:\s*đáp\s*án)?|Đáp\s*án(?:\s*đúng)?(?:\s*là)?)\s*[\:\.]?\s*([A-D])\b/i
        );
        if (expAnsMatch) {
          correctAnswer = expAnsMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          hasRecognizedAnswer = true;
        }
      } else if (fallbackAnswerKeyMap[questionNumber]) {
        correctAnswer = fallbackAnswerKeyMap[questionNumber];
        hasRecognizedAnswer = true;
      }

      const cleanPrompt = promptLines.join('\n').replace(/\[\/?U\]/gi, '').trim();
      const foundOptionKeys = new Set(options.filter((o) => o.content.trim().length > 0).map((o) => o.key));
      const missingOptionKeys = (['A', 'B', 'C', 'D'] as const).filter((k) => !foundOptionKeys.has(k));

      if (!cleanPrompt) {
        addUnrecognized({
          part: 'part1',
          partLabel: PART_LABELS.part1,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'incomplete_structure',
          reason: 'Chưa nhận dạng được nội dung đề bài',
        });
        warnings.push(`Phần I - Câu ${questionNumber}: Chưa nhận dạng được nội dung đề bài.`);
      } else if (missingOptionKeys.length === 4) {
        addUnrecognized({
          part: 'part1',
          partLabel: PART_LABELS.part1,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'incomplete_structure',
          reason: 'Chưa nhận dạng được các phương án A, B, C, D',
        });
        warnings.push(`Phần I - Câu ${questionNumber}: Chưa nhận dạng được các phương án A, B, C, D.`);
      } else if (missingOptionKeys.length > 0) {
        addUnrecognized({
          part: 'part1',
          partLabel: PART_LABELS.part1,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'incomplete_structure',
          reason: `Thiếu phương án ${missingOptionKeys.join(', ')}`,
        });
        warnings.push(`Phần I - Câu ${questionNumber}: Thiếu phương án ${missingOptionKeys.join(', ')}.`);
      } else if (!hasRecognizedAnswer) {
        addUnrecognized({
          part: 'part1',
          partLabel: PART_LABELS.part1,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'missing_answer',
          reason: 'Chưa gạch chân đáp án đúng (tạm mặc định A)',
        });
        warnings.push(
          `Phần I - Câu ${questionNumber}: Chưa gạch chân đáp án đúng (tạm mặc định chọn A).`
        );
      } else {
        recognizedByPart.part1.push(`Câu ${questionNumber}`);
      }

      const formattedOptions = (['A', 'B', 'C', 'D'] as const).map((k) => {
        const found = options.find((o) => o.key === k);
        return {
          key: k,
          content: found && found.content ? found.content : `Phương án ${k}`,
        };
      });

      part1.push({
        id: `custom_p1_q${part1.length + 1}`,
        part: 'part1',
        number: part1.length + 1,
        topic: 'Trắc nghiệm nhiều lựa chọn',
        prompt: cleanPrompt || `Câu ${questionNumber}`,
        options: formattedOptions,
        correctAnswer,
        explanation: explanation || 'Xem lại kiến thức và công thức liên quan.',
        pedagogicalTip: 'Phân tích kỹ giả thiết và kiểm tra cẩn thận các phương án trước khi chọn.',
        points: 0.25,
        tikzType: extractedTikzCode ? 'custom' : detectAutoTikzType(cleanPrompt),
        tikzCode: extractedTikzCode,
      });
    } else if (targetPart === 'part2') {
      // --- Xử lý Phần II: Trắc nghiệm Đúng / Sai (gạch chân đáp án đúng) ---
      const promptLines: string[] = [];
      const statements: TrueFalseStatement[] = [];

      const cleanFirst = stripQuestionPrefix(firstLine);
      if (cleanFirst) promptLines.push(cleanFirst);

      for (let i = 1; i < filteredLines.length; i++) {
        const line = filteredLines[i];
        const match = line.match(stRegex);
        if (match) {
          const starBefore = Boolean(match[1]);
          const label = match[2].toLowerCase() as 'a' | 'b' | 'c' | 'd';
          const starAfter = Boolean(match[3]);
          let content = match[4].trim();

          const explicitTrue =
            /(?:[\[\(]\s*(?:Đúng|Đ|True)\s*[\]\)]|\-\>\s*Đúng|\:\s*Đúng)\s*$/i.test(content);
          const explicitFalse =
            /(?:[\[\(]\s*(?:Sai|S|False)\s*[\]\)]|\-\>\s*Sai|\:\s*Sai)\s*$/i.test(content);

          // Quy tắc chuẩn: Mệnh đề nào được gạch chân (hoặc đánh dấu *) là ĐÚNG, còn lại là SAI
          const hasUnderlineOrStar =
            line.includes('[U]') ||
            line.includes('[/U]') ||
            line.includes('<u>') ||
            starBefore ||
            starAfter ||
            content.startsWith('*');

          const isCorrect = explicitFalse ? false : explicitTrue ? true : hasUnderlineOrStar;

          content = content
            .replace(/^\*\s*/, '')
            .replace(/\[\/?U\]/gi, '')
            .replace(/<\/?u>/gi, '')
            .replace(
              /(?:[\[\(]\s*(?:Đúng|Sai|Đ|S|True|False)\s*[\]\)]|\-\>\s*(?:Đúng|Sai))\s*$/gi,
              ''
            )
            .trim();

          statements.push({
            id: label,
            label,
            statement: content,
            isCorrect,
            explanation: `Mệnh đề ${label}) là ${isCorrect ? 'Đúng' : 'Sai'}.`,
          });
        } else if (statements.length === 0) {
          promptLines.push(line);
        } else {
          // Nếu dòng nối tiếp của mệnh đề trước đó có gạch chân thì cập nhật luôn isCorrect
          if (line.includes('[U]') || line.includes('[/U]')) {
            statements[statements.length - 1].isCorrect = true;
            statements[statements.length - 1].explanation = `Mệnh đề ${
              statements[statements.length - 1].label
            }) là Đúng.`;
          }
          statements[statements.length - 1].statement +=
            ' ' + line.replace(/\[\/?U\]/gi, '').trim();
        }
      }

      // Trường hợp Word tự động đánh số (Auto-Numbering <ol><li>) làm mất chữ a), b), c), d)
      if (statements.length === 0 && promptLines.length >= 5) {
        const stLines = promptLines.splice(promptLines.length - 4, 4);
        const labels: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];
        stLines.forEach((sl, idx) => {
          const isCorrect = sl.includes('[U]') || sl.includes('[/U]') || sl.startsWith('*');
          const lbl = labels[idx];
          statements.push({
            id: lbl,
            label: lbl,
            statement: sl.replace(/^\*\s*/, '').replace(/\[\/?U\]/gi, '').trim(),
            isCorrect,
            explanation: `Mệnh đề ${lbl}) là ${isCorrect ? 'Đúng' : 'Sai'}.`,
          });
        });
      }

      const cleanPrompt = promptLines.join('\n').replace(/\[\/?U\]/gi, '').trim();
      const foundLabels = new Set(
        statements.filter((s) => s.statement.trim().length > 0).map((s) => s.label)
      );
      const missingLabels = (['a', 'b', 'c', 'd'] as const).filter((l) => !foundLabels.has(l));

      if (!cleanPrompt) {
        addUnrecognized({
          part: 'part2',
          partLabel: PART_LABELS.part2,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'incomplete_structure',
          reason: 'Chưa nhận dạng được nội dung đề bài',
        });
        warnings.push(`Phần II - Câu ${questionNumber}: Chưa nhận dạng được nội dung đề bài.`);
      } else if (missingLabels.length === 4) {
        addUnrecognized({
          part: 'part2',
          partLabel: PART_LABELS.part2,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'incomplete_structure',
          reason: 'Chưa nhận dạng được các mệnh đề a), b), c), d)',
        });
        warnings.push(`Phần II - Câu ${questionNumber}: Chưa nhận dạng được các mệnh đề a), b), c), d).`);
      } else if (missingLabels.length > 0) {
        addUnrecognized({
          part: 'part2',
          partLabel: PART_LABELS.part2,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'incomplete_structure',
          reason: `Thiếu mệnh đề ${missingLabels.map((l) => `${l})`).join(', ')}`,
        });
        warnings.push(
          `Phần II - Câu ${questionNumber}: Thiếu mệnh đề ${missingLabels.map((l) => `${l})`).join(', ')}.`
        );
      } else {
        recognizedByPart.part2.push(`Câu ${questionNumber}`);
      }

      const fullStatements = (['a', 'b', 'c', 'd'] as const).map((l) => {
        const found = statements.find((s) => s.label === l);
        return (
          found || {
            id: l,
            label: l,
            statement: `Mệnh đề ${l}`,
            isCorrect: false,
            explanation: '',
          }
        );
      });

      part2.push({
        id: `custom_p2_q${part2.length + 1}`,
        part: 'part2',
        number: part2.length + 1,
        topic: 'Trắc nghiệm Đúng / Sai',
        prompt: cleanPrompt || `Câu ${questionNumber}`,
        statements: fullStatements,
        pedagogicalTip: 'Đọc kỹ từng ý mệnh đề độc lập để xác định tính đúng sai.',
        tikzType: extractedTikzCode ? 'custom' : detectAutoTikzType(cleanPrompt),
        tikzCode: extractedTikzCode,
      });
    } else if (targetPart === 'part4') {
      // --- Xử lý Phần IV: Tự luận ghép bước giải ---
      const allLines: string[] = [];
      const cleanFirst = stripQuestionPrefix(firstLine);
      if (cleanFirst) allLines.push(cleanFirst);
      for (let i = 1; i < filteredLines.length; i++) {
        allLines.push(filteredLines[i]);
      }

      const promptLines: string[] = [];
      const steps: SolutionStep[] = [];
      let stepCounter = 1;

      const hasExplicitStepPrefix = allLines.some((l) => stepRegex.test(l));

      if (hasExplicitStepPrefix) {
        for (const line of allLines) {
          const match = line.match(stepRegex);
          if (match) {
            const originalIdx = parseInt(match[1], 10) || stepCounter++;
            const content = match[2].replace(/\[\/?U\]/gi, '').trim();
            if (content) {
              steps.push({
                id: `custom_p4_q${part4.length + 1}_s${steps.length + 1}`,
                originalIndex: originalIdx,
                content,
                roleDescription: '',
              });
            }
          } else if (steps.length === 0) {
            promptLines.push(line);
          } else {
            steps[steps.length - 1].content += ' ' + line.replace(/\[\/?U\]/gi, '').trim();
          }
        }
      } else {
        // Không cần ghi "Bước 1, Bước 2": Dòng đầu tiên là đề bài, các dòng tiếp theo là các bước lời giải
        if (allLines.length > 0) {
          promptLines.push(allLines[0]);
        }
        const rawStepLines = allLines.slice(1);
        rawStepLines.forEach((line, idx) => {
          const cleanStep = line
            .replace(/\[\/?U\]/gi, '')
            .replace(/^[\-\+•]\s*/, '')
            .trim();
          if (cleanStep) {
            steps.push({
              id: `custom_p4_q${part4.length + 1}_s${idx + 1}`,
              originalIndex: idx + 1,
              content: cleanStep,
              roleDescription: '',
            });
          }
        });
      }

      // Nếu người soạn đặt các dòng bước giải trong mục "Lời giải:"
      if (steps.length === 0 && explanation) {
        const expLines = explanation
          .split('\n')
          .map((l) =>
            l
              .replace(/^[\-\+•]\s*/, '')
              .replace(/^(?:Bước|Dòng|Ý)\s*\d+\s*[\:\.\-]\s*/i, '')
              .trim()
          )
          .filter(Boolean);
        expLines.forEach((stepText, idx) => {
          steps.push({
            id: `custom_p4_q${part4.length + 1}_s${idx + 1}`,
            originalIndex: idx + 1,
            content: stepText,
            roleDescription: '',
          });
        });
      }

      const cleanPrompt = promptLines.join('\n').replace(/\[\/?U\]/gi, '').trim();
      if (!cleanPrompt) {
        addUnrecognized({
          part: 'part4',
          partLabel: PART_LABELS.part4,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'incomplete_structure',
          reason: 'Chưa nhận dạng được đề bài tự luận',
        });
        warnings.push(`Phần IV - Câu ${questionNumber}: Chưa nhận dạng được đề bài tự luận.`);
      } else if (steps.length === 0) {
        addUnrecognized({
          part: 'part4',
          partLabel: PART_LABELS.part4,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'incomplete_structure',
          reason: 'Chưa nhận dạng được các dòng bước lời giải',
        });
        warnings.push(`Phần IV - Câu ${questionNumber}: Chưa nhận dạng được các bước lời giải.`);
      } else {
        recognizedByPart.part4.push(`Câu ${questionNumber}`);
      }

      part4.push({
        id: `custom_p4_q${part4.length + 1}`,
        part: 'part4',
        number: part4.length + 1,
        topic: 'Tự luận ghép thứ tự lời giải',
        problemStatement: cleanPrompt || `Câu ${questionNumber}`,
        conclusionTarget: 'Sắp xếp các bước suy luận theo thứ tự logic đúng.',
        steps:
          steps.length > 0
            ? steps
            : [
                {
                  id: `custom_p4_q${part4.length + 1}_s1`,
                  originalIndex: 1,
                  content: 'Đặt điều kiện và phân tích giả thiết bài toán',
                  roleDescription: '',
                },
                {
                  id: `custom_p4_q${part4.length + 1}_s2`,
                  originalIndex: 2,
                  content: 'Biến đổi phương trình / hệ thức tương đương',
                  roleDescription: '',
                },
                {
                  id: `custom_p4_q${part4.length + 1}_s3`,
                  originalIndex: 3,
                  content: 'Đối chiếu điều kiện và kết luận',
                  roleDescription: '',
                },
              ],
        pedagogicalTip: 'Đọc kỹ toàn bộ các bước và tìm mối liên hệ nhân quả logic.',
        teacherAnalysis: explanation || 'Phân tích mạch tư duy từ giả thiết đến kết luận.',
        points: 0.5,
        tikzType: extractedTikzCode ? 'custom' : detectAutoTikzType(cleanPrompt),
        tikzCode: extractedTikzCode,
      });
    } else {
      // --- Xử lý Phần III: Trả lời ngắn ---
      const promptLines: string[] = [];
      let acceptableAnswers: string[] = ['0'];
      let foundShortAns = false;

      const cleanFirst = stripQuestionPrefix(firstLine);
      if (cleanFirst) promptLines.push(cleanFirst);

      for (let i = 1; i < filteredLines.length; i++) {
        const line = filteredLines[i];
        const match = line.match(shortAnsRegex);
        if (match) {
          const rawAns = match[1].trim();
          if (rawAns) {
            acceptableAnswers = buildAcceptableShortAnswers(rawAns);
            foundShortAns = true;
          }
        } else {
          promptLines.push(line);
        }
      }

      // Hỗ trợ gạch chân đáp số trực tiếp trong Phần III (ví dụ: <u>8</u> hoặc Đáp số gạch chân)
      if (!foundShortAns) {
        const fullBlockText = promptLines.join('\n');
        const underlineMatches = [...fullBlockText.matchAll(/\[U\]([\s\S]*?)\[\/U\]/gi)];
        if (underlineMatches.length > 0) {
          const lastUnderlined = underlineMatches[underlineMatches.length - 1][1].trim();
          if (lastUnderlined && lastUnderlined.length <= 25) {
            acceptableAnswers = buildAcceptableShortAnswers(lastUnderlined);
            foundShortAns = true;
            // Nếu dòng cuối cùng chỉ chứa phần gạch chân đáp án thì bỏ dòng đó khỏi đề bài
            const lastPromptLine = promptLines[promptLines.length - 1]
              ?.replace(/\[\/?U\]/gi, '')
              .trim();
            if (promptLines.length > 1 && lastPromptLine === lastUnderlined) {
              promptLines.pop();
            }
          }
        }
      }

      // Hỗ trợ trường hợp dòng cuối cùng dưới câu hỏi Phần III là con số đáp án (ví dụ: dòng 1 là đề, dòng 2 ghi "8")
      if (!foundShortAns && promptLines.length >= 2) {
        const lastLineClean = promptLines[promptLines.length - 1]
          .replace(/\[\/?U\]/gi, '')
          .replace(/^\$|\$$/g, '')
          .trim();
        if (/^[\-\+]?\d+(?:[\,\.\/]\d+)?$/.test(lastLineClean)) {
          acceptableAnswers = buildAcceptableShortAnswers(lastLineClean);
          foundShortAns = true;
          promptLines.pop();
        }
      }

      // Kiểm tra trong phần Lời giải nếu có "Đáp số: ..."
      if (!foundShortAns && explanation) {
        const expShortMatch = explanation.match(
          /(?:Đáp số|Đáp án|Kết quả|KQ|ĐS)\s*[\:\.\=]\s*([^\n\r\.]+)/i
        );
        if (expShortMatch && expShortMatch[1]) {
          acceptableAnswers = buildAcceptableShortAnswers(expShortMatch[1]);
          foundShortAns = true;
        }
      }

      const cleanPrompt = promptLines.join('\n').replace(/\[\/?U\]/gi, '').trim();
      if (!cleanPrompt) {
        addUnrecognized({
          part: 'part3',
          partLabel: PART_LABELS.part3,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'incomplete_structure',
          reason: 'Chưa nhận dạng được nội dung câu hỏi',
        });
        warnings.push(`Phần III - Câu ${questionNumber}: Chưa nhận dạng được nội dung câu hỏi.`);
      } else if (!foundShortAns) {
        addUnrecognized({
          part: 'part3',
          partLabel: PART_LABELS.part3,
          questionNumber,
          questionLabel: `Câu ${questionNumber}`,
          status: 'missing_answer',
          reason: 'Chưa nhận dạng được Đáp số (cần ghi "Đáp số: ..." hoặc gạch chân đáp số)',
        });
        warnings.push(
          `Phần III - Câu ${questionNumber}: Chưa nhận dạng được Đáp số (tạm mặc định 0).`
        );
      } else {
        recognizedByPart.part3.push(`Câu ${questionNumber}`);
      }

      part3.push({
        id: `custom_p3_q${part3.length + 1}`,
        part: 'part3',
        number: part3.length + 1,
        topic: 'Câu hỏi trả lời ngắn',
        prompt: cleanPrompt || `Câu ${questionNumber}`,
        acceptableAnswers,
        explanation: explanation || `Đáp số chính xác: ${acceptableAnswers[0]}`,
        pedagogicalTip: 'Điền chính xác giá trị số nguyên hoặc số thập phân.',
        points: 0.5,
        tikzType: extractedTikzCode ? 'custom' : detectAutoTikzType(cleanPrompt),
        tikzCode: extractedTikzCode,
      });
    }
  }

  // Kiểm tra các câu bị khuyết thứ tự trong từng Phần (ví dụ: có Câu 1, Câu 2, Câu 4 -> thiếu Câu 3)
  (['part1', 'part2', 'part3', 'part4'] as const).forEach((partKey) => {
    const mentioned = Array.from(mentionedNumbersByPart[partKey]).sort((a, b) => a - b);
    const parsed = parsedNumbersByPart[partKey];
    if (mentioned.length === 0) return;

    const minNum = mentioned[0];
    const maxNum = mentioned[mentioned.length - 1];
    // Nếu phần này bắt đầu đánh số từ đầu (ví dụ từ Câu 1..5), kiểm tra từ 1 đến maxNum
    const startCheck = minNum <= 5 ? 1 : minNum;
    if (maxNum - startCheck <= 60) {
      for (let n = startCheck; n <= maxNum; n++) {
        if (!parsed.has(n)) {
          addUnrecognized({
            part: partKey,
            partLabel: PART_LABELS[partKey],
            questionNumber: n,
            questionLabel: `Câu ${n}`,
            status: 'missing',
            reason: 'Không nhận dạng được câu hỏi (bị gộp dòng, thiếu hoặc sai định dạng tiêu đề Câu)',
          });
          warnings.push(
            `${PART_LABELS[partKey]} - Câu ${n}: Không nhận dạng được câu hỏi (bị khuyết hoặc gộp vào câu trước).`
          );
        }
      }
    }
  });

  // Sắp xếp danh sách câu chưa nhận dạng theo thứ tự Phần và số câu
  const partOrder: Record<'part1' | 'part2' | 'part3' | 'part4', number> = {
    part1: 1,
    part2: 2,
    part3: 3,
    part4: 4,
  };
  unrecognizedQuestions.sort((a, b) => {
    if (partOrder[a.part] !== partOrder[b.part]) {
      return partOrder[a.part] - partOrder[b.part];
    }
    return a.questionNumber - b.questionNumber;
  });
  (['part1', 'part2', 'part3', 'part4'] as const).forEach((p) => {
    unrecognizedByPart[p].sort((a, b) => a.questionNumber - b.questionNumber);
  });

  const exam: ExamSet = {
    id: `de-custom-${Date.now()}`,
    title: examTitle || 'Đề tải từ file Word',
    subtitle: 'Đề thi tự biên soạn theo chuẩn cấu trúc',
    grade: 10,
    durationMinutes: 90,
    totalPoints: 10,
    description: `Đề thi gồm ${part1.length} câu trắc nghiệm, ${part2.length} câu đúng/sai, ${part3.length} câu trả lời ngắn, ${part4.length} câu tự luận ghép bước.`,
    part1,
    part2,
    part3,
    part4,
  };

  return {
    exam,
    warnings,
    unrecognizedQuestions,
    unrecognizedByPart,
    recognizedByPart,
    counts: {
      part1: part1.length,
      part2: part2.length,
      part3: part3.length,
      part4: part4.length,
      total: part1.length + part2.length + part3.length + part4.length,
    },
  };
}

/**
 * Mẫu văn bản chuẩn theo đúng quy tắc:
 * Phần I. (gạch chân đáp án đúng) -> Câu 1, Câu 2...
 * Phần II. (gạch chân đáp án đúng) -> Câu 1 -> a) b) c) d)
 * Phần III. -> Câu 1...
 * Phần IV. -> Câu 1...
 */
export const SAMPLE_WORD_CONTENT = `Phần I. ( gạch chân đáp án đúng )
Câu 1. Cho mệnh đề $P$: "$\\forall x \\in \\mathbb{R},\\ x^2 - x + 7 > 0$". Mệnh đề phủ định của $P$ là:
<u>A. $\\exists x \\in \\mathbb{R},\\ x^2 - x + 7 \\le 0$</u>
B. $\\forall x \\in \\mathbb{R},\\ x^2 - x + 7 \\le 0$
C. $\\exists x \\in \\mathbb{R},\\ x^2 - x + 7 < 0$
D. $\\forall x \\in \\mathbb{R},\\ x^2 - x + 7 < 0$

Câu 2. Cho hai tập hợp $A = [-2; 5)$ và $B = (1; 7]$. Tập hợp $A \\cap B$ là:
A. $[-2; 7]$    <u>B. $(1; 5)$</u>    C. $[1; 5)$    D. $(1; 5]$

Phần II. ( gạch chân đáp án đúng )
Câu 1. Cho tam giác $ABC$ có ba cạnh $a = 7, b = 8, c = 5$. Xét tính đúng/sai của các mệnh đề sau:
<u>a) Nửa chu vi của tam giác $ABC$ bằng $p = 10$.</u>
<u>b) Cô-sin của góc $A$ bằng $\\cos A = \\frac{1}{2}$, suy ra góc $\\widehat{A} = 60^\\circ$.</u>
c) Diện tích của tam giác $ABC$ là $S = 20\\sqrt{3}$.
<u>d) Bán kính đường tròn ngoại tiếp tam giác là $R = \\frac{7\\sqrt{3}}{3}$.</u>

Câu 2. Cho parabol $(P): y = -x^2 + 4x - 3$. Xét tính đúng/sai của các phát biểu sau:
a) Bề lõm của parabol quay lên phía trên.
<u>b) Trục đối xứng của parabol là đường thẳng $x = 2$.</u>
<u>c) Đỉnh của parabol có tọa độ $I(2; 1)$.</u>
d) Hàm số đồng biến trên khoảng $(2; +\\infty)$.

Phần III.
Câu 1. Cho tam giác $ABC$ có cạnh $AB = 6, AC = 10$ và diện tích $S = 24$. Biết góc $\\widehat{A}$ là góc nhọn. Tính độ dài cạnh $BC$.
Đáp số: 8

Câu 2. Có bao nhiêu số tự nhiên có 3 chữ số đôi một khác nhau lập từ tập hợp $\\{1, 2, 3, 4, 5\\}$?
Đáp số: 60

Phần IV.
Câu 1. Giải phương trình vô tỉ: $\\sqrt{2x^2 - 5x + 3} = x - 1$.
Đặt điều kiện có nghiệm $x - 1 \\ge 0 \\Leftrightarrow x \\ge 1$.
Bình phương hai vế: $2x^2 - 5x + 3 = (x - 1)^2 \\Leftrightarrow 2x^2 - 5x + 3 = x^2 - 2x + 1$.
Thu gọn về phương trình bậc hai: $x^2 - 3x + 2 = 0 \\Leftrightarrow x = 1$ hoặc $x = 2$.
Đối chiếu điều kiện $x \\ge 1$, cả hai nghiệm đều thỏa mãn. Kết luận $S = \\{1; 2\\}$.
`;
