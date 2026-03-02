#!/usr/bin/env bash
set -euo pipefail

SOURCE_PROJECT="${1:?Usage: scripts/migrate_firestore_between_projects.sh <source-project> <target-project> <bucket-name> [database-id] }"
TARGET_PROJECT="${2:?Usage: scripts/migrate_firestore_between_projects.sh <source-project> <target-project> <bucket-name> [database-id] }"
BUCKET_NAME="${3:?Usage: scripts/migrate_firestore_between_projects.sh <source-project> <target-project> <bucket-name> [database-id] }"
DATABASE_ID="${4:-career-concierge}"

export CLOUDSDK_PYTHON="${CLOUDSDK_PYTHON:-/usr/bin/python3}"

STAMP="$(date +%Y%m%d-%H%M%S)"
EXPORT_PATH="gs://${BUCKET_NAME}/firestore-migrations/${DATABASE_ID}/${STAMP}"

echo "Exporting Firestore database ${DATABASE_ID} from ${SOURCE_PROJECT} to ${EXPORT_PATH}..."
gcloud firestore export "$EXPORT_PATH" \
  --project="$SOURCE_PROJECT" \
  --database="$DATABASE_ID"

echo "Importing Firestore database ${DATABASE_ID} into ${TARGET_PROJECT}..."
gcloud firestore import "$EXPORT_PATH" \
  --project="$TARGET_PROJECT" \
  --database="$DATABASE_ID"

echo "Firestore migration complete."
