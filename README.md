<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1VcFeL_HCD12ewu1TzOhOVejmCorbG5Dh

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Voice Engine (Provider Toggle)

The onboarding flow now supports concierge voice playback through `POST /v1/voice/synthesize` on the Cloud Run API.

Provider options in Admin Console:

- `sesame` (external endpoint such as Cerebrium)
- `gemini_live` (Gemini Live API through your existing `GEMINI_API_KEY`)

Set these on the API service for `sesame`:

- `SESAME_API_URL` (for example a Cerebrium `.../generate_audio` endpoint)
- `SESAME_API_KEY` (if your endpoint requires bearer auth)
- Optional:
  - `SESAME_AUTH_HEADER` (default: `Authorization`)
  - `SESAME_AUTH_PREFIX` (default: `Bearer `)
  - `SESAME_TIMEOUT_MS` (default: `45000`)

Set these on the API service for `gemini_live` (optional overrides):

- `GEMINI_MODEL_LIVE_VOICE` (default: `gemini-2.5-flash-native-audio-preview-12-2025`)
- `GEMINI_VOICE_NAME` (default: `Aoede`)
- `GEMINI_LIVE_TIMEOUT_MS` (default: `30000`)

Then in the app Admin Console, configure:

- `Voice Engine -> enabled`
- `Voice Engine -> provider` (`sesame` or `gemini_live`)
- Provider-specific route/model values
- Speaker / max length / temperature / narration style

## Production Migration

For the clean move into a new GCP/Firebase project, use:

- `docs/ssai-production-migration.md`
- `scripts/bootstrap_prod_project.sh`
- `scripts/deploy_api_cloudrun.sh`
- `scripts/deploy_ui_cloudrun.sh`
- `scripts/migrate_firestore_between_projects.sh`

The frontend Firebase config is now environment-driven through `VITE_FIREBASE_*` variables instead of being fixed to a single project.
