import React from 'react';
import type { GhostAction } from '../hooks/useGhostVoice';

function formatAction(a: GhostAction): string {
  const params = Object.entries(a.params)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  return params ? `${a.tool}(${params})` : a.tool;
}

export function GhostActionFeed({ actions }: { actions: GhostAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm pointer-events-none">
      <div className="space-y-1 border border-white/10 bg-[#081418]/92 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm">
        {actions.slice(0, 6).map((a, i) => (
          <div
            key={a.id}
            className="font-mono text-[10px] leading-tight transition-opacity duration-500"
            style={{ opacity: Math.max(0.15, 1 - i * 0.15) }}
          >
            <span className="text-teal-400/80">&gt; [GHOST]</span>{' '}
            <span className="text-white/60">{formatAction(a)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
