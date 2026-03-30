# End-to-End Test Plan: Ghost + GWS Integration

**Date**: 2026-03-29  
**Service**: `signal-atlas`  
**Region**: `europe-west1`  
**Service URL**: `https://signal-atlas-480846059254.europe-west1.run.app`

## Current Test Status

This document now reflects the latest verified state instead of the original empty checklist.

- Journey 1 `Ghost Webhook Tools`: verified against the live service
- Journey 2 `GWS Document Sync`: verified against the live service and Firestore registry
- Journey 3 `Ghost Voice Agent`: browser/manual validation still required
- Journey 4 `Edge Cases`: partial negative-path validation complete

Use environment variables for sensitive values during manual reruns:

```bash
export SIGNAL_ATLAS_URL="https://signal-atlas-480846059254.europe-west1.run.app"
export GHOST_SECRET="<ghost-webhook-secret>"
export REAL_USER_UID="<firebase-uid>"
export FIREBASE_ID_TOKEN="<firebase-id-token>"
```

## Pre-Test Checklist

- [x] Cloud Run service is healthy
- [x] Ghost/GWS env configuration is present in production
- [x] ElevenLabs agent is configured with Ghost client/server tools
- [x] Real test user exists in Firestore with artifacts populated
- [x] Google Drive folder structure exists for synced artifact publishing

## Journey 1: Ghost Webhook Tools

### Verified Results

- [x] `fetch_briefing` rejects missing `uid` with `400 missing_uid`
- [x] `fetch_briefing` responds for a real user
- [x] `fetch_artifact` returns live artifact payloads for the real user
- [x] `fetch_drive_documents` returns a graceful empty-state response for a user with no folder
- [x] `fetch_drive_documents` returns live Google Docs for the real user
- [x] `GET /v1/ghost/tools` behavior is covered by the deployed tool manifest and service readiness checks

### Notes

- The earlier `Candidate: Unknown` issue was not a broken tool path. It was a client-identity fallback problem.
- The service successfully fetched artifacts and Drive documents for the real production test user once the correct UID was used.
- This pass hardens Ghost so it no longer surfaces raw backend identifiers in the briefing when a human-readable name is unavailable.

### Re-run Commands

```bash
curl -s -X POST "$SIGNAL_ATLAS_URL/v1/ghost/briefing" \
  -H "Content-Type: application/json" \
  -H "X-Ghost-Secret: $GHOST_SECRET" \
  -d "{\"uid\":\"$REAL_USER_UID\"}"

curl -s -X POST "$SIGNAL_ATLAS_URL/v1/ghost/artifact" \
  -H "Content-Type: application/json" \
  -H "X-Ghost-Secret: $GHOST_SECRET" \
  -d "{\"uid\":\"$REAL_USER_UID\",\"type\":\"profile\"}"

curl -s -X POST "$SIGNAL_ATLAS_URL/v1/ghost/drive" \
  -H "Content-Type: application/json" \
  -H "X-Ghost-Secret: $GHOST_SECRET" \
  -d "{\"uid\":\"$REAL_USER_UID\"}"
```

## Journey 2: GWS Document Sync

### Verified Results

- [x] Real user Drive folder exists and is cached on the Firestore client document
- [x] `sync-docs` completed successfully for the real user
- [x] Eight artifact docs were synced with `0` errors
- [x] `doc_registry` entries exist and are marked `synced`
- [x] Drive listing returns the synced Google Docs

### Notes

- The live sync summary for the verified production test user was `8 synced / 0 errors`.
- This refinement pass removes raw UID fallback from user-facing document names and `Prepared for` headers.
- Server-side identity hydration now attempts to backfill `display_name` and `email` from Firebase Auth when the Firestore client document is sparse.

### Re-run Command

```bash
curl -s -X POST "$SIGNAL_ATLAS_URL/v1/ghost/sync-docs" \
  -H "Content-Type: application/json" \
  -H "X-Ghost-Secret: $GHOST_SECRET" \
  -d "{\"uid\":\"$REAL_USER_UID\"}"
```

## Journey 3: Ghost Voice Agent

### Manual Browser Validation Still Required

