import React from 'react';
import { motion } from 'framer-motion';
import { ClientWikiSection } from '../types';

const DONNA_SPRING = { type: 'spring', stiffness: 260, damping: 28, mass: 0.8 } as const;
const SECTION_STAGGER = 0.055;
const CARD_ENTER = { opacity: 0, y: 8 };
const CARD_EXIT = { opacity: 0, y: -6 };

interface WikiSectionCardProps {
  section: ClientWikiSection;
  variant: 'light' | 'dark';
  agentFocused?: boolean;
  index?: number;
}

const formatCompiledAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function WikiSectionCard({
  section,
  variant,
  agentFocused = false,
  index = 0,
}: WikiSectionCardProps) {
  const dark = variant === 'dark';
  const eyebrowColor = dark ? '#8DD9BF' : '#5FAF95';
  const cardStyle: React.CSSProperties = dark
    ? {
        backgroundColor: '#0D2329',
        border: `1px solid ${agentFocused ? '#314F56' : '#22424A'}`,
        borderLeft: '2px solid #8DD9BF',
        color: '#DCE7E8',
        boxShadow: agentFocused ? '0 0 0 3px rgba(141,217,191,0.12)' : 'none',
      }
    : {
        backgroundColor: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(0,0,0,0.09)',
        borderLeft: '2px solid #8DD9BF',
        color: '#28211E',
        boxShadow: agentFocused ? '0 0 0 3px rgba(141,217,191,0.12)' : 'none',
      };

  return (
    <motion.div
      initial={CARD_ENTER}
      animate={{ opacity: 1, y: 0 }}
      exit={CARD_EXIT}
      transition={{ ...DONNA_SPRING, delay: index * SECTION_STAGGER }}
      className="space-y-2 px-4 py-3 text-left"
      style={cardStyle}
    >
      <div
        className="font-data text-[10px] uppercase tracking-[0.28em]"
        style={{ color: eyebrowColor }}
      >
        {section.key.toUpperCase()} // {section.source_refs.join(', ').toUpperCase()}
      </div>
      {section.heading ? (
        <div className={`font-editorial italic ${dark ? 'text-base' : 'text-[17px]'}`}>
          {section.heading}
        </div>
      ) : null}
      <div
        className="text-sm leading-7"
        style={{ color: dark ? '#DCE7E8' : 'rgba(40,33,30,0.68)' }}
      >
        {section.body}
      </div>
      {!dark ? (
        <div className="font-data text-[10px] uppercase tracking-[0.18em] opacity-40">
          COMPILED {formatCompiledAt(section.compiled_at)}
        </div>
      ) : null}
    </motion.div>
  );
}
