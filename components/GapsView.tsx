import React from 'react';
import { GapsContent } from '../types';

export function GapsView(props: { gaps: GapsContent }) {
  return (
    <div className="space-y-12">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Your Gaps</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">What to tighten.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          This is not a list of flaws. It’s the shortest set of gaps that unlocks the next level.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Near-term</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.gaps.near_term.map((x, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">For your target role</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.gaps.for_target_role.map((x, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Constraints</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.gaps.constraints.map((x, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

