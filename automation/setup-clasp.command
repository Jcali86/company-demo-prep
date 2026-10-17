#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
CLASP_PACKAGE="@google/clasp@3.3.0"

echo "[insert company here] Demo Prep — one-time clasp setup"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22 or later is required. Install the current LTS release from https://nodejs.org and run this file again."
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node.js 22 or later is required. Your current version is $(node --version)."
  exit 1
fi

echo "1. Enable the Apps Script API for your Google account."
echo "   A browser window will open. Turn the Apps Script API setting on, then return here."
if command -v open >/dev/null 2>&1; then
  open "https://script.google.com/home/usersettings"
fi
read -r -p "Press Return after the Apps Script API is enabled: "

echo
echo "2. In your Apps Script project, open Project Settings and copy the Script ID under IDs."
read -r -p "Paste the Script ID: " SCRIPT_ID
SCRIPT_ID="$(printf '%s' "$SCRIPT_ID" | tr -d '[:space:]')"
if [ ${#SCRIPT_ID} -lt 20 ]; then
  echo "That does not look like a valid Script ID. No configuration was written."
  exit 1
fi

printf '{\n  "scriptId": "%s",\n  "rootDir": "apps-script"\n}\n' "$SCRIPT_ID" > .clasp.json

echo
echo "3. Google authorization will now open. Sign in with the account that owns or edits the Apps Script project."
npx --yes "$CLASP_PACKAGE" login

echo
echo "4. Available deployments:"
npx --yes "$CLASP_PACKAGE" list-deployments
echo
echo "Copy the deployment ID for the current web app. It is the long value shown before @version."
read -r -p "Paste the existing web-app deployment ID: " DEPLOYMENT_ID
DEPLOYMENT_ID="$(printf '%s' "$DEPLOYMENT_ID" | tr -d '[:space:]')"
if [ ${#DEPLOYMENT_ID} -lt 20 ]; then
  echo "That does not look like a valid deployment ID. Run this setup again."
  exit 1
fi
printf '%s\n' "$DEPLOYMENT_ID" > .clasp-deployment-id

echo
echo "5. Verifying the project connection:"
npx --yes "$CLASP_PACKAGE" show-file-status

echo
echo "Local clasp setup is complete."
echo "For optional GitHub deployment, select GITHUB_REPOSITORY and run automation/configure-github.command once."
echo "For an emergency local deployment, double-click automation/deploy.command."
echo "Your Google authorization remains in clasp's account-level configuration on this Mac and is not stored in this package."
