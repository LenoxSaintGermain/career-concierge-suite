import React from 'react';
import { ReadinessContent } from '../types';

const Section = (props: { title: string; items: string[] }) => (
  <section className="border border-black/5 p-6 bg-gray-50">
    <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">{props.title}</div>
    <ul className="space-y-3 text-sm text-gray-800 leading-relaxed">
      {props.items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="font-mono text-gray-400">{String(index + 1).padStart(2, '0')}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </section>
);

export function ReadinessView(props: { doc: ReadinessContent }) {
  const resourceGuide = Array.isArray((props.doc as any).resource_guide)
    ? ((props.doc as any).resource_guide as string[])
    : [];
  const upgradeCta = String((props.doc as any).upgrade_cta || '').trim();

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">AI Readiness Assessment</div>
          <h2 className="text-4xl md:text-5xl font-editorial leading-none">Module 1 Report.</h2>
          <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
            Calibrated readiness summary that routes the curriculum tier and execution priorities.
          </p>
        </div>
        <div className="border border-brand-teal bg-brand-soft px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-brand-teal mb-1">Tier Route</div>
          <div className="font-editorial italic text-2xl">{props.doc.tier_recommendation}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Executive Overview" items={props.doc.executive_overview} />
        <Section title="From Awareness to Action" items={props.doc.from_awareness_to_action} />
        <Section
          title="Targeted AI Development Priorities"
          items={props.doc.targeted_ai_development_priorities}
        />
        <Section title="Technical Development Areas" items={props.doc.technical_development_areas} />
      </div>

      {resourceGuide.length > 0 && (
        <section className="border border-black/10 bg-white p-6">
          <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal mb-4">Resource Guide</div>
          <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
            {resourceGuide.map((entry) => (
              <li key={entry}>• {entry}</li>
            ))}
          </ul>
          {upgradeCta && (
            <div className="mt-5 border border-brand-teal/30 bg-brand-soft p-4 text-sm text-gray-700">
              {upgradeCta}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
