import React, { useEffect, useState } from 'react';
import { Clock, Pause, Play } from 'lucide-react';

interface TimerProps {
  initialMinutes: number;
  isRunning: boolean;
  onTimeUp: () => void;
  resetKey?: string | number;
  onElapsedChange?: (elapsedSeconds: number) => void;
}

export const Timer: React.FC<TimerProps> = ({
  initialMinutes,
  isRunning,
  onTimeUp,
  resetKey,
  onElapsedChange,
}) => {
  const totalInitialSeconds = initialMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalInitialSeconds);
  const [isPaused, setIsPaused] = useState(false);

  // Reset when initialMinutes or resetKey changes
  useEffect(() => {
    setSecondsLeft(initialMinutes * 60);
    setIsPaused(false);
    if (onElapsedChange) {
      onElapsedChange(0);
    }
  }, [initialMinutes, resetKey]);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev <= 1 ? 0 : prev - 1;
        if (onElapsedChange) {
          onElapsedChange(totalInitialSeconds - next);
        }
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, secondsLeft, onTimeUp, totalInitialSeconds, onElapsedChange]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isLowTime = secondsLeft <= 300 && secondsLeft > 0; // <= 5 phút

  const formatDigits = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-md ${
        isLowTime
          ? 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse'
          : isRunning
          ? 'bg-[#0b1739] border-amber-500/40 text-amber-300'
          : 'bg-[#0b1739] border-sky-800/80 text-sky-200'
      }`}
    >
      <Clock
        className={`w-4 h-4 ${
          !isRunning ? 'text-sky-400' : isLowTime ? 'text-rose-400' : 'text-amber-400'
        }`}
      />
      <span className="font-mono text-base tabular-nums font-black text-white">
        {formatDigits(minutes)}:{formatDigits(seconds)}
      </span>
      {!isRunning ? (
        <span className="text-[11px] font-bold text-sky-300 bg-sky-950/90 border border-sky-800/80 px-2 py-0.5 rounded-lg">
          Chờ bắt đầu
        </span>
      ) : isLowTime ? (
        <span className="hidden sm:inline text-xs font-bold text-rose-300">
          (Sắp hết giờ!)
        </span>
      ) : null}
      {isRunning && (
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="ml-0.5 p-1 rounded-lg bg-[#071126] hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-800/70 transition-colors"
          title={isPaused ? 'Tiếp tục tính giờ' : 'Tạm dừng đồng hồ'}
          type="button"
        >
          {isPaused ? (
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
          ) : (
            <Pause className="w-3.5 h-3.5 text-amber-300" />
          )}
        </button>
      )}
    </div>
  );
};
