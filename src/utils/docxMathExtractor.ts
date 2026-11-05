import mammoth from 'mammoth';
import { normalizeWordHtmlToText } from './wordExamParser';

/**
 * Chuyển đổi các ký tự Toán học Unicode phổ biến sang lệnh LaTeX chuẩn
 */
const UNICODE_TO_LATEX_MAP: Record<string, string> = {
  '∀': '\\forall ',
  '∃': '\\exists ',
  '∈': '\\in ',
  '∉': '\\notin ',
  '⊂': '\\subset ',
  '⊃': '\\supset ',
  '⊆': '\\subseteq ',
  '⊇': '\\supseteq ',
  '∪': '\\cup ',
  '∩': '\\cap ',
  '∅': '\\emptyset ',
  '∖': '\\setminus ',
  '≤': '\\le ',
  '≥': '\\ge ',
  '⩽': '\\le ',
  '⩾': '\\ge ',
  '≠': '\\neq ',
  '≈': '\\approx ',
  '≡': '\\equiv ',
  '±': '\\pm ',
  '∓': '\\mp ',
  '×': '\\times ',
  '÷': '\\div ',
  '⋅': '\\cdot ',
  '∙': '\\cdot ',
  '∞': '\\infty ',
  '⇒': '\\Rightarrow ',
  '⟹': '\\Rightarrow ',
  '⇔': '\\Leftrightarrow ',
  '⟺': '\\Leftrightarrow ',
  '→': '\\to ',
  '⟶': '\\to ',
  '↦': '\\mapsto ',
  '↑': '\\uparrow ',
  '↓': '\\downarrow ',
  'ℝ': '\\mathbb{R}',
  'ℤ': '\\mathbb{Z}',
  'ℕ': '\\mathbb{N}',
  'ℚ': '\\mathbb{Q}',
  'ℂ': '\\mathbb{C}',
  'α': '\\alpha ',
  'β': '\\beta ',
  'γ': '\\gamma ',
  'δ': '\\delta ',
  'ε': '\\varepsilon ',
  'θ': '\\theta ',
  'λ': '\\lambda ',
  'μ': '\\mu ',
  'π': '\\pi ',
  'ρ': '\\rho ',
  'σ': '\\sigma ',
  'τ': '\\tau ',
  'φ': '\\varphi ',
  'ω': '\\omega ',
  'Δ': '\\Delta ',
  'Ω': '\\Omega ',
  '∑': '\\sum ',
  '∏': '\\prod ',
  '∫': '\\int ',
  '⊥': '\\perp ',
  '∥': '\\parallel ',
  '∠': '\\widehat ',
  '△': '\\triangle ',
  '°': '^\\circ ',
  '²': '^{2}',
  '³': '^{3}',
  '⁴': '^{4}',
  '¹': '^{1}',
  '⁰': '^{0}',
  '−': '-',
};

/**
 * Dịch chuỗi văn bản bên trong khối toán học (OMML <m:t>) sang ký hiệu LaTeX
 */
function convertMathRunText(raw: string): string {
  if (!raw) return '';
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (UNICODE_TO_LATEX_MAP[ch]) {
      out += UNICODE_TO_LATEX_MAP[ch];
    } else if (ch === '{') {
      out += '\\{';
    } else if (ch === '}') {
      out += '\\}';
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Lấy phần tử con trực tiếp theo localName (bỏ qua tiền tố namespace m: hoặc w:)
 */
function getDirectChild(parent: Element, localName: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    const name = child.localName || child.nodeName.replace(/^.*:/, '');
    if (name === localName) return child;
  }
  return null;
}

function getDirectChildren(parent: Element, localName: string): Element[] {
  const result: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    const name = child.localName || child.nodeName.replace(/^.*:/, '');
    if (name === localName) result.push(child);
  }
  return result;
}

function getAttrVal(el: Element | null, attrLocalName: string = 'val'): string {
  if (!el) return '';
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    const local = attr.localName || attr.name.replace(/^.*:/, '');
    if (local === attrLocalName) return attr.value;
  }
  return '';
}

/**
 * Chuyển đổi đệ quy cây XML OMML (<m:oMath>, <m:f>, <m:rad>, <m:sSup>,...) của Microsoft Word sang LaTeX chuẩn
 */
