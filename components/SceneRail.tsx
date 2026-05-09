import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type DonnaScene = 'arrival' | 'calibration' | 'co_design';

interface SceneRailProps {
  scene: DonnaScene;
}

const SCENE_COPY: Record<DonnaScene, { id: string; label: string; copy: string }> = {
  arrival: {
    id: 'SCENE 01',
    label: 'ARRIVAL',
    copy: 'The first conversation is not the beginning. It is the entrance.',
  },
  calibration: {
    id: 'SCENE 02',
    label: 'CALIBRATION',
    copy: 'Signal is clarified, not captured. We listen for what you already know.',
  },
  co_design: {
    id: 'SCENE 03',
    label: 'CO·DESIGN',
    copy: 'What appears is a response to what you brought. Nothing is pre-built.',
  },
};

export function SceneRail({ scene }: SceneRailProps) {
  const active = SCENE_COPY[scene];

  return (
    <div className="pointer-events-none fixed right-[-210px] top-1/2 z-20 hidden w-[460px] -translate-y-1/2 rotate-90 items-center gap-4 lg:flex">
      <AnimatePresence mode="wait">
        <motion.div
          key={scene}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex items-center gap-4 font-data uppercase tracking-[0.24em]"
        >
          <span className="text-[8px] text-[#8EA3A7]/25">{active.id}</span>
          <span className="text-[9px] text-[#8EA3A7]/40">{active.label}</span>
          <span className="max-w-[260px] text-[9px] normal-case tracking-[0.12em] text-[#8EA3A7]/35">
            {active.copy}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
