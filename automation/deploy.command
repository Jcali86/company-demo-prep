#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -f .clasp.json ] || [ ! -f .clasp-deployment-id ]; then
  echo "Run automation/setup-clasp.command before deploying."
  exit 1
fi

node automation/validate.mjs

DEFAULT_DESCRIPTION="[insert company here] Demo Prep $(date '+%Y-%m-%d %H:%M')"
read -r -p "Release description [$DEFAULT_DESCRIPTION]: " DESCRIPTION
DESCRIPTION="${DESCRIPTION:-$DEFAULT_DESCRIPTION}"

RELEASE_DESCRIPTION="$DESCRIPTION" \
  bash automation/deploy-apps-script.sh
