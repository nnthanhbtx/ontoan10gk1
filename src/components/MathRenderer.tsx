import React, { useMemo } from 'react';
import katex from 'katex';
import { TikzFigure } from './TikzFigure';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

interface MathPart {
  type: 'text' | 'inline-math' | 'block-math' | 'tikz';
  value: string;
}

const KATEX_MACROS: Record<string, string> = {
  '\\R': '\\mathbb{R}',
  '\\N': '\\mathbb{N}',
  '\\Z': '\\mathbb{Z}',
  '\\Q': '\\mathbb{Q}',
  '\\C': '\\mathbb{C}',
  '\\vec': '\\overrightarrow{#1}',
  '\\wideparen': '\\widehat{#1}',
  '\\tg': '\\tan',
  '\\cotg': '\\cot',
};

/**
 * Chuẩn hóa chuỗi công thức bên trong $...$ để mọi ký hiệu Unicode đều được KaTeX hiển thị đúng chuẩn LaTeX
 */
function sanitizeLatexFormula(rawFormula: string): string {
  const cleaned = rawFormula
    .replace(/∀/g, '\\forall ')
    .replace(/∃/g, '\\exists ')
    .replace(/∉/g, '\\notin ')
    .replace(/∈/g, '\\in ')
    .replace(/⊆/g, '\\subseteq ')
    .replace(/⊇/g, '\\supseteq ')
    .replace(/⊂/g, '\\subset ')
    .replace(/⊃/g, '\\supset ')
    .replace(/∪/g, '\\cup ')
    .replace(/∩/g, '\\cap ')
    .replace(/∅/g, '\\emptyset ')
    .replace(/∖/g, '\\setminus ')
    .replace(/≤|⩽/g, '\\le ')
    .replace(/≥|⩾/g, '\\ge ')
    .replace(/≠/g, '\\neq ')
    .replace(/≈/g, '\\approx ')
    .replace(/±/g, '\\pm ')
    .replace(/∓/g, '\\mp ')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/⋅|∙/g, '\\cdot ')
    .replace(/∞/g, '\\infty ')
    .replace(/⇔|⟺/g, '\\Leftrightarrow ')
    .replace(/⇒|⟹/g, '\\Rightarrow ')
    .replace(/→|⟶/g, '\\to ')
    .replace(/ℝ/g, '\\mathbb{R}')
    .replace(/ℤ/g, '\\mathbb{Z}')
    .replace(/ℕ/g, '\\mathbb{N}')
    .replace(/ℚ/g, '\\mathbb{Q}')
    .replace(/ℂ/g, '\\mathbb{C}')
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ')
    .replace(/ε/g, '\\varepsilon ')
    .replace(/φ/g, '\\varphi ')
    .replace(/π/g, '\\pi ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/Ω/g, '\\Omega ')
    .replace(/°/g, '^\\circ ')
    .replace(/²/g, '^{2}')
    .replace(/³/g, '^{3}')
    .replace(/⁴/g, '^{4}')
    .replace(/−/g, '-')
    .replace(/(\d),(\d)/g, '$1{,}$2')
    .trim();

  // Tự động cân bằng dấu ngoặc nhọn { } không có \ phía trước để tránh lỗi KaTeX render màu đỏ
  let balanced = '';
  let depth = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const prev = i > 0 ? cleaned[i - 1] : '';
    if (ch === '{' && prev !== '\\') {
      depth++;
      balanced += ch;
    } else if (ch === '}' && prev !== '\\') {
      if (depth > 0) {
        depth--;
        balanced += ch;
      }
      // Bỏ qua dấu '}' dư thừa không có '{' mở tương ứng
    } else {
      balanced += ch;
    }
  }
  if (depth > 0) {
    balanced += '}'.repeat(depth);
  }
  return balanced;
}

/**
 * Tự động bọc $...$ cho các biểu thức LaTeX hoặc ký hiệu toán học bị thiếu cặp dấu $...$ trong văn bản
 */
