import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ClientWikiSection } from '../types';
import { WikiSectionCard } from './WikiSectionCard';

const DONNA_SPRING = { type: 'spring', stiffness: 260, damping: 28, mass: 0.8 } as const;

interface WikiDrawerProps {
  sections: ClientWikiSection[];
  focusedKey?: string | null;
  open: boolean;
  onClose: () => void;
}

export function WikiDrawer({
  sections,
  focusedKey = null,
  open,
  onClose,
}: WikiDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={DONNA_SPRING}
          className="fixed bottom-0 left-0 right-0 z-50 max-h-[62vh] overflow-y-auto"
          style={{
            backgroundColor: '#07161A',
            borderTop: '1px solid #22424A',
            boxShadow: '0 -14px 40px rgba(1,12,18,0.32)',
          }}
        >
          <div className="border-b border-[#22424A] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
                  CLIENT KNOWLEDGE // COMPILED
                </div>
                <h3 className="mt-2 text-lg font-editorial italic text-[#DCE7E8]">
                  What I know about you.
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="font-data text-[10px] uppercase tracking-[0.2em] text-[#8EA3A7] transition-colors hover:text-[#DCE7E8]"
              >
                Close ×
              </button>
            </div>
          </div>
          <div className="space-y-3 px-5 py-4">
            <AnimatePresence initial={false}>
              {sections.map((section, index) => (
                <React.Fragment key={section.key}>
                  <WikiSectionCard
                    section={section}
                    variant="dark"
                    agentFocused={focusedKey === section.key}
                    index={index}
                  />
                </React.Fragment>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
