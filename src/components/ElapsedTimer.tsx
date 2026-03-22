import React, { useState, useEffect } from "react";

interface ElapsedTimerProps {
  startTime: string | Date;
  /** Minutes after which to show warning (e.g. order waiting too long) */
  warningThresholdMinutes?: number;
  className?: string;
}

export function ElapsedTimer({
  startTime,
  warningThresholdMinutes = 5,
  className = "",
}: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(() => {
    const start = new Date(startTime).getTime();
    return Math.floor((Date.now() - start) / 1000);
  });

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const isOverThreshold = minutes >= warningThresholdMinutes;

  return (
    <span
      className={`font-mono font-black tabular-nums ${
        isOverThreshold ? "text-orange-600" : "text-slate-700"
      } ${className}`}
      title={isOverThreshold ? `Over ${warningThresholdMinutes} min – prioritize!` : undefined}
    >
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}
