# Voice Runtime Hardening and External Lanes Spec

## Objective

Harden the default live voice rail for the demo-ready Career Concierge OS so the system can interview, coach, and interact with clients across the suite with high trust and low setup friction.

Current shipping decision:

- `Gemini Live` is the only active real-time voice lane for demo readiness.
- `Sesame` remains visible only as a disabled lane until a dedicated Cloud Run service exists.
- `ElevenLabs` and `Manus AI` are planned integration lanes and remain backlog work until credentials and adapter implementation are available.

## Runtime Decision

For the March 8, 2026 closure pass, the product should optimize for reliability over novelty.

- Use Gemini Live native-audio as the default interview rail.
- Keep audio as the primary response modality.
- Turn on input and output transcription by default so operator and client sessions are inspectable.
- Keep affective dialog, proactive audio, and thinking available in admin, but default them off for the demo posture.
- Keep server-side automatic activity detection on, with explicit admin tuning for interruption policy and VAD thresholds.

## Admin Voice Controls

Admin must expose one ordered voice operating section with:

1. Voice posture presets
2. Voice lane readiness map
3. Active provider selection
4. Model selection
5. Gemini prebuilt voice selection
6. Audio length and tone controls
7. Transcription toggles
8. Affective/proactive/thinking toggles
9. Activity handling and VAD tuning

Notes:

- Gemini voice names should come from the official prebuilt voice catalog, not free-form guessing.
- Sesame must show as explicitly gated off unless the feature flag is enabled.
- ElevenLabs and Manus should appear as planned lanes, not fake-live options.

## Gemini Live Hardening Defaults

Recommended default config for demo readiness:

- `provider`: `gemini_live`
- `enabled`: `false` by default at config level, operator-controlled
- `gemini_live_model`: `gemini-2.5-flash-native-audio-preview-12-2025`
- `gemini_voice_name`: `Aoede`
- `temperature`: `0.82`
- `gemini_input_audio_transcription_enabled`: `true`
- `gemini_output_audio_transcription_enabled`: `true`
- `gemini_affective_dialog_enabled`: `false`
- `gemini_proactive_audio_enabled`: `false`
- `gemini_activity_handling`: `interrupt`
- `gemini_thinking_enabled`: `false`
- `gemini_thinking_budget`: `0`
- `live_vad_silence_ms`: `380`
- `live_vad_prefix_padding_ms`: `120`
- `live_vad_start_sensitivity`: `high`
- `live_vad_end_sensitivity`: `high`

## Persona Testing Requirement

Sample personas must support manual email/password login in addition to one-click admin launch.

- Shared demo password: `CareerDemo!2026`
- Sample persona reseed must reset that password every time.
- Admin validation should surface the shared password in the persona harness for operator use.

## Future Lanes

### ElevenLabs

Best initial use:

- premium fallback voice synthesis
- polished outbound narration and guided coaching moments
- admin-selectable voice identity profiles

Implementation lane:

- adapter-backed synthesis service
- credential storage in admin config / secret manager
- voice catalog sync
- provider health and fallback policy

### Manus AI

Best initial use:

- operator-side research and workflow execution assistance
- high-context prep for interviews, search strategy, and concierge follow-up
- non-canonical assistant lane, not primary user-memory system

Implementation lane:

- operator tool adapter
- controlled task scopes
- explicit ledger writes back into Firestore
- dry-run and approval discipline

## Acceptance Criteria

- `AC-1`: Gemini Live is the default active voice lane and no longer silently falls back to Sesame.
- `AC-2`: Admin exposes official Gemini voice-name options and advanced live-session tuning controls.
- `AC-3`: Gemini Live tokens include transcription and activity-handling settings from admin config.
- `AC-4`: Live panel can display transcript updates from input and output transcription events.
- `AC-5`: Sesame remains feature-flagged off by default and cannot be selected unless explicitly enabled.
- `AC-6`: Sample personas support a shared default password for direct manual testing.
- `AC-7`: ElevenLabs and Manus are documented as queued lanes with scoped stories and operator-first use cases.

## Positive Tests

- Enable voice with `Gemini Live`, start a session, and confirm token response reflects active transcription settings.
- Speak into Gemini Live and confirm transcript updates capture user and concierge turns.
- Reseed a sample persona and confirm login works with the shared demo password.
- Open Admin and confirm Gemini, ElevenLabs, Sesame, and Manus appear as distinct runtime lanes with correct state labels.

## Negative Tests

- Disable voice globally and confirm `/v1/live/token` returns `voice_disabled`.
- Set provider to `sesame` while the Sesame flag is off and confirm the runtime still resolves to `gemini_live`.
- Attempt to use an unsupported Gemini voice name and confirm config normalization falls back to the default official voice.
- Confirm ElevenLabs and Manus do not appear as active runtime providers before their integrations exist.

## Sources

- Google Live API overview: https://ai.google.dev/gemini-api/docs/live
- Google Live API capabilities: https://ai.google.dev/gemini-api/docs/live/capabilities
- Google Live API session management: https://ai.google.dev/gemini-api/docs/live/session-management
- ADK streaming guide: https://google.github.io/adk-docs/streaming/
- ADK bidi demo sample: https://github.com/google/adk-samples/tree/main/python/agents/bidi-demo
