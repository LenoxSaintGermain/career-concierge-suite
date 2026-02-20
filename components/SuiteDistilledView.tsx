import React from 'react';
import { SuiteDistilledContent } from '../types';

export function SuiteDistilledView(props: { doc: SuiteDistilledContent }) {
  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Your Suite, Distilled</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">Strategic map.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          Two-column briefing output: what is true now and what must happen next.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">What I learned</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.doc.what_i_learned.map((item, index) => (
              <li key={index} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(index + 1).padStart(2, '0')}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-black/5 p-6 bg-gray-50">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">What needs to happen</div>
          <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
            {props.doc.what_needs_to_happen.map((item, index) => (
              <li key={index} className="flex gap-3">
                <span className="font-mono text-gray-400">{String(index + 1).padStart(2, '0')}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="border border-black/5 p-6">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Next to do</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {props.doc.next_to_do.map((task) => (
            <div key={task.id} className="bg-gray-50 border border-black/5 p-4">
              <div className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Action</div>
              <div className="text-sm text-gray-800 leading-relaxed">{task.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
