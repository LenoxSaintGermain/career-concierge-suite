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
