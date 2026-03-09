import React, { useEffect, useRef, useState } from 'react';

type AmbientGuideProps = {
  key?: React.Key;
  label: string;
  message: string;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  delayMs?: number;
};

const alignmentClass = {
  left: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0',
};

export function AmbientGuide({
  label,
  message,
  children,
  align = 'left',
  delayMs = 680,
}: AmbientGuideProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const enabledRef = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    enabledRef.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  const clearGuide = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  };

  const scheduleGuide = () => {
    if (!enabledRef.current || typeof window === 'undefined') return;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={scheduleGuide}
      onMouseLeave={clearGuide}
      onFocus={scheduleGuide}
      onBlur={clearGuide}
    >
      {children}
      <span
        className={`pointer-events-none absolute top-full z-40 mt-3 w-[260px] max-w-[72vw] transition-all duration-300 ${alignmentClass[align]} ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <span className="block border border-black/10 bg-[rgba(247,244,237,0.96)] px-4 py-3 text-left shadow-[0_18px_36px_-28px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <span className="block text-[10px] uppercase tracking-[0.22em] text-brand-teal">{label}</span>
          <span className="mt-2 block text-sm leading-6 text-black/68">{message}</span>
        </span>
      </span>
    </span>
  );
}
