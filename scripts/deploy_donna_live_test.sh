#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-ssai-f6191}"
REGION="${2:-europe-west1}"
API_SERVICE_NAME="${API_SERVICE_NAME:-career-concierge-api-donna-live}"
UI_SERVICE_NAME="${UI_SERVICE_NAME:-career-concierge-suite-donna-live}"
API_ENV_FILE="${API_ENV_FILE:-.context/deploy/${PROJECT_ID}.donna-live.api.yaml}"
UI_ENV_FILE="${UI_ENV_FILE:-.context/deploy/${PROJECT_ID}.donna-live.ui.env}"
ALLOW_UNAUTHENTICATED="${ALLOW_UNAUTHENTICATED:-true}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f "$API_ENV_FILE" ]; then
  echo "Missing API env file: $API_ENV_FILE"
  exit 1
fi

if [ ! -f "$UI_ENV_FILE" ]; then
  echo "Missing UI env file: $UI_ENV_FILE"
  exit 1
fi

echo "Deploying API service: $API_SERVICE_NAME"
SERVICE_NAME="$API_SERVICE_NAME" \
ALLOW_UNAUTHENTICATED="$ALLOW_UNAUTHENTICATED" \
bash scripts/deploy_api_cloudrun.sh "$PROJECT_ID" "$REGION" "$API_ENV_FILE"

echo "Deploying UI service: $UI_SERVICE_NAME"
SERVICE_NAME="$UI_SERVICE_NAME" \
ALLOW_UNAUTHENTICATED="$ALLOW_UNAUTHENTICATED" \
bash scripts/deploy_ui_cloudrun.sh "$PROJECT_ID" "$REGION" "$UI_ENV_FILE"

echo "API URL:"
gcloud run services describe "$API_SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)'

echo "UI URL:"
gcloud run services describe "$UI_SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)'