function preprocessRawMathContent(input: string): string {
  if (!input) return '';

  // 1. Chuyển \[ ... \] -> $$ ... $$ và \( ... \) -> $ ... $
  let s = input
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // 2. Bảo vệ các khối \begin{tikzpicture}...\end{tikzpicture}, $$...$$ và $...$ đã có sẵn
  const saved: string[] = [];
  s = s.replace(
    /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}|\$\$[\s\S]*?\$\$|\$[\s\S]+?\$/g,
    (m) => {
      const idx = saved.length;
      saved.push(m);
      return `__SAVED_MATH_${idx}__`;
    }
  );

  // 3. Tự động bọc $...$ cho các lệnh LaTeX bị viết trần ngoài dấu $
  s = s
    .replace(/(\\begin\{(?:cases|aligned|matrix|pmatrix|bmatrix|vmatrix)\}[\s\S]*?\\end\{(?:cases|aligned|matrix|pmatrix|bmatrix|vmatrix)\})/g, '$$$1$$')
    .replace(/(\\frac\{[^{}]+\}\{[^{}]+\})/g, '$$$1$$')
    .replace(/(\\sqrt(?:\[[^\]]+\])?\{[^{}]+\})/g, '$$$1$$')
    .replace(/(\\(?:widehat|overrightarrow|overline|underline)\{[^{}]+\})/g, '$$$1$$')
    .replace(/(\\mathbb\{[RZNQC]\})/g, '$$$1$$')
    .replace(/(\d+)\s*°/g, '$$$1^\\circ$$')
    .replace(/([a-zA-Z0-9\)\}])\s*²/g, '$$$1^2$$')
    .replace(/([a-zA-Z0-9\)\}])\s*³/g, '$$$1^3$$')
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
  s = s.replace(/__SAVED_MATH_(\d+)__/g, (_, idxStr) => {
    return saved[parseInt(idxStr, 10)] || '';
  });

  return s;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  className = '',
}) => {
  const renderedContent = useMemo<MathPart[]>(() => {
    if (!content) return [];

    const normalized = preprocessRawMathContent(content);
    const parts: MathPart[] = [];

    // Phân tách theo \begin{tikzpicture}...\end{tikzpicture}, $$...$$ (display math) hoặc $...$ (inline math, hỗ trợ cả nhiều dòng như \begin{cases})
    const regex =
      /(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})|\$\$([\s\S]*?)\$\$|\$([\s\S]+?)\$/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(normalized)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          value: normalized.substring(lastIndex, match.index),
        });
      }

      if (match[1] !== undefined) {
        parts.push({
          type: 'tikz',
          value: match[1],
        });
      } else if (match[2] !== undefined) {
        parts.push({
          type: 'block-math',
          value: match[2],
        });
      } else if (match[3] !== undefined) {
        parts.push({
          type: 'inline-math',
          value: match[3],
        });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < normalized.length) {
      parts.push({
        type: 'text',
        value: normalized.substring(lastIndex),
      });
    }

    return parts;
  }, [content]);

  return (
    <span
      className={`leading-relaxed font-times break-words max-w-full ${className}`}
      style={{ fontFamily: "'Times New Roman', Times, Georgia, serif" }}
    >
      {renderedContent.map((part, index) => {
        if (part.type === 'tikz') {
          return (
            <span key={index} className="block my-2 max-w-full overflow-x-auto">
              <TikzFigure type="custom" tikzCode={part.value} />
            </span>
          );
        }

        if (part.type === 'text') {
          const lines = part.value.split('\n');
          return (
            <React.Fragment key={index}>
              {lines.map((line, lineIdx) => (
                <React.Fragment key={lineIdx}>
                  {line}
                  {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }

        const isDisplay = part.type === 'block-math';
        const cleanMath = sanitizeLatexFormula(part.value);

        try {
          const html = katex.renderToString(cleanMath, {
            displayMode: isDisplay,
            throwOnError: false,
            errorColor: 'currentColor',
            strict: false,
            trust: true,
            macros: KATEX_MACROS,
            output: 'htmlAndMathml',
          });

          return isDisplay ? (
            <span
              key={index}
              className="block my-2 text-center overflow-x-auto max-w-full py-1 font-math"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <span
              key={index}
              className="inline-math mx-0.5 align-baseline max-w-full"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <code
              key={index}
              className="text-amber-300 bg-amber-950/50 px-1 py-0.5 rounded text-sm font-mono break-all"
            >
              ${cleanMath}$
            </code>
          );
        }
      })}
    </span>
  );
};

