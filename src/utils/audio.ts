/**
 * Web Audio API Sound Effects & Speech Synthesis Engine
 * Provides crisp audio feedback for student actions, correct/wrong responses, and TTS reading for questions.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Check if sound FX is enabled
export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('exam_sound_enabled');
  return stored !== 'false';
}

export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('exam_sound_enabled', enabled ? 'true' : 'false');
}

/**
 * Modern soft pop / bubble click sound
 */
export function playClickSound(): void {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

/**
 * Option selection chime (subtle pleasant ping)
 */
export function playSelectOptionSound(): void {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

/**
 * Bookmark toggle sound
 */
export function playBookmarkSound(): void {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(880, now + 0.04); // A5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

/**
 * Âm thanh VUI MỪNG khi làm ĐÚNG (Joyful celebration fanfare & sparkling chime)
 * Chuỗi nốt hân hoan rộn ràng C5 -> E5 -> G5 -> C6 -> E6 kèm hợp âm lấp lánh ngân vang
 */
export function playCorrectSound(): void {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Giai điệu rộn ràng, vui mừng phấn khởi (C5 -> E5 -> G5 -> C6 -> E6)
    const melody = [
      { f: 523.25, t: 0.0, d: 0.12, gain: 0.22 }, // C5
      { f: 659.25, t: 0.07, d: 0.12, gain: 0.24 }, // E5
      { f: 783.99, t: 0.14, d: 0.14, gain: 0.26 }, // G5
      { f: 1046.5, t: 0.22, d: 0.35, gain: 0.30 }, // C6
      { f: 1318.5, t: 0.28, d: 0.45, gain: 0.26 }, // E6
    ];

    melody.forEach(({ f, t, d, gain: noteGain }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const startTime = now + t;
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(noteGain, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + d + 0.05);
    });

    // Chuông ngân lấp lánh (Sparkling victory shimmer chord)
    const sparkleNotes = [523.25, 783.99, 1046.5, 1567.98];
    sparkleNotes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startTime = now + 0.22;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.09, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

/**
 * Âm thanh BUỒN khi làm SAI (Sad trombone / "wah-wah-wah-waaaahn" / trượt buồn bã)
 * 4 nốt trầm trễ nải trượt xuống F4 -> E4 -> Eb4 -> D4 với hiệu ứng filter wah-wah buồn bã
 */
export function playWrongSound(): void {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 4 nốt trượt chậm rãi mang sắc thái buồn rầu, tiếc nuối: F4 -> E4 -> Eb4 -> D4
    const sadSteps = [
      { f: 349.23, t: 0.0, d: 0.22, slideTo: 338 },   // F4
      { f: 329.63, t: 0.22, d: 0.22, slideTo: 318 },  // E4
      { f: 311.13, t: 0.44, d: 0.22, slideTo: 300 },  // Eb4
      { f: 293.66, t: 0.66, d: 0.75, slideTo: 220 },  // D4 trượt dài xuống buồn bã
    ];

    sadSteps.forEach(({ f, t, d, slideTo }, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      const startTime = now + t;

      // Trượt xuống nhẹ
      osc.frequency.setValueAtTime(f, startTime);
      osc.frequency.exponentialRampToValueAtTime(slideTo, startTime + d);

      // Lowpass filter tạo hiệu ứng "wah" của kèn buồn
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, startTime);
      filter.frequency.linearRampToValueAtTime(1000, startTime + 0.07);
      filter.frequency.exponentialRampToValueAtTime(320, startTime + d);

      // Nốt cuối rung giọng não nề (tremolo / vibrato LFO)
      if (idx === 3) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(5.5, startTime); // 5.5Hz vibrato
        lfoGain.gain.setValueAtTime(7, startTime);
        lfo.connect(osc.frequency);
        lfo.start(startTime + 0.1);
        lfo.stop(startTime + d);
      }

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + d + 0.05);
    });
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

/**
 * Phát âm thanh phản hồi tùy theo kết quả Đúng hay Sai
 */
export function playAnswerFeedbackSound(isCorrect: boolean): void {
  if (isCorrect) {
    playCorrectSound();
  } else {
    playWrongSound();
  }
}

/**
 * Nộp bài thi hoàn thành fanfare
 */
export function playSubmitFanfare(): void {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.7]; // A4, C#5, E5, A5, C#6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const startTime = now + idx * 0.08;
      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.52);
    });
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

/**
 * Text-to-speech for Vietnamese math questions
 */
let currentUtterance: SpeechSynthesisUtterance | null = null;

// Clean math string for cleaner reading
function cleanMathForSpeech(text: string): string {
  return text
    .replace(/\$\$/g, ' ')
    .replace(/\$/g, ' ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 trên $2')
    .replace(/\\cdot/g, ' nhân ')
    .replace(/\\times/g, ' nhân ')
    .replace(/\\sqrt\{([^}]+)\}/g, 'căn bậc hai của $1')
    .replace(/\^2/g, ' bình phương ')
    .replace(/\^3/g, ' lập phương ')
    .replace(/\\le|\\leq/g, ' nhỏ hơn hoặc bằng ')
    .replace(/\\ge|\\geq/g, ' lớn hơn hoặc bằng ')
    .replace(/\\ne|\\neq/g, ' khác ')
    .replace(/\\in/g, ' thuộc ')
    .replace(/\\notin/g, ' không thuộc ')
    .replace(/\\subset/g, ' tập con của ')
    .replace(/\\cap/g, ' giao ')
    .replace(/\\cup/g, ' hợp ')
    .replace(/\\infty/g, ' vô cùng ')
    .replace(/\\vec\{([^}]+)\}/g, 'vectơ $1')
    .replace(/\\left|\\right/g, '')
    .replace(/[{}\\]/g, ' ');
}

export function speakQuestion(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  stopSpeech();

  const cleaned = cleanMathForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find((v) => v.lang.includes('vi') || v.lang.includes('VIE'));
  if (viVoice) {
    utterance.voice = viVoice;
  }

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };

  utterance.onerror = () => {
    currentUtterance = null;
    onEnd?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}
