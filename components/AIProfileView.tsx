import React from 'react';
import { AIProfileContent } from '../types';

export function AIProfileView(props: { aiProfile: AIProfileContent }) {
  return (
    <div className="space-y-12">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Your AI Profile</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">How you should use AI.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          This is your operating stance. Less “tools”. More leverage, constraints, and truth.
        </p>
      </div>

      <section className="border border-black/5 p-6">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-3">Positioning</div>
        <div className="text-xl font-editorial italic leading-relaxed">{props.aiProfile.positioning}</div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Use AI for</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.aiProfile.how_to_use_ai.map((x, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Guardrails</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.aiProfile.guardrails.map((x, idx) => (
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

