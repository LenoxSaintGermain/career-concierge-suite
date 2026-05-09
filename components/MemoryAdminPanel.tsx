import React, { useState } from 'react';
import { ClientMemory } from '../types';
import { resolveApiOrigin } from '../services/apiOrigin';
import { auth } from '../services/firebase';

interface MemoryAdminPanelProps {
  memory: ClientMemory | null;
  onRecompiled: (memory: ClientMemory) => void;
}

const KIND_LABEL: Record<string, string> = {
  commitment: 'Commitment',
  concern: 'Concern',
  milestone: 'Milestone',
  preference: 'Preference',
  context: 'Context',
};

const KIND_COLOR: Record<string, string> = {
  commitment: '#8DD9BF',
  concern: '#E88B74',
  milestone: '#74A8E8',
  preference: '#C4B5E8',
  context: '#8EA3A7',
};

const WEIGHT_BADGE: Record<string, string> = {
  high: 'bg-[#8DD9BF]/15 text-[#8DD9BF] border border-[#8DD9BF]/30',
  medium: 'bg-white/5 text-[#8EA3A7] border border-white/10',
  low: 'bg-white/5 text-[#8EA3A7]/60 border border-white/5',
};

export function MemoryAdminPanel({ memory, onRecompiled }: MemoryAdminPanelProps) {
  const [recompiling, setRecompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecompile = async () => {
    setRecompiling(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const resp = await fetch(`${resolveApiOrigin()}/v1/memory/compile`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`${resp.status}`);
      const data = await resp.json();
      if (data.memory) onRecompiled(data.memory);
    } catch (e: any) {
      setError(e.message ?? 'Recompile failed');
    } finally {
      setRecompiling(false);
    }
  };

  if (!memory) {
    return (
      <div className="border border-black/10 bg-white/60 p-4">
        <div className="admin-mono text-[10px] uppercase tracking-[0.2em] text-black/40 mb-2">
          Conversation Memory
        </div>
        <div className="text-sm text-black/50">No memory compiled yet.</div>
        <button
          type="button"
          onClick={handleRecompile}
          disabled={recompiling}
          className="mt-3 border border-[var(--brand-teal-dark)] px-3 py-1.5 admin-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brand-teal-dark)] transition-colors hover:bg-[var(--brand-teal-soft)] disabled:opacity-40"
        >
          {recompiling ? 'Compiling…' : 'Compile →'}
        </button>
        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      </div>
    );
  }

  const grouped = Object.fromEntries(
    ['commitment', 'concern', 'milestone', 'preference', 'context'].map((kind) => [
      kind,
      memory.entries.filter((e) => e.kind === kind),
    ])
  );

  const ts = new Date(memory.compiled_at);
  const ageMs = Date.now() - ts.getTime();
  const stale = ageMs > 24 * 60 * 60 * 1000;

  return (
    <div className="border border-black/10 bg-white/60 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="admin-mono text-[10px] uppercase tracking-[0.2em] text-black/40 mb-1">
            Conversation Memory
          </div>
          <div className="flex items-center gap-3 text-[11px] text-black/50">
            <span>{memory.session_count} session{memory.session_count !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{memory.entries.length} entries</span>
            <span>·</span>
            <span className={stale ? 'text-amber-600' : ''}>
              {stale ? 'Stale — ' : ''}
              {ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRecompile}
          disabled={recompiling}
          className="shrink-0 border border-[var(--brand-teal-dark)] px-3 py-1.5 admin-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brand-teal-dark)] transition-colors hover:bg-[var(--brand-teal-soft)] disabled:opacity-40"
        >
          {recompiling ? 'Recompiling…' : 'Recompile →'}
        </button>
      </div>

      {/* Arc summary */}
      {memory.arc_summary && (
        <div className="border-l-2 border-[var(--brand-teal-dark)] pl-3">
          <div className="admin-mono text-[10px] uppercase tracking-[0.18em] text-black/40 mb-1">Arc</div>
          <p className="text-sm leading-relaxed text-black/70">{memory.arc_summary}</p>
        </div>
      )}

      {/* Entries grouped by kind */}
      {Object.entries(grouped).map(([kind, entries]) =>
        entries.length === 0 ? null : (
          <div key={kind}>
            <div
              className="admin-mono text-[10px] uppercase tracking-[0.18em] mb-2"
              style={{ color: KIND_COLOR[kind] || '#8EA3A7' }}
            >
              {KIND_LABEL[kind] || kind} ({entries.length})
            </div>
            <div className="space-y-1.5">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-sm text-black/70">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 admin-mono text-[9px] uppercase tracking-wider ${WEIGHT_BADGE[entry.weight] || ''}`}
                  >
                    {entry.weight}
                  </span>
                  <span>{entry.body}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
}
