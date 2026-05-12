import type { AppConfig } from '../types';

export const DEFAULT_DONNA_CONFIG: AppConfig['donna'] = {
  voice_first_default: true,
  auto_start_live: true,
  opening_turn_text:
    'Open the Smart Start session now. Greet the client briefly in one sentence, then ask the single best first question for the currently visible section. Do not wait for the client to speak first.',
  composer_mode: 'voice_first',
  live_dock_detail_level: 'standard',
  suite_escape_visible: true,
  workflow_routing_posture: 'agentic',
  visual_theme_intensity: 'quiet',
  operator_diagnostics_visible: true,
};
