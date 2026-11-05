import React, { useState } from 'react';
import { Copy, Check, Eye, Code2 } from 'lucide-react';
import { playClickSound } from '../utils/audio';

export type TikzDiagramType =
  | 'number_line_intersection'
  | 'number_line_minus2_4'
  | 'set_difference_venn'
  | 'venn_diagram_40'
  | 'venn_diagram_100'
  | 'venn_diagram_50_10b'
  | 'bpt_halfplane_2x_y_4'
  | 'feasible_region_quad'
  | 'feasible_region_aircon'
  | 'feasible_region_coffee_cocoa'
  | 'trig_unit_circle_supp'
  | 'triangle_60deg'
  | 'triangle_sin_circumcircle'
  | 'triangle_obtuse_cos'
  | 'triangle_heron'
  | 'river_triangulation'
  | 'lighthouse_coast'
  | 'parabola_vertex_2_1'
  | 'broken_tree_storm'
  | 'feasible_region_aloe_asparagus'
  | 'venn_diagram_70_tourists'
  | 'number_line_3_6'
  | 'triangle_cos_inscribed_d2'
  | 'mountain_building_observation'
  | 'triangle_abc_456_d3'
  | 'triangle_sin_ac_d3'
  | 'feasible_region_rice_potato_d3'
  | 'venn_diagram_10a_math_eng_d3'
  | 'number_line_union_4_d3'
  | 'triangle_cos_inscribed_d3'
  | 'mountain_tv_tower_d3'
  | 'triangle_abc_567_d4'
  | 'triangle_sin_ac_d4'
  | 'feasible_region_corn_soy_d4'
  | 'venn_diagram_10b_math_phys_d4'
  | 'number_line_union_5_d4'
  | 'triangle_cos_inscribed_d4'
  | 'mountain_tv_tower_d4'
  | 'feasible_region_tea_pepper_d5'
  | 'venn_diagram_45_10c_d5'
  | 'number_line_minus3_5_d5'
  | 'lighthouse_coast_d5'
  | 'broken_tree_storm_d6'
  | 'feasible_region_melon_strawberry_d6'
  | 'venn_diagram_80_tourists_d6'
  | 'number_line_2_7_d6'
  | 'triangle_cos_inscribed_d6'
  | 'mountain_building_observation_d6'
  | 'custom';

interface TikzFigureProps {
  type?: TikzDiagramType | string;
  tikzCode?: string;
  caption?: string;
  className?: string;
}

const MATH_SERIF = '"Times New Roman", Times, "KaTeX_Main", "Computer Modern Serif", Georgia, serif';

/**
 * Bộ dịch trực tiếp khối mã \begin{tikzpicture} ... \end{tikzpicture} tùy chỉnh sang hình vẽ vector SVG chuẩn TikZ
 */
function renderCustomTikzToSvg(rawCode: string): React.ReactNode {
  const coords = new Map<string, { x: number; y: number }>();

  // Tìm scale nếu có
  const scaleMatch = rawCode.match(/scale\s*=\s*([\d\.]+)/);
  const userScale = scaleMatch ? parseFloat(scaleMatch[1]) || 1 : 1;

  // 1. Đọc các điểm \coordinate (A) at (x, y);
  const coordRegex = /\\coordinate\s*\(\s*([A-Za-z0-9_]+)\s*\)\s*at\s*\(\s*([^\),]+)\s*,\s*([^\)]+)\s*\)/g;
  let cm;
  const evalNum = (expr: string): number => {
    const clean = expr
      .replace(/[{}]/g, '')
      .replace(/cos\(\s*60\s*\)/g, '0.5')
      .replace(/sin\(\s*60\s*\)/g, '0.866')
      .replace(/cos\(\s*30\s*\)/g, '0.866')
      .replace(/sin\(\s*30\s*\)/g, '0.5')
      .replace(/cos\(\s*45\s*\)/g, '0.707')
      .replace(/sin\(\s*45\s*\)/g, '0.707')
      .replace(/sqrt\(\s*3\s*\)/g, '1.732')
      .replace(/sqrt\(\s*2\s*\)/g, '1.414')
      .trim();
    if (clean.includes('*')) {
      const parts = clean.split('*').map((p) => parseFloat(p.trim()));
      if (parts.every((n) => !isNaN(n))) {
        return parts.reduce((a, b) => a * b, 1);
      }
    }
    const v = parseFloat(clean);
    return isNaN(v) ? 0 : v;
  };

  while ((cm = coordRegex.exec(rawCode)) !== null) {
    coords.set(cm[1], { x: evalNum(cm[2]), y: evalNum(cm[3]) });
  }

  const resolvePoint = (ptStr: string): { x: number; y: number } | null => {
    const clean = ptStr.trim();
    if (coords.has(clean)) {
      return coords.get(clean)!;
    }
    const m = clean.match(/^\(\s*([^\),]+)\s*,\s*([^\)]+)\s*\)$/);
    if (m) {
      return { x: evalNum(m[1]), y: evalNum(m[2]) };
    }
    const named = clean.match(/^\(\s*([A-Za-z0-9_]+)\s*\)$/);
    if (named && coords.has(named[1])) {
      return coords.get(named[1])!;
    }
    return null;
  };

  // Thu thập tất cả tọa độ để tự động căn khung viewBox
  const allPoints: { x: number; y: number }[] = [];
  coords.forEach((pt) => allPoints.push(pt));
  const rawPairRegex = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
  let pm;
  while ((pm = rawPairRegex.exec(rawCode)) !== null) {
    allPoints.push({ x: parseFloat(pm[1]), y: parseFloat(pm[2]) });
  }

  const minX = allPoints.length > 0 ? Math.min(...allPoints.map((p) => p.x), -2) - 1.2 : -4;
  const maxX = allPoints.length > 0 ? Math.max(...allPoints.map((p) => p.x), 4) + 1.5 : 5;
  const minY = allPoints.length > 0 ? Math.min(...allPoints.map((p) => p.y), -2) - 1.2 : -3;
  const maxY = allPoints.length > 0 ? Math.max(...allPoints.map((p) => p.y), 3) + 1.2 : 4;

  const widthUnits = Math.max(maxX - minX, 4);
  const heightUnits = Math.max(maxY - minY, 3);
  const svgW = 460;
  const svgH = Math.min(340, Math.max(180, Math.round((svgW * heightUnits) / widthUnits)));

  const unitPx = Math.min((svgW - 50) / widthUnits, (svgH - 40) / heightUnits);
  const toSvgX = (x: number) => 25 + (x - minX) * unitPx;
  const toSvgY = (y: number) => svgH - 20 - (y - minY) * unitPx;

  const cleanLatexLabel = (raw: string): string => {
    return raw
      .replace(/^\$|\$$/g, '')
      .replace(/\\mathbb\{R\}/g, 'ℝ')
      .replace(/\\mathbb\{Z\}/g, 'ℤ')
      .replace(/\\mathbb\{N\}/g, 'ℕ')
      .replace(/\\cap/g, '∩')
      .replace(/\\cup/g, '∪')
      .replace(/\\setminus/g, '∖')
      .replace(/\\infty/g, '∞')
      .replace(/\\le/g, '≤')
      .replace(/\\ge/g, '≥')
      .replace(/\\approx/g, '≈')
      .replace(/\^\\circ/g, '°')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[{}]/g, '')
      .trim();
  };

  const elements: React.ReactNode[] = [];
  const statements = rawCode
    .replace(/%.*$/gm, '')
    .replace(/\\begin\{tikzpicture\}(?:\[[^\]]*\])?/g, '')
    .replace(/\\end\{tikzpicture\}/g, '')
    .split(';');

  statements.forEach((stmt, idx) => {
    const line = stmt.trim();
    if (!line) return;

    const isDashed = /dashed/.test(line);
    const isDotted = /dotted/.test(line);
    const hasArrowEnd = /->/.test(line);
    const hasArrowBoth = /<->/.test(line);
    const isVeryThick = /very\s+thick/.test(line);

    let strokeColor = '#0f172a';
    if (/cyan|sky|blue|teal/.test(line)) strokeColor = '#0369a1';
    else if (/emerald|green/.test(line)) strokeColor = '#047857';
    else if (/amber|orange/.test(line)) strokeColor = '#b45309';
    else if (/rose|red|crimson/.test(line)) strokeColor = '#be123c';

    // 1. \draw hoặc \filldraw hình tròn: \draw[...] (x,y) circle (r);
    const circleMatch = line.match(
      /\\(?:draw|filldraw|fill)(?:\[[^\]]*\])?\s*(\([^\)]+\))\s*circle\s*\(\s*([\d\.]+)\s*(?:cm|pt)?\s*\)/
    );
    if (circleMatch) {
      const center = resolvePoint(circleMatch[1]);
      const rawR = parseFloat(circleMatch[2]) || 1;
      const isPt = /pt\s*\)/.test(circleMatch[0]);
      if (center) {
        const rPx = isPt ? Math.max(3, rawR * 1.1) : rawR * unitPx * (userScale > 0.2 ? 1 : userScale);
        elements.push(
          <circle
            key={`c-${idx}`}
            cx={toSvgX(center.x)}
            cy={toSvgY(center.y)}
            r={rPx}
            fill={isPt ? strokeColor : /^\\fill/.test(line) ? `${strokeColor}22` : 'none'}
            stroke={strokeColor}
            strokeWidth={isPt ? 1.5 : 1.8}
            strokeDasharray={isDashed ? '5 3' : isDotted ? '2 2' : undefined}
          />
        );
      }
    }

    // 2. \draw hoặc \fill hình chữ nhật: (x1,y1) rectangle (x2,y2)
    const rectMatch = line.match(
      /\\(?:draw|fill|filldraw)(?:\[[^\]]*\])?\s*(\([^\)]+\))\s*rectangle\s*(\([^\)]+\))/
    );
    if (rectMatch) {
      const p1 = resolvePoint(rectMatch[1]);
      const p2 = resolvePoint(rectMatch[2]);
      if (p1 && p2) {
        const x = Math.min(toSvgX(p1.x), toSvgX(p2.x));
        const y = Math.min(toSvgY(p1.y), toSvgY(p2.y));
        const w = Math.abs(toSvgX(p2.x) - toSvgX(p1.x));
        const h = Math.abs(toSvgY(p2.y) - toSvgY(p1.y));
        const isHatched = /pattern\s*=/.test(line);
        elements.push(
          <rect
            key={`rect-${idx}`}
            x={x}
            y={y}
            width={w}
            height={h}
            fill={isHatched ? 'url(#tikz-hatch-ne)' : /^\\fill/.test(line) ? '#e0f2fe' : 'none'}
            stroke={/^\\fill\[/.test(line) && !/draw=/.test(line) ? 'none' : strokeColor}
            strokeWidth={1.5}
          />
        );
      }
    }

    // 3. Đường gấp khúc / đoạn thẳng / đa giác: (p1) -- (p2) -- ...
    if (line.includes('--') && /^\\(?:draw|fill|filldraw)/.test(line)) {
      const ptMatches = [...line.matchAll(/\(\s*[A-Za-z0-9_]+\s*\)|\(\s*-?[\d\.]+\s*,\s*-?[\d\.]+\s*\)/g)];
      const pts = ptMatches.map((m) => resolvePoint(m[0])).filter(Boolean) as { x: number; y: number }[];
      const isClosed = /--\s*cycle/.test(line);

      if (pts.length >= 2) {
        const pointsAttr = pts.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ');
        if (isClosed || /^\\fill/.test(line)) {
          elements.push(
            <polygon
              key={`poly-${idx}`}
              points={pointsAttr}
              fill={/^\\fill/.test(line) || /fill=/.test(line) ? 'rgba(14, 165, 233, 0.16)' : 'none'}
              stroke={strokeColor}
              strokeWidth={isVeryThick ? 2.4 : 1.8}
              strokeDasharray={isDashed ? '5 3' : undefined}
            />
          );
        } else {
          elements.push(
            <polyline
              key={`line-${idx}`}
              points={pointsAttr}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isVeryThick ? 2.5 : 1.8}
              strokeDasharray={isDashed ? '5 3' : isDotted ? '2 2' : undefined}
              markerEnd={hasArrowEnd || hasArrowBoth ? 'url(#tikz-arrow)' : undefined}
              markerStart={hasArrowBoth ? 'url(#tikz-arrow-start)' : undefined}
            />
          );
        }
      }
    }

    // 4. Các nhãn \node hoặc node[...] at (x,y) {label}
    const nodeAtMatches = [
      ...line.matchAll(/node(?:\[([^\]]*)\])?\s*at\s*(\([^\)]+\))\s*\{([\s\S]*?)\}/g),
    ];
    nodeAtMatches.forEach((nm, nIdx) => {
      const opts = nm[1] || '';
      const pt = resolvePoint(nm[2]);
      const label = cleanLatexLabel(nm[3]);
      if (pt && label) {
        let dx = 0;
        let dy = 4;
        if (/above/.test(opts)) dy = -8;
        if (/below/.test(opts)) dy = 15;
        if (/left/.test(opts)) dx = -14;
        if (/right/.test(opts)) dx = 14;
        elements.push(
          <text
            key={`node-at-${idx}-${nIdx}`}
            x={toSvgX(pt.x) + dx}
            y={toSvgY(pt.y) + dy}
            fill="#0f172a"
            fontFamily={MATH_SERIF}
            fontSize="13"
            fontStyle={/^[A-Za-z]$/.test(label) ? 'italic' : 'normal'}
            fontWeight="600"
            textAnchor="middle"
          >
            {label}
          </text>
        );
      }
    });

    // Nhãn ở cuối đoạn thẳng: ... (x,y) node[right] {label}
    const trailingNodeMatches = [
      ...line.matchAll(/(\(\s*[A-Za-z0-9_]+\s*\)|\(\s*-?[\d\.]+\s*,\s*-?[\d\.]+\s*\))\s*(?:circle\s*\([^\)]+\)\s*)?node(?:\[([^\]]*)\])?\s*\{([\s\S]*?)\}/g),
    ];
    trailingNodeMatches.forEach((tm, tIdx) => {
      const pt = resolvePoint(tm[1]);
      const opts = tm[2] || '';
      const label = cleanLatexLabel(tm[3]);
      if (pt && label) {
        let dx = 0;
        let dy = 4;
        if (/above/.test(opts)) dy = -9;
        if (/below/.test(opts)) dy = 16;
        if (/left/.test(opts)) dx = -14;
        if (/right/.test(opts)) dx = 14;
        elements.push(
          <text
            key={`trail-${idx}-${tIdx}`}
            x={toSvgX(pt.x) + dx}
            y={toSvgY(pt.y) + dy}
            fill="#0f172a"
            fontFamily={MATH_SERIF}
            fontSize="13"
            fontStyle={/^[A-Za-z]$/.test(label) ? 'italic' : 'normal'}
            fontWeight="600"
            textAnchor="middle"
          >
            {label}
          </text>
        );
      }
    });
  });

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-lg mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
    >
      <defs>
        <marker
          id="tikz-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
        </marker>
        <marker
          id="tikz-arrow-start"
          viewBox="0 0 10 10"
          refX="2"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 10 1.5 L 1 5 L 10 8.5 L 8 5 z" fill="#0f172a" />
        </marker>
        <pattern id="tikz-hatch-ne" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" strokeWidth="1.2" />
        </pattern>
      </defs>
      {elements}
    </svg>
  );
}