function convertOmmlNodeToLatex(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return convertMathRunText(node.nodeValue || '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as Element;
  const localName = el.localName || el.nodeName.replace(/^.*:/, '');

  switch (localName) {
    case 'oMathPara':
    case 'oMath': {
      let inner = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        inner += convertOmmlNodeToLatex(el.childNodes[i]);
      }
      return inner.trim();
    }

    case 'r': {
      // Math run <m:r> hoặc Word run <w:r> bên trong công thức
      const tNodes = getDirectChildren(el, 't');
      if (tNodes.length > 0) {
        return tNodes.map((t) => convertMathRunText(t.textContent || '')).join('');
      }
      return '';
    }

    case 't': {
      return convertMathRunText(el.textContent || '');
    }

    case 'f': {
      // Phân số <m:f>: <m:num> và <m:den>
      const fPr = getDirectChild(el, 'fPr');
      const typeEl = fPr ? getDirectChild(fPr, 'type') : null;
      const fracType = getAttrVal(typeEl);
      const num = getDirectChild(el, 'num');
      const den = getDirectChild(el, 'den');
      const numLatex = num ? convertOmmlChildren(num) : '';
      const denLatex = den ? convertOmmlChildren(den) : '';
      if (fracType === 'noBar') {
        return `\\binom{${numLatex}}{${denLatex}}`;
      }
      return `\\frac{${numLatex}}{${denLatex}}`;
    }

    case 'rad': {
      // Căn thức <m:rad>: <m:deg> và <m:e>
      const radPr = getDirectChild(el, 'radPr');
      const degHideEl = radPr ? getDirectChild(radPr, 'degHide') : null;
      const degHide = getAttrVal(degHideEl) === '1' || getAttrVal(degHideEl) === 'true';
      const deg = getDirectChild(el, 'deg');
      const base = getDirectChild(el, 'e');
      const degLatex = deg ? convertOmmlChildren(deg).trim() : '';
      const baseLatex = base ? convertOmmlChildren(base) : '';
      if (!degHide && degLatex) {
        return `\\sqrt[${degLatex}]{${baseLatex}}`;
      }
      return `\\sqrt{${baseLatex}}`;
    }

    case 'sSup': {
      // Số mũ <m:sSup>: <m:e> và <m:sup>
      const base = getDirectChild(el, 'e');
      const sup = getDirectChild(el, 'sup');
      const baseLatex = base ? convertOmmlChildren(base) : '';
      let supLatex = sup ? convertOmmlChildren(sup).trim() : '';
      if (supLatex === 'o' || supLatex === '0' || supLatex === '\\circ' || supLatex === '^\\circ') {
        if (/^\d+$/.test(baseLatex.trim()) || /^\\widehat/.test(baseLatex.trim())) {
          return `${baseLatex}^\\circ `;
        }
      }
      const wrappedBase = baseLatex.length > 1 && !baseLatex.startsWith('{') ? `{${baseLatex}}` : baseLatex;
      return `${wrappedBase}^{${supLatex}}`;
    }

    case 'sSub': {
      // Chỉ số dưới <m:sSub>: <m:e> và <m:sub>
      const base = getDirectChild(el, 'e');
      const sub = getDirectChild(el, 'sub');
      const baseLatex = base ? convertOmmlChildren(base) : '';
      const subLatex = sub ? convertOmmlChildren(sub).trim() : '';
      const wrappedBase = baseLatex.length > 1 && !baseLatex.startsWith('{') ? `{${baseLatex}}` : baseLatex;
      return `${wrappedBase}_{${subLatex}}`;
    }

    case 'sSubSup': {
      // Vừa chỉ số dưới vừa số mũ <m:sSubSup>
      const base = getDirectChild(el, 'e');
      const sub = getDirectChild(el, 'sub');
      const sup = getDirectChild(el, 'sup');
      const baseLatex = base ? convertOmmlChildren(base) : '';
      const subLatex = sub ? convertOmmlChildren(sub).trim() : '';
      const supLatex = sup ? convertOmmlChildren(sup).trim() : '';
      return `${baseLatex}_{${subLatex}}^{${supLatex}}`;
    }

    case 'sPre': {
      const sub = getDirectChild(el, 'sub');
      const sup = getDirectChild(el, 'sup');
      const base = getDirectChild(el, 'e');
      const subLatex = sub ? convertOmmlChildren(sub).trim() : '';
      const supLatex = sup ? convertOmmlChildren(sup).trim() : '';
      const baseLatex = base ? convertOmmlChildren(base) : '';
      return `{}_{${subLatex}}^{${supLatex}}${baseLatex}`;
    }

    case 'd': {
      // Cặp dấu ngoặc / Hệ phương trình <m:d>
      const dPr = getDirectChild(el, 'dPr');
      const begChrEl = dPr ? getDirectChild(dPr, 'begChr') : null;
      const endChrEl = dPr ? getDirectChild(dPr, 'endChr') : null;
      const sepChrEl = dPr ? getDirectChild(dPr, 'sepChr') : null;

      const begChr = begChrEl ? getAttrVal(begChrEl) : '(';
      const endChr = endChrEl ? getAttrVal(endChrEl) : ')';
      const sepChr = sepChrEl ? getAttrVal(sepChrEl) : '|';

      const eNodes = getDirectChildren(el, 'e');
      const eStrings = eNodes.map((eNode) => convertOmmlChildren(eNode).trim());

      // Hệ phương trình / hệ bất phương trình: dấu ngoặc nhọn trái '{' và không có ngoặc phải
      if (begChr === '{' && (!endChr || endChr === '')) {
        const rows: string[] = [];
        for (const s of eStrings) {
          if (s.includes('\\\\')) {
            rows.push(...s.split('\\\\').map((r) => r.trim()).filter(Boolean));
          } else if (s) {
            rows.push(s);
          }
        }
        return `\\begin{cases} ${rows.join(' \\\\ ')} \\end{cases}`;
      }

      // Tuyển (hoặc) ngoặc vuông trái '[' và không có ngoặc phải
      if (begChr === '[' && (!endChr || endChr === '') && eStrings.length > 1) {
        return `\\left[ \\begin{aligned} ${eStrings.join(' \\\\ ')} \\end{aligned} \\right.`;
      }

      const mapDelim = (c: string, isLeft: boolean): string => {
        if (!c) return '.';
        if (c === '{') return '\\{';
        if (c === '}') return '\\}';
        if (c === '|') return isLeft ? '\\left|' : '\\right|';
        if (c === '‖' || c === '\\|') return isLeft ? '\\left\\|' : '\\right\\|';
        if (c === '⌊') return '\\lfloor ';
        if (c === '⌋') return '\\rfloor ';
        if (c === '⌈') return '\\lceil ';
        if (c === '⌉') return '\\rceil ';
        return c;
      };

      const leftStr = mapDelim(begChr, true);
      const rightStr = mapDelim(endChr, false);
      const sepStr = sepChr === '|' ? ' \\mid ' : ` ${sepChr} `;
      return `${leftStr}${eStrings.join(sepStr)}${rightStr}`;
    }

    case 'eqArr': {
      // Mảng phương trình nhiều dòng <m:eqArr>
      const eNodes = getDirectChildren(el, 'e');
      const rows = eNodes.map((eNode) => convertOmmlChildren(eNode).trim()).filter(Boolean);
      return rows.join(' \\\\ ');
    }

    case 'acc': {
      // Dấu mũ góc, vectơ, gạch ngang trên đầu <m:acc>
      const accPr = getDirectChild(el, 'accPr');
      const chrEl = accPr ? getDirectChild(accPr, 'chr') : null;
      const chr = getAttrVal(chrEl);
      const base = getDirectChild(el, 'e');
      const baseLatex = base ? convertOmmlChildren(base).trim() : '';

      if (chr === '\u20D7' || chr === '→' || chr === '\u2192' || chr === '\u20D6') {
        return `\\overrightarrow{${baseLatex}}`;
      }
      if (chr === '\u0305' || chr === '\u00AF' || chr === '¯' || chr === '-') {
        return `\\overline{${baseLatex}}`;
      }
      if (chr === '\u0303' || chr === '~') {
        return `\\widetilde{${baseLatex}}`;
      }
      // Mặc định dấu góc / mũ (\widehat)
      return `\\widehat{${baseLatex}}`;
    }

    case 'bar': {
      // Gạch ngang trên đầu (phủ định mệnh đề \overline{P}, số tự nhiên \overline{abc})
      const barPr = getDirectChild(el, 'barPr');
      const posEl = barPr ? getDirectChild(barPr, 'pos') : null;
      const pos = getAttrVal(posEl);
      const base = getDirectChild(el, 'e');
      const baseLatex = base ? convertOmmlChildren(base).trim() : '';
      if (pos === 'bot') {
        return `\\underline{${baseLatex}}`;
      }
      return `\\overline{${baseLatex}}`;
    }

    case 'nary': {
      // Tổng \sum, tích \prod, tích phân \int, hợp \bigcup, giao \bigcap
      const naryPr = getDirectChild(el, 'naryPr');
      const chrEl = naryPr ? getDirectChild(naryPr, 'chr') : null;
      const chr = getAttrVal(chrEl) || '∫';
      const sub = getDirectChild(el, 'sub');
      const sup = getDirectChild(el, 'sup');
      const base = getDirectChild(el, 'e');

      let op = '\\int';
      if (chr === '∑') op = '\\sum';
      else if (chr === '∏') op = '\\prod';
      else if (chr === '⋃' || chr === '∪') op = '\\bigcup';
      else if (chr === '⋂' || chr === '∩') op = '\\bigcap';

      const subLatex = sub ? convertOmmlChildren(sub).trim() : '';
      const supLatex = sup ? convertOmmlChildren(sup).trim() : '';
      const baseLatex = base ? convertOmmlChildren(base).trim() : '';

      let result = op;
      if (subLatex) result += `_{${subLatex}}`;
      if (supLatex) result += `^{${supLatex}}`;
      return `${result} ${baseLatex}`;
    }

    case 'func': {
      // Hàm lượng giác / logarit: \sin, \cos, \tan, \cot, \lim
      const fNameEl = getDirectChild(el, 'fName');
      const baseEl = getDirectChild(el, 'e');
      let fName = fNameEl ? convertOmmlChildren(fNameEl).trim() : '';
      const baseLatex = baseEl ? convertOmmlChildren(baseEl).trim() : '';

      const cleanFn = fName.replace(/\\/g, '').trim().toLowerCase();
      if (['sin', 'cos', 'tan', 'cot', 'arcsin', 'arccos', 'arctan', 'ln', 'log', 'lim', 'max', 'min'].includes(cleanFn)) {
        fName = `\\${cleanFn}`;
      } else if (cleanFn === 'tg') {
        fName = '\\tan';
      } else if (cleanFn === 'cotg') {
        fName = '\\cot';
      }
      return `${fName} ${baseLatex}`;
    }

    case 'limLow': {
      const baseEl = getDirectChild(el, 'e');
      const limEl = getDirectChild(el, 'lim');
      let baseLatex = baseEl ? convertOmmlChildren(baseEl).trim() : '';
      const limLatex = limEl ? convertOmmlChildren(limEl).trim() : '';
      if (/^(?:lim|max|min)$/i.test(baseLatex)) {
        baseLatex = `\\${baseLatex.toLowerCase()}`;
      }
      return `${baseLatex}_{${limLatex}}`;
    }

    case 'limUpp': {
      const baseEl = getDirectChild(el, 'e');
      const limEl = getDirectChild(el, 'lim');
      const baseLatex = baseEl ? convertOmmlChildren(baseEl).trim() : '';
      const limLatex = limEl ? convertOmmlChildren(limEl).trim() : '';
      return `\\overset{${limLatex}}{${baseLatex}}`;
    }

    case 'm': {
      // Ma trận <m:m> -> <m:mr> -> <m:e>
      const rows = getDirectChildren(el, 'mr');
      const rowStrings = rows.map((mr) => {
        const cells = getDirectChildren(mr, 'e');
        return cells.map((c) => convertOmmlChildren(c).trim()).join(' & ');
      });
      return `\\begin{pmatrix} ${rowStrings.join(' \\\\ ')} \\end{pmatrix}`;
    }

    case 'groupChr': {
      const baseEl = getDirectChild(el, 'e');
      const baseLatex = baseEl ? convertOmmlChildren(baseEl).trim() : '';
      return `\\underbrace{${baseLatex}}`;
    }

    case 'box':
    case 'borderBox':
    case 'phant':
    case 'e':
    case 'num':
    case 'den':
    case 'deg':
    case 'sub':
    case 'sup':
    case 'lim':
    case 'fName': {
      return convertOmmlChildren(el);
    }

    case 'oMathParaPr':
    case 'rPr':
    case 'ctrlPr':
    case 'fPr':
    case 'radPr':
    case 'sSupPr':
    case 'sSubPr':
    case 'sSubSupPr':
    case 'sPrePr':
    case 'dPr':
    case 'eqArrPr':
    case 'accPr':
    case 'barPr':
    case 'naryPr':
    case 'funcPr':
    case 'limLowPr':
    case 'limUppPr':
    case 'mPr':
    case 'groupChrPr':
      return '';

    default:
      return convertOmmlChildren(el);
  }
}

