import React from 'react';
import { motion } from 'framer-motion';

interface A2UICardProps {
  children: React.ReactNode;
  delay?: number;
  onExit?: () => void;
  className?: string;
}

// Spring config — matches docs/DESIGN.md motion.spring-materialize
const SPRING = { type: 'spring', stiffness: 260, damping: 24, mass: 0.9 } as const;

// Card variants for elevation levels
// 'default' — backdrop-blur card (≥96% bg opacity — prevents teal bleed)
// 'elevated' — solid surface-2 card (no blur, for featured / revealed states)
// 'ghost'    — low-opacity card (deferred / secondary)
export type A2UICardVariant = 'default' | 'elevated' | 'ghost';

const CARD_STYLES: Record<A2UICardVariant, React.CSSProperties> = {
  default: {
    // Background must be ≥ 0.96 opacity — anything lower causes teal bleed
    // through backdrop-filter: blur(8px) from the ambient field
    background: 'rgba(10, 30, 36, 0.96)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--donna-hairline-mid, #22424A)',
    borderLeft: '2px solid var(--donna-accent, #8DD9BF)',
    borderRadius: 0,
    padding: 'var(--space-card-inner, 20px)',
  },
  elevated: {
    background: 'var(--donna-surface-2, #0D2329)',
    border: '1px solid var(--donna-hairline-mid, #22424A)',
    borderLeft: '2px solid var(--donna-accent, #8DD9BF)',
    borderRadius: 0,
    padding: 'var(--space-card-inner, 20px)',
  },
  ghost: {
    background: 'rgba(10, 30, 36, 0.40)',
    backdropFilter: 'blur(4px)',
    border: '1px solid var(--donna-hairline, #1A3640)',
    borderRadius: 0,
    padding: 'var(--space-card-inner, 20px)',
  },
};

interface A2UICardProps {
  children: React.ReactNode;
  delay?: number;
  onExit?: () => void;
  className?: string;
  variant?: A2UICardVariant;
}

export function A2UICard({ children, delay = 0, onExit, className = '', variant = 'default' }: A2UICardProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={{
        hidden: { opacity: 0, scale: 0.96, y: 12 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { ...SPRING, delay: delay / 1000 },
        },
        exit: {
          opacity: 0,
          scale: 0.97,
          y: 0,
          transition: { duration: 0.3, ease: 'easeOut' },
        },
      }}
      onAnimationComplete={(definition) => {
        if (definition === 'exit') onExit?.();
      }}
      style={CARD_STYLES[variant]}
    >
      {children}
    </motion.div>
  );
}