- [ ] Admin `Voice model`, `Provider`, and `Public intake lane` stay in sync between ElevenLabs Ghost and Gemini audio fallback
- [ ] ElevenLabs signed session route succeeds for the signed-in user
- [ ] SDK panel loads for the signed-in user
- [ ] Dynamic user context is passed into the Ghost session
- [ ] Structured current-section / visible-field context is sent after the session connects
- [ ] Donna greets the user with a human-readable name or generic client-safe fallback
- [ ] `navigate_module` works from voice
- [ ] `close_module` works from voice
- [ ] `toggle_admin` works from voice
- [ ] `dispatch_agent` confirms before action
- [ ] `update_stance` confirms before action
- [ ] `address_gap` updates the UI correctly
- [ ] `jump_intake_screen` moves between Smart Start screens
- [ ] `focus_intake_field` visibly orients the user to the current field
- [ ] `set_intake_text_field` writes into text inputs
- [ ] `set_intake_choice_field` updates a single-choice intake value
- [ ] `set_intake_multi_field` updates multi-select choices without duplicating entries
- [ ] `set_intake_boolean_field` updates boolean intake state
- [ ] `clear_intake_field` removes a previously set value safely
- [ ] `set_intake_intent` changes the route without drifting the rest of the form
- [ ] `set_support_preference` changes pace/focus preferences
- [ ] `summarize_intake_state` reflects the current intake form accurately
- [ ] `fetch_artifact` responses cite the live artifact content
- [ ] `fetch_drive_documents` responses cite the live Drive docs
- [ ] the guided section nav makes it obvious where the live lane is currently working
- [ ] only one intake section is visible at a time during the voice-guided flow
- [ ] field focus visibly pulls the user to the correct section instead of leaving the form visually ambiguous
- [ ] submitting intake cleanly locks the live lane and holds the user in processing until artifacts are ready

### Demo Focus

When this journey is run manually, the success bar is:

1. no raw UIDs spoken or rendered
2. human-readable naming in the greeting and fetched-doc references
3. the admin lane switch between Gemini and ElevenLabs actually changes the live intake experience
4. ElevenLabs can complete meaningful intake data entry by voice without collapsing into transcript theater
5. artifact/doc retrieval feels immediate and grounded in real data

## Journey 4: Error Handling & Edge Cases

### Verified Negative Paths

- [x] Missing `uid` returns `400 missing_uid`
- [x] User with no Drive folder gets a graceful empty-state message

### Still Worth Manual Regression

- [ ] invalid webhook secret rejection
- [ ] deleted client Drive folder recovery
- [ ] malformed artifact content sync failure recording
- [ ] concurrent suite generation collision handling

## Post-Test Summary

| Journey | Status | Summary |
|---|---|---|
| 1. Ghost Webhooks | Verified | Live webhook endpoints return expected data and error states |
| 2. GWS Doc Sync | Verified | Real user docs sync and list correctly; registry is healthy |
| 3. Ghost Voice Agent | Pending manual UI pass | Needs browser/demo validation against signed-in Gemini and ElevenLabs intake flows plus admin lane switching |
| 4. Error Handling | Partially verified | Core negative paths confirmed; broader chaos testing still open |

## Issues Found

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | Ghost/GWS could fall back to raw UID when client identity fields were sparse | High | Fixed in code |
| 2 | Earlier test-plan draft embedded the webhook secret directly in examples | High | Fixed in docs |
| 3 | Voice/browser interaction coverage was implied but not actually recorded | Medium | Explicitly marked manual/pending |
| 4 | Gemini versus ElevenLabs lane switching was previously able to drift because different saved config fields could disagree | High | Fixed in code; manual browser validation still required |
| 5 | Smart Start exposed a client-visible lane chooser and too many simultaneous form sections, which made live voice guidance ambiguous | High | Fixed in code; manual browser validation still required |

## Sign-Off

- [x] Server-side webhook and doc-sync paths verified
- [x] Firestore `doc_registry` verification completed
- [ ] Browser voice UX validated end to end after latest identity cleanup
- [ ] Demo sign-off after manual Gemini + ElevenLabs intake pass, including admin lane switching and ElevenLabs voice-led field entry
