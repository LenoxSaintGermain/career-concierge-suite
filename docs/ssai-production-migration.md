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
- API service is deployed privately at `https://career-concierge-api-tpcap5aa5a-ew.a.run.app`
- Auth users import runs successfully, but password-hash parameters from the source project still need to be supplied for email/password users

## Remaining blockers

- Org policy still blocks `allUsers` on Cloud Run in `ssai-f6191`, so the API/UI cannot be made publicly reachable with the current SPA + Cloud Run architecture.
- Source deploys required granting the project compute service account `roles/storage.objectViewer`, `roles/artifactregistry.writer`, and `roles/logging.logWriter`.
- Auth import needs the source Firebase password hash settings if email/password users must keep their existing passwords.

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

Auth is initialized in `ssai-f6191`. For full email/password migration fidelity, re-run the import with the source project's hash parameters.

Export from source project:

```bash
npx -y firebase-tools auth:export .context/auth-export.json --project third-signal
```

Import into target project:

```bash
npx -y firebase-tools auth:import .context/auth-export.json --project ssai-f6191
```

If admin/staff access relies on custom claims, reapply those claims after import.

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