function convertOmmlChildren(el: Element): string {
  let res = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    res += convertOmmlNodeToLatex(el.childNodes[i]);
  }
  return res;
}

/**
 * Chuẩn hóa biểu thức LaTeX sau khi trích xuất từ OMML
 */
function cleanConvertedLatex(latex: string): string {
  let s = latex.trim();
  if (!s) return '';

  // Chuẩn hóa các tên hàm lượng giác nếu bị viết rời trong <m:t>
  s = s
    .replace(/(?<!\\)\b(sin|cos|tan|cot|ln|log|lim)\b/g, '\\$1')
    .replace(/\\(sin|cos|tan|cot)\s*\^\s*\{?2\}?/g, '\\$1^2 ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return s;
}

/**
 * Giải nén file bên trong kho lưu trữ ZIP (.docx) bằng DecompressionStream chuẩn trình duyệt
 */
async function readZipEntriesFromDocx(
  arrayBuffer: ArrayBuffer
): Promise<Record<string, string>> {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  // Tìm End of Central Directory (EOCD) signature: 0x06054b50
  let eocdOffset = -1;
  const minEocdOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minEocdOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP/DOCX archive');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const decoder = new TextDecoder('utf-8');
  const targetFiles = new Set(['word/document.xml', 'word/numbering.xml']);
  const results: Record<string, string> = {};

  let ptr = cdOffset;
  for (let idx = 0; idx < totalEntries; idx++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) {
      break;
    }

    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fileNameLen));
    ptr += 46 + fileNameLen + extraLen + commentLen;

    if (!targetFiles.has(fileName)) continue;

    // Đọc Local File Header (0x04034b50)
    if (localHeaderOffset + 30 > bytes.length) continue;
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
      results[fileName] = decoder.decode(compressedData);
    } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(compressedData);
      writer.close();
      const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
      results[fileName] = decoder.decode(decompressedBuffer);
    }
  }

  return results;
}

