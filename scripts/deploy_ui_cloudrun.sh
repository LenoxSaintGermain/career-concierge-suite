#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:?Usage: scripts/deploy_ui_cloudrun.sh <project-id> <region> [ui-env-file] }"
REGION="${2:?Usage: scripts/deploy_ui_cloudrun.sh <project-id> <region> [ui-env-file] }"
UI_ENV_FILE="${3:-config/${PROJECT_ID}.ui.env}"
SERVICE_NAME="${SERVICE_NAME:-career-concierge-suite}"
TEMP_ENV_FILE=".env.production.local"

export CLOUDSDK_PYTHON="${CLOUDSDK_PYTHON:-/usr/bin/python3}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f "$UI_ENV_FILE" ]; then
  echo "Missing UI env file: $UI_ENV_FILE"
  echo "Create it from .env.production.local.example or pass a file path explicitly."
  exit 1
fi

BACKUP_FILE=""
if [ -f "$TEMP_ENV_FILE" ]; then
  BACKUP_FILE="$(mktemp)"
  cp "$TEMP_ENV_FILE" "$BACKUP_FILE"
fi

cleanup() {
  rm -f "$TEMP_ENV_FILE"
  if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
    mv "$BACKUP_FILE" "$TEMP_ENV_FILE"
  fi
}
trap cleanup EXIT

cp "$UI_ENV_FILE" "$TEMP_ENV_FILE"

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --platform managed \
  --quiet
