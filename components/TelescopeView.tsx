import React, { useMemo } from 'react';
import { ClientDoc, SuiteModuleId } from '../types';

type Props = {
  client: ClientDoc | null;
  onOpenModule: (id: SuiteModuleId) => void;
};

export function TelescopeView({ client, onOpenModule }: Props) {
  const horizons = useMemo(() => {
    const answers = client?.intake?.answers ?? {};
    const current = String(answers.current_title || answers.current_or_target_job_title || 'Current role');
    const target = String(answers.target || answers.current_or_target_job_title || 'Next role');
    return [
      {
        label: 'Now',
        title: 'Immediate leverage lane',
        detail: `Use ${current} context to build stronger proof in the next 30 days.`,
        nextModule: 'plan' as SuiteModuleId,
      },
      {
        label: 'Near',
        title: 'Adjacent role horizon',
        detail: `Translate your current signal into ${target} language with one visible win and one sharper narrative.`,
        nextModule: client?.intent === 'target_role' ? ('cjs_execution' as SuiteModuleId) : ('episodes' as SuiteModuleId),
      },
      {
        label: 'Later',
        title: 'Longer-arc market watch',
        detail: 'Track role clusters, leadership expectations, and skill signals without turning this into a noisy job board.',
        nextModule: 'episodes' as SuiteModuleId,
      },
    ];
  }, [client]);

  if (!client) {
    return <div className="border border-black/10 bg-[#fbf8f2] p-6 text-sm text-black/55">Complete intake to map opportunity horizons.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-teal mb-3">Telescope</div>
        <h2 className="text-3xl md:text-4xl font-editorial leading-tight">A horizon view for what is next, near, and later.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/60">
          Telescope is not a generic job board. It is an adjacent-role and signal horizon that links back into Plan, Episodes, or CJS when action is needed.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {horizons.map((horizon) => (
          <article key={horizon.label} className="border border-black/10 bg-[#fbf8f2] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-brand-teal">{horizon.label}</div>
            <h3 className="mt-3 text-2xl font-editorial leading-tight">{horizon.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-black/60">{horizon.detail}</p>
            <button
              type="button"
              onClick={() => onOpenModule(horizon.nextModule)}
              className="mt-5 px-4 py-3 btn-brand text-[10px] uppercase tracking-[0.22em]"
            >
              Open supporting module
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
