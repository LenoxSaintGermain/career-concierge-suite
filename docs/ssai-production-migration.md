# SSAI Production Migration

Target project:

- Project ID: `ssai-f6191`
- Region: `europe-west1`
- Firestore DB ID: `career-concierge`

## Required access

The operator running these commands must have access to both:

- source project: `third-signal`
- target project: `ssai-f6191`

Required roles are effectively:

- `roles/run.admin`
- `roles/cloudbuild.builds.editor`
- `roles/artifactregistry.admin` or sufficient write access
- `roles/serviceusage.serviceUsageAdmin`
- `roles/datastore.owner` or sufficient Firestore admin/import-export access
- `roles/firebase.admin`
- `roles/iam.serviceAccountUser`
- `roles/secretmanager.admin` if using Secret Manager

## Current project status

- Firebase project exists: `ssai-f6191`
- Firebase web app exists: `1:480846059254:web:6e62fc367e14d79acdbed7`
- Firestore database exists: `career-concierge` in `europe-west1`
- Firestore rules are deployed
- Firestore data has been copied from `third-signal`
- Billing is attached
- API service is deployed at `https://career-concierge-api-tpcap5aa5a-ew.a.run.app`
- API service public invoker access is enabled and verified
- UI service is deployed at `https://career-concierge-suite-tpcap5aa5a-ew.a.run.app`
- Auth users import runs successfully
- A reset workflow is prepared for the 15 email/password users whose source password hash settings were not recoverable through the source admin config API

## Remaining blockers

- Source deploys required granting the project compute service account `roles/storage.objectViewer`, `roles/artifactregistry.writer`, and `roles/logging.logWriter`.
- Password-based users need either a hash-parameter-aware re-import or password reset emails. The repo now includes a reset-mailer workflow for that fallback path.
- UI deploy and final cutover validation still need to be completed in `ssai-f6191`.

## 1. Bootstrap the target project

```bash
bash scripts/bootstrap_prod_project.sh ssai-f6191 europe-west1 career-concierge
```

## 2. Configure UI env

Copy `.env.production.local.example` to `.env.production.local` or create `config/ssai-f6191.ui.env`.

Required values:

- `VITE_CONCIERGE_API_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID=ssai-f6191`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_DATABASE_ID=career-concierge`

Current web app values for `ssai-f6191` are already populated in `config/ssai-f6191.ui.env.example`.

## 3. Configure API env

Copy `config/ssai-f6191.api.env.example` to `config/ssai-f6191.api.yaml`.

Minimum required values:

- `GEMINI_API_KEY`
- `FIRESTORE_DATABASE_ID=career-concierge`
- `ADMIN_EMAILS`

## 4. Deploy Firestore rules

```bash
npx -y firebase-tools deploy --only "firestore:career-concierge" --project ssai-f6191
```

## 5. Migrate Auth users

Auth is initialized in `ssai-f6191`.

Export from source project:

```bash
npx -y firebase-tools auth:export .context/auth-export.json --project third-signal
```

Import into target project:

```bash
npx -y firebase-tools auth:import .context/auth-export.json --project ssai-f6191
```

If admin/staff access relies on custom claims, reapply those claims after import.

### Password reset fallback

The source admin config API returned an empty `hashConfig`, so the exact legacy password hash parameters are still unavailable through the current access path. The operational fallback is to trigger Firebase password reset emails for the imported password users.

Dry run:

```bash
npm run auth:resets:dry-run
```

Send the reset emails:

```bash
node scripts/send_password_reset_emails.mjs \
  --api-key <ssai-f6191-web-api-key> \
  --send \
  --output .context/password-reset-report.sent.json
```

## 6. Migrate Firestore data

```bash
bash scripts/migrate_firestore_between_projects.sh third-signal ssai-f6191 <bucket-name> career-concierge
```

The bucket must be writable by the source export job and readable by the target import job.

## 7. Deploy API then UI

```bash
bash scripts/deploy_api_cloudrun.sh ssai-f6191 europe-west1 config/ssai-f6191.api.yaml
bash scripts/deploy_ui_cloudrun.sh ssai-f6191 europe-west1 config/ssai-f6191.ui.env
```

If the UI service requires public access after deploy:

```bash
gcloud beta run services add-iam-policy-binding career-concierge-suite \
  --region=europe-west1 \
  --project=ssai-f6191 \
  --member=allUsers \
  --role=roles/run.invoker
```

## Region mismatch note

If the source Firestore database is US-based and the target database is EU-based, managed Firestore export/import cannot bridge them directly because each database is restricted to bucket locations within its own region family.

Use the REST migration fallback instead:

```bash
SOURCE_FIRESTORE_TOKEN="$(CLOUDSDK_PYTHON=/usr/bin/python3 gcloud auth print-access-token --account=treble.design@gmail.com)" \
TARGET_FIRESTORE_TOKEN="$(CLOUDSDK_PYTHON=/usr/bin/python3 gcloud auth print-access-token --account=gws@conciergecareerservices.com)" \
node scripts/migrate_firestore_rest.mjs \
  --source-project=third-signal \
  --target-project=ssai-f6191 \
  --source-db=career-concierge \
  --target-db=career-concierge
```

## 8. Validate

- Confirm Cloud Run API public reachability
- Login with an imported user
- Verify intake writes to `clients/{uid}`
- Verify `system/career-concierge-config` loads in Admin
- Verify `POST /v1/suite/generate`
- Verify `POST /v1/binge/episode`
- Verify `POST /v1/live/token`

## Notes

- The frontend is now env-driven for Firebase project selection.
- The API must always deploy from `./api`, not repo root.
- Keep `ADMIN_EMAILS` populated in production. Blank means the API currently falls back to permissive admin behavior.
- The original `third-signal` project is now a source system and reference environment, not the canonical production target for this fork.
