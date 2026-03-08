export const DEMO_PERSONA_SHARED_PASSWORD = 'CareerDemo!2026';

export const GEMINI_LIVE_MODEL_OPTIONS = [
  {
    id: 'gemini-2.5-flash-native-audio-preview-12-2025',
    label: 'Gemini 2.5 Flash Native Audio',
    note: 'Current recommended Gemini Live native-audio preview model.',
  },
];

export const GEMINI_LIVE_VOICE_OPTIONS = [
  { name: 'Zephyr', tone: 'Bright' },
  { name: 'Puck', tone: 'Upbeat' },
  { name: 'Charon', tone: 'Informative' },
  { name: 'Kore', tone: 'Firm' },
  { name: 'Fenrir', tone: 'Excitable' },
  { name: 'Leda', tone: 'Youthful' },
  { name: 'Orus', tone: 'Firm' },
  { name: 'Aoede', tone: 'Breezy' },
  { name: 'Callirrhoe', tone: 'Easy-going' },
  { name: 'Autonoe', tone: 'Bright' },
  { name: 'Enceladus', tone: 'Breathy' },
  { name: 'Iapetus', tone: 'Clear' },
  { name: 'Umbriel', tone: 'Easy-going' },
  { name: 'Algieba', tone: 'Smooth' },
  { name: 'Despina', tone: 'Smooth' },
  { name: 'Erinome', tone: 'Clear' },
  { name: 'Algenib', tone: 'Gravelly' },
  { name: 'Rasalgethi', tone: 'Informative' },
  { name: 'Laomedeia', tone: 'Upbeat' },
  { name: 'Achernar', tone: 'Soft' },
  { name: 'Alnilam', tone: 'Firm' },
  { name: 'Schedar', tone: 'Even' },
  { name: 'Gacrux', tone: 'Mature' },
  { name: 'Pulcherrima', tone: 'Forward' },
  { name: 'Achird', tone: 'Friendly' },
  { name: 'Zubenelgenubi', tone: 'Casual' },
  { name: 'Vindemiatrix', tone: 'Gentle' },
  { name: 'Sadachbia', tone: 'Lively' },
  { name: 'Sadaltager', tone: 'Knowledgeable' },
  { name: 'Sulafat', tone: 'Warm' },
];

export const VOICE_RUNTIME_LANES = [
  {
    id: 'gemini_live',
    label: 'Gemini Live',
    state: 'active',
    summary: 'Default live interview and concierge voice rail for the OS.',
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    state: 'planned',
    summary: 'Secondary premium voice lane once credentials and adapter work are implemented.',
  },
  {
    id: 'sesame',
    label: 'Sesame',
    state: 'disabled',
    summary: 'Held behind a feature flag until the dedicated Cloud Run service is deployed.',
  },
  {
    id: 'manus',
    label: 'Manus AI',
    state: 'planned',
    summary: 'Future operator-assisted interview and workflow automation lane.',
  },
];
