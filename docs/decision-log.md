# Decision Log

## 2026-03-04

### Career Concierge OS is the production fork

Signal Atlas remains the conceptual and design ancestor.
Career Concierge OS is the canonical operational product for this repo.

Implication:

- docs, deploys, and infrastructure must optimize for Career Concierge OS first

### Canonical production project is `ssai-f6191`

The production Firebase and GCP target for this fork is `ssai-f6191`.

Implication:

- frontend Firebase config
- Cloud Run deploys
- Firestore rules
- migration notes

must point to `ssai-f6191` unless intentionally changed and documented.

### Firestore database ID remains `career-concierge`

The database identifier is retained through the migration rather than renamed.

Implication:

- code paths and deploy scripts keep the current database ID
- runbooks should assume `career-concierge`

### Public Cloud Run remains the chosen web architecture

The SPA and mobile clients are expected to reach the API over public HTTPS.
Application auth is enforced inside the API and frontend rather than through private ingress.

Implication:

- Cloud Run IAM and org policy are part of the release checklist

### Password reset is the operational fallback for legacy password users

The source legacy password hash settings were not recovered through the available admin config path.

Implication:

- password reset workflow is the supported fallback for affected imported users

### Documentation is a release artifact

Documentation is not optional cleanup after implementation.
If production behavior changes, matching docs must change in the same work.

Implication:

- `README.md`
- `docs/career-concierge-fork.md`
- `docs/career-concierge-os.md`
- `docs/operations-runbook.md`
- `docs/ssai-production-migration.md`
- `docs/decision-log.md`
- `docs/documentation-map.md`

must be treated as part of the product surface

## 2026-03-05

### Admin roadmap module is a first-class OS surface

The suite now includes an admin-only `Roadmap` module as the final grid tile.
It visualizes MVP delivery as node-based sprint phases rather than a static text checklist.

Implication:

- roadmap state must be maintained continuously
- admin operators can validate delivery posture directly in-product

### Progress log is the roadmap source of truth

`docs/progress-log.md` is now required for delivery passes.
The roadmap module should mirror this log to avoid drift between visuals and actual implementation.

Implication:

- each implementation pass must include a progress-log update

### Backlog ledger is required for story status and execution audit trail

`docs/backlog-ledger.md` is now the canonical tracker for end-to-end story status and pass-by-pass execution rows.

Implication:

- each implementation pass must include a backlog-ledger update
- roadmap/status communication should align with backlog-ledger entries

### Roadmap validation surface is visible to signed-in users

The roadmap module now serves as a shared in-app validation guide.
It is no longer hidden behind frontend admin gating.

Implication:

- teams can confirm epic/story test focus directly in-product
- backend admin authorization remains enforced only at protected API routes

### Deterministic persona fixtures are the demo baseline

The demo test users are now codified as fixtures and seeded through a repeatable script.

Implication:

- use `config/demo/persona-fixtures.json` as the canonical persona payload source
- use `api/scripts/seed_persona_fixtures.mjs` for dry-run and write runs
- avoid ad-hoc manual client document creation for demo personas

### CJS execution rail is now API-backed, not placeholder-only UI

ConciergeJobSearch now ships with real backend routes for resume upload, resume review, and strategy generation.

Implication:

- TU2 path can be validated end-to-end in product
- CJS data now persists under `clients/{uid}/assets` and `clients/{uid}/artifacts`

### Chief of Staff summary log uses interaction ledger as canonical trail

Chief of Staff outputs are persisted in `clients/{uid}/interactions` with optional `pending_approval` status.

Implication:

- investor/demo audit trail is now directly queryable
- approval state can be surfaced in-product

### Free-tier users are constrained by module visibility and intake scope

Free-tier (`free_foundation_access`) now uses a constrained module graph and a shortened intake path.

Implication:

- TU4 journey now matches spec intent (limited artifacts + upgrade pathway)
- paid-tier-only modules are hidden for free users at suite-home level

### Admin approvals must be cross-user, not self-scoped

Approval queue actions are operational controls, not personal client actions.
They must work across clients from an admin-wide surface.

Implication:

- admin approval endpoints cannot be keyed off `req.user.uid`
- interaction ledger items must carry client identity metadata for queue handling
