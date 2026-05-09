import React, { useMemo, useState } from 'react';
import { ClientWiki } from '../types';
import { WikiSectionCard } from './WikiSectionCard';

interface WikiAdminPanelProps {
  wiki: ClientWiki | null;
  onRecompile: () => Promise<void>;
  recompiling?: boolean;
}

const isStaleWiki = (wiki: ClientWiki | null) => {
  if (!wiki?.intake_complete) return false;
  const compiledAt = new Date(wiki.compiled_at).getTime();
  if (!Number.isFinite(compiledAt)) return false;
  return Date.now() - compiledAt > 24 * 60 * 60 * 1000;
};

export function WikiAdminPanel({
  wiki,
  onRecompile,
  recompiling = false,
}: WikiAdminPanelProps) {
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const stale = useMemo(() => isStaleWiki(wiki), [wiki]);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-data text-[10px] uppercase tracking-[0.28em] text-brand-teal">
            <span className={`h-1.5 w-1.5 rounded-full bg-brand-teal ${recompiling ? 'animate-pulse' : ''}`} />
            CLIENT KNOWLEDGE // ADMIN VIEW
          </div>
          <h3 className="mt-1 text-xl font-editorial italic text-[#09161a]">
            Compiled Knowledge Panel
          </h3>
          {stale ? (
            <div className="mt-1 font-data text-[10px] uppercase tracking-[0.18em] text-[#D97706]">
              ⚠ Recompile recommended
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void onRecompile()}
          disabled={recompiling}
          className="border border-black/10 bg-white px-3 py-2 font-data text-[10px] uppercase tracking-[0.2em] text-[#09161a] transition-colors hover:border-brand-teal disabled:opacity-55"
        >
          {recompiling ? 'Recompiling…' : 'Recompile →'}
        </button>
      </div>

      {wiki === null ? (
        <WikiSectionCard
          section={{
            key: 'not_yet_calibrated',
            heading: 'Not yet calibrated',
            body: 'Intake has not been completed. Wiki compiles automatically after Smart Start.',
            source_refs: ['intake'],
            compiled_at: new Date().toISOString(),
          }}
          variant="light"
        />
      ) : (
        <div className="space-y-2">
          {wiki.sections.map((section, index) => (
            <button
              key={section.key}
              type="button"
              onClick={() =>
                setFocusedKey((current) => (current === section.key ? null : section.key))
              }
              className="block w-full text-left"
            >
              <WikiSectionCard
                section={section}
                variant="light"
                agentFocused={focusedKey === section.key}
                index={index}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
