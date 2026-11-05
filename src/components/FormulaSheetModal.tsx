import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface FormulaSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaSheetModal: React.FC<FormulaSheetModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sets' | 'inequalities' | 'trig' | 'triangle'>('triangle');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sổ Tay Công Thức Toán 10 (Bài 1 đến Bài 6)</h3>
              <p className="text-xs text-slate-500">Tóm tắt định lý và công thức trọng tâm từ SGK Toán 10 Tập 1</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 overflow-x-auto p-1.5 bg-slate-100 gap-1 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('sets')}
            className={`px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'sets' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bài 1 & 2: Mệnh Đề & Tập Hợp
          </button>
          <button
            onClick={() => setActiveTab('inequalities')}
            className={`px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'inequalities' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bài 3 & 4: BPT & Hệ BPT Hai Ẩn
          </button>
          <button
            onClick={() => setActiveTab('trig')}
            className={`px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'trig' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bài 5: Giá Trị Lượng Giác
          </button>
          <button
            onClick={() => setActiveTab('triangle')}
            className={`px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'triangle' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bài 6: Hệ Thức Lượng Tam Giác
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-800 leading-relaxed flex-1">
          {activeTab === 'sets' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-indigo-900 mb-2">1. Mệnh Đề (Bài 1)</h4>
                <div className="space-y-1.5">
                  <div><MathRenderer content="• Phủ định của mệnh đề: $\overline{\forall x \in X, P(x)}$ là $\exists x \in X, \overline{P(x)}$." /></div>
                  <div><MathRenderer content="• Phủ định của mệnh đề: $\overline{\exists x \in X, P(x)}$ là $\forall x \in X, \overline{P(x)}$." /></div>
                  <div><MathRenderer content="• Mệnh đề kéo theo: $P \Rightarrow Q$ (&quot;Nếu $P$ thì $Q$&quot;). $P$ là điều kiện đủ để có $Q$, $Q$ là điều kiện cần để có $P$." /></div>
                  <div><MathRenderer content="• Mệnh đề tương đương: $P \Leftrightarrow Q$ (&quot;$P$ khi và chỉ khi $Q$&quot; hoặc &quot;$P$ là điều kiện cần và đủ để có $Q$&quot;)." /></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-indigo-900 mb-2">2. Tập Hợp & Các Phép Toán (Bài 2)</h4>
                <div className="space-y-2">
                  <div>• Số tập con của tập hợp có $n$ phần tử là: $2^n$ (bao gồm cả $\emptyset$ và chính nó).</div>
                  <div>• Giao hai tập hợp: <MathRenderer content="$A \cap B = \{x \mid x \in A \text{ và } x \in B\}$" /></div>
                  <div>• Hợp hai tập hợp: <MathRenderer content="$A \cup B = \{x \mid x \in A \text{ hay } x \in B\}$" /></div>
                  <div>• Hiệu hai tập hợp: <MathRenderer content="$A \setminus B = \{x \mid x \in A \text{ và } x \notin B\}$" /></div>
                  <div>• Công thức số phần tử thực tế: <MathRenderer content="$n(A \cup B) = n(A) + n(B) - n(A \cap B)$" /></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inequalities' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-indigo-900 mb-2">1. Bất Phương Trình Bậc Nhất Hai Ẩn (Bài 3)</h4>
                <div className="space-y-1.5">
                  <div>• Dạng tổng quát: <MathRenderer content="$ax + by \le c$ (hoặc $\ge, <, >$)" /> với $a, b$ không đồng thời bằng 0.</div>
                  <div>• Miền nghiệm: Trên mặt phẳng tọa độ $Oxy$, đường thẳng $ax + by = c$ chia mặt phẳng thành hai nửa mặt phẳng bờ $d$. Một trong hai nửa mặt phẳng (kể cả bờ hoặc không kể bờ) là miền nghiệm của bất phương trình.</div>
                  <div>• Cách kiểm tra: Lấy điểm thử $M(x_0; y_0)$ (thường chọn gốc tọa độ $O(0; 0)$ nếu $c \neq 0$) thay vào bất phương trình.</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-indigo-900 mb-2">2. Hệ Bất Phương Trình & Bài Toán Tối Ưu Hóa (Bài 4)</h4>
                <div className="space-y-1.5">
                  <div>• Miền nghiệm của hệ bất phương trình bậc nhất hai ẩn là giao các miền nghiệm của từng bất phương trình trong hệ.</div>
                  <div>• <strong>Định lý tối ưu hóa:</strong> Giá trị lớn nhất (hoặc nhỏ nhất) của biểu thức tuyến tính <MathRenderer content="$F(x; y) = ax + by$" /> trên một miền đa giác lồi luôn đạt được tại một trong các đỉnh của miền đa giác đó.</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trig' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-indigo-900 mb-2">1. Định Nghĩa Giá Trị Lượng Giác (Bài 5)</h4>
                <div className="space-y-1.5">
                  <div>Với góc $\alpha$ ($0^\circ \le \alpha \le 180^\circ$), gọi $M(x_0; y_0)$ là điểm trên nửa đường tròn đơn vị:</div>
                  <div>• <MathRenderer content="$\sin \alpha = y_0; \quad \cos \alpha = x_0$" /></div>
                  <div>• <MathRenderer content="$\tan \alpha = \frac{y_0}{x_0} = \frac{\sin \alpha}{\cos \alpha} \quad (\alpha \neq 90^\circ); \quad \cot \alpha = \frac{x_0}{y_0} = \frac{\cos \alpha}{\sin \alpha} \quad (\alpha \neq 0^\circ, 180^\circ)$" /></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-indigo-900 mb-2">2. Mối Quan Hệ Giữa Hai Góc Bù Nhau</h4>
                <div className="space-y-1.5">
                  <div>• <MathRenderer content="$\sin(180^\circ - \alpha) = \sin \alpha$" /> (Sin bù: bằng nhau)</div>
                  <div>• <MathRenderer content="$\cos(180^\circ - \alpha) = -\cos \alpha$" /></div>
                  <div>• <MathRenderer content="$\tan(180^\circ - \alpha) = -\tan \alpha$" /></div>
                  <div>• <MathRenderer content="$\cot(180^\circ - \alpha) = -\cot \alpha$" /></div>
                  <div>• Các hệ thức cơ bản: <MathRenderer content="$\sin^2 \alpha + \cos^2 \alpha = 1; \quad 1 + \tan^2 \alpha = \frac{1}{\cos^2 \alpha}; \quad \tan \alpha \cdot \cot \alpha = 1$" /></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'triangle' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-indigo-900 mb-2">1. Định Lý Cô-sin & Định Lý Sin (Bài 6)</h4>
                <div className="space-y-1.5 font-math">
                  <div><MathRenderer content="$a^2 = b^2 + c^2 - 2bc \cos A$" /></div>
                  <div><MathRenderer content="$\cos A = \frac{b^2 + c^2 - a^2}{2bc}$" /></div>
                  <div><MathRenderer content="$\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C} = 2R$" /></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-indigo-900 mb-2">2. Các Công Thức Tính Diện Tích Tam Giác</h4>
                <div className="space-y-2">
                  <div><MathRenderer content="$S = \frac{1}{2} a h_a = \frac{1}{2} b h_b = \frac{1}{2} c h_c$" /></div>
                  <div><MathRenderer content="$S = \frac{1}{2}ab \sin C = \frac{1}{2}bc \sin A = \frac{1}{2}ca \sin B$" /></div>
                  <div><MathRenderer content="$S = \frac{abc}{4R} = p \cdot r$ (với $p = \frac{a+b+c}{2}$)" /></div>
                  <div><MathRenderer content="Công thức Heron: $S = \sqrt{p(p-a)(p-b)(p-c)}$" /></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors"
          >
            Đóng Bảng Tra Cứu
          </button>
        </div>
      </div>
    </div>
  );
};