interface NumberingLevelInfo {
  numFmt: string;
  lvlText: string;
  start: number;
  isUnderlined: boolean;
}

/**
 * Phân tích word/numbering.xml để khôi phục đánh số tự động (Câu 1., A., B., C., D., a), b), c), d))
 */
function parseNumberingXml(numberingXml?: string): Map<string, Map<string, NumberingLevelInfo>> {
  const numMap = new Map<string, Map<string, NumberingLevelInfo>>();
  if (!numberingXml) return numMap;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(numberingXml, 'application/xml');
    const abstractMap = new Map<string, Map<string, NumberingLevelInfo>>();

    const abstractNums = getDirectChildren(doc.documentElement, 'abstractNum');
    for (const abs of abstractNums) {
      const absId = getAttrVal(abs, 'abstractNumId');
      const lvlMap = new Map<string, NumberingLevelInfo>();
      const lvls = getDirectChildren(abs, 'lvl');
      for (const lvl of lvls) {
        const ilvl = getAttrVal(lvl, 'ilvl') || '0';
        const numFmtEl = getDirectChild(lvl, 'numFmt');
        const lvlTextEl = getDirectChild(lvl, 'lvlText');
        const startEl = getDirectChild(lvl, 'start');
        const rPrEl = getDirectChild(lvl, 'rPr');
        const uEl = rPrEl ? getDirectChild(rPrEl, 'u') : null;
        const uVal = uEl ? getAttrVal(uEl, 'val') : '';

        lvlMap.set(ilvl, {
          numFmt: getAttrVal(numFmtEl) || 'decimal',
          lvlText: getAttrVal(lvlTextEl) || '%1.',
          start: parseInt(getAttrVal(startEl) || '1', 10) || 1,
          isUnderlined: Boolean(uEl && uVal !== 'none'),
        });
      }
      abstractMap.set(absId, lvlMap);
    }

    const nums = getDirectChildren(doc.documentElement, 'num');
    for (const num of nums) {
      const numId = getAttrVal(num, 'numId');
      const absIdEl = getDirectChild(num, 'abstractNumId');
      const absId = getAttrVal(absIdEl);
      const baseLvlMap = abstractMap.get(absId);
      if (baseLvlMap) {
        const cloned = new Map<string, NumberingLevelInfo>();
        baseLvlMap.forEach((v, k) => cloned.set(k, { ...v }));
        numMap.set(numId, cloned);
      }
    }
  } catch {
    // Bỏ qua nếu không đọc được numbering.xml
  }

  return numMap;
}

