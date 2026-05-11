import React from 'react';
import { motion } from 'framer-motion';
import { A2UICard } from './A2UICard';

type PackageId = 'smart_start' | 'premier' | 'cjs' | 'concierge';

interface PackageSelectCardsProps {
  onSelect: (packageId: PackageId) => void;
  onAskDonna?: () => void;
}

const packages: Array<{
  id: PackageId;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  delay: number;
}> = [
  {
    id: 'smart_start',
    eyebrow: 'SMART START',
    title: 'Smart Start',
    body: 'The calibration session. A 10-minute guided conversation that maps your professional DNA and stages your entire suite.',
    cta: 'Begin Smart Start →',
    delay: 0,
  },
  {
    id: 'premier',
    eyebrow: 'SKILLSYNC AI PREMIER',
    title: 'SkillSync Ai Premier',
    body: 'End-to-end career infrastructure. Brief, plan, DNA dossier, live concierge, and ongoing strategic alignment.',
    cta: 'Explore Premier →',
    delay: 80,
  },
  {
    id: 'cjs',
    eyebrow: 'CONCIERGE JOB SEARCH',
    title: 'Concierge Job Search',
    body: 'Dedicated placement strategy with search execution, artifact optimization, and weekly concierge coordination.',
    cta: 'Explore CJS →',
    delay: 160,
  },
  {
    id: 'concierge',
    eyebrow: 'MYCONCIERGE',
    title: 'MyConcierge',
    body: 'Ongoing human career partner support for navigation, decisions, accountability, and strategic operating rhythm.',
    cta: 'Explore MyConcierge →',
    delay: 240,
  },
];

export function PackageSelectCards({ onSelect, onAskDonna }: PackageSelectCardsProps) {
  return (
    <motion.div
      className="space-y-3"
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.3, ease: 'easeOut' } }}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {packages.map((item) => (
          <React.Fragment key={item.id}>
            <A2UICard delay={item.delay} className="flex h-full flex-col">
              <div className="font-data text-[9px] uppercase tracking-[0.28em] text-[#8DD9BF]">
                {item.eyebrow}
              </div>
              <h3 className="mt-3 font-editorial text-2xl italic text-[#DCE7E8]">
                {item.title}
              </h3>
              <p className="mt-3 flex-1 font-body text-sm leading-6 text-[#8EA3A7]">
                {item.body}
              </p>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="mt-5 border border-[#8DD9BF]/70 px-3 py-2 text-left font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10"
                style={{ borderRadius: 0 }}
              >
                {item.cta}
              </button>
            </A2UICard>
          </React.Fragment>
        ))}
      </div>
      <button
        type="button"
        onClick={onAskDonna}
        className="font-data text-[10px] uppercase tracking-[0.22em] text-[#8EA3A7]/60 transition-colors hover:text-[#DCE7E8]"
      >
        Not sure which fits? Ask me.
      </button>
    </motion.div>
  );
}
