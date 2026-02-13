import React from 'react';
import { PlanContent } from '../types';

export function PlanView(props: { plan: PlanContent }) {
  return (
    <div className="space-y-12">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Your Plan</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">72 hours, then a sprint.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          This is timeboxed on purpose. The goal is momentum you can sustain.
        </p>
      </div>

      <section className="border border-black/5 p-6 bg-gray-50">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Next 72 hours</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {props.plan.next_72_hours.map((t) => (
            <div key={t.id} className="bg-white border border-black/5 p-4">
              <div className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Action</div>
              <div className="text-sm text-gray-800 leading-relaxed">{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-black/5 p-6">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Next 2 weeks</div>
        <div className="text-2xl font-editorial italic">{props.plan.next_2_weeks.goal}</div>
        <ul className="mt-6 space-y-2 text-sm text-gray-700 leading-relaxed">
          {props.plan.next_2_weeks.cadence.map((c, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-black/5 p-6 bg-gray-50">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">What I need from you</div>
        <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
          {props.plan.needs_from_you.map((x, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