function formatListNumber(n: number, fmt: string): string {
  if (fmt === 'upperLetter') {
    return String.fromCharCode(64 + ((n - 1) % 26) + 1);
  }
  if (fmt === 'lowerLetter') {
    return String.fromCharCode(96 + ((n - 1) % 26) + 1);
  }
  if (fmt === 'upperRoman' || fmt === 'lowerRoman') {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const val = romans[n - 1] || String(n);
    return fmt === 'lowerRoman' ? val.toLowerCase() : val;
  }
  return String(n);
}

/**
 * Chuẩn hóa văn bản Toán học có chứa ký hiệu Unicode hoặc biểu thức rời rạc sang LaTeX chuẩn $...$
 */
export function normalizeMathExpressionsToLatex(rawText: string): string {
  if (!rawText) return '';
  let text = rawText.normalize('NFC');

  // 1. Chuyển đổi \[ ... \] -> $$ ... $$ và \( ... \) -> $ ... $
  text = text
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // 2. Bảo vệ các vùng đã nằm trong $...$, $$...$$ hoặc \begin{tikzpicture}...\end{tikzpicture}
  const protectedBlocks: string[] = [];
  const placeholderPrefix = '__MATH_HOLD_';

  text = text.replace(
    /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}|\$\$[\s\S]*?\$\$|\$[^\$]+?\$/g,
    (match) => {
      const idx = protectedBlocks.length;
      protectedBlocks.push(match);
      return `${placeholderPrefix}${idx}__`;
    }
  );

  // 3. Chuyển các ký hiệu toán học Unicode đứng ngoài $...$ sang LaTeX
  text = text
    .replace(/(\d+)\s*°/g, '$$$1^\\circ$$')
    .replace(/([a-zA-Z0-9\)\}])\s*²/g, '$$$1^2$$')
    .replace(/([a-zA-Z0-9\)\}])\s*³/g, '$$$1^3$$')
    .replace(/√\s*\(([^)]+)\)/g, '$$\\sqrt{$1}$$')
    .replace(/√\s*(\d+[a-zA-Z0-9]*)/g, '$$\\sqrt{$1}$$')
    .replace(/∀/g, '$$\\forall$$')
    .replace(/∃/g, '$$\\exists$$')
    .replace(/∉/g, '$$\\notin$$')
    .replace(/∈/g, '$$\\in$$')
    .replace(/⊆/g, '$$\\subseteq$$')
    .replace(/⊂/g, '$$\\subset$$')
    .replace(/∪/g, '$$\\cup$$')
    .replace(/∩/g, '$$\\cap$$')
    .replace(/∅/g, '$$\\emptyset$$')
    .replace(/≤|⩽/g, '$$\\le$$')
    .replace(/≥|⩾/g, '$$\\ge$$')
    .replace(/≠/g, '$$\\neq$$')
    .replace(/≈/g, '$$\\approx$$')
    .replace(/±/g, '$$\\pm$$')
    .replace(/∞/g, '$$\\infty$$')
    .replace(/⇔|⟺/g, '$$\\Leftrightarrow$$')
    .replace(/⇒|⟹/g, '$$\\Rightarrow$$')
    .replace(/ℝ/g, '$$\\mathbb{R}$$')
    .replace(/ℤ/g, '$$\\mathbb{Z}$$')
    .replace(/ℕ/g, '$$\\mathbb{N}$$')
    .replace(/ℚ/g, '$$\\mathbb{Q}$$');

  // 4. Khôi phục các khối đã bảo vệ
  text = text.replace(/__MATH_HOLD_(\d+)__/g, (_, idxStr) => {
    return protectedBlocks[parseInt(idxStr, 10)] || '';
  });

  // 5. Gộp hai công thức $...$ liền kề chỉ cách nhau bởi khoảng trắng/toán tử đơn giản
  text = text.replace(/\$\s*\$/g, ' ');

  return text;
}

