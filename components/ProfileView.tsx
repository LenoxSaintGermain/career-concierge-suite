import React from 'react';
import { ProfileContent } from '../types';

export function ProfileView(props: { profile: ProfileContent }) {
  return (
    <div className="space-y-12">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Your Profile</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">Professional DNA.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          Not a personality test. A working profile: patterns you can exploit on purpose.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Strengths</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.profile.strengths.map((x, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Patterns</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.profile.patterns.map((x, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Leverage</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.profile.leverage.map((x, idx) => (
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

