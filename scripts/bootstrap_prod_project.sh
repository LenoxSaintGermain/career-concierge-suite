#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:?Usage: scripts/bootstrap_prod_project.sh <project-id> <region> [firestore-db-id] }"
REGION="${2:?Usage: scripts/bootstrap_prod_project.sh <project-id> <region> [firestore-db-id] }"
FIRESTORE_DB_ID="${3:-career-concierge}"

export CLOUDSDK_PYTHON="${CLOUDSDK_PYTHON:-/usr/bin/python3}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Enabling required services in ${PROJECT_ID}..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  storage.googleapis.com \
  --project="$PROJECT_ID"

echo "Adding Firebase to ${PROJECT_ID}..."
npx -y firebase-tools projects:addfirebase "$PROJECT_ID" || true

echo "Ensuring Firestore database ${FIRESTORE_DB_ID} exists in ${REGION}..."
if ! gcloud firestore databases describe --project="$PROJECT_ID" --database="$FIRESTORE_DB_ID" >/dev/null 2>&1; then
  gcloud firestore databases create \
    --project="$PROJECT_ID" \
    --database="$FIRESTORE_DB_ID" \
    --location="$REGION" \
    --type=firestore-native
fi

echo "Bootstrap complete for ${PROJECT_ID}."