/**
 * Trích xuất nội dung đề thi từ file Word (.docx) giữ nguyên:
 * - Công thức Toán học OMML (<m:oMath>) chuyển sang chuẩn LaTeX $...$
 * - Gạch chân đáp án đúng (<u>...</u>)
 * - Chỉ số trên / chỉ số dưới (<w:vertAlign>)
 * - Đánh số tự động (<w:numPr>) cho Câu 1, Câu 2, A. B. C. D., a) b) c) d)
 */
export async function extractWordDocxWithMath(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zipFiles = await readZipEntriesFromDocx(arrayBuffer);
    const documentXml = zipFiles['word/document.xml'];

    if (documentXml) {
      const numberingMap = parseNumberingXml(zipFiles['word/numbering.xml']);
      const listCounters = new Map<string, number>();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(documentXml, 'application/xml');
      const body = getDirectChild(xmlDoc.documentElement, 'body');

      if (body) {
        const lines: string[] = [];

        const processParagraph = (pEl: Element): string => {
          let prefix = '';
          let paragraphUnderlined = false;

          const pPr = getDirectChild(pEl, 'pPr');
          if (pPr) {
            const pRPr = getDirectChild(pPr, 'rPr');
            const pUEl = pRPr ? getDirectChild(pRPr, 'u') : null;
            if (pUEl && getAttrVal(pUEl, 'val') !== 'none') {
              paragraphUnderlined = true;
            }

            // Kiểm tra đánh số tự động <w:numPr>
            const numPr = getDirectChild(pPr, 'numPr');
            if (numPr) {
              const ilvlEl = getDirectChild(numPr, 'ilvl');
              const numIdEl = getDirectChild(numPr, 'numId');
              const ilvl = getAttrVal(ilvlEl) || '0';
              const numId = getAttrVal(numIdEl);
              if (numId && numId !== '0') {
                const counterKey = `${numId}:${ilvl}`;
                const lvlInfo = numberingMap.get(numId)?.get(ilvl);
                const startVal = lvlInfo?.start ?? 1;
                const currentCount = (listCounters.get(counterKey) ?? startVal - 1) + 1;
                listCounters.set(counterKey, currentCount);

                // Reset các mức con sâu hơn
                for (let subLvl = parseInt(ilvl, 10) + 1; subLvl <= 8; subLvl++) {
                  listCounters.delete(`${numId}:${subLvl}`);
                }

                if (lvlInfo) {
                  const formattedNum = formatListNumber(currentCount, lvlInfo.numFmt);
                  const renderedPrefix = lvlInfo.lvlText.replace(`%${parseInt(ilvl, 10) + 1}`, formattedNum);
                  prefix = lvlInfo.isUnderlined
                    ? `<u>${renderedPrefix}</u> `
                    : `${renderedPrefix} `;
                }
              }
            }
          }

          let pContent = '';

          const walkParagraphChild = (child: Node) => {
            if (child.nodeType !== Node.ELEMENT_NODE) return;
            const el = child as Element;
            const name = el.localName || el.nodeName.replace(/^.*:/, '');

            if (name === 'oMathPara' || name === 'oMath') {
              const rawLatex = cleanConvertedLatex(convertOmmlNodeToLatex(el));
              if (rawLatex) {
                pContent += `$${rawLatex}$`;
              }
              return;
            }

            if (name === 'r') {
              const rPr = getDirectChild(el, 'rPr');
              const uEl = rPr ? getDirectChild(rPr, 'u') : null;
              const uVal = uEl ? getAttrVal(uEl, 'val') : '';
              const isRunUnderlined = Boolean((uEl && uVal !== 'none') || paragraphUnderlined);

              const vertAlignEl = rPr ? getDirectChild(rPr, 'vertAlign') : null;
              const vertAlign = getAttrVal(vertAlignEl);

              let runText = '';
              for (let i = 0; i < el.childNodes.length; i++) {
                const rc = el.childNodes[i] as Element;
                const rcName = rc.localName || rc.nodeName.replace(/^.*:/, '');
                if (rcName === 't') {
                  runText += rc.textContent || '';
                } else if (rcName === 'tab') {
                  runText += '   ';
                } else if (rcName === 'br' || rcName === 'cr') {
                  runText += '\n';
                } else if (rcName === 'sym') {
                  const charCode = getAttrVal(rc, 'char');
                  if (charCode) {
                    const code = parseInt(charCode, 16);
                    if (!isNaN(code)) runText += String.fromCharCode(code);
                  }
                }
              }

              if (!runText) return;

              if (vertAlign === 'superscript') {
                const cleanSup = runText.trim();
                if (cleanSup === 'o' || cleanSup === '0' || cleanSup === '°') {
                  runText = '$^\\circ$';
                } else if (cleanSup) {
                  runText = `$^{${cleanSup}}$`;
                }
              } else if (vertAlign === 'subscript') {
                const cleanSub = runText.trim();
                if (cleanSub) {
                  runText = `$_{${cleanSub}}$`;
                }
              }

              if (isRunUnderlined && runText.trim()) {
                pContent += `<u>${runText}</u>`;
              } else {
                pContent += runText;
              }
              return;
            }

            if (name === 'hyperlink' || name === 'smartTag' || name === 'ins' || name === 'sdt' || name === 'sdtContent') {
              for (let i = 0; i < el.childNodes.length; i++) {
                walkParagraphChild(el.childNodes[i]);
              }
            }
          };

          for (let i = 0; i < pEl.childNodes.length; i++) {
            walkParagraphChild(pEl.childNodes[i]);
          }

          // Gộp các thẻ <u> liền kề và hợp nhất công thức cơ số + số mũ (ví dụ: x$^{2}$ -> $x^{2}$)
          let fullLine = (prefix + pContent)
            .replace(/<\/u>(\s*)<u>/gi, '$1')
            .replace(/([a-zA-Z0-9\)\}])\$\^\{([^}]+)\}\$/g, '$$$1^{$2}$$')
            .replace(/([a-zA-Z0-9\)\}])\$_\{([^}]+)\}\$/g, '$$$1_{$2}$$')
            .replace(/(\d+)\$\^\\circ\$/g, '$$$1^\\circ$$')
            .trim();

          fullLine = normalizeMathExpressionsToLatex(fullLine);
          return fullLine;
        };

        const walkBodyNode = (node: Node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;
          const name = el.localName || el.nodeName.replace(/^.*:/, '');

          if (name === 'p') {
            const pText = processParagraph(el);
            if (pText) lines.push(pText);
          } else if (name === 'tbl') {
            // Duyệt qua các hàng và ô trong bảng Word
            const rows = getDirectChildren(el, 'tr');
            for (const tr of rows) {
              const cells = getDirectChildren(tr, 'tc');
              const cellTexts: string[] = [];
              for (const tc of cells) {
                const cellParagraphs = getDirectChildren(tc, 'p');
                const pStrings = cellParagraphs.map((p) => processParagraph(p)).filter(Boolean);
                if (pStrings.length > 0) {
                  cellTexts.push(pStrings.join('\n'));
                }
              }
              if (cellTexts.length > 0) {
                lines.push(cellTexts.join('    '));
              }
            }
          } else if (name === 'sdt' || name === 'sdtContent' || name === 'customXml') {
            for (let i = 0; i < el.childNodes.length; i++) {
              walkBodyNode(el.childNodes[i]);
            }
          }
        };

        for (let i = 0; i < body.childNodes.length; i++) {
          walkBodyNode(body.childNodes[i]);
        }

        const finalDocxText = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        if (finalDocxText) {
          return finalDocxText;
        }
      }
    }
  } catch {
    // Fallback sang Mammoth nếu có lỗi đọc cấu trúc ZIP/XML
  }

  // Fallback với Mammoth kèm xử lý <sup>, <sub> và chuẩn hóa LaTeX
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        'u => u',
        'b => strong',
        'i => em',
        'strike => s',
      ],
    }
  );

  const htmlWithSupSub = result.value
    .replace(/<sup>\s*(?:o|0|°)\s*<\/sup>/gi, '$^\\circ$')
    .replace(/<sup>([\s\S]*?)<\/sup>/gi, '$^{$1}$')
    .replace(/<sub>([\s\S]*?)<\/sub>/gi, '$_{$1}$');

  const cleanReadable = normalizeWordHtmlToText(htmlWithSupSub)
    .replace(/\[U\]/g, '<u>')
    .replace(/\[\/U\]/g, '</u>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalizeMathExpressionsToLatex(cleanReadable);
}
