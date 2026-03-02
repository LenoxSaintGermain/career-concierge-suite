#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:?Usage: scripts/deploy_api_cloudrun.sh <project-id> <region> [env-file] }"
REGION="${2:?Usage: scripts/deploy_api_cloudrun.sh <project-id> <region> [env-file] }"
ENV_FILE="${3:-config/${PROJECT_ID}.api.env}"
SERVICE_NAME="${SERVICE_NAME:-career-concierge-api}"

export CLOUDSDK_PYTHON="${CLOUDSDK_PYTHON:-/usr/bin/python3}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing API env file: $ENV_FILE"
  echo "Create it from config/${PROJECT_ID}.api.env.example or pass a file path explicitly."
  exit 1
fi

gcloud run deploy "$SERVICE_NAME" \
  --source ./api \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --platform managed \
  --env-vars-file "$ENV_FILE" \
  --quiet
