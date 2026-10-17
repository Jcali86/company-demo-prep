#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

CLASP_PACKAGE="${CLASP_PACKAGE:-@google/clasp@3.3.0}"
DESCRIPTION="${RELEASE_DESCRIPTION:-[insert company here] Demo Prep $(date -u '+%Y-%m-%d %H:%M UTC')}"

if [ ! -f .clasp.json ]; then
  echo "Missing .clasp.json. Configure the Apps Script project before deploying."
  exit 1
fi

if [ -n "${APPS_SCRIPT_DEPLOYMENT_ID:-}" ]; then
  DEPLOYMENT_ID="$(printf '%s' "$APPS_SCRIPT_DEPLOYMENT_ID" | tr -d '[:space:]')"
elif [ -f .clasp-deployment-id ]; then
  DEPLOYMENT_ID="$(tr -d '[:space:]' < .clasp-deployment-id)"
else
  echo "Missing deployment ID. Set APPS_SCRIPT_DEPLOYMENT_ID or create .clasp-deployment-id."
  exit 1
fi

if ! printf '%s' "$DEPLOYMENT_ID" | grep -Eq '^[A-Za-z0-9_-]{20,}$'; then
  echo "The Apps Script deployment ID is not valid."
  exit 1
fi

node automation/validate.mjs

echo
echo "Uploading the complete verified project…"
npx --yes "$CLASP_PACKAGE" push --force

echo
echo "Creating an immutable Apps Script version…"
VERSION_OUTPUT="$(npx --yes "$CLASP_PACKAGE" create-version "$DESCRIPTION")"
printf '%s\n' "$VERSION_OUTPUT"
VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | sed -nE 's/.*[Vv]ersion[^0-9]*([0-9]+).*/\1/p' | head -n 1)"
if [ -z "$VERSION" ]; then
  echo "The source was uploaded, but the new version number could not be detected. The live deployment was not changed."
  exit 1
fi

echo
echo "Updating the existing web-app deployment to version ${VERSION}…"
# clasp 3.x documents create-deployment --deploymentId as the redeploy path.
# This avoids the positional-argument parsing issue seen with update-deployment.
set +e
DEPLOY_OUTPUT="$(npx --yes "$CLASP_PACKAGE" create-deployment \
  --deploymentId "$DEPLOYMENT_ID" \
  --versionNumber "$VERSION" \
  --description "$DESCRIPTION" 2>&1)"
DEPLOY_STATUS=$?
set -e
printf '%s\n' "$DEPLOY_OUTPUT"
if [ "$DEPLOY_STATUS" -ne 0 ] || printf '%s\n' "$DEPLOY_OUTPUT" | grep -Eiq '(^|[[:space:]])error:'; then
  echo "Deployment failed. The source version exists, but the live web app was not updated."
  exit 1
fi

echo
DEPLOYMENTS_OUTPUT="$(npx --yes "$CLASP_PACKAGE" list-deployments)"
printf '%s\n' "$DEPLOYMENTS_OUTPUT"
if ! printf '%s\n' "$DEPLOYMENTS_OUTPUT" | awk -v id="$DEPLOYMENT_ID" -v version="@$VERSION" '$1 == "-" && $2 == id && $3 == version { found = 1 } END { exit !found }'; then
  echo "Deployment could not be verified at version $VERSION. Check Apps Script before treating this release as live."
  exit 1
fi

echo
echo "Deployment verified at version $VERSION. The existing web-app URL is unchanged."
