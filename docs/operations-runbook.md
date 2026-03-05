# Operations Runbook

## Core Services

- API: `career-concierge-api`
- UI: `career-concierge-suite`
- Firebase project: `ssai-f6191`
- Firestore DB: `career-concierge`
- Region: `europe-west1`
- Public API URL: `https://career-concierge-api-tpcap5aa5a-ew.a.run.app`
- Public UI URL: `https://career-concierge-suite-tpcap5aa5a-ew.a.run.app`

## Deploy API

```bash
bash scripts/deploy_api_cloudrun.sh ssai-f6191 europe-west1 .context/deploy/ssai-f6191.api.yaml
```

## Deploy UI

```bash
bash scripts/deploy_ui_cloudrun.sh ssai-f6191 europe-west1 .context/deploy/ssai-f6191.ui.env
```

## Public Access Requirement

Both Cloud Run services are expected to be publicly invocable.
If a deploy succeeds but public requests return `403`, check Cloud Run IAM and organization policy before changing app code.

Current state:

- API public access is working in `ssai-f6191`
- UI public access must be validated after each deploy

## Firestore Rules

Deploy concierge rules with:

```bash
npx -y firebase-tools deploy --only "firestore:career-concierge" --project ssai-f6191
```

## Auth Migration Fallback

Password users requiring reset are derived from `.context/auth-export-ssai.json`.

Dry run:

```bash
npm run auth:resets:dry-run
```

Send reset emails:

```bash
node scripts/send_password_reset_emails.mjs \
  --api-key <ssai-f6191-web-api-key> \
  --send \
  --output .context/password-reset-report.sent.json
```

## Demo Persona Fixture Seeding (MTL-01)

Use deterministic persona fixtures for repeatable E2E and demo runs.
Seeder writes a full hydrated account surface (identity + intake + artifacts + assets + interaction seed).

Sources:

- `config/demo/persona-fixtures.json`
- `docs/mvp/test_user_specs.md`

Dry run (no writes):

```bash
npm run demo:fixtures:seed -- --dry-run --project ssai-f6191 --database-id career-concierge
```

Seed Firestore client docs:

```bash
npm run demo:fixtures:seed -- --project ssai-f6191 --database-id career-concierge
```

Seed Firestore + Firebase Auth users:

```bash
npm run demo:fixtures:seed -- --project ssai-f6191 --database-id career-concierge --auth --password '<temporary-password>'
```

Optional reduction flags:

```bash
--no-artifacts --no-assets --no-interactions --no-intro-seen
```

Output report (default):

- `.context/persona-seed-report.json`

If auth/Firestore calls fail with `invalid_rapt`, refresh local Google auth first:

```bash
gcloud auth login
gcloud auth application-default login
```

## Admin Access

Production admin access depends on API-side `ADMIN_EMAILS` and any future claims strategy.
Keep `ADMIN_EMAILS` populated in the API env file.

Current default admin list in the deploy template includes:

- `lenox.paris@outlook.com`
- `treble.design@gmail.com`
- `lenox@thirdsignal.ai`
- `iamjimbutler@gmail.com`

## CJS Rail + Ledger API Checks

After API deploy, validate these authenticated routes:

- `GET /v1/cjs/assets`
- `POST /v1/cjs/resume/upload`
- `POST /v1/cjs/resume/review`
- `POST /v1/cjs/search/strategy`
- `GET /v1/interactions`
- `POST /v1/interactions/chief-of-staff`
- `POST /v1/interactions/:interactionId/decision` (admin only)

If resume upload is enabled for binary upload, set one of:

- `CCS_STORAGE_BUCKET`
- `STORAGE_BUCKET`
- `FIREBASE_STORAGE_BUCKET`

## High-Risk Failure Modes

### Wrong Source Path During Deploy

- API must deploy from `./api`
- UI must deploy from repo root

If the API is deployed from the wrong source path, Cloud Run may serve the wrong container entirely.

### Wrong Firebase Project

This fork must point to `ssai-f6191`.
Do not reuse `third-signal` frontend config for production.

### Organization Policy Drift

If public access breaks unexpectedly, re-check:

- Cloud Run IAM bindings
- `iam.allowedPolicyMemberDomains`

### Password Login Drift

If imported legacy users cannot log in with their old password, do not assume the import failed.
The likely cause is unrecovered legacy hash parameters from the source project.
Use the reset workflow instead of repeating blind imports.

## Post-Deploy Smoke Checks

- `GET /health`
- `GET /v1/public/config`
- login with a migrated user
- intake persistence
- admin config load
- roadmap + validation tile visibility for signed-in users
- episode generation
- suite generation
- live token generation
- CJS upload/review/strategy flow
- Assets ledger summary + decision flow

## Recommended Release Sequence

1. Deploy API
2. Confirm `/health` and `/v1/public/config`
3. Deploy UI
4. Confirm login
5. Confirm intake write to `clients/{uid}`
6. Confirm Admin loads and saves config
7. Confirm episodes, suite, and live voice surfaces
