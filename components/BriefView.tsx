import React from 'react';
import { BriefContent } from '../types';

export function BriefView(props: {
  brief: BriefContent;
  onOpenPlan: () => void;
}) {
  return (
    <div className="space-y-12">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">The Brief</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">Your suite, distilled.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          Start here. This is the “golden plate”: what I learned, what matters most, and what to do next.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">What I learned</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.brief.learned.map((x, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">What moves the needle</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.brief.needle.map((x, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="border border-black/5 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-50">Next 72 hours</div>
            <div className="text-xl font-editorial italic mt-2">Momentum without chaos.</div>
          </div>
          <button
            onClick={props.onOpenPlan}
            className="px-5 py-3 bg-black text-white text-xs uppercase tracking-[0.25em] hover:bg-black/90 transition-colors"
          >
            Open Your Plan
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {props.brief.next_72_hours.map((t) => (
            <div key={t.id} className="bg-gray-50 border border-black/5 p-4">
              <div className="text-[9px] uppercase tracking-widest opacity-50 mb-2">Action</div>
              <div className="text-sm text-gray-800 leading-relaxed">{t.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