export const TikzFigure: React.FC<TikzFigureProps> = ({
  type,
  tikzCode,
  caption,
  className = '',
}) => {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chuẩn mã TikZ tương ứng cho từng hình vẽ toán học (ẩn kết quả bằng dấu ?)
  const getTikzCode = (diagramType?: TikzDiagramType | string): string => {
    if (tikzCode && tikzCode.trim()) {
      return tikzCode.trim();
    }

    switch (diagramType) {
      case 'number_line_intersection':
        return `% TikZ: Biểu diễn giao của hai tập hợp A = [-2; 3] và B = (1; +\\infty)
\\begin{tikzpicture}[>=stealth, scale=1.1]
  % Trục số thực
  \\draw[->, thick] (-3.5,0) -- (4.5,0) node[below] {$\\mathbb{R}$};
  \\fill[pattern=north east lines, pattern color=gray!60] (-3.3,-0.18) rectangle (1,0.18);
  \\fill[pattern=north east lines, pattern color=gray!60] (3,-0.18) rectangle (4.2,0.18);
  \\draw (-2, 0.08) -- (-2, -0.08) node[below=4pt] {$-2$};
  \\draw (1, 0.08) -- (1, -0.08) node[below=4pt] {$?$};
  \\draw (3, 0.08) -- (3, -0.08) node[below=4pt] {$?$};
  \\draw[very thick, blue!80!black] (1, 0) -- (3, 0) node[midway, above=5pt] {$A \\cap B = ?$};
\\end{tikzpicture}`;

      case 'set_difference_venn':
        return `% TikZ: Biểu đồ Ven minh họa hiệu hai tập hợp A \\setminus B = ?
\\begin{tikzpicture}[scale=1.0]
  % Miền A \\setminus B tô gạch chéo
  \\begin{scope}
    \\clip (-0.85, 0) circle (1.4cm);
    \\fill[pattern=north east lines, pattern color=blue!50] (-2.5,-1.6) rectangle (2.5,1.6);
    \\fill[white] (0.85, 0) circle (1.4cm);
  \\end{scope}
  \\draw[thick] (-0.85, 0) circle (1.4cm);
  \\draw[thick] (0.85, 0) circle (1.4cm);
  \\node[above] at (-1.2, 1.4) {$A$};
  \\node[above] at (1.2, 1.4) {$B$};
  \\node[font=\\bfseries, red!80!black] at (-1.35, 0) {$A \\setminus B = ?$};
  \\node at (0, 0) {$?$};
  \\node at (1.35, 0) {$?$};
\\end{tikzpicture}`;

      case 'venn_diagram_40':
        return `% TikZ: Biểu đồ Ven 40 học sinh (CLB Bóng đá A và Cầu lông B)
\\begin{tikzpicture}[scale=1.0]
  \\draw[thick, rounded corners=4pt] (-3.4,-2.0) rectangle (3.4,2.0);
  \\node[anchor=north west] at (-3.2, 1.85) {$n(U) = 40$};
  \\draw[thick, fill=blue!8] (-0.85, -0.05) circle (1.4cm);
  \\draw[thick, fill=teal!8] (0.85, -0.05) circle (1.4cm);
  \\draw[thick] (-0.85, -0.05) circle (1.4cm);
  \\node at (-1.5, 1.45) {Bóng đá $A$ ($25$)};
  \\node at (1.5, 1.45) {Cầu lông $B$ ($18$)};
  \\node[font=\\bfseries] at (-1.35, -0.05) {$?$};
  \\node[font=\\bfseries] at (0, -0.05) {$8$};
  \\node[font=\\bfseries] at (1.35, -0.05) {$?$};
  \\node at (2.4, -1.55) {Ngoài: $?$};
\\end{tikzpicture}`;

      case 'venn_diagram_100':
        return `% TikZ: Biểu đồ Ven 100 học sinh (Toán n(A)=65, Văn n(B)=55)
\\begin{tikzpicture}[scale=1.0]
  \\draw[thick, rounded corners=4pt] (-3.4,-2.0) rectangle (3.4,2.0);
  \\node[anchor=north west] at (-3.2, 1.85) {$n(A \\cup B) = 100$};
  \\draw[thick, fill=blue!8] (-0.85, -0.05) circle (1.4cm);
  \\draw[thick, fill=teal!8] (0.85, -0.05) circle (1.4cm);
  \\draw[thick] (-0.85, -0.05) circle (1.4cm);
  \\node at (-1.5, 1.45) {Toán $n(A) = 65$};
  \\node at (1.5, 1.45) {Văn $n(B) = 55$};
  \\node at (-1.35, -0.05) {$?$};
  \\node[font=\\bfseries, red!80!black] at (0, -0.05) {$A \\cap B = ?$};
  \\node at (1.35, -0.05) {$?$};
\\end{tikzpicture}`;

      case 'bpt_halfplane_2x_y_4':
        return `% TikZ: Miền nghiệm của bất phương trình 2x - y + 4 >= 0
\\begin{tikzpicture}[>=stealth, scale=0.65]
  \\draw[->, thick] (-3.5,0) -- (3.2,0) node[below] {$x$};
  \\draw[->, thick] (0,-1.5) -- (0,5.5) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  % Đường thẳng d: 2x - y + 4 = 0 qua (-2,0) và (0,4)
  \\fill[pattern=north east lines, pattern color=gray!45] (-3.2,-1.2) -- (-3.2,5.2) -- (0.6,5.2) -- (-2.6,-1.2) -- cycle;
  \\draw[thick, blue!80!black] (-2.6,-1.2) -- (0.6,5.2) node[right] {$2x - y + 4 = 0$};
  \\filldraw (-2,0) circle (2pt) node[below right] {$-2$};
  \\filldraw (0,4) circle (2pt) node[right] {$4$};
  \\node[red!80!black, font=\\bfseries] at (1.3, 2.2) {$M(x; y) = ?$};
\\end{tikzpicture}`;

      case 'feasible_region_quad':
        return `% TikZ: Miền nghiệm tứ giác OABC của hệ BPT trên Oxy
\\begin{tikzpicture}[>=stealth, scale=0.85]
  \\draw[->, thick] (-1.0,0) -- (5.0,0) node[below] {$x$};
  \\draw[->, thick] (0,-0.8) -- (0,4.6) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\fill[blue!15] (0,0) -- (0,1) -- (1,3) -- (4,0) -- cycle;
  \\draw[thick] (-0.4, 4.4) -- (4.4, -0.4) node[above right] {$x+y=4$};
  \\draw[thick] (-0.7, -0.4) -- (1.7, 4.4) node[right] {$2x-y=-1$};
  \\draw[dashed] (1,0) node[below] {$?$} -- (1,3) -- (0,3) node[left] {$?$};
  \\filldraw (0,0) circle (1.8pt);
  \\filldraw (0,1) circle (1.8pt) node[left] {$A$};
  \\filldraw[red!80!black] (1,3) circle (2pt) node[above right] {$B(?; ?)$};
  \\filldraw (4,0) circle (1.8pt) node[below] {$C$};
\\end{tikzpicture}`;

      case 'feasible_region_aircon':
        return `% TikZ: Miền nghiệm bài toán tối ưu x + y <= 100, 2x + y <= 120
\\begin{tikzpicture}[>=stealth, scale=0.036]
  \\draw[->, thick] (-15,0) -- (125,0) node[below] {$x$};
  \\draw[->, thick] (0,-15) -- (0,132) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\fill[blue!15] (0,0) -- (0,100) -- (20,80) -- (60,0) -- cycle;
  \\draw[thick, blue!80!black] (-8, 108) -- (108, -8) node[above right] {$x+y=100$};
  \\draw[thick, teal!80!black] (-4, 128) -- (64, -8) node[right] {$2x+y=120$};
  \\draw[dashed] (20,0) node[below] {$?$} -- (20,80) -- (0,80) node[left] {$?$};
  \\filldraw (0,0) circle (45pt);
  \\filldraw (0,100) circle (45pt) node[left] {$A$};
  \\filldraw[red!80!black] (20,80) circle (55pt) node[above right] {$B(?; ?)$};
  \\filldraw (60,0) circle (45pt) node[below] {$C$};
  \\filldraw (100,0) circle (35pt) node[below] {$100$};
  \\filldraw (0,120) circle (35pt) node[left] {$120$};
\\end{tikzpicture}`;

      case 'trig_unit_circle_supp':
        return `% TikZ: Nửa đường tròn đơn vị biểu diễn hai góc bù nhau alpha và 180^o - alpha
\\begin{tikzpicture}[>=stealth, scale=1.8]
  \\draw[->, thick] (-1.35,0) -- (1.35,0) node[below] {$x$};
  \\draw[->, thick] (0,-0.2) -- (0,1.35) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\draw[thick] (1,0) arc (0:180:1);
  \\coordinate (M) at ({cos(50)}, {sin(50)});
  \\coordinate (N) at ({-cos(50)}, {sin(50)});
  \\draw[thick, blue!80!black] (0,0) -- (M) node[above right] {$M$};
  \\draw[thick, red!75!black] (0,0) -- (N) node[above left] {$M'(?; ?)$};
  \\draw[dashed] (N) -- (M);
  \\draw[dashed] (M) -- ({cos(50)},0) node[below] {$\\cos\\alpha$};
  \\draw[dashed] (N) -- ({-cos(50)},0) node[below] {$?$};
  \\draw (0.28,0) arc (0:50:0.28) node[right=2pt, above=1pt] {$\\alpha$};
  \\draw (0.42,0) arc (0:130:0.42);
  \\node at (-0.18, 0.52) {$180^\\circ-\\alpha$};
\\end{tikzpicture}`;

      case 'triangle_60deg':
        return `% TikZ: Tam giác ABC có b = 5, c = 8 và góc A = 60 độ
\\begin{tikzpicture}[scale=0.55]
  \\coordinate (A) at (0, 0);
  \\coordinate (B) at (8, 0);
  \\coordinate (C) at ({5*cos(60)}, {5*sin(60)});
  \\draw[thick, fill=blue!5] (A) -- (B) node[midway, below] {$c = 8$}
    -- (C) node[midway, above right] {$a = ?$}
    -- cycle node[midway, above left] {$b = 5$};
  \\draw (0.9, 0) arc (0:60:0.9);
  \\node at (1.35, 0.5) {$60^\\circ$};
  \\filldraw (A) circle (2.2pt) node[below left] {$A$};
  \\filldraw (B) circle (2.2pt) node[below right] {$B$};
  \\filldraw (C) circle (2.2pt) node[above] {$C$};
\\end{tikzpicture}`;

      case 'triangle_sin_circumcircle':
        return `% TikZ: Tam giác ABC nội tiếp đường tròn (O; R) với a = 6, góc A = 30 độ
\\begin{tikzpicture}[scale=0.38]
  \\coordinate (O) at (0,0);
  \\draw[thick] (O) circle (6cm);
  \\coordinate (A) at (90:6);
  \\coordinate (B) at (210:6);
  \\coordinate (C) at (330:6);
  \\draw[thick, fill=blue!5] (A) -- (B) -- (C) -- cycle;
  \\draw[dashed, red!75!black] (O) -- (B) node[midway, above left] {$R = ?$};
  \\draw[dashed, red!75!black] (O) -- (C) node[midway, above right] {$R = ?$};
  \\filldraw (O) circle (3pt) node[above] {$O$};
  \\filldraw (A) circle (3pt) node[above] {$A$};
  \\filldraw (B) circle (3pt) node[below left] {$B$};
  \\filldraw (C) circle (3pt) node[below right] {$C$};
  \\node[below] at (0, -3) {$a = BC = 6$};
  \\node[below] at (0, 4.4) {$30^\\circ$};
\\end{tikzpicture}`;

      case 'triangle_obtuse_cos':
        return `% TikZ: Tam giác ABC với b = 3, c = 5, cos A = -1/15 (góc A tù)
\\begin{tikzpicture}[scale=0.65]
  \\coordinate (A) at (0, 0);
  \\coordinate (B) at (5, 0);
  \\coordinate (C) at (-0.2, 2.99);
  \\draw[thick, fill=blue!5] (A) -- (B) node[midway, below] {$c = 5$}
    -- (C) node[midway, above right] {$a = ?$}
    -- cycle node[midway, left] {$b = 3$};
  \\draw (0.7, 0) arc (0:94:0.7);
  \\filldraw (A) circle (2pt) node[below left] {$A$};
  \\filldraw (B) circle (2pt) node[below right] {$B$};
  \\filldraw (C) circle (2pt) node[above] {$C$};
\\end{tikzpicture}`;

      case 'triangle_heron':
        return `% TikZ: Tam giác ABC với 3 cạnh a = 7, b = 8, c = 5
\\begin{tikzpicture}[scale=0.52]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (5,0);
  \\coordinate (C) at (4, 6.93);
  \\draw[thick, fill=blue!5] (A) -- (B) node[midway, below] {$c = 5$}
    -- (C) node[midway, right] {$a = 7$}
    -- cycle node[midway, above left] {$b = 8$};
  \\node[red!80!black, font=\\bfseries] at (2.8, 2.3) {$S = ?$};
  \\filldraw (A) circle (2.2pt) node[below left] {$A$};
  \\filldraw (B) circle (2.2pt) node[below right] {$B$};
  \\filldraw (C) circle (2.2pt) node[above] {$C$};
\\end{tikzpicture}`;

      case 'river_triangulation':
        return `% TikZ: Bài toán đo khoảng cách AB qua hai bờ sông (AC = 60m, góc A = 75^o, góc C = 60^o)
\\begin{tikzpicture}[scale=0.07]
  % Hai bờ sông song song
  \\fill[cyan!12] (-12, 22) rectangle (82, 58);
  \\draw[dashed, blue!60] (-12, 22) -- (82, 22);
  \\draw[dashed, blue!60] (-12, 58) -- (82, 58);
  \\coordinate (C) at (0, 0);
  \\coordinate (A) at (60, 0);
  \\coordinate (B) at (36.8, 63.7);
  \\draw[thick] (C) -- (A) node[midway, below] {$AC = 60\\text{ m}$};
  \\draw[dashed] (C) -- (B);
  \\draw[thick, blue!80!black] (A) -- (B) node[midway, right] {$AB = ?$};
  \\draw (9,0) arc (0:60:9) node[right=4pt, above=2pt] {$60^\\circ$};
  \\draw (51,0) arc (180:105:9) node[left=4pt, above=2pt] {$75^\\circ$};
  \\filldraw (C) circle (14pt) node[below left] {$C$};
  \\filldraw (A) circle (14pt) node[below right] {$A$};
  \\filldraw (B) circle (14pt) node[above] {$B$};
\\end{tikzpicture}`;

      case 'parabola_vertex_2_1':
        return `% TikZ: Đồ thị Parabol (P): y = -x^2 + 4x - 3 có đỉnh I(?; ?)
\\begin{tikzpicture}[>=stealth, scale=0.8]
  \\draw[->, thick] (-0.8,0) -- (4.6,0) node[below] {$x$};
  \\draw[->, thick] (0,-3.4) -- (0,2.2) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\draw[dashed, gray] (2,-3.2) -- (2,1.8);
  \\draw[dashed] (2,0) node[below] {$?$} -- (2,1) -- (0,1) node[left] {$?$};
  \\draw[thick, blue!80!black, domain=-0.1:4.1, samples=60] plot (\\x, {-(\\x)^2 + 4*(\\x) - 3});
  \\filldraw[red!80!black] (2,1) circle (2pt) node[above right] {$I(?; ?)$};
  \\filldraw (1,0) circle (1.8pt) node[below left] {$1$};
  \\filldraw (3,0) circle (1.8pt) node[below right] {$3$};
  \\filldraw (0,-3) circle (1.8pt) node[left] {$-3$};
\\end{tikzpicture}`;

      case 'number_line_minus2_4':
        return `% TikZ: Biểu diễn tập hợp A \\cap B = ? trên trục số (Đề 01 - Phần IV Câu 1)
\\begin{tikzpicture}[>=stealth, scale=0.9]
  \\draw[->, thick] (-4.5,0) -- (6.2,0);
  \\fill[pattern=north east lines, pattern color=gray!65] (-4.3,-0.2) rectangle (-2,0.2);
  \\fill[pattern=north east lines, pattern color=gray!65] (4,-0.2) rectangle (5.8,0.2);
  \\draw[very thick, blue!80!black] (-2,0) -- (4,0) node[midway, above=6pt] {$A \\cap B = ?$};
  \\node[font=\\bfseries, scale=1.2] at (-2,0) {$($};
  \\node[font=\\bfseries, scale=1.2] at (4,0) {$]$};
  \\node[below=6pt] at (-2,0) {$?$};
  \\node[below=6pt] at (4,0) {$?$};
\\end{tikzpicture}`;

      case 'lighthouse_coast':
        return `% TikZ: Bài toán quan sát ngọn hải đăng từ hai vị trí A, B dọc bờ biển (Đề 01 - Phần IV Câu 4)
\\begin{tikzpicture}[>=stealth, scale=0.95]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (3.2,0);
  \\coordinate (H) at (4.4,0);
  \\coordinate (C) at (4.4, 4.4);
  % Đường thẳng bờ biển và các tia ngắm
  \\draw[thick] (-0.6,0) -- (5.5,0);
  \\draw[thick] (A) -- (C);
  \\draw[thick] (B) -- (C);
  \\draw[dashed, thick, blue!80!black] (C) -- (H) node[midway, right] {$CH = ?$};
  % Ký hiệu vuông góc tại H
  \\draw (4.15,0) -- (4.15,0.25) -- (4.4,0.25);
  % Cung góc 45 độ tại A và 75 độ tại B
  \\draw (0.65,0) arc (0:45:0.65);
  \\node at (0.95, 0.32) {$45^\\circ$};
  \\draw (3.75,0) arc (0:75:0.55);
  \\node at (3.92, 0.42) {$75^\\circ$};
  % Độ dài AB = 30 m
  \\draw[<->, dashed] (0,-0.45) -- (3.2,-0.45) node[midway, fill=white, inner sep=2pt] {$30\\text{ m}$};
  % Nhãn các đỉnh
  \\filldraw (A) circle (1.5pt) node[above left] {$A$};
  \\filldraw (B) circle (1.5pt) node[above left] {$B$};
  \\filldraw (H) circle (1.5pt) node[below] {$H$};
  \\filldraw (C) circle (1.8pt) node[above] {$C$ (Ngọn hải đăng)};
\\end{tikzpicture}`;

      case 'feasible_region_coffee_cocoa':
        return `% TikZ: Miền nghiệm bài toán trồng cà phê và ca cao: x + y <= 8, 2x + 3y <= 18 (Đề 01 - Phần III Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.45]
  \\draw[->, thick] (-1.2,0) -- (10.5,0) node[below] {$x$};
  \\draw[->, thick] (0,-1.2) -- (0,9.5) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\fill[blue!15] (0,0) -- (8,0) -- (6,2) -- (0,6) -- cycle;
  \\draw[thick, blue!80!black] (-0.5, 8.5) -- (8.5, -0.5) node[above right] {$x+y=8$};
  \\draw[thick, teal!80!black] (-0.6, 6.4) -- (9.3, -0.2) node[right] {$2x+3y=18$};
  \\draw[dashed] (6,0) node[below] {$m = ?$} -- (6,2) -- (0,2) node[left] {$n = ?$};
  \\filldraw (0,0) circle (3pt);
  \\filldraw (8,0) circle (3.5pt) node[below] {$A$};
  \\filldraw[red!80!black] (6,2) circle (4pt) node[above right] {$B(m; n) = (?; ?)$};
  \\filldraw (0,6) circle (3.5pt) node[left] {$C$};
\\end{tikzpicture}`;

      case 'venn_diagram_50_10b':
        return `% TikZ: Biểu đồ Ven lớp 10B (50 học sinh: 32 CLB Tiếng Anh, 25 CLB Tin học, 7 không đăng ký)
\\begin{tikzpicture}[scale=1.0]
  \\draw[thick, rounded corners=4pt] (-3.4,-2.0) rectangle (3.4,2.0);
  \\node[anchor=north west] at (-3.2, 1.85) {$n(U) = 50$};
  \\draw[thick, fill=blue!8] (-0.85, -0.05) circle (1.4cm);
  \\draw[thick, fill=teal!8] (0.85, -0.05) circle (1.4cm);
  \\draw[thick] (-0.85, -0.05) circle (1.4cm);
  \\node at (-1.5, 1.45) {Tiếng Anh $A$ ($32$)};
  \\node at (1.5, 1.45) {Tin học $B$ ($25$)};
  \\node at (-1.35, -0.05) {$?$};
  \\node[font=\\bfseries, red!80!black] at (0, -0.05) {$A \\cap B = ?$};
  \\node at (1.35, -0.05) {$?$};
  \\node at (2.3, -1.55) {Ngoài: $7$};
\\end{tikzpicture}`;

      case 'broken_tree_storm':
        return `% TikZ: Bài toán cây bị gãy trong cơn bão (Đề 02 - Phần II Câu 2)
\\begin{tikzpicture}[>=stealth, scale=0.85]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (6,0);
  \\coordinate (C) at (0.89, 3.58);
  % Vẽ tam giác ABC
  \\draw[thick] (A) -- (B) -- (C) -- cycle;
  % Cung góc tại A (76 độ) và tại B (35 độ)
  \\draw (0.65,0) arc (0:76:0.65);
  \\node at (0.85, 0.42) {$76^\\circ$};
  \\draw (4.95,0) arc (180:145:1.05);
  \\node at (4.65, 0.35) {$35^\\circ$};
  % Nhãn các đỉnh và cạnh
  \\node[below left] at (A) {$A$};
  \\node[below right] at (B) {$B$};
  \\node[above] at (C) {$C$};
  \\node[below] at (3,0) {$6\\text{ m}$};
  \\node[left, red!80!black] at (0.4, 1.85) {$AC = ?$};
\\end{tikzpicture}`;

      case 'feasible_region_aloe_asparagus':
        return `% TikZ: Miền nghiệm bài toán trồng nha đam và măng tây: x + y <= 10, x + 3y <= 15 (Đề 02 - Phần III Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.38]
  \\draw[->, thick] (-1.5,0) -- (16.5,0) node[below] {$x$};
  \\draw[->, thick] (0,-1.5) -- (0,11.5) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\fill[blue!15] (0,0) -- (10,0) -- (7.5,2.5) -- (0,5) -- cycle;
  \\draw[thick, blue!80!black] (-0.5, 10.5) -- (10.5, -0.5) node[above right] {$x+y=10$};
  \\draw[thick, teal!80!black] (-0.9, 5.3) -- (15.3, -0.1) node[above right] {$x+3y=15$};
  \\draw[dashed] (7.5,0) node[below] {$?$} -- (7.5,2.5) -- (0,2.5) node[left] {$?$};
  \\filldraw (0,0) circle (3.5pt);
  \\filldraw (10,0) circle (4pt) node[below] {$A$};
  \\filldraw[red!80!black] (7.5,2.5) circle (4.5pt) node[above right] {$B(?; ?),\\ F_{\\max} = ?$};
  \\filldraw (0,5) circle (4pt) node[left] {$C$};
\\end{tikzpicture}`;

      case 'venn_diagram_70_tourists':
        return `% TikZ: Biểu đồ Ven khảo sát 70 khách du lịch (45 Nha Trang, 38 Đà Lạt, 8 chưa đến cả hai nơi)
\\begin{tikzpicture}[scale=1.0]
  \\draw[thick, rounded corners=4pt] (-3.4,-2.0) rectangle (3.4,2.0);
  \\node[anchor=north west] at (-3.2, 1.85) {$n(U) = 70$};
  \\draw[thick, fill=blue!8] (-0.85, -0.05) circle (1.4cm);
  \\draw[thick, fill=teal!8] (0.85, -0.05) circle (1.4cm);
  \\draw[thick] (-0.85, -0.05) circle (1.4cm);
  \\node at (-1.5, 1.45) {Nha Trang $A$ ($45$)};
  \\node at (1.5, 1.45) {Đà Lạt $B$ ($38$)};
  \\node at (-1.35, -0.05) {$?$};
  \\node[font=\\bfseries, red!80!black] at (0, -0.05) {$A \\cap B = ?$};
  \\node at (1.35, -0.05) {$?$};
  \\node at (2.3, -1.55) {Ngoài: $8$};
\\end{tikzpicture}`;

      case 'number_line_3_6':
        return `% TikZ: Biểu diễn tập hợp A \\cap B = ? trên trục số (Đề 02 - Phần IV Câu 1)
\\begin{tikzpicture}[>=stealth, scale=0.9]
  \\draw[->, thick] (-3.5,0) -- (7.5,0);
  \\fill[pattern=north east lines, pattern color=gray!65] (-3.3,-0.2) rectangle (1.5,0.2);
  \\fill[pattern=north east lines, pattern color=gray!65] (4.5,-0.2) rectangle (7.1,0.2);
  \\draw[very thick, blue!80!black] (1.5,0) -- (4.5,0) node[midway, above=6pt] {$A \\cap B = ?$};
  \\node[font=\\bfseries, scale=1.2] at (1.5,0) {$($};
  \\node[font=\\bfseries, scale=1.2] at (4.5,0) {$]$};
  \\node[below=6pt] at (1.5,0) {$?$};
  \\node[below=6pt] at (4.5,0) {$?$};
\\end{tikzpicture}`;

      case 'triangle_cos_inscribed_d2':
        return `% TikZ: Tam giác ABC có b = 6 cm, c = 8 cm, góc A = 60 độ, tìm cạnh a = ? và bán kính nội tiếp r = ? (Đề 02 - Phần IV Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.65]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (8,0);
  \\coordinate (C) at (3, 5.196);
  \\coordinate (I) at (3.42, 1.97);
  \\draw[thick] (A) -- (B) -- (C) -- cycle;
  \\draw[dashed, blue!80!black] (I) circle (1.97cm);
  \\draw[dashed, red!80!black] (I) -- (3.42, 0) node[midway, right] {$r = ?$};
  \\filldraw (I) circle (2pt) node[above left] {$I$};
  \\draw (0.95,0) arc (0:60:0.95);
  \\node at (1.35, 0.45) {$60^\\circ$};
  \\node[below left] at (A) {$A$};
  \\node[below right] at (B) {$B$};
  \\node[above] at (C) {$C$};
  \\node[below] at (4,0) {$c = 8\\text{ cm}$};
  \\node[above left] at (1.5, 2.6) {$b = 6\\text{ cm}$};
  \\node[above right, red!80!black] at (5.5, 2.6) {$a = ?$};
\\end{tikzpicture}`;

      case 'mountain_building_observation':
        return `% TikZ: Quan sát đỉnh núi nhân tạo CD từ hai vị trí A, B của tòa nhà cao 46 m (Đề 02 - Phần IV Câu 4)
\\begin{tikzpicture}[>=stealth, scale=0.85]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (0,2.2);
  \\coordinate (D) at (4.8,0);
  \\coordinate (E) at (4.8,2.2);
  \\coordinate (C) at (4.8,3.8);
  % Tòa nhà AB, ngọn núi CD và mặt đất AD
  \\draw[thick] (A) -- (D) -- (C);
  \\draw[thick] (A) -- (B);
  % Phương nằm ngang BE tại sân thượng
  \\draw[thick] (B) -- (E);
  % Các tia ngắm AC và BC
  \\draw[thick] (A) -- (C);
  \\draw[thick] (B) -- (C);
  % Cung góc 35 độ tại A và 15 độ tại B
  \\draw (0.75,0) arc (0:38:0.75);
  \\node at (1.15, 0.28) {$35^\\circ$};
  \\draw[dashed] (0.85,2.2) arc (0:18:0.85);
  \\node at (1.2, 2.42) {$15^\\circ$};
  % Nhãn các đỉnh và chiều cao
  \\node[below left] at (A) {$A$};
  \\node[left] at (B) {$B$};
  \\node[above] at (C) {$C$};
  \\node[below right] at (D) {$D$};
  \\node[right] at (E) {$E$};
  \\node[left] at (0, 1.1) {$46\\text{ m}$};
  \\node[right, red!80!black] at (4.9, 3.0) {$CD = ?$};
\\end{tikzpicture}`;

      case 'triangle_abc_456_d3':
        return `% TikZ: Tam giác ABC có độ dài ba cạnh a = 4 cm, b = 5 cm, c = 6 cm (Đề 03 - Phần II Câu 2)
\\begin{tikzpicture}[>=stealth, scale=0.72]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (6,0);
  \\coordinate (C) at (3.75, 3.307);
  \\draw[thick, fill=blue!5] (A) -- (B) node[midway, below] {$c = 6\\text{ cm}$}
    -- (C) node[midway, above right] {$a = 4\\text{ cm}$}
    -- cycle node[midway, above left] {$b = 5\\text{ cm}$};
  \\filldraw (A) circle (2pt) node[below left] {$A$};
  \\filldraw (B) circle (2pt) node[below right] {$B$};
  \\filldraw (C) circle (2pt) node[above] {$C$};
\\end{tikzpicture}`;

      case 'triangle_sin_ac_d3':
        return `% TikZ: Tam giác ABC có BC = 12 cm, góc B = 45 độ, góc C = 60 độ, tính AC = ? (Đề 03 - Phần III Câu 2)
\\begin{tikzpicture}[>=stealth, scale=0.45]
  \\coordinate (B) at (0,0);
  \\coordinate (C) at (12,0);
  \\coordinate (A) at (7.61, 7.61);
  \\draw[thick, fill=blue!5] (B) -- (C) node[midway, below] {$BC = 12\\text{ cm}$}
    -- (A) node[midway, above right, red!80!black] {$AC = ?$}
    -- cycle;
  \\draw (1.5,0) arc (0:45:1.5);
  \\node at (2.1, 0.7) {$45^\\circ$};
  \\draw (10.5,0) arc (180:120:1.5);
  \\node at (9.9, 0.75) {$60^\\circ$};
  \\filldraw (B) circle (3pt) node[below left] {$B$};
  \\filldraw (C) circle (3pt) node[below right] {$C$};
  \\filldraw (A) circle (3pt) node[above] {$A$};
\\end{tikzpicture}`;

      case 'feasible_region_rice_potato_d3':
        return `% TikZ: Miền nghiệm bài toán Bác An trồng lúa và khoai: x + y <= 6, x + 2y <= 8 (Đề 03 - Phần III Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.52]
  \\draw[->, thick] (-1.0,0) -- (9.2,0) node[below] {$x$};
  \\draw[->, thick] (0,-1.0) -- (0,7.2) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\fill[blue!15] (0,0) -- (6,0) -- (4,2) -- (0,4) -- cycle;
  \\draw[thick, blue!80!black] (-0.5, 6.5) -- (6.5, -0.5) node[above right] {$x+y=6$};
  \\draw[thick, teal!80!black] (-0.6, 4.3) -- (8.4, -0.2) node[above right] {$x+2y=8$};
  \\draw[dashed] (4,0) node[below] {$?$} -- (4,2) -- (0,2) node[left] {$?$};
  \\filldraw (0,0) circle (2.5pt);
  \\filldraw (6,0) circle (2.8pt) node[below] {$A$};
  \\filldraw[red!80!black] (4,2) circle (3.2pt) node[above right] {$B(?; ?),\\ F_{\\max} = ?$};
  \\filldraw (0,4) circle (2.8pt) node[left] {$C$};
\\end{tikzpicture}`;

      case 'venn_diagram_10a_math_eng_d3':
        return `% TikZ: Biểu đồ Ven lớp 10A khảo sát Toán (12 giỏi), Tiếng Anh (18 giỏi), 6 giỏi cả hai, 10 ngoài (Đề 03 - Phần III Câu 4)
\\begin{tikzpicture}[scale=1.0]
  \\draw[thick, rounded corners=4pt] (-3.4,-2.0) rectangle (3.4,2.0);
  \\node[anchor=north west, red!80!black, font=\\bfseries] at (-3.2, 1.85) {$n(U) = ?$};
  \\draw[thick, fill=blue!8] (-0.85, -0.05) circle (1.4cm);
  \\draw[thick, fill=teal!8] (0.85, -0.05) circle (1.4cm);
  \\draw[thick] (-0.85, -0.05) circle (1.4cm);
  \\node at (-1.5, 1.45) {Giỏi Toán $A$ ($12$)};
  \\node at (1.5, 1.45) {Giỏi Anh $B$ ($18$)};
  \\node at (-1.35, -0.05) {$?$};
  \\node[font=\\bfseries] at (0, -0.05) {$6$};
  \\node at (1.35, -0.05) {$?$};
  \\node at (2.3, -1.55) {Ngoài: $10$};
\\end{tikzpicture}`;

      case 'number_line_union_4_d3':
        return `% TikZ: Biểu diễn tập hợp A \\cup B = (-\\infty; 4) trên trục số (Đề 03 - Phần IV Câu 1)
\\begin{tikzpicture}[>=stealth, scale=1.0]
  \\draw[->, thick] (-3,0) -- (4,0) node[below] {$x$};
  % Điểm 4 cho kết quả hợp A \\cup B = (-\\infty; 4)
  \\draw (2, 0.1) -- (2, -0.1) node[below] {$4$};
  \\node at (2,0) {$)$};
  % Gạch bỏ phần [4; +\\infty)
  \\foreach \\x in {2.1, 2.3, ..., 3.7}
    \\draw (\\x, -0.1) -- (\\x+0.15, 0.1);
\\end{tikzpicture}`;

      case 'triangle_cos_inscribed_d3':
        return `% TikZ: Tam giác ABC có b = 5, c = 8, góc A = 60 độ, tìm cạnh a = ? và bán kính nội tiếp r = ? (Đề 03 - Phần IV Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.65]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (8,0);
  \\coordinate (C) at (2.5, 4.33);
  \\coordinate (I) at (3.0, 1.732);
  \\draw[thick] (A) -- (B) -- (C) -- cycle;
  \\draw[dashed, blue!80!black] (I) circle (1.732cm);
  \\draw[dashed, red!80!black] (I) -- (3.0, 0) node[midway, right] {$r = ?$};
  \\filldraw (I) circle (2pt) node[above left] {$I$};
  \\draw (0.95,0) arc (0:60:0.95);
  \\node at (1.35, 0.45) {$60^\\circ$};
  \\node[below left] at (A) {$A$};
  \\node[below right] at (B) {$B$};
  \\node[above] at (C) {$C$};
  \\node[below] at (4,0) {$c = 8$};
  \\node[above left] at (1.2, 2.2) {$b = 5$};
  \\node[above right, red!80!black] at (5.3, 2.3) {$a = ?$};
\\end{tikzpicture}`;

      case 'mountain_tv_tower_d3':
        return `% TikZ: Bài toán tháp truyền hình BC = 50 m trên đỉnh ngọn núi CH = h (Đề 03 - Phần IV Câu 4)
\\begin{tikzpicture}[>=stealth, scale=0.9]
  \\coordinate (H) at (0,0);
  \\coordinate (A) at (-5,0);
  \\coordinate (C) at (0,2);
  \\coordinate (B) at (0,3.5);
  \\draw[thick] (A) -- (H) -- (B) -- (A);
  \\draw[thick] (A) -- (C);
  \\draw[very thick, blue] (C) -- (B) node[midway, right] {$50\\text{ m}$};
  \\draw[dashed] (H) -- (C) node[midway, right] {$h$};
  \\node[below left] at (A) {$A$};
  \\node[below right] at (H) {$H$};
  \\node[right] at (C) {$C$};
  \\node[above] at (B) {$B$};
  % Ký hiệu góc vuông tại H
  \\draw (-0.25,0) -- (-0.25,0.25) -- (0,0.25);
  % Góc nâng 9,2 độ và 15,5 độ tại A
  \\draw (-4,0) arc (0:21:1) node[midway, right, xshift=2pt, yshift=-2pt] {\\footnotesize $9,2^\\circ$};
  \\draw (-3.4,0) arc (0:35:1.6) node[ near end, above left, xshift=14pt, yshift=1pt] {\\footnotesize $15,5^\\circ$};
\\end{tikzpicture}`;

      case 'triangle_abc_567_d4':
        return `% TikZ: Tam giác ABC có độ dài ba cạnh a = 5 cm, b = 6 cm, c = 7 cm (Đề 04 - Phần II Câu 2)
\\begin{tikzpicture}[>=stealth, scale=0.65]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (7,0);
  \\coordinate (C) at (4.286, 4.199);
  \\draw[thick, fill=blue!5] (A) -- (B) node[midway, below] {$c = 7\\text{ cm}$}
    -- (C) node[midway, above right] {$a = 5\\text{ cm}$}
    -- cycle node[midway, above left] {$b = 6\\text{ cm}$};
  \\filldraw (A) circle (2pt) node[below left] {$A$};
  \\filldraw (B) circle (2pt) node[below right] {$B$};
  \\filldraw (C) circle (2pt) node[above] {$C$};
\\end{tikzpicture}`;

      case 'triangle_sin_ac_d4':
        return `% TikZ: Tam giác ABC có BC = 15 cm, góc B = 45 độ, góc C = 60 độ, tính AC = ? (Đề 04 - Phần III Câu 2)
\\begin{tikzpicture}[>=stealth, scale=0.38]
  \\coordinate (B) at (0,0);
  \\coordinate (C) at (15,0);
  \\coordinate (A) at (9.51, 9.51);
  \\draw[thick, fill=blue!5] (B) -- (C) node[midway, below] {$BC = 15\\text{ cm}$}
    -- (A) node[midway, above right, red!80!black] {$AC = ?$}
    -- cycle;
  \\draw (1.8,0) arc (0:45:1.8);
  \\node at (2.5, 0.85) {$45^\\circ$};
  \\draw (13.2,0) arc (180:120:1.8);
  \\node at (12.4, 0.9) {$60^\\circ$};
  \\filldraw (B) circle (3.5pt) node[below left] {$B$};
  \\filldraw (C) circle (3.5pt) node[below right] {$C$};
  \\filldraw (A) circle (3.5pt) node[above] {$A$};
\\end{tikzpicture}`;

      case 'feasible_region_corn_soy_d4':
        return `% TikZ: Miền nghiệm bài toán Bác Bình trồng ngô và đậu nành: x + y <= 8, x + 2y <= 10 (Đề 04 - Phần III Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.45]
  \\draw[->, thick] (-1.2,0) -- (11.2,0) node[below] {$x$};
  \\draw[->, thick] (0,-1.2) -- (0,9.2) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\fill[blue!15] (0,0) -- (8,0) -- (6,2) -- (0,5) -- cycle;
  \\draw[thick, blue!80!black] (-0.5, 8.5) -- (8.5, -0.5) node[above right] {$x+y=8$};
  \\draw[thick, teal!80!black] (-0.6, 5.3) -- (10.4, -0.2) node[above right] {$x+2y=10$};
  \\draw[dashed] (6,0) node[below] {$?$} -- (6,2) -- (0,2) node[left] {$?$};
  \\filldraw (0,0) circle (2.8pt);
  \\filldraw (8,0) circle (3pt) node[below] {$A$};
  \\filldraw[red!80!black] (6,2) circle (3.5pt) node[above right] {$B(?; ?),\\ F_{\\max} = ?$};
  \\filldraw (0,5) circle (3pt) node[left] {$C$};
\\end{tikzpicture}`;

      case 'venn_diagram_10b_math_phys_d4':
        return `% TikZ: Biểu đồ Ven lớp 10B khảo sát Toán (15 giỏi), Vật lí (20 giỏi), 8 giỏi cả hai, 12 ngoài (Đề 04 - Phần III Câu 4)
\\begin{tikzpicture}[scale=1.0]
  \\draw[thick, rounded corners=4pt] (-3.4,-2.0) rectangle (3.4,2.0);
  \\node[anchor=north west, red!80!black, font=\\bfseries] at (-3.2, 1.85) {$n(U) = ?$};
  \\draw[thick, fill=blue!8] (-0.85, -0.05) circle (1.4cm);
  \\draw[thick, fill=teal!8] (0.85, -0.05) circle (1.4cm);
  \\draw[thick] (-0.85, -0.05) circle (1.4cm);
  \\node at (-1.5, 1.45) {Giỏi Toán $A$ ($15$)};
  \\node at (1.5, 1.45) {Giỏi Vật lí $B$ ($20$)};
  \\node at (-1.35, -0.05) {$?$};
  \\node[font=\\bfseries] at (0, -0.05) {$8$};
  \\node at (1.35, -0.05) {$?$};
  \\node at (2.3, -1.55) {Ngoài: $12$};
\\end{tikzpicture}`;

      case 'number_line_union_5_d4':
        return `% TikZ: Biểu diễn tập hợp A \\cup B = (-\\infty; 5) trên trục số (Đề 04 - Phần IV Câu 1)
\\begin{tikzpicture}[>=stealth, scale=1.0]
  \\draw[->, thick] (-3,0) -- (4,0) node[below] {$x$};
  % Điểm 5 cho kết quả hợp A \\cup B = (-\\infty; 5)
  \\draw (2, 0.1) -- (2, -0.1) node[below] {$5$};
  \\node at (2,0) {$)$};
  % Gạch bỏ phần [5; +\\infty)
  \\foreach \\x in {2.1, 2.3, ..., 3.7}
    \\draw (\\x, -0.1) -- (\\x+0.15, 0.1);
\\end{tikzpicture}`;

      case 'triangle_cos_inscribed_d4':
        return `% TikZ: Tam giác ABC có b = 3, c = 8, góc A = 60 độ, tìm cạnh a = ? và bán kính nội tiếp r = ? (Đề 04 - Phần IV Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.65]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (8,0);
  \\coordinate (C) at (1.5, 2.598);
  \\coordinate (I) at (2.0, 1.155);
  \\draw[thick] (A) -- (B) -- (C) -- cycle;
  \\draw[dashed, blue!80!black] (I) circle (1.155cm);
  \\draw[dashed, red!80!black] (I) -- (2.0, 0) node[midway, right] {$r = ?$};
  \\filldraw (I) circle (2pt) node[above left] {$I$};
  \\draw (0.95,0) arc (0:60:0.95);
  \\node at (1.35, 0.45) {$60^\\circ$};
  \\node[below left] at (A) {$A$};
  \\node[below right] at (B) {$B$};
  \\node[above] at (C) {$C$};
  \\node[below] at (4,0) {$c = 8$};
  \\node[above left] at (0.7, 1.4) {$b = 3$};
  \\node[above right, red!80!black] at (4.8, 1.5) {$a = ?$};
\\end{tikzpicture}`;

      case 'mountain_tv_tower_d4':
        return `% TikZ: Bài toán tháp viễn thông BC = 45 m trên đỉnh ngọn đồi CH = h (Đề 04 - Phần IV Câu 4)
\\begin{tikzpicture}[>=stealth, scale=0.9]
  \\coordinate (H) at (0,0);
  \\coordinate (A) at (-5,0);
  \\coordinate (C) at (0,2);
  \\coordinate (B) at (0,3.5);
  \\draw[thick] (A) -- (H) -- (B) -- (A);
  \\draw[thick] (A) -- (C);
  \\draw[very thick, blue] (C) -- (B) node[midway, right] {$45\\text{ m}$};
  \\draw[dashed] (H) -- (C) node[midway, right] {$h$};
  \\node[below left] at (A) {$A$};
  \\node[below right] at (H) {$H$};
  \\node[right] at (C) {$C$};
  \\node[above] at (B) {$B$};
  % Ký hiệu góc vuông tại H
  \\draw (-0.25,0) -- (-0.25,0.25) -- (0,0.25);
  % Góc nâng 11,2 độ và 18,5 độ tại A
  \\draw (-4,0) arc (0:21:1) node[midway, right, xshift=2pt, yshift=-2pt] {\\footnotesize $11,2^\\circ$};
  \\draw (-3.4,0) arc (0:35:1.6) node[near end, above left, xshift=14pt, yshift=1pt] {\\footnotesize $18,5^\\circ$};
\\end{tikzpicture}`;

      case 'feasible_region_tea_pepper_d5':
        return `% TikZ: Miền nghiệm bài toán Bác Minh trồng chè và hồ tiêu: x + y <= 9, 2x + 3y <= 21 (Đề 05 - Phần III Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.42]
  \\draw[->, thick] (-1.2,0) -- (11.5,0) node[below] {$x$};
  \\draw[->, thick] (0,-1.2) -- (0,10.2) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\fill[blue!15] (0,0) -- (9,0) -- (6,3) -- (0,7) -- cycle;
  \\draw[thick, blue!80!black] (-0.5, 9.5) -- (9.5, -0.5) node[above right] {$x+y=9$};
  \\draw[thick, teal!80!black] (-0.6, 7.4) -- (10.8, -0.2) node[above right] {$2x+3y=21$};
  \\draw[dashed] (6,0) node[below] {$m=?$} -- (6,3) -- (0,3) node[left] {$n=?$};
  \\filldraw (0,0) circle (2.8pt);
  \\filldraw (9,0) circle (3pt) node[below] {$A(9;0)$};
  \\filldraw[red!80!black] (6,3) circle (3.5pt) node[above right] {$B(m; n)$};
  \\filldraw (0,7) circle (3pt) node[left] {$C(0;7)$};
\\end{tikzpicture}`;

      case 'venn_diagram_45_10c_d5':
        return `% TikZ: Biểu đồ Ven lớp 10C (45 học sinh): CLB Bóng rổ (28), CLB Cầu lông (22), ngoài (6) (Đề 05 - Phần III Câu 4)
\\begin{tikzpicture}[scale=1.0]
  \\draw[thick, rounded corners=4pt] (-3.4,-2.0) rectangle (3.4,2.0);
  \\node[anchor=north west, font=\\bfseries] at (-3.2, 1.85) {$n(U) = 45$};
  \\draw[thick, fill=blue!8] (-0.85, -0.05) circle (1.4cm);
  \\draw[thick, fill=teal!8] (0.85, -0.05) circle (1.4cm);
  \\draw[thick] (-0.85, -0.05) circle (1.4cm);
  \\node at (-1.5, 1.45) {Bóng rổ $A$ ($28$)};
  \\node at (1.5, 1.45) {Cầu lông $B$ ($22$)};
  \\node at (-1.35, -0.05) {$?$};
  \\node[red!80!black, font=\\bfseries] at (0, -0.05) {$?$};
  \\node at (1.35, -0.05) {$?$};
  \\node at (2.3, -1.55) {Ngoài: $6$};
\\end{tikzpicture}`;

      case 'number_line_minus3_5_d5':
        return `% TikZ: Biểu diễn tập hợp A \\cap B = (-3; 5] trên trục số (Đề 05 - Phần IV Câu 1)
\\begin{tikzpicture}[>=stealth, scale=0.85]
  \\draw[->, thick] (-5,0) -- (7,0) node[below] {$x$};
  \\draw (-3, 0.12) -- (-3, -0.12) node[below] {$-3$};
  \\draw (5, 0.12) -- (5, -0.12) node[below] {$5$};
  \\node at (-3,0) {$($};
  \\node at (5,0) {$]$};
  \\foreach \\x in {-4.8, -4.5, ..., -3.2}
    \\draw (\\x, -0.12) -- (\\x+0.18, 0.12);
  \\foreach \\x in {5.2, 5.5, ..., 6.6}
    \\draw (\\x, -0.12) -- (\\x+0.18, 0.12);
\\end{tikzpicture}`;

      case 'lighthouse_coast_d5':
        return `% TikZ: Bài toán ngọn hải đăng C cách bờ biển AB = 40 m, góc quan sát 45 độ và 75 độ (Đề 05 - Phần IV Câu 4)
\\begin{tikzpicture}[>=stealth, scale=0.85]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (3.2,0);
  \\coordinate (H) at (4.6,0);
  \\coordinate (C) at (4.6,4.6);
  \\draw[thick] (-0.5,0) -- (5.5,0);
  \\draw[very thick, blue!80!black] (A) -- (B) node[midway, below] {$40\\text{ m}$};
  \\draw[thick] (A) -- (C);
  \\draw[thick] (B) -- (C);
  \\draw[dashed, red!80!black, thick] (C) -- (H) node[midway, right] {$CH = ?$};
  \\draw (4.35,0) -- (4.35,0.25) -- (4.6,0.25);
  \\draw (0.7,0) arc (0:45:0.7) node[midway, right, xshift=2pt, yshift=2pt] {$45^\\circ$};
  \\draw (3.75,0) arc (0:75:0.55) node[midway, above right, xshift=1pt] {$75^\\circ$};
  \\filldraw (A) circle (2.5pt) node[below left] {$A$};
  \\filldraw (B) circle (2.5pt) node[below] {$B$};
  \\filldraw (H) circle (2.5pt) node[below right] {$H$};
  \\filldraw[red!80!black] (C) circle (3pt) node[above] {$C$ (Hải đăng)};
\\end{tikzpicture}`;

      case 'broken_tree_storm_d6':
        return `% TikZ: Bài toán cây bị bão làm gãy không hoàn toàn: AB = 8 m, góc CAB = 74 độ, góc CBA = 36 độ (Đề 06 - Phần II Câu 2)
\\begin{tikzpicture}[>=stealth, scale=0.65]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (8,0);
  \\coordinate (C) at (1.38, 4.81);
  \\draw[thick] (-0.8,0) -- (9.0,0);
  \\draw[very thick, teal!75!black] (A) -- (C) node[midway, left] {$AC = ?$};
  \\draw[very thick, teal!75!black] (C) -- (B);
  \\draw[thick, blue!80!black] (A) -- (B) node[midway, below] {$AB = 8\\text{ m}$};
  \\draw (0.9,0) arc (0:74:0.9) node[midway, above right, xshift=1pt] {$74^\\circ$};
  \\draw (6.9,0) arc (180:144:1.1) node[midway, above left] {$36^\\circ$};
  \\filldraw (A) circle (3pt) node[below left] {$A$ (Gốc cây)};
  \\filldraw (B) circle (3pt) node[below right] {$B$ (Ngọn cây)};
  \\filldraw[red!80!black] (C) circle (3.2pt) node[above] {$C$ (Điểm gãy)};
\\end{tikzpicture}`;

      case 'feasible_region_melon_strawberry_d6':
        return `% TikZ: Miền nghiệm bài toán trồng dưa lưới và dâu tây: x + y <= 12, x + 3y <= 18 (Đề 06 - Phần III Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.35]
  \\draw[->, thick] (-1.5,0) -- (19.5,0) node[below] {$x$};
  \\draw[->, thick] (0,-1.5) -- (0,13.5) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\fill[blue!15] (0,0) -- (12,0) -- (9,3) -- (0,6) -- cycle;
  \\draw[thick, blue!80!black] (-0.5, 12.5) -- (12.5, -0.5) node[above right] {$x+y=12$};
  \\draw[thick, teal!80!black] (-0.6, 6.2) -- (18.6, -0.2) node[above right] {$x+3y=18$};
  \\draw[dashed] (9,0) node[below] {$?$} -- (9,3) -- (0,3) node[left] {$?$};
  \\filldraw (0,0) circle (3pt);
  \\filldraw (12,0) circle (3.5pt) node[below] {$A(12;0)$};
  \\filldraw[red!80!black] (9,3) circle (4pt) node[above right] {$B(?; ?),\\ F_{\\max} = ?$};
  \\filldraw (0,6) circle (3.5pt) node[left] {$C(0;6)$};
\\end{tikzpicture}`;

      case 'venn_diagram_80_tourists_d6':
        return `% TikZ: Biểu đồ Ven khảo sát 80 khách du lịch: Phú Quốc (52), Hạ Long (44), chưa đến hai nơi (10) (Đề 06 - Phần III Câu 4)
\\begin{tikzpicture}[scale=1.0]
  \\draw[thick, rounded corners=4pt] (-3.4,-2.0) rectangle (3.4,2.0);
  \\node[anchor=north west, font=\\bfseries] at (-3.2, 1.85) {$n(U) = 80$};
  \\draw[thick, fill=blue!8] (-0.85, -0.05) circle (1.4cm);
  \\draw[thick, fill=teal!8] (0.85, -0.05) circle (1.4cm);
  \\draw[thick] (-0.85, -0.05) circle (1.4cm);
  \\node at (-1.5, 1.45) {Phú Quốc $A$ ($52$)};
  \\node at (1.5, 1.45) {Hạ Long $B$ ($44$)};
  \\node at (-1.35, -0.05) {$?$};
  \\node[red!80!black, font=\\bfseries] at (0, -0.05) {$?$};
  \\node at (1.35, -0.05) {$?$};
  \\node at (2.3, -1.55) {Ngoài: $10$};
\\end{tikzpicture}`;

      case 'number_line_2_7_d6':
        return `% TikZ: Biểu diễn tập hợp A \\cap B = (2; 7] trên trục số (Đề 06 - Phần IV Câu 1)
\\begin{tikzpicture}[>=stealth, scale=0.8]
  \\draw[->, thick] (-4,0) -- (9,0) node[below] {$x$};
  \\draw (2, 0.12) -- (2, -0.12) node[below] {$2$};
  \\draw (7, 0.12) -- (7, -0.12) node[below] {$7$};
  \\node at (2,0) {$($};
  \\node at (7,0) {$]$};
  \\foreach \\x in {-3.8, -3.5, ..., 1.8}
    \\draw (\\x, -0.12) -- (\\x+0.18, 0.12);
  \\foreach \\x in {7.2, 7.5, ..., 8.6}
    \\draw (\\x, -0.12) -- (\\x+0.18, 0.12);
\\end{tikzpicture}`;

      case 'triangle_cos_inscribed_d6':
        return `% TikZ: Tam giác ABC có b = 5 cm, c = 8 cm, góc A = 60 độ, tìm cạnh a = ? và bán kính nội tiếp r = ? (Đề 06 - Phần IV Câu 3)
\\begin{tikzpicture}[>=stealth, scale=0.65]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (8,0);
  \\coordinate (C) at (2.5, 4.33);
  \\coordinate (I) at (3.0, 1.732);
  \\draw[thick] (A) -- (B) -- (C) -- cycle;
  \\draw[dashed, blue!80!black] (I) circle (1.732cm);
  \\draw[dashed, red!80!black] (I) -- (3.0, 0) node[midway, right] {$r = ?$};
  \\filldraw (I) circle (2pt) node[above left] {$I$};
  \\draw (0.95,0) arc (0:60:0.95);
  \\node at (1.35, 0.45) {$60^\\circ$};
  \\node[below left] at (A) {$A$};
  \\node[below right] at (B) {$B$};
  \\node[above] at (C) {$C$};
  \\node[below] at (4,0) {$c = 8\\text{ cm}$};
  \\node[above left] at (1.1, 2.2) {$b = 5\\text{ cm}$};
  \\node[above right, red!80!black] at (5.4, 2.3) {$a = ?$};
\\end{tikzpicture}`;

      case 'mountain_building_observation_d6':
        return `% TikZ: Quan sát đỉnh núi CD = h từ tầng trệt A (góc 38 độ) và sân thượng B (góc 18 độ) của tòa nhà cao 50 m (Đề 06 - Phần IV Câu 4)
\\begin{tikzpicture}[>=stealth, scale=0.85]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (0,1.9);
  \\coordinate (D) at (4.5,0);
  \\coordinate (E) at (4.5,1.9);
  \\coordinate (C) at (4.5,3.5);
  \\draw[thick] (-0.4,0) -- (5.2,0);
  \\draw[very thick, blue!80!black] (A) -- (B) node[midway, left] {$50\\text{ m}$};
  \\draw[very thick, teal!80!black] (D) -- (C) node[midway, right] {$h = ?$};
  \\draw[dashed] (B) -- (E);
  \\draw[thick] (A) -- (C);
  \\draw[thick] (B) -- (C);
  \\draw (4.25,0) -- (4.25,0.25) -- (4.5,0.25);
  \\draw (4.25,1.9) -- (4.25,2.15) -- (4.5,2.15);
  \\draw (0.85,0) arc (0:38:0.85) node[midway, right, xshift=3pt, yshift=1pt] {\\footnotesize $38^\\circ$};
  \\draw (1.0,1.9) arc (0:19.5:1.0) node[midway, right, xshift=4pt, yshift=2pt] {\\footnotesize $18^\\circ$};
  \\filldraw (A) circle (2.5pt) node[below left] {$A$};
  \\filldraw (B) circle (2.5pt) node[above left] {$B$};
  \\filldraw (D) circle (2.5pt) node[below right] {$D$};
  \\filldraw (E) circle (2.5pt) node[right] {$E$};
  \\filldraw[red!80!black] (C) circle (3pt) node[above] {$C$ (Đỉnh núi)};
\\end{tikzpicture}`;

      default:
        return '';
    }
  };

  const handleCopyCode = () => {
    playClickSound();
    const code = getTikzCode(type);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render SVG hình vẽ trực quan chuẩn phong cách xuất bản LaTeX TikZ (nền giấy trắng kỹ thuật, font Times New Roman, ẩn đáp số bằng dấu ?)
  const renderSvgDiagram = () => {
    if (tikzCode && tikzCode.trim() && (!type || type === 'custom')) {
      return renderCustomTikzToSvg(tikzCode);
    }

    switch (type) {
      case 'number_line_intersection':
        return (
          <svg
            viewBox="0 0 520 115"
            className="w-full max-w-lg mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="nl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
              <pattern id="nl-hatch-ne" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="7" stroke="#64748b" strokeWidth="1.2" />
              </pattern>
              <pattern id="nl-hatch-nw" width="7" height="7" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="7" stroke="#94a3b8" strokeWidth="1.1" />
              </pattern>
            </defs>

            {/* Vùng gạch chéo bị loại */}
            <rect x="36" y="43" width="84" height="24" fill="url(#nl-hatch-ne)" />
            <rect x="370" y="43" width="95" height="24" fill="url(#nl-hatch-ne)" />
            <rect x="36" y="43" width="234" height="24" fill="url(#nl-hatch-nw)" />

            {/* Trục số thực R */}
            <line x1="30" y1="55" x2="480" y2="55" stroke="#0f172a" strokeWidth="1.8" markerEnd="url(#nl-arrow)" />
            <text x="492" y="60" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold">
              ℝ
            </text>

            {/* Phần giao lấy nghiệm tô đậm với dấu chấm hỏi ? */}
            <line x1="270" y1="55" x2="370" y2="55" stroke="#1d4ed8" strokeWidth="3.5" />

            {/* Vạch chia và dấu chấm hỏi tại biên nghiệm */}
            {[
              { val: '−2', x: 120, color: '#0f172a' },
              { val: '0', x: 220, color: '#0f172a' },
              { val: '?', x: 270, color: '#dc2626' },
              { val: '?', x: 370, color: '#dc2626' },
            ].map((item, idx) => (
              <g key={idx}>
                <line x1={item.x} y1="48" x2={item.x} y2="62" stroke="#0f172a" strokeWidth="1.5" />
                <text
                  x={item.x}
                  y="85"
                  fill={item.color}
                  fontFamily={MATH_SERIF}
                  fontSize="16"
                  fontWeight={item.val === '?' ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {item.val}
                </text>
              </g>
            ))}

            {/* Dấu ngoặc tại -2 và dấu ? tại miền giao */}
            <text x="120" y="61" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              [
            </text>

            {/* Nhãn chú thích */}
            <text x="320" y="30" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A ∩ B = ?
            </text>
          </svg>
        );

      case 'set_difference_venn':
        return (
          <svg
            viewBox="0 0 420 210"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <pattern id="venn-diff-hatch" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="7" stroke="#2563eb" strokeWidth="1.2" opacity="0.55" />
              </pattern>
              <clipPath id="clip-circle-a">
                <circle cx="165" cy="110" r="72" />
              </clipPath>
            </defs>

            {/* Miền A \ B gạch chéo chuẩn TikZ */}
            <g clipPath="url(#clip-circle-a)">
              <rect x="80" y="30" width="170" height="160" fill="url(#venn-diff-hatch)" />
              <circle cx="255" cy="110" r="72" fill="#ffffff" />
            </g>

            {/* Hai đường tròn A và B */}
            <circle cx="165" cy="110" r="72" fill="none" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="255" cy="110" r="72" fill="none" stroke="#0f172a" strokeWidth="1.8" />

            {/* Tên tập hợp A, B */}
            <text x="125" y="30" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="17" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="285" y="30" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="17" fontStyle="italic" fontWeight="bold">
              B
            </text>

            {/* Dấu chấm hỏi ? ở các miền thay vì hiện sẵn đáp án */}
            <rect x="104" y="96" width="60" height="26" rx="4" fill="#ffffff" fillOpacity="0.9" />
            <text x="134" y="115" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              A \ B = ?
            </text>

            <text x="210" y="115" fill="#475569" fontFamily={MATH_SERIF} fontSize="17" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="288" y="115" fill="#475569" fontFamily={MATH_SERIF} fontSize="17" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="210" y="198" fill="#334155" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="middle">
              Miền gạch chéo biểu diễn hiệu A \ B = ?
            </text>
          </svg>
        );

      case 'venn_diagram_40':
        return (
          <svg
            viewBox="0 0 450 230"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tập vũ trụ U = 40 */}
            <rect x="20" y="18" width="410" height="194" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
            <text x="34" y="42" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              n(U) = 40
            </text>

            {/* Hai tập hợp A (Bóng đá) và B (Cầu lông) */}
            <circle cx="175" cy="118" r="74" fill="#eff6ff" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="275" cy="118" r="74" fill="#f0fdf4" fillOpacity="0.6" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="175" cy="118" r="74" fill="none" stroke="#0f172a" strokeWidth="1.8" />

            <text x="140" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Bóng đá A (25)
            </text>
            <text x="310" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Cầu lông B (18)
            </text>

            <text x="135" y="122" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="225" y="122" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              8
            </text>
            <text x="315" y="122" fill="#065f46" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="225" y="142" fill="#475569" fontFamily={MATH_SERIF} fontSize="12" fontStyle="italic" textAnchor="middle">
              A ∩ B
            </text>
            <text x="372" y="198" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              Ngoài: ?
            </text>
          </svg>
        );

      case 'venn_diagram_100':
        return (
          <svg
            viewBox="0 0 450 230"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <rect x="20" y="18" width="410" height="194" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
            <text x="34" y="42" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              n(A ∪ B) = 100
            </text>

            <circle cx="175" cy="118" r="74" fill="#eff6ff" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="275" cy="118" r="74" fill="#f0fdf4" fillOpacity="0.6" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="175" cy="118" r="74" fill="none" stroke="#0f172a" strokeWidth="1.8" />

            <text x="135" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Toán: n(A) = 65
            </text>
            <text x="315" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Ngữ văn: n(B) = 55
            </text>

            <text x="135" y="122" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="18" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="225" y="122" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="17" fontWeight="bold" textAnchor="middle">
              A ∩ B = ?
            </text>
            <text x="315" y="122" fill="#065f46" fontFamily={MATH_SERIF} fontSize="18" fontWeight="bold" textAnchor="middle">
              ?
            </text>
          </svg>
        );

      case 'bpt_halfplane_2x_y_4':
        return (
          <svg
            viewBox="0 0 380 280"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="bpt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
              <pattern id="bpt-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="1.1" />
              </pattern>
            </defs>

            {/* Gốc tọa độ O(200, 210), 1 đơn vị = 35px */}
            {/* Nửa mặt phẳng bị gạch bỏ: 2x - y + 4 < 0 */}
            <polygon points="30,25 222,25 112,245 30,245" fill="url(#bpt-hatch)" />

            {/* Trục Ox, Oy */}
            <line x1="30" y1="210" x2="345" y2="210" stroke="#0f172a" strokeWidth="1.6" markerEnd="url(#bpt-arrow)" />
            <text x="352" y="224" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              x
            </text>
            <line x1="200" y1="255" x2="200" y2="22" stroke="#0f172a" strokeWidth="1.6" markerEnd="url(#bpt-arrow)" />
            <text x="184" y="28" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              y
            </text>
            <text x="186" y="226" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Đường thẳng d: 2x - y + 4 = 0 qua (-2,0)=(130,210) và (0,4)=(200,70) */}
            <line x1="112" y1="246" x2="222" y2="26" stroke="#1d4ed8" strokeWidth="2.2" />
            <text x="230" y="48" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              2x − y + 4 = 0
            </text>

            {/* Giao điểm với trục: (-2, 0) và (0, 4) */}
            <circle cx="130" cy="210" r="3" fill="#0f172a" />
            <text x="132" y="228" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              −2
            </text>
            <circle cx="200" cy="70" r="3" fill="#0f172a" />
            <text x="208" y="75" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              4
            </text>

            {/* Dấu chấm hỏi ? trong miền nghiệm thay vì vẽ sẵn điểm đáp án (1; 2) */}
            <text x="268" y="142" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              (x; y) = ?
            </text>
          </svg>
        );

      case 'feasible_region_quad':
        return (
          <svg
            viewBox="0 0 400 310"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="quad-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Gốc O(95, 245), 1 đơn vị = 48px */}
            <polygon
              points="95,245 95,197 143,101 287,245"
              fill="#dbeafe"
              stroke="#1d4ed8"
              strokeWidth="2"
            />

            {/* Trục tọa độ Ox, Oy */}
            <line x1="35" y1="245" x2="355" y2="245" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#quad-arrow)" />
            <text x="362" y="258" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              x
            </text>
            <line x1="95" y1="285" x2="95" y2="22" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#quad-arrow)" />
            <text x="78" y="28" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              y
            </text>
            <text x="78" y="262" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Đường d1: x + y = 4 */}
            <line x1="75" y1="33" x2="312" y2="270" stroke="#0f172a" strokeWidth="1.5" />
            <text x="235" y="135" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              x + y = 4
            </text>

            {/* Đường d2: 2x - y = -1 */}
            <line x1="59" y1="269" x2="175" y2="37" stroke="#0f172a" strokeWidth="1.5" />
            <text x="172" y="55" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              2x − y = −1
            </text>

            {/* Đường gióng nét đứt từ đỉnh B(?; ?) */}
            <line x1="143" y1="245" x2="143" y2="101" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1="95" y1="101" x2="143" y2="101" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <text x="143" y="262" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="82" y="105" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="end">
              ?
            </text>

            {/* Các đỉnh O, A, B, C */}
            <circle cx="95" cy="245" r="3" fill="#0f172a" />
            <circle cx="95" cy="197" r="3.2" fill="#1d4ed8" />
            <text x="85" y="198" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" textAnchor="end">
              A
            </text>

            <circle cx="143" cy="101" r="3.5" fill="#dc2626" />
            <text x="152" y="100" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              B(?; ?)
            </text>

            <circle cx="287" cy="245" r="3.2" fill="#1d4ed8" />
            <text x="287" y="264" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" textAnchor="middle">
              C
            </text>
          </svg>
        );

      case 'feasible_region_aircon':
        return (
          <svg
            viewBox="0 0 410 315"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="ac-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            <polygon
              points="80,255 80,75 116,111 188,255"
              fill="#dbeafe"
              stroke="#1d4ed8"
              strokeWidth="2"
            />

            {/* Trục tọa độ Ox, Oy */}
            <line x1="40" y1="255" x2="345" y2="255" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#ac-arrow)" />
            <text x="355" y="268" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              x
            </text>
            <line x1="80" y1="285" x2="80" y2="18" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#ac-arrow)" />
            <text x="64" y="25" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              y
            </text>
            <text x="65" y="272" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Đường d1: x + y = 100 */}
            <line x1="65" y1="60" x2="278" y2="273" stroke="#0f172a" strokeWidth="1.5" />
            <text x="232" y="185" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              x + y = 100
            </text>

            {/* Đường d2: 2x + y = 120 */}
            <line x1="72" y1="23" x2="198" y2="275" stroke="#0f172a" strokeWidth="1.5" />
            <text x="148" y="68" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              2x + y = 120
            </text>

            {/* Đường gióng nét đứt từ đỉnh B(?; ?) */}
            <line x1="116" y1="255" x2="116" y2="111" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1="80" y1="111" x2="116" y2="111" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <text x="116" y="272" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="72" y="115" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="end">
              ?
            </text>

            {/* Điểm mốc trên trục */}
            <circle cx="80" cy="39" r="2.5" fill="#0f172a" />
            <text x="72" y="43" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13" textAnchor="end">
              120
            </text>
            <circle cx="260" cy="255" r="2.5" fill="#0f172a" />
            <text x="260" y="272" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13" textAnchor="middle">
              100
            </text>

            {/* Các đỉnh miền nghiệm OABC */}
            <circle cx="80" cy="255" r="3" fill="#0f172a" />
            <circle cx="80" cy="75" r="3.2" fill="#1d4ed8" />
            <text x="72" y="78" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="end">
              A
            </text>

            <circle cx="116" cy="111" r="3.8" fill="#dc2626" />
            <text x="125" y="112" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              B(?; ?)
            </text>

            <circle cx="188" cy="255" r="3.2" fill="#1d4ed8" />
            <text x="188" y="272" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="middle">
              C
            </text>
          </svg>
        );

      case 'trig_unit_circle_supp':
        return (
          <svg
            viewBox="0 0 400 225"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="trig-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Gốc O(200, 180), R = 120px */}
            <line x1="35" y1="180" x2="365" y2="180" stroke="#0f172a" strokeWidth="1.6" markerEnd="url(#trig-arrow)" />
            <text x="372" y="194" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              x
            </text>
            <line x1="200" y1="205" x2="200" y2="20" stroke="#0f172a" strokeWidth="1.6" markerEnd="url(#trig-arrow)" />
            <text x="184" y="28" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              y
            </text>
            <text x="186" y="196" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Nửa đường tròn đơn vị bán kính R = 1 */}
            <path d="M 320,180 A 120,120 0 0 0 80,180" fill="none" stroke="#0f172a" strokeWidth="1.8" />
            <text x="322" y="196" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13">
              1
            </text>
            <text x="72" y="196" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13" textAnchor="end">
              −1
            </text>
            <text x="208" y="56" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13">
              1
            </text>

            {/* Điểm M ứng với góc alpha và M' ứng với 180 - alpha */}
            <line x1="123" y1="88" x2="277" y2="88" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1="277" y1="88" x2="277" y2="180" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1="123" y1="88" x2="123" y2="180" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />

            <line x1="200" y1="180" x2="277" y2="88" stroke="#1d4ed8" strokeWidth="2" />
            <line x1="200" y1="180" x2="123" y2="88" stroke="#dc2626" strokeWidth="2" />

            {/* Cung góc alpha và 180 - alpha */}
            <path d="M 232,180 A 32,32 0 0 0 220,155" fill="none" stroke="#1d4ed8" strokeWidth="1.5" />
            <text x="242" y="168" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              α
            </text>

            <path d="M 246,180 A 46,46 0 0 0 170,145" fill="none" stroke="#dc2626" strokeWidth="1.4" />
            <text x="165" y="132" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              180° − α
            </text>

            <circle cx="277" cy="88" r="3.2" fill="#1d4ed8" />
            <text x="286" y="84" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              M
            </text>
            <circle cx="123" cy="88" r="3.2" fill="#dc2626" />
            <text x="112" y="84" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold" textAnchor="end">
              M&apos;
            </text>

            <text x="277" y="196" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="middle">
              cos α
            </text>
            <text x="123" y="196" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="212" y="84" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold">
              ?
            </text>
          </svg>
        );

      case 'triangle_60deg':
        return (
          <svg
            viewBox="0 0 380 225"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC: A(55, 185), B(315, 185) [c=8], C(136, 44) [b=5, góc A = 60°] */}
            <polygon
              points="55,185 315,185 136,44"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="2"
            />
            {/* Cung góc A = 60° */}
            <path d="M 93,185 A 38,38 0 0 0 74,152" fill="#dbeafe" fillOpacity="0.6" stroke="#1d4ed8" strokeWidth="1.6" />
            <text x="102" y="170" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold">
              60°
            </text>

            {/* Độ dài các cạnh */}
            <text x="185" y="206" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" textAnchor="middle">
              c = 8
            </text>
            <text x="76" y="108" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" textAnchor="middle">
              b = 5
            </text>
            <text x="242" y="108" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              a = ?
            </text>

            {/* Các đỉnh A, B, C */}
            <circle cx="55" cy="185" r="3" fill="#0f172a" />
            <text x="40" y="195" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <circle cx="315" cy="185" r="3" fill="#0f172a" />
            <text x="326" y="195" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <circle cx="136" cy="44" r="3" fill="#0f172a" />
            <text x="136" y="32" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              C
            </text>
          </svg>
        );

      case 'triangle_sin_circumcircle':
        return (
          <svg
            viewBox="0 0 360 235"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Đường tròn ngoại tiếp tâm O(180, 120), R = 88px */}
            <circle cx="180" cy="120" r="88" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.6" />

            {/* Tam giác ABC nội tiếp: A(180, 32), B(104, 164), C(256, 164) */}
            <polygon
              points="180,32 104,164 256,164"
              fill="#eff6ff"
              fillOpacity="0.45"
              stroke="#0f172a"
              strokeWidth="2"
            />

            {/* Cung góc A = 30° */}
            <path d="M 164,60 A 32,32 0 0 0 196,60" fill="none" stroke="#1d4ed8" strokeWidth="1.5" />
            <text x="180" y="76" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontWeight="bold" textAnchor="middle">
              30°
            </text>

            {/* Bán kính R từ tâm O tới B và C */}
            <line x1="180" y1="120" x2="256" y2="164" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="180" cy="120" r="3" fill="#dc2626" />
            <text x="174" y="114" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              O
            </text>
            <text x="224" y="136" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              R = ?
            </text>

            {/* Cạnh a = 6 */}
            <text x="180" y="182" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" textAnchor="middle">
              a = 6
            </text>

            {/* Đỉnh A, B, C */}
            <circle cx="180" cy="32" r="3" fill="#0f172a" />
            <text x="180" y="22" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A
            </text>
            <circle cx="104" cy="164" r="3" fill="#0f172a" />
            <text x="88" y="174" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <circle cx="256" cy="164" r="3" fill="#0f172a" />
            <text x="266" y="174" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              C
            </text>
          </svg>
        );

      case 'triangle_obtuse_cos':
        return (
          <svg
            viewBox="0 0 380 220"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC với góc A tù (cos A = -1/15): A(110, 180), B(320, 180) [c=5], C(98, 52) [b=3] */}
            <polygon
              points="110,180 320,180 98,52"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="2"
            />
            <path d="M 140,180 A 30,30 0 0 0 107,150" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
            <text x="152" y="166" fill="#b45309" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              cos A = −1/15
            </text>

            <text x="215" y="202" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" textAnchor="middle">
              c = 5
            </text>
            <text x="82" y="122" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" textAnchor="end">
              b = 3
            </text>
            <text x="225" y="106" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              a = ?
            </text>

            <circle cx="110" cy="180" r="3" fill="#0f172a" />
            <text x="95" y="196" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <circle cx="320" cy="180" r="3" fill="#0f172a" />
            <text x="330" y="196" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <circle cx="98" cy="52" r="3" fill="#0f172a" />
            <text x="98" y="38" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              C
            </text>
          </svg>
        );

      case 'triangle_heron':
        return (
          <svg
            viewBox="0 0 380 230"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC: A(55, 190), B(315, 190), C(215, 42) */}
            <polygon
              points="55,190 315,190 215,42"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="2"
            />
            <circle
              cx="190"
              cy="134"
              r="36"
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="1.3"
              strokeDasharray="4 3"
            />
            <circle cx="190" cy="134" r="2.5" fill="#1d4ed8" />
            <text x="190" y="138" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              S = ?
            </text>

            <text x="185" y="210" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" textAnchor="middle">
              c = 5
            </text>
            <text x="118" y="108" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" textAnchor="middle">
              b = 8
            </text>
            <text x="280" y="108" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" textAnchor="middle">
              a = 7
            </text>

            <circle cx="55" cy="190" r="3" fill="#0f172a" />
            <text x="40" y="202" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <circle cx="315" cy="190" r="3" fill="#0f172a" />
            <text x="326" y="202" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <circle cx="215" cy="42" r="3" fill="#0f172a" />
            <text x="215" y="30" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              C
            </text>
          </svg>
        );

      case 'river_triangulation':
        return (
          <svg
            viewBox="0 0 420 250"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Dải sông giữa hai bờ */}
            <rect x="15" y="82" width="390" height="76" fill="#e0f2fe" />
            <line x1="15" y1="82" x2="405" y2="82" stroke="#0284c7" strokeWidth="1.4" strokeDasharray="6 4" />
            <line x1="15" y1="158" x2="405" y2="158" stroke="#0284c7" strokeWidth="1.4" strokeDasharray="6 4" />
            <text x="36" y="124" fill="#0369a1" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              Khúc sông
            </text>

            {/* Tam giác đo đạc: C(75, 205), A(295, 205) [AC=60m], B(185, 42) */}
            <line x1="75" y1="205" x2="295" y2="205" stroke="#0f172a" strokeWidth="2.2" />
            <line x1="75" y1="205" x2="185" y2="42" stroke="#475569" strokeWidth="1.6" strokeDasharray="5 3" />
            <line x1="295" y1="205" x2="185" y2="42" stroke="#1d4ed8" strokeWidth="2.2" />

            {/* Cung góc C = 60° và góc A = 75° */}
            <path d="M 105,205 A 30,30 0 0 0 92,180" fill="none" stroke="#0f172a" strokeWidth="1.5" />
            <text x="112" y="196" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13" fontWeight="bold">
              60°
            </text>

            <path d="M 265,205 A 30,30 0 0 1 278,180" fill="none" stroke="#0f172a" strokeWidth="1.5" />
            <text x="242" y="196" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13" fontWeight="bold">
              75°
            </text>

            <text x="185" y="226" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              AC = 60 m
            </text>
            <text x="256" y="122" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              AB = ?
            </text>

            <circle cx="75" cy="205" r="3.2" fill="#0f172a" />
            <text x="58" y="214" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              C
            </text>
            <circle cx="295" cy="205" r="3.2" fill="#0f172a" />
            <text x="306" y="214" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <circle cx="185" cy="42" r="3.5" fill="#1d4ed8" />
            <text x="185" y="28" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              B
            </text>
          </svg>
        );

      case 'parabola_vertex_2_1':
        return (
          <svg
            viewBox="0 0 380 260"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="para-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            <line x1="40" y1="100" x2="340" y2="100" stroke="#0f172a" strokeWidth="1.6" markerEnd="url(#para-arrow)" />
            <text x="348" y="114" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              x
            </text>
            <line x1="110" y1="245" x2="110" y2="18" stroke="#0f172a" strokeWidth="1.6" markerEnd="url(#para-arrow)" />
            <text x="94" y="26" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              y
            </text>
            <text x="96" y="116" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Trục đối xứng */}
            <line x1="194" y1="22" x2="194" y2="242" stroke="#64748b" strokeWidth="1.2" strokeDasharray="5 3" />
            <line x1="110" y1="58" x2="194" y2="58" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4 3" />

            {/* Đường cong Parabol */}
            <path
              d="M 106,238 Q 194,-116 282,238"
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="2.2"
            />

            <circle cx="194" cy="58" r="3.5" fill="#dc2626" />
            <text x="204" y="52" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              I(?; ?)
            </text>
            <circle cx="152" cy="100" r="2.8" fill="#0f172a" />
            <text x="144" y="116" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13">
              1
            </text>
            <text x="198" y="116" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold">
              ?
            </text>
            <circle cx="236" cy="100" r="2.8" fill="#0f172a" />
            <text x="244" y="116" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13">
              3
            </text>
            <text x="96" y="62" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold">
              ?
            </text>
            <circle cx="110" cy="226" r="2.8" fill="#0f172a" />
            <text x="88" y="230" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13">
              −3
            </text>
          </svg>
        );

      case 'number_line_minus2_4':
        return (
          <svg
            viewBox="0 0 520 115"
            className="w-full max-w-lg mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="nl24-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
              <pattern id="nl24-hatch" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="7" stroke="#475569" strokeWidth="1.25" />
              </pattern>
            </defs>

            {/* Vùng gạch chéo ngoài tập hợp giao */}
            <rect x="36" y="42" width="129" height="26" fill="url(#nl24-hatch)" />
            <rect x="355" y="42" width="113" height="26" fill="url(#nl24-hatch)" />

            {/* Trục số thực */}
            <line x1="30" y1="55" x2="482" y2="55" stroke="#0f172a" strokeWidth="1.8" markerEnd="url(#nl24-arrow)" />

            {/* Đoạn nghiệm tô đậm */}
            <line x1="165" y1="55" x2="355" y2="55" stroke="#1d4ed8" strokeWidth="3.5" />

            {/* Dấu ngoặc tại hai đầu mút */}
            <text x="165" y="62" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="24" fontWeight="bold" textAnchor="middle">
              (
            </text>
            <text x="355" y="62" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="24" fontWeight="bold" textAnchor="middle">
              ]
            </text>

            {/* Dấu chấm hỏi ? tại hai đầu mút thay vì hiện sẵn -2 và 4 */}
            <text x="165" y="88" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="355" y="88" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="260" y="25" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A ∩ B = ?
            </text>
          </svg>
        );

      case 'lighthouse_coast':
        return (
          <svg
            viewBox="0 0 460 250"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="lh-arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
              <marker id="lh-arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 10 1.5 L 1 5 L 10 8.5 L 8 5 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Đường bờ biển nằm ngang: A(75, 185), B(255, 185), H(335, 185), C(335, 42) */}
            <line x1="25" y1="185" x2="430" y2="185" stroke="#0f172a" strokeWidth="1.9" />

            {/* Tia ngắm AC và BC */}
            <line x1="75" y1="185" x2="335" y2="42" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="255" y1="185" x2="335" y2="42" stroke="#0f172a" strokeWidth="1.8" />

            {/* Đường vuông góc CH nét đứt */}
            <line x1="335" y1="42" x2="335" y2="185" stroke="#1d4ed8" strokeWidth="1.8" strokeDasharray="5 4" />

            {/* Ký hiệu góc vuông tại H(335, 185) */}
            <polyline points="323,185 323,173 335,173" fill="none" stroke="#0f172a" strokeWidth="1.3" />

            {/* Cung góc 45° tại A(75, 185) */}
            <path d="M 122,185 A 47,47 0 0 0 112,165" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="135" y="176" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              45°
            </text>

            {/* Cung góc 75° tại B(255, 185) */}
            <path d="M 290,185 A 35,35 0 0 0 272,155" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="295" y="173" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              75°
            </text>

            {/* Gióng kích thước AB = 30 m phía dưới */}
            <line x1="75" y1="185" x2="75" y2="222" stroke="#475569" strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="255" y1="185" x2="255" y2="222" stroke="#475569" strokeWidth="1.2" strokeDasharray="3 3" />
            <line
              x1="78"
              y1="214"
              x2="252"
              y2="214"
              stroke="#0f172a"
              strokeWidth="1.3"
              strokeDasharray="4 3"
              markerStart="url(#lh-arrow-start)"
              markerEnd="url(#lh-arrow-end)"
            />
            <rect x="142" y="203" width="46" height="20" fill="#ffffff" />
            <text x="165" y="218" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              30 m
            </text>

            {/* Biểu tượng ngọn hải đăng tại đỉnh C(335, 42) */}
            <polygon points="329,42 341,42 338,22 332,22" fill="#dc2626" stroke="#0f172a" strokeWidth="1.2" />
            <circle cx="335" cy="18" r="4" fill="#f59e0b" stroke="#0f172a" strokeWidth="1" />
            <line x1="322" y1="15" x2="313" y2="11" stroke="#f59e0b" strokeWidth="1.4" />
            <line x1="348" y1="15" x2="357" y2="11" stroke="#f59e0b" strokeWidth="1.4" />

            {/* Nhãn các điểm A, B, H, C */}
            <circle cx="75" cy="185" r="3" fill="#0f172a" />
            <text x="68" y="175" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>

            <circle cx="255" cy="185" r="3" fill="#0f172a" />
            <text x="242" y="175" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>

            <circle cx="335" cy="185" r="3" fill="#0f172a" />
            <text x="335" y="204" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              H
            </text>

            <circle cx="335" cy="42" r="3" fill="#1d4ed8" />
            <text x="352" y="42" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              C
            </text>
            <text x="346" y="118" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              CH = ?
            </text>
          </svg>
        );

      case 'feasible_region_coffee_cocoa':
        return (
          <svg
            viewBox="0 0 410 300"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="cc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            <polygon
              points="80,240 272,240 224,192 80,96"
              fill="#dbeafe"
              stroke="#1d4ed8"
              strokeWidth="2"
            />

            {/* Trục Ox, Oy */}
            <line x1="40" y1="240" x2="355" y2="240" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#cc-arrow)" />
            <text x="364" y="253" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              x
            </text>
            <line x1="80" y1="275" x2="80" y2="20" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#cc-arrow)" />
            <text x="64" y="28" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              y
            </text>
            <text x="64" y="256" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Đường d1: x + y = 8 */}
            <line x1="65" y1="33" x2="290" y2="258" stroke="#1d4ed8" strokeWidth="1.5" />
            <text x="155" y="95" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              x + y = 8
            </text>

            {/* Đường d2: 2x + 3y = 18 */}
            <line x1="62" y1="84" x2="314" y2="252" stroke="#0f766e" strokeWidth="1.5" />
            <text x="242" y="172" fill="#0f766e" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              2x + 3y = 18
            </text>

            {/* Đường gióng nét đứt từ đỉnh tối ưu B(m; n) = (?; ?) */}
            <line x1="224" y1="240" x2="224" y2="192" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1="80" y1="192" x2="224" y2="192" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <text x="224" y="258" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              m = ?
            </text>
            <text x="74" y="196" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" fontWeight="bold" textAnchor="end">
              n = ?
            </text>

            {/* Các đỉnh O, A, B, C */}
            <circle cx="80" cy="240" r="3" fill="#0f172a" />
            <circle cx="272" cy="240" r="3.2" fill="#1d4ed8" />
            <text x="272" y="258" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="middle">
              A
            </text>

            <circle cx="224" cy="192" r="3.8" fill="#dc2626" />
            <text x="234" y="188" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              B(m; n) = (?; ?)
            </text>

            <circle cx="80" cy="96" r="3.2" fill="#1d4ed8" />
            <text x="72" y="99" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="end">
              C
            </text>
          </svg>
        );

      case 'venn_diagram_50_10b':
        return (
          <svg
            viewBox="0 0 450 230"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <rect x="20" y="18" width="410" height="194" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
            <text x="34" y="42" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              Lớp 10B: n(U) = 50
            </text>

            <circle cx="175" cy="118" r="74" fill="#eff6ff" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="275" cy="118" r="74" fill="#f0fdf4" fillOpacity="0.6" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="175" cy="118" r="74" fill="none" stroke="#0f172a" strokeWidth="1.8" />

            <text x="145" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              CLB Tiếng Anh (32)
            </text>
            <text x="310" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              CLB Tin học (25)
            </text>

            <text x="135" y="122" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="225" y="118" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="315" y="122" fill="#065f46" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="225" y="142" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A ∩ B = ?
            </text>
            <text x="372" y="198" fill="#475569" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="middle">
              Ngoài: 7
            </text>
          </svg>
        );

      case 'broken_tree_storm':
        return (
          <svg
            viewBox="0 0 380 235"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Đỉnh A(65, 195), B(325, 195), C(108, 25) */}
            <polygon
              points="65,195 325,195 108,25"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />

            {/* Cung góc 76° tại A */}
            <path
              d="M 93 195 A 28 28 0 0 0 72 168"
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.4"
            />
            <text x="95" y="182" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              76°
            </text>

            {/* Cung góc 35° tại B */}
            <path
              d="M 283 195 A 42 42 0 0 1 291 170"
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.4"
            />
            <text x="248" y="185" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              35°
            </text>

            {/* Nhãn các đỉnh A, B, C */}
            <text x="50" y="210" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              A
            </text>
            <text x="334" y="202" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              B
            </text>
            <text x="108" y="16" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" textAnchor="middle">
              C
            </text>

            {/* Độ dài AB = 6 m và các đại lượng cần tìm có dấu ? */}
            <text x="195" y="214" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="middle">
              6 m
            </text>
            <text x="64" y="108" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold" textAnchor="end">
              AC = ?
            </text>
          </svg>
        );

      case 'feasible_region_aloe_asparagus':
        return (
          <svg
            viewBox="0 0 420 290"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="aa-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Gốc O(70, 235), 1 đơn vị = 18px: O(70,235), A(10,0)->(250,235), B(7.5,2.5)->(205,190), C(0,5)->(70,145) */}
            <polygon
              points="70,235 250,235 205,190 70,145"
              fill="#dbeafe"
              stroke="#1d4ed8"
              strokeWidth="2"
            />

            {/* Trục Ox, Oy */}
            <line x1="35" y1="235" x2="365" y2="235" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#aa-arrow)" />
            <text x="375" y="248" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              x
            </text>
            <line x1="70" y1="268" x2="70" y2="22" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#aa-arrow)" />
            <text x="54" y="30" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              y
            </text>
            <text x="54" y="252" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Đường d1: x + y = 10 */}
            <line x1="58" y1="43" x2="264" y2="249" stroke="#1d4ed8" strokeWidth="1.5" />
            <text x="135" y="102" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              x + y = 10
            </text>

            {/* Đường d2: x + 3y = 15 */}
            <line x1="52" y1="139" x2="349" y2="238" stroke="#0f766e" strokeWidth="1.5" />
            <text x="242" y="182" fill="#0f766e" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              x + 3y = 15
            </text>

            {/* Đường gióng nét đứt từ đỉnh tối ưu B(?; ?) */}
            <line x1="205" y1="235" x2="205" y2="190" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1="70" y1="190" x2="205" y2="190" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <text x="205" y="254" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="62" y="194" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="end">
              ?
            </text>

            {/* Các đỉnh O, A, B, C */}
            <circle cx="70" cy="235" r="3" fill="#0f172a" />
            <circle cx="250" cy="235" r="3.2" fill="#1d4ed8" />
            <text x="250" y="254" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="middle">
              A
            </text>

            <circle cx="205" cy="190" r="3.8" fill="#dc2626" />
            <text x="214" y="168" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              B(?; ?), F_max = ?
            </text>

            <circle cx="70" cy="145" r="3.2" fill="#1d4ed8" />
            <text x="60" y="148" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="end">
              C
            </text>
          </svg>
        );

      case 'venn_diagram_70_tourists':
        return (
          <svg
            viewBox="0 0 450 230"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <rect x="20" y="18" width="410" height="194" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
            <text x="34" y="42" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              Khảo sát: n(U) = 70
            </text>

            <circle cx="175" cy="118" r="74" fill="#eff6ff" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="275" cy="118" r="74" fill="#f0fdf4" fillOpacity="0.6" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="175" cy="118" r="74" fill="none" stroke="#0f172a" strokeWidth="1.8" />

            <text x="145" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Nha Trang A (45)
            </text>
            <text x="310" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Đà Lạt B (38)
            </text>

            <text x="135" y="122" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="225" y="118" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="315" y="122" fill="#065f46" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="225" y="142" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A ∩ B = ?
            </text>
            <text x="372" y="198" fill="#475569" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="middle">
              Ngoài: 8
            </text>
          </svg>
        );

      case 'number_line_3_6':
        return (
          <svg
            viewBox="0 0 520 115"
            className="w-full max-w-lg mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="nl36-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
              <pattern id="nl36-hatch" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="7" stroke="#64748b" strokeWidth="1.2" />
              </pattern>
            </defs>

            {/* Vùng gạch chéo bị loại */}
            <rect x="36" y="43" width="184" height="24" fill="url(#nl36-hatch)" />
            <rect x="340" y="43" width="125" height="24" fill="url(#nl36-hatch)" />

            {/* Trục số thực R */}
            <line x1="30" y1="55" x2="480" y2="55" stroke="#0f172a" strokeWidth="1.8" markerEnd="url(#nl36-arrow)" />

            {/* Miền giao lấy nghiệm tô đậm */}
            <line x1="220" y1="55" x2="340" y2="55" stroke="#1d4ed8" strokeWidth="3.5" />

            {/* Dấu ngoặc ( và ] */}
            <text x="220" y="61" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              (
            </text>
            <text x="340" y="61" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              ]
            </text>

            {/* Nhãn ? tại hai đầu mút và trên miền giao */}
            <text x="220" y="86" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="340" y="86" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="280" y="30" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A ∩ B = ?
            </text>
          </svg>
        );

      case 'triangle_cos_inscribed_d2':
        return (
          <svg
            viewBox="0 0 380 230"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC: A(65, 190), B(315, 190), C(158, 30) */}
            <polygon
              points="65,190 315,190 158,30"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />

            {/* Đường tròn nội tiếp tâm I(172, 130), bán kính r = 60px */}
            <circle
              cx="172"
              cy="130"
              r="60"
              fill="#eff6ff"
              fillOpacity="0.55"
              stroke="#1d4ed8"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            <line x1="172" y1="130" x2="172" y2="190" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="172" cy="130" r="2.8" fill="#1d4ed8" />
            <text x="164" y="124" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              I
            </text>
            <text x="180" y="164" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              r = ?
            </text>

            {/* Cung góc 60° tại A */}
            <path d="M 97 190 A 32 32 0 0 0 81 162" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="102" y="178" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              60°
            </text>

            {/* Các đỉnh và độ dài cạnh */}
            <text x="48" y="204" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="324" y="204" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <text x="158" y="20" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              C
            </text>

            <text x="190" y="212" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="middle">
              c = 8 cm
            </text>
            <text x="95" y="102" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="end">
              b = 6 cm
            </text>
            <text x="252" y="102" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              a = ?
            </text>
          </svg>
        );

      case 'mountain_building_observation':
        return (
          <svg
            viewBox="0 0 400 250"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* A(75, 210), B(75, 118), D(285, 210), E(285, 118), C(285, 32) */}
            {/* Tòa nhà AB, mặt đất AD, ngọn núi CD */}
            <line x1="75" y1="210" x2="285" y2="210" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="75" y1="210" x2="75" y2="118" stroke="#0f172a" strokeWidth="2" />
            <line x1="285" y1="210" x2="285" y2="32" stroke="#0f172a" strokeWidth="2" />

            {/* Đường nằm ngang BE */}
            <line x1="75" y1="118" x2="285" y2="118" stroke="#0f172a" strokeWidth="1.6" />

            {/* Hai tia ngắm AC và BC */}
            <line x1="75" y1="210" x2="285" y2="32" stroke="#0f172a" strokeWidth="1.7" />
            <line x1="75" y1="118" x2="285" y2="32" stroke="#0f172a" strokeWidth="1.7" />

            {/* Cung góc 35° tại A */}
            <path d="M 111 210 A 36 36 0 0 0 103 187" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="116" y="203" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              35°
            </text>

            {/* Cung góc 15° nét đứt tại B (như hình gốc trang 6 PDF) */}
            <path
              d="M 115 118 A 40 40 0 0 0 112 103"
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.4"
              strokeDasharray="3 2"
            />
            <text x="118" y="114" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              15°
            </text>

            {/* Nhãn các đỉnh A, B, C, D, E */}
            <text x="64" y="226" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              A
            </text>
            <text x="58" y="122" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              B
            </text>
            <text x="285" y="22" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" textAnchor="middle">
              C
            </text>
            <text x="292" y="226" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              D
            </text>
            <text x="295" y="123" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic">
              E
            </text>

            {/* Chiều cao tòa nhà 46m và chiều cao ngọn núi CD = ? */}
            <text x="68" y="170" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" textAnchor="end">
              46m
            </text>
            <text x="298" y="78" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              CD = ?
            </text>
          </svg>
        );

      case 'triangle_abc_456_d3':
        return (
          <svg
            viewBox="0 0 380 215"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC với a = 4 cm, b = 5 cm, c = 6 cm: A(55, 178), B(325, 178), C(224, 30) */}
            <polygon
              points="55,178 325,178 224,30"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
            <circle cx="55" cy="178" r="3" fill="#0f172a" />
            <circle cx="325" cy="178" r="3" fill="#0f172a" />
            <circle cx="224" cy="30" r="3" fill="#0f172a" />

            <text x="40" y="192" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="334" y="192" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <text x="224" y="20" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              C
            </text>

            <text x="190" y="200" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="middle">
              c = 6 cm
            </text>
            <text x="128" y="96" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="end">
              b = 5 cm
            </text>
            <text x="284" y="98" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15">
              a = 4 cm
            </text>
          </svg>
        );

      case 'triangle_sin_ac_d3':
        return (
          <svg
            viewBox="0 0 390 225"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC với BC = 12 cm, góc B = 45°, góc C = 60°: B(55, 185), C(335, 185), A(232, 32) */}
            <polygon
              points="55,185 335,185 232,32"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />

            {/* Cung góc B = 45° */}
            <path d="M 92 185 A 37 37 0 0 0 82 161" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="98" y="175" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              45°
            </text>

            {/* Cung góc C = 60° */}
            <path d="M 300 185 A 35 35 0 0 1 316 156" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="272" y="174" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              60°
            </text>

            <circle cx="55" cy="185" r="3" fill="#0f172a" />
            <circle cx="335" cy="185" r="3" fill="#0f172a" />
            <circle cx="232" cy="32" r="3" fill="#0f172a" />

            <text x="40" y="198" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <text x="344" y="198" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              C
            </text>
            <text x="232" y="21" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A
            </text>

            <text x="195" y="208" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="middle">
              BC = 12 cm
            </text>
            <text x="294" y="102" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              AC = ?
            </text>
          </svg>
        );

      case 'feasible_region_rice_potato_d3':
        return (
          <svg
            viewBox="0 0 420 290"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="rp3-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Gốc O(70, 235), 1 đơn vị = 30px: O(70,235), A(6,0)->(250,235), B(4,2)->(190,175), C(0,4)->(70,115) */}
            <polygon
              points="70,235 250,235 190,175 70,115"
              fill="#dbeafe"
              stroke="#1d4ed8"
              strokeWidth="2"
            />

            {/* Trục Ox, Oy */}
            <line x1="35" y1="235" x2="365" y2="235" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#rp3-arrow)" />
            <text x="375" y="248" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              x
            </text>
            <line x1="70" y1="268" x2="70" y2="22" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#rp3-arrow)" />
            <text x="54" y="30" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              y
            </text>
            <text x="54" y="252" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Đường d1: x + y = 6 */}
            <line x1="55" y1="40" x2="268" y2="253" stroke="#1d4ed8" strokeWidth="1.5" />
            <text x="128" y="92" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              x + y = 6
            </text>

            {/* Đường d2: x + 2y = 8 */}
            <line x1="50" y1="105" x2="330" y2="245" stroke="#0f766e" strokeWidth="1.5" />
            <text x="235" y="182" fill="#0f766e" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              x + 2y = 8
            </text>

            {/* Đường gióng nét đứt từ đỉnh tối ưu B(?; ?) */}
            <line x1="190" y1="235" x2="190" y2="175" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1="70" y1="175" x2="190" y2="175" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <text x="190" y="254" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="62" y="179" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="end">
              ?
            </text>

            {/* Các đỉnh O, A, B, C */}
            <circle cx="70" cy="235" r="3" fill="#0f172a" />
            <circle cx="250" cy="235" r="3.2" fill="#1d4ed8" />
            <text x="250" y="254" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="middle">
              A
            </text>

            <circle cx="190" cy="175" r="3.8" fill="#dc2626" />
            <text x="198" y="162" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              B(?; ?), F_max = ?
            </text>

            <circle cx="70" cy="115" r="3.2" fill="#1d4ed8" />
            <text x="60" y="118" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="end">
              C
            </text>
          </svg>
        );

      case 'venn_diagram_10a_math_eng_d3':
        return (
          <svg
            viewBox="0 0 450 230"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <rect x="20" y="18" width="410" height="194" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
            <text x="34" y="42" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              Lớp 10A: n(U) = ?
            </text>

            <circle cx="175" cy="118" r="74" fill="#eff6ff" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="275" cy="118" r="74" fill="#f0fdf4" fillOpacity="0.6" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="175" cy="118" r="74" fill="none" stroke="#0f172a" strokeWidth="1.8" />

            <text x="145" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Giỏi Toán A (12)
            </text>
            <text x="310" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Giỏi Tiếng Anh B (18)
            </text>

            <text x="135" y="122" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="225" y="120" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              6
            </text>
            <text x="315" y="122" fill="#065f46" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="225" y="142" fill="#475569" fontFamily={MATH_SERIF} fontSize="12" fontStyle="italic" textAnchor="middle">
              A ∩ B = 6
            </text>
            <text x="366" y="198" fill="#475569" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              Ngoài: 10
            </text>
          </svg>
        );

      case 'number_line_union_4_d3':
        return (
          <svg
            viewBox="0 0 520 115"
            className="w-full max-w-lg mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="nlu4-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
              <pattern id="nlu4-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#334155" strokeWidth="1.35" />
              </pattern>
            </defs>

            {/* Vùng gạch chéo phần [4; +∞) đúng chuẩn hình vẽ trang 4 PDF */}
            <rect x="310" y="42" width="150" height="26" fill="url(#nlu4-hatch)" />

            {/* Trục số thực x */}
            <line x1="35" y1="55" x2="482" y2="55" stroke="#0f172a" strokeWidth="1.8" markerEnd="url(#nlu4-arrow)" />
            <text x="488" y="75" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              x
            </text>

            {/* Phần hợp (-∞; 4) tô đậm */}
            <line x1="35" y1="55" x2="310" y2="55" stroke="#1d4ed8" strokeWidth="3.2" />

            {/* Vạch chia và dấu ngoặc tròn ) tại điểm 4 */}
            <line x1="310" y1="46" x2="310" y2="64" stroke="#0f172a" strokeWidth="1.5" />
            <text x="310" y="61" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              )
            </text>
            <text x="310" y="88" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              4
            </text>

            <text x="172" y="28" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A ∪ B = (−∞; 4)
            </text>
          </svg>
        );

      case 'triangle_cos_inscribed_d3':
        return (
          <svg
            viewBox="0 0 380 230"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC: A(65, 190), B(315, 190), C(143, 55) */}
            <polygon
              points="65,190 315,190 143,55"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />

            {/* Đường tròn nội tiếp tâm I(159, 136), bán kính r = 54px */}
            <circle
              cx="159"
              cy="136"
              r="54"
              fill="#eff6ff"
              fillOpacity="0.55"
              stroke="#1d4ed8"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            <line x1="159" y1="136" x2="159" y2="190" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="159" cy="136" r="2.8" fill="#1d4ed8" />
            <text x="150" y="130" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              I
            </text>
            <text x="167" y="168" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              r = ?
            </text>

            {/* Cung góc 60° tại A */}
            <path d="M 97 190 A 32 32 0 0 0 81 162" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="102" y="178" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              60°
            </text>

            {/* Các đỉnh và độ dài cạnh */}
            <text x="48" y="204" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="324" y="204" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <text x="143" y="44" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              C
            </text>

            <text x="190" y="212" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="middle">
              c = 8
            </text>
            <text x="92" y="116" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="end">
              b = 5
            </text>
            <text x="242" y="114" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              a = ?
            </text>
          </svg>
        );

      case 'mountain_tv_tower_d3':
        return (
          <svg
            viewBox="0 0 430 250"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* A(55, 205), H(325, 205), C(325, 110), B(325, 32) — chuẩn 100% hình vẽ trang 5 PDF */}
            {/* Cạnh mặt đất AH và tia ngắm AB, AC */}
            <line x1="55" y1="205" x2="325" y2="205" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="55" y1="205" x2="325" y2="32" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="55" y1="205" x2="325" y2="110" stroke="#0f172a" strokeWidth="1.7" />

            {/* Ngọn núi CH = h (nét đứt) và Tháp truyền hình BC = 50 m (tô xanh đậm) */}
            <line x1="325" y1="205" x2="325" y2="110" stroke="#0f172a" strokeWidth="1.8" strokeDasharray="5 4" />
            <line x1="325" y1="110" x2="325" y2="32" stroke="#1d4ed8" strokeWidth="3.2" />

            {/* Ký hiệu góc vuông tại H(325, 205) */}
            <polyline points="311,205 311,191 325,191" fill="none" stroke="#0f172a" strokeWidth="1.4" />

            {/* Cung góc nâng 9,2° (góc CAH) */}
            <path d="M 118 205 A 63 63 0 0 0 114 184" fill="none" stroke="#0f172a" strokeWidth="1.35" />
            <text x="126" y="198" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5">
              9,2°
            </text>

            {/* Cung góc nâng 15,5° (góc BAH) */}
            <path d="M 152 205 A 97 97 0 0 0 137 152" fill="none" stroke="#0f172a" strokeWidth="1.35" />
            <text x="148" y="164" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5">
              15,5°
            </text>

            {/* Các điểm A, H, C, B */}
            <circle cx="55" cy="205" r="2.8" fill="#0f172a" />
            <circle cx="325" cy="205" r="2.8" fill="#0f172a" />
            <circle cx="325" cy="110" r="3" fill="#1d4ed8" />
            <circle cx="325" cy="32" r="3" fill="#1d4ed8" />

            <text x="38" y="220" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="334" y="220" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              H
            </text>
            <text x="336" y="115" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              C
            </text>
            <text x="325" y="21" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              B
            </text>

            {/* Nhãn kích thước 50 m và chiều cao ngọn núi h */}
            <text x="338" y="75" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold">
              50 m
            </text>
            <text x="338" y="162" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              h
            </text>
          </svg>
        );

      case 'triangle_abc_567_d4':
        return (
          <svg
            viewBox="0 0 380 215"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC với a = 5 cm, b = 6 cm, c = 7 cm: A(55, 178), B(325, 178), C(220, 28) */}
            <polygon
              points="55,178 325,178 220,28"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
            <circle cx="55" cy="178" r="3" fill="#0f172a" />
            <circle cx="325" cy="178" r="3" fill="#0f172a" />
            <circle cx="220" cy="28" r="3" fill="#0f172a" />

            <text x="40" y="192" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="334" y="192" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <text x="220" y="18" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              C
            </text>

            <text x="190" y="200" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="middle">
              c = 7 cm
            </text>
            <text x="125" y="96" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="end">
              b = 6 cm
            </text>
            <text x="282" y="98" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15">
              a = 5 cm
            </text>
          </svg>
        );

      case 'triangle_sin_ac_d4':
        return (
          <svg
            viewBox="0 0 390 225"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC với BC = 15 cm, góc B = 45°, góc C = 60°: B(55, 185), C(335, 185), A(232, 32) */}
            <polygon
              points="55,185 335,185 232,32"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />

            {/* Cung góc B = 45° */}
            <path d="M 92 185 A 37 37 0 0 0 82 161" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="98" y="175" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              45°
            </text>

            {/* Cung góc C = 60° */}
            <path d="M 300 185 A 35 35 0 0 1 316 156" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="272" y="174" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              60°
            </text>

            <circle cx="55" cy="185" r="3" fill="#0f172a" />
            <circle cx="335" cy="185" r="3" fill="#0f172a" />
            <circle cx="232" cy="32" r="3" fill="#0f172a" />

            <text x="40" y="198" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <text x="344" y="198" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              C
            </text>
            <text x="232" y="21" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A
            </text>

            <text x="195" y="208" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="middle">
              BC = 15 cm
            </text>
            <text x="294" y="102" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              AC = ?
            </text>
          </svg>
        );

      case 'feasible_region_corn_soy_d4':
        return (
          <svg
            viewBox="0 0 420 290"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="cs4-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Gốc O(70, 235), 1 đơn vị = 24px: O(70,235), A(8,0)->(262,235), B(6,2)->(214,187), C(0,5)->(70,115) */}
            <polygon
              points="70,235 262,235 214,187 70,115"
              fill="#dbeafe"
              stroke="#1d4ed8"
              strokeWidth="2"
            />

            {/* Trục Ox, Oy */}
            <line x1="35" y1="235" x2="365" y2="235" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#cs4-arrow)" />
            <text x="375" y="248" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              x
            </text>
            <line x1="70" y1="268" x2="70" y2="22" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#cs4-arrow)" />
            <text x="54" y="30" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              y
            </text>
            <text x="54" y="252" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Đường d1: x + y = 8 */}
            <line x1="55" y1="28" x2="280" y2="253" stroke="#1d4ed8" strokeWidth="1.5" />
            <text x="132" y="92" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              x + y = 8
            </text>

            {/* Đường d2: x + 2y = 10 */}
            <line x1="50" y1="105" x2="330" y2="245" stroke="#0f766e" strokeWidth="1.5" />
            <text x="242" y="182" fill="#0f766e" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic">
              x + 2y = 10
            </text>

            {/* Đường gióng nét đứt từ đỉnh tối ưu B(?; ?) */}
            <line x1="214" y1="235" x2="214" y2="187" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1="70" y1="187" x2="214" y2="187" stroke="#475569" strokeWidth="1.2" strokeDasharray="4 3" />
            <text x="214" y="254" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="62" y="191" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="end">
              ?
            </text>

            {/* Các đỉnh O, A, B, C */}
            <circle cx="70" cy="235" r="3" fill="#0f172a" />
            <circle cx="262" cy="235" r="3.2" fill="#1d4ed8" />
            <text x="262" y="254" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="middle">
              A
            </text>

            <circle cx="214" cy="187" r="3.8" fill="#dc2626" />
            <text x="220" y="168" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              B(?; ?), F_max = ?
            </text>

            <circle cx="70" cy="115" r="3.2" fill="#1d4ed8" />
            <text x="60" y="118" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" textAnchor="end">
              C
            </text>
          </svg>
        );

      case 'venn_diagram_10b_math_phys_d4':
        return (
          <svg
            viewBox="0 0 450 230"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <rect x="20" y="18" width="410" height="194" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
            <text x="34" y="42" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              Lớp 10B: n(U) = ?
            </text>

            <circle cx="175" cy="118" r="74" fill="#eff6ff" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="275" cy="118" r="74" fill="#f0fdf4" fillOpacity="0.6" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="175" cy="118" r="74" fill="none" stroke="#0f172a" strokeWidth="1.8" />

            <text x="145" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Giỏi Toán A (15)
            </text>
            <text x="310" y="36" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Giỏi Vật lí B (20)
            </text>

            <text x="135" y="122" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="225" y="120" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              8
            </text>
            <text x="315" y="122" fill="#065f46" fontFamily={MATH_SERIF} fontSize="20" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="225" y="142" fill="#475569" fontFamily={MATH_SERIF} fontSize="12" fontStyle="italic" textAnchor="middle">
              A ∩ B = 8
            </text>
            <text x="366" y="198" fill="#475569" fontFamily={MATH_SERIF} fontSize="13" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              Ngoài: 12
            </text>
          </svg>
        );

      case 'number_line_union_5_d4':
        return (
          <svg
            viewBox="0 0 520 115"
            className="w-full max-w-lg mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="nlu5-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
              <pattern id="nlu5-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#334155" strokeWidth="1.35" />
              </pattern>
            </defs>

            {/* Vùng gạch chéo phần [5; +∞) */}
            <rect x="310" y="42" width="150" height="26" fill="url(#nlu5-hatch)" />

            {/* Trục số thực x */}
            <line x1="35" y1="55" x2="482" y2="55" stroke="#0f172a" strokeWidth="1.8" markerEnd="url(#nlu5-arrow)" />
            <text x="488" y="75" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              x
            </text>

            {/* Phần hợp (-∞; 5) tô đậm */}
            <line x1="35" y1="55" x2="310" y2="55" stroke="#1d4ed8" strokeWidth="3.2" />

            {/* Vạch chia và dấu ngoặc tròn ) tại điểm 5 */}
            <line x1="310" y1="46" x2="310" y2="64" stroke="#0f172a" strokeWidth="1.5" />
            <text x="310" y="61" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              )
            </text>
            <text x="310" y="88" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              5
            </text>

            <text x="172" y="28" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A ∪ B = (−∞; 5)
            </text>
          </svg>
        );

      case 'triangle_cos_inscribed_d4':
        return (
          <svg
            viewBox="0 0 380 230"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC: A(65, 190), B(315, 190), C(132, 74) */}
            <polygon
              points="65,190 315,190 132,74"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />

            {/* Đường tròn nội tiếp tâm I(148, 146), bán kính r = 44px */}
            <circle
              cx="148"
              cy="146"
              r="44"
              fill="#eff6ff"
              fillOpacity="0.55"
              stroke="#1d4ed8"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            <line x1="148" y1="146" x2="148" y2="190" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="148" cy="146" r="2.8" fill="#1d4ed8" />
            <text x="139" y="140" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              I
            </text>
            <text x="156" y="172" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              r = ?
            </text>

            {/* Cung góc 60° tại A */}
            <path d="M 97 190 A 32 32 0 0 0 81 162" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="102" y="178" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              60°
            </text>

            {/* Các đỉnh và độ dài cạnh */}
            <text x="48" y="204" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="324" y="204" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <text x="132" y="63" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              C
            </text>

            <text x="190" y="212" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="middle">
              c = 8
            </text>
            <text x="86" y="128" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="end">
              b = 3
            </text>
            <text x="235" y="124" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              a = ?
            </text>
          </svg>
        );

      case 'mountain_tv_tower_d4':
        return (
          <svg
            viewBox="0 0 430 250"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* A(55, 205), H(325, 205), C(325, 110), B(325, 32) */}
            <line x1="55" y1="205" x2="325" y2="205" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="55" y1="205" x2="325" y2="32" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="55" y1="205" x2="325" y2="110" stroke="#0f172a" strokeWidth="1.7" />

            {/* Ngọn đồi CH = h (nét đứt) và Tháp viễn thông BC = 45 m (tô xanh đậm) */}
            <line x1="325" y1="205" x2="325" y2="110" stroke="#0f172a" strokeWidth="1.8" strokeDasharray="5 4" />
            <line x1="325" y1="110" x2="325" y2="32" stroke="#1d4ed8" strokeWidth="3.2" />

            {/* Ký hiệu góc vuông tại H(325, 205) */}
            <polyline points="311,205 311,191 325,191" fill="none" stroke="#0f172a" strokeWidth="1.4" />

            {/* Cung góc nâng 11,2° (góc CAH) */}
            <path d="M 118 205 A 63 63 0 0 0 114 184" fill="none" stroke="#0f172a" strokeWidth="1.35" />
            <text x="126" y="198" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5">
              11,2°
            </text>

            {/* Cung góc nâng 18,5° (góc BAH) */}
            <path d="M 152 205 A 97 97 0 0 0 137 152" fill="none" stroke="#0f172a" strokeWidth="1.35" />
            <text x="148" y="164" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5">
              18,5°
            </text>

            {/* Các điểm A, H, C, B */}
            <circle cx="55" cy="205" r="2.8" fill="#0f172a" />
            <circle cx="325" cy="205" r="2.8" fill="#0f172a" />
            <circle cx="325" cy="110" r="3" fill="#1d4ed8" />
            <circle cx="325" cy="32" r="3" fill="#1d4ed8" />

            <text x="38" y="220" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="334" y="220" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              H
            </text>
            <text x="336" y="115" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              C
            </text>
            <text x="325" y="21" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              B
            </text>

            {/* Nhãn kích thước 45 m và chiều cao ngọn đồi h */}
            <text x="338" y="75" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold">
              45 m
            </text>
            <text x="338" y="162" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              h
            </text>
          </svg>
        );

      case 'feasible_region_tea_pepper_d5':
        return (
          <svg
            viewBox="0 0 420 310"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="frtp5-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Gốc tọa độ O(65, 255), 1 đơn vị = 24px:
                O(0,0)=(65,255), A(9,0)=(281,255), B(6,3)=(209,183), C(0,7)=(65,87), (10.5,0)=(317,255), (0,9)=(65,39) */}
            <polygon
              points="65,255 281,255 209,183 65,87"
              fill="#dbeafe"
              stroke="#1d4ed8"
              strokeWidth="2"
            />

            {/* Trục tọa độ Ox, Oy */}
            <line x1="30" y1="255" x2="385" y2="255" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#frtp5-arrow)" />
            <text x="392" y="268" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              x
            </text>
            <line x1="65" y1="285" x2="65" y2="18" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#frtp5-arrow)" />
            <text x="48" y="24" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              y
            </text>
            <text x="48" y="272" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Đường d1: x + y = 9 qua (0,9)=(65,39) và (9,0)=(281,255) */}
            <line x1="53" y1="27" x2="295" y2="269" stroke="#1d4ed8" strokeWidth="1.6" />
            <text x="128" y="70" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13.5" fontStyle="italic">
              x + y = 9
            </text>

            {/* Đường d2: 2x + 3y = 21 qua (0,7)=(65,87) và (10.5,0)=(317,255) */}
            <line x1="47" y1="75" x2="335" y2="267" stroke="#0f766e" strokeWidth="1.6" />
            <text x="245" y="175" fill="#0f766e" fontFamily={MATH_SERIF} fontSize="13.5" fontStyle="italic">
              2x + 3y = 21
            </text>

            {/* Đường gióng nét đứt từ đỉnh B(m; n) */}
            <line x1="209" y1="255" x2="209" y2="183" stroke="#dc2626" strokeWidth="1.3" strokeDasharray="4 3" />
            <line x1="65" y1="183" x2="209" y2="183" stroke="#dc2626" strokeWidth="1.3" strokeDasharray="4 3" />
            <text x="209" y="273" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="13.5" fontWeight="bold" textAnchor="middle">
              m = ?
            </text>
            <text x="58" y="187" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="13.5" fontWeight="bold" textAnchor="end">
              n = ?
            </text>

            {/* Các đỉnh O, A, B, C */}
            <circle cx="65" cy="255" r="3" fill="#0f172a" />
            <circle cx="281" cy="255" r="3.2" fill="#1d4ed8" />
            <text x="281" y="274" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5" textAnchor="middle">
              A(9; 0)
            </text>

            <circle cx="65" cy="87" r="3.2" fill="#0f766e" />
            <text x="56" y="91" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5" textAnchor="end">
              C(0; 7)
            </text>

            <circle cx="209" cy="183" r="4" fill="#dc2626" />
            <text x="218" y="176" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              B(m; n)
            </text>
          </svg>
        );

      case 'venn_diagram_45_10c_d5':
        return (
          <svg
            viewBox="0 0 450 230"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <rect x="20" y="18" width="410" height="194" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
            <text x="34" y="42" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold">
              n(U) = 45
            </text>

            <circle cx="175" cy="118" r="74" fill="#eff6ff" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="275" cy="118" r="74" fill="#f0fdf4" fillOpacity="0.6" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="175" cy="118" r="74" fill="none" stroke="#0f172a" strokeWidth="1.8" />

            <text x="135" y="36" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              CLB Bóng rổ A (28)
            </text>
            <text x="315" y="36" fill="#065f46" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              CLB Cầu lông B (22)
            </text>

            <text x="135" y="122" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="19" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="225" y="120" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="18" fontWeight="bold" textAnchor="middle">
              A ∩ B = ?
            </text>
            <text x="315" y="122" fill="#065f46" fontFamily={MATH_SERIF} fontSize="19" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="368" y="198" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              Ngoài: 6 học sinh
            </text>
          </svg>
        );

      case 'number_line_minus3_5_d5':
        return (
          <svg
            viewBox="0 0 520 115"
            className="w-full max-w-lg mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="nlm35-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
              <pattern id="nlm35-hatch" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="7" stroke="#64748b" strokeWidth="1.3" />
              </pattern>
            </defs>

            {/* Gạch bỏ phần (-∞; -3] và (5; +∞) */}
            <rect x="35" y="42" width="115" height="26" fill="url(#nlm35-hatch)" />
            <rect x="355" y="42" width="110" height="26" fill="url(#nlm35-hatch)" />

            {/* Trục số thực x */}
            <line x1="35" y1="55" x2="482" y2="55" stroke="#0f172a" strokeWidth="1.8" markerEnd="url(#nlm35-arrow)" />
            <text x="488" y="75" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              x
            </text>

            {/* Phần giao (-3; 5] tô đậm */}
            <line x1="150" y1="55" x2="355" y2="55" stroke="#1d4ed8" strokeWidth="3.2" />

            {/* Điểm -3 với ngoặc tròn ( */}
            <line x1="150" y1="46" x2="150" y2="64" stroke="#0f172a" strokeWidth="1.5" />
            <text x="150" y="61" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              (
            </text>
            <text x="150" y="88" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              −3
            </text>

            {/* Điểm 5 với ngoặc vuông ] */}
            <line x1="355" y1="46" x2="355" y2="64" stroke="#0f172a" strokeWidth="1.5" />
            <text x="355" y="61" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              ]
            </text>
            <text x="355" y="88" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              5
            </text>

            <text x="252" y="28" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A ∩ B = (−3; 5]
            </text>
          </svg>
        );

      case 'lighthouse_coast_d5':
        return (
          <svg
            viewBox="0 0 440 245"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Đường bờ biển đi qua A(55, 198), B(235, 198), H(325, 198); Hải đăng C(325, 42) */}
            <line x1="30" y1="198" x2="395" y2="198" stroke="#0f172a" strokeWidth="1.7" />
            <line x1="55" y1="198" x2="235" y2="198" stroke="#1d4ed8" strokeWidth="3.2" />

            {/* Tia ngắm AC và BC */}
            <line x1="55" y1="198" x2="325" y2="42" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="235" y1="198" x2="325" y2="42" stroke="#0f172a" strokeWidth="1.8" />

            {/* Khoảng cách CH vuông góc bờ biển */}
            <line x1="325" y1="42" x2="325" y2="198" stroke="#dc2626" strokeWidth="2" strokeDasharray="5 4" />
            <polyline points="311,198 311,184 325,184" fill="none" stroke="#0f172a" strokeWidth="1.4" />

            {/* Góc 45° tại A và góc 75° tại B */}
            <path d="M 98 198 A 43 43 0 0 0 92 176" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="106" y="191" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              45°
            </text>

            <path d="M 272 198 A 37 37 0 0 0 254 166" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="276" y="182" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              75°
            </text>

            {/* Các đỉnh A, B, H, C */}
            <circle cx="55" cy="198" r="3" fill="#1d4ed8" />
            <circle cx="235" cy="198" r="3" fill="#1d4ed8" />
            <circle cx="325" cy="198" r="3" fill="#0f172a" />
            <circle cx="325" cy="42" r="3.5" fill="#dc2626" />

            <text x="50" y="218" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="235" y="218" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              B
            </text>
            <text x="325" y="218" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              H
            </text>
            <text x="325" y="28" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold" textAnchor="middle">
              C (Ngọn hải đăng)
            </text>

            <text x="145" y="218" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold" textAnchor="middle">
              40 m
            </text>
            <text x="336" y="125" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              CH = ?
            </text>
          </svg>
        );

      case 'broken_tree_storm_d6':
        return (
          <svg
            viewBox="0 0 430 235"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Mặt đất qua A(60, 192) và B(355, 192); Điểm gãy C(115, 42) */}
            <line x1="30" y1="192" x2="395" y2="192" stroke="#475569" strokeWidth="1.6" />
            <polygon
              points="60,192 355,192 115,42"
              fill="#f0fdf4"
              fillOpacity="0.65"
              stroke="#0f766e"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <line x1="60" y1="192" x2="355" y2="192" stroke="#1d4ed8" strokeWidth="2.6" />

            {/* Cung góc 74° tại A và 36° tại B */}
            <path d="M 96 192 A 36 36 0 0 0 71 158" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="100" y="176" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold">
              74°
            </text>

            <path d="M 308 192 A 47 47 0 0 1 317 168" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="292" y="182" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="end">
              36°
            </text>

            {/* Đỉnh A, B, C */}
            <circle cx="60" cy="192" r="3.2" fill="#0f172a" />
            <circle cx="355" cy="192" r="3.2" fill="#0f172a" />
            <circle cx="115" cy="42" r="3.8" fill="#dc2626" />

            <text x="55" y="214" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold" textAnchor="middle">
              A (Gốc cây)
            </text>
            <text x="355" y="214" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold" textAnchor="middle">
              B (Ngọn cây)
            </text>
            <text x="115" y="28" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold" textAnchor="middle">
              C (Điểm gãy)
            </text>

            <text x="208" y="214" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold" textAnchor="middle">
              AB = 8 m
            </text>
            <text x="72" y="112" fill="#0f766e" fontFamily={MATH_SERIF} fontSize="14.5" fontStyle="italic" fontWeight="bold" textAnchor="end">
              AC = ?
            </text>
          </svg>
        );

      case 'feasible_region_melon_strawberry_d6':
        return (
          <svg
            viewBox="0 0 430 300"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="frms6-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Gốc tọa độ O(60, 245), 1 đơn vị = 17px:
                O(0,0)=(60,245), A(12,0)=(264,245), B(9,3)=(213,194), C(0,6)=(60,143), (18,0)=(366,245), (0,12)=(60,41) */}
            <polygon
              points="60,245 264,245 213,194 60,143"
              fill="#dbeafe"
              stroke="#1d4ed8"
              strokeWidth="2"
            />

            {/* Trục tọa độ Ox, Oy */}
            <line x1="28" y1="245" x2="395" y2="245" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#frms6-arrow)" />
            <text x="402" y="258" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              x
            </text>
            <line x1="60" y1="278" x2="60" y2="18" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#frms6-arrow)" />
            <text x="44" y="24" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic">
              y
            </text>
            <text x="44" y="262" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic">
              O
            </text>

            {/* Đường d1: x + y = 12 qua (0,12)=(60,41) và (12,0)=(264,245) */}
            <line x1="48" y1="29" x2="278" y2="259" stroke="#1d4ed8" strokeWidth="1.6" />
            <text x="122" y="75" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="13.5" fontStyle="italic">
              x + y = 12
            </text>

            {/* Đường d2: x + 3y = 18 qua (0,6)=(60,143) và (18,0)=(366,245) */}
            <line x1="42" y1="137" x2="381" y2="250" stroke="#0f766e" strokeWidth="1.6" />
            <text x="275" y="205" fill="#0f766e" fontFamily={MATH_SERIF} fontSize="13.5" fontStyle="italic">
              x + 3y = 18
            </text>

            {/* Đường gióng nét đứt từ đỉnh B(?; ?) */}
            <line x1="213" y1="245" x2="213" y2="194" stroke="#dc2626" strokeWidth="1.3" strokeDasharray="4 3" />
            <line x1="60" y1="194" x2="213" y2="194" stroke="#dc2626" strokeWidth="1.3" strokeDasharray="4 3" />
            <text x="213" y="263" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="13.5" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="52" y="198" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="13.5" fontWeight="bold" textAnchor="end">
              ?
            </text>

            {/* Các đỉnh O, A, B, C */}
            <circle cx="60" cy="245" r="3" fill="#0f172a" />
            <circle cx="264" cy="245" r="3.2" fill="#1d4ed8" />
            <text x="264" y="264" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5" textAnchor="middle">
              A(12; 0)
            </text>

            <circle cx="60" cy="143" r="3.2" fill="#0f766e" />
            <text x="52" y="147" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5" textAnchor="end">
              C(0; 6)
            </text>

            <circle cx="213" cy="194" r="4" fill="#dc2626" />
            <text x="222" y="186" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              B(?; ?), Fmax = ?
            </text>
          </svg>
        );

      case 'venn_diagram_80_tourists_d6':
        return (
          <svg
            viewBox="0 0 450 230"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <rect x="20" y="18" width="410" height="194" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
            <text x="34" y="42" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold">
              n(U) = 80
            </text>

            <circle cx="175" cy="118" r="74" fill="#eff6ff" fillOpacity="0.7" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="275" cy="118" r="74" fill="#f0fdf4" fillOpacity="0.6" stroke="#0f172a" strokeWidth="1.8" />
            <circle cx="175" cy="118" r="74" fill="none" stroke="#0f172a" strokeWidth="1.8" />

            <text x="135" y="36" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Phú Quốc A (52)
            </text>
            <text x="315" y="36" fill="#065f46" fontFamily={MATH_SERIF} fontSize="14" fontWeight="bold" textAnchor="middle">
              Hạ Long B (44)
            </text>

            <text x="135" y="122" fill="#1e3a8a" fontFamily={MATH_SERIF} fontSize="19" fontWeight="bold" textAnchor="middle">
              ?
            </text>
            <text x="225" y="120" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="18" fontWeight="bold" textAnchor="middle">
              A ∩ B = ?
            </text>
            <text x="315" y="122" fill="#065f46" fontFamily={MATH_SERIF} fontSize="19" fontWeight="bold" textAnchor="middle">
              ?
            </text>

            <text x="365" y="198" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              Ngoài: 10 du khách
            </text>
          </svg>
        );

      case 'number_line_2_7_d6':
        return (
          <svg
            viewBox="0 0 520 115"
            className="w-full max-w-lg mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            <defs>
              <marker id="nl27-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 9 5 L 0 8.5 L 2 5 z" fill="#0f172a" />
              </marker>
              <pattern id="nl27-hatch" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="7" stroke="#64748b" strokeWidth="1.3" />
              </pattern>
            </defs>

            {/* Gạch bỏ phần (-∞; 2] và (7; +∞) */}
            <rect x="35" y="42" width="150" height="26" fill="url(#nl27-hatch)" />
            <rect x="365" y="42" width="100" height="26" fill="url(#nl27-hatch)" />

            {/* Trục số thực x */}
            <line x1="35" y1="55" x2="482" y2="55" stroke="#0f172a" strokeWidth="1.8" markerEnd="url(#nl27-arrow)" />
            <text x="488" y="75" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              x
            </text>

            {/* Phần giao (2; 7] tô đậm */}
            <line x1="185" y1="55" x2="365" y2="55" stroke="#1d4ed8" strokeWidth="3.2" />

            {/* Điểm 2 với ngoặc tròn ( */}
            <line x1="185" y1="46" x2="185" y2="64" stroke="#0f172a" strokeWidth="1.5" />
            <text x="185" y="61" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              (
            </text>
            <text x="185" y="88" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              2
            </text>

            {/* Điểm 7 với ngoặc vuông ] */}
            <line x1="365" y1="46" x2="365" y2="64" stroke="#0f172a" strokeWidth="1.5" />
            <text x="365" y="61" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="22" fontWeight="bold" textAnchor="middle">
              ]
            </text>
            <text x="365" y="88" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontWeight="bold" textAnchor="middle">
              7
            </text>

            <text x="275" y="28" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              A ∩ B = (2; 7]
            </text>
          </svg>
        );

      case 'triangle_cos_inscribed_d6':
        return (
          <svg
            viewBox="0 0 380 235"
            className="w-full max-w-sm mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tam giác ABC: A(60, 195), B(316, 195), C(140, 56) */}
            <polygon
              points="60,195 316,195 140,56"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />

            {/* Đường tròn nội tiếp tâm I(156, 140), bán kính r = 55px */}
            <circle
              cx="156"
              cy="140"
              r="55"
              fill="#eff6ff"
              fillOpacity="0.55"
              stroke="#1d4ed8"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            <line x1="156" y1="140" x2="156" y2="195" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="156" cy="140" r="2.8" fill="#1d4ed8" />
            <text x="145" y="135" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              I
            </text>
            <text x="164" y="172" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="14" fontStyle="italic" fontWeight="bold">
              r = ?
            </text>

            {/* Cung góc 60° tại A */}
            <path d="M 92 195 A 32 32 0 0 0 76 167" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="98" y="183" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="14">
              60°
            </text>

            {/* Các đỉnh và độ dài cạnh */}
            <text x="44" y="208" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="325" y="208" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold">
              B
            </text>
            <text x="140" y="45" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="16" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              C
            </text>

            <text x="188" y="216" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="middle">
              c = 8 cm
            </text>
            <text x="90" y="120" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" textAnchor="end">
              b = 5 cm
            </text>
            <text x="238" y="118" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              a = ?
            </text>
          </svg>
        );

      case 'mountain_building_observation_d6':
        return (
          <svg
            viewBox="0 0 440 250"
            className="w-full max-w-md mx-auto h-auto select-none rounded-lg bg-white border border-slate-300 shadow-xs"
          >
            {/* Tòa nhà AB: A(75, 205), B(75, 112); Ngọn núi CD: D(325, 205), E(325, 112), C(325, 32) */}
            <line x1="35" y1="205" x2="395" y2="205" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="75" y1="205" x2="75" y2="112" stroke="#1d4ed8" strokeWidth="3.2" />
            <line x1="325" y1="205" x2="325" y2="32" stroke="#0f766e" strokeWidth="3.2" />

            {/* Phương ngang BE từ sân thượng */}
            <line x1="75" y1="112" x2="325" y2="112" stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 4" />

            {/* Hai tia ngắm AC (38°) và BC (18°) */}
            <line x1="75" y1="205" x2="325" y2="32" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="75" y1="112" x2="325" y2="32" stroke="#0f172a" strokeWidth="1.8" />

            {/* Ký hiệu góc vuông tại D và E */}
            <polyline points="311,205 311,191 325,191" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <polyline points="311,112 311,98 325,98" fill="none" stroke="#0f172a" strokeWidth="1.4" />

            {/* Cung góc 38° tại A và 18° tại B */}
            <path d="M 122 205 A 47 47 0 0 0 113 178" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="128" y="195" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5" fontWeight="bold">
              38°
            </text>

            <path d="M 130 112 A 55 55 0 0 0 127 95" fill="none" stroke="#0f172a" strokeWidth="1.4" />
            <text x="136" y="106" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="13.5" fontWeight="bold">
              18°
            </text>

            {/* Các đỉnh A, B, C, D, E */}
            <circle cx="75" cy="205" r="3" fill="#1d4ed8" />
            <circle cx="75" cy="112" r="3" fill="#1d4ed8" />
            <circle cx="325" cy="205" r="3" fill="#0f766e" />
            <circle cx="325" cy="112" r="3" fill="#0f766e" />
            <circle cx="325" cy="32" r="3.5" fill="#dc2626" />

            <text x="64" y="222" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              A
            </text>
            <text x="62" y="110" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="end">
              B
            </text>
            <text x="325" y="222" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold" textAnchor="middle">
              D
            </text>
            <text x="335" y="116" fill="#0f172a" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              E
            </text>
            <text x="325" y="20" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontWeight="bold" textAnchor="middle">
              C (Đỉnh núi)
            </text>

            <text x="64" y="162" fill="#1d4ed8" fontFamily={MATH_SERIF} fontSize="14.5" fontWeight="bold" textAnchor="end">
              50 m
            </text>
            <text x="338" y="75" fill="#dc2626" fontFamily={MATH_SERIF} fontSize="15" fontStyle="italic" fontWeight="bold">
              h = ?
            </text>
          </svg>
        );

      default:
        if (tikzCode && tikzCode.trim()) {
          return renderCustomTikzToSvg(tikzCode);
        }
        return null;
    }
  };

  const renderedSvg = renderSvgDiagram();
  if (!renderedSvg) return null;

  return (
    <div className={`rounded-xl border border-sky-900/60 bg-[#060e20] p-3 sm:p-4 shadow-inner space-y-2.5 my-3 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>Hình vẽ chuẩn TikZ</span>
          </span>
          {caption && <span className="text-sky-300 font-semibold">{caption}</span>}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowCode((prev) => !prev);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
              showCode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-sky-950/80 text-sky-300 hover:text-white border-sky-800/80 hover:bg-sky-900/60'
            }`}
            title="Xem hoặc ẩn mã nguồn TikZ chuẩn LaTeX"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showCode ? 'Ẩn mã TikZ' : 'Mã TikZ'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-950/80 text-cyan-300 hover:text-white border border-sky-800/80 hover:bg-sky-900/60 transition-all flex items-center gap-1"
            title="Sao chép mã TikZ vào clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã chép' : 'Sao chép TikZ'}</span>
          </button>
        </div>
      </div>

      {/* Vector Figure Container */}
      <div className="flex justify-center items-center py-2 overflow-x-auto">
        {renderedSvg}
      </div>

      {/* Expandable TikZ LaTeX Code */}
      {showCode && (
        <div className="mt-2.5 pt-2.5 border-t border-sky-950 space-y-1.5 animate-fadeIn">
          <div className="text-[11px] font-bold text-amber-300/90 flex items-center justify-between">
            <span>Mã nguồn LaTeX chuẩn TikZ (Dùng trực tiếp trong Overleaf / TeXMaker):</span>
          </div>
          <pre className="p-3 rounded-lg bg-[#030712] border border-sky-950 font-mono text-[11px] text-cyan-300 overflow-x-auto leading-relaxed max-h-48 selection:bg-cyan-500 selection:text-black">
            {getTikzCode(type)}
          </pre>
        </div>
      )}
    </div>
  );
};
