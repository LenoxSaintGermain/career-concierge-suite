# SSAI Production Migration

Target project:

- Project ID: `ssai-482923`
- Region: `europe-west1`
- Firestore DB ID: `career-concierge`

## Required access

The operator running these commands must have access to both:

- source project: `third-signal`
- target project: `ssai-482923`

Required roles are effectively:

- `roles/run.admin`
- `roles/cloudbuild.builds.editor`
- `roles/artifactregistry.admin` or sufficient write access
- `roles/serviceusage.serviceUsageAdmin`
- `roles/datastore.owner` or sufficient Firestore admin/import-export access
- `roles/firebase.admin`
- `roles/iam.serviceAccountUser`
- `roles/secretmanager.admin` if using Secret Manager

## 1. Bootstrap the target project

```bash
bash scripts/bootstrap_prod_project.sh ssai-482923 europe-west1 career-concierge
```

## 2. Configure UI env

Copy `.env.production.local.example` to `.env.production.local` or create `config/ssai-482923.ui.env`.

Required values:

- `VITE_CONCIERGE_API_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID=ssai-482923`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_DATABASE_ID=career-concierge`

## 3. Configure API env

Copy `config/ssai-482923.api.env.example` to `config/ssai-482923.api.env`.

Minimum required values:

- `GEMINI_API_KEY`
- `FIRESTORE_DATABASE_ID=career-concierge`
- `ADMIN_EMAILS`

## 4. Deploy Firestore rules

```bash
npx -y firebase-tools deploy --only "firestore:career-concierge" --project ssai-482923
```

## 5. Migrate Auth users

Export from source project:

```bash
npx -y firebase-tools auth:export .context/auth-export.json --project third-signal
```

Import into target project:

```bash
npx -y firebase-tools auth:import .context/auth-export.json --project ssai-482923
```

If admin/staff access relies on custom claims, reapply those claims after import.

## 6. Migrate Firestore data

```bash
bash scripts/migrate_firestore_between_projects.sh third-signal ssai-482923 <bucket-name> career-concierge
```

The bucket must be writable by the source export job and readable by the target import job.

## 7. Deploy API then UI

```bash
bash scripts/deploy_api_cloudrun.sh ssai-482923 europe-west1 config/ssai-482923.api.env
bash scripts/deploy_ui_cloudrun.sh ssai-482923 europe-west1 config/ssai-482923.ui.env
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
