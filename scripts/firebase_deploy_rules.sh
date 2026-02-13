#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Always deploy to the intended Firebase project explicitly.
PROJECT_ID="${1:-third-signal}"
DATABASE_ID="${2:-signal-atlas}"

# Firestore multi-database: deploy to the configured database target.
# Requires firebase.json "firestore": [{ "database": "<id>", "rules": "firestore.rules" }]
npx -y firebase-tools deploy --only "firestore:${DATABASE_ID}" --project "$PROJECT_ID"
