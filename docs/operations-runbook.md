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

## Admin Access

Production admin access depends on API-side `ADMIN_EMAILS` and any future claims strategy.
Keep `ADMIN_EMAILS` populated in the API env file.

Current default admin list in the deploy template includes:

- `lenox.paris@outlook.com`
- `treble.design@gmail.com`
- `lenox@thirdsignal.ai`
- `iamjimbutler@gmail.com`

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
- episode generation
- suite generation
- live token generation

## Recommended Release Sequence

1. Deploy API
2. Confirm `/health` and `/v1/public/config`
3. Deploy UI
4. Confirm login
5. Confirm intake write to `clients/{uid}`
6. Confirm Admin loads and saves config
7. Confirm episodes, suite, and live voice surfaces
