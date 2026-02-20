import React from 'react';
import { CjsExecutionContent } from '../types';

const statusTone: Record<string, string> = {
  ready: 'text-brand-teal',
  planned: 'text-black/60',
  blocked: 'text-red-700',
};

export function CjsExecutionView(props: { doc: CjsExecutionContent }) {
  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">ConciergeJobSearch</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">Execution rail.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          The job-search execution arm runs after Smart Start intake. Client sets intent; system handles execution.
        </p>
      </div>

      <section className="border border-black/5 p-6 bg-gray-50">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-3">Intent Summary</div>
        <div className="text-lg font-editorial italic">{props.doc.intent_summary}</div>
      </section>

      <section className="border border-black/5 p-6">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Process Steps</div>
        <div className="space-y-3">
          {props.doc.stages.map((stage) => (
            <div
              key={stage.step}
              className="grid grid-cols-[72px_1fr] md:grid-cols-[84px_220px_1fr] gap-3 border border-black/5 bg-gray-50 p-4"
            >
              <div className="font-mono text-xs opacity-50">Step {String(stage.step).padStart(2, '0')}</div>
              <div className="text-sm font-medium">{stage.title}</div>
              <div className="space-y-1">
                <div className={`text-[10px] uppercase tracking-[0.18em] ${statusTone[stage.status] || 'text-black/60'}`}>
                  {stage.status}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{stage.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
