#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

REPOSITORY="${1:-${GITHUB_REPOSITORY:-}}"
CLASP_CREDENTIALS_FILE="${CLASP_CREDENTIALS_FILE:-$HOME/.clasprc.json}"

if ! printf '%s' "$REPOSITORY" | grep -Eq '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'; then
  echo "Set GITHUB_REPOSITORY to OWNER/company-demo-prep or pass OWNER/REPO as the first argument."
  echo "No repository destination was selected and no credentials were read."
  exit 1
fi

# Pinned to GitHub's immutable official release. When updating this version,
# update the checksum-manifest digest from the same release's API metadata.
GH_CLI_VERSION="2.97.0"
GH_CHECKSUMS_SHA256="61905c69ec8660f310814ec98395cdd0c2d07aabf024c597ec45813984a02334"
GH_RELEASE_BASE_URL="https://github.com/cli/cli/releases/download/v${GH_CLI_VERSION}"
GH_COMMAND=""
GH_WAS_BOOTSTRAPPED="0"
TEMP_WORK_DIR=""

cleanup() {
  if [ -n "$TEMP_WORK_DIR" ] && [ -d "$TEMP_WORK_DIR" ]; then
    rm -rf "$TEMP_WORK_DIR"
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

ensure_temp_dir() {
  if [ -z "$TEMP_WORK_DIR" ]; then
    umask 077
    TEMP_WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/company-demo-prep-gh.XXXXXX")"
  fi
}

version_at_least() {
  awk -v have="$1" -v need="$2" 'BEGIN {
    split(have, h, "."); split(need, n, ".");
    for (i = 1; i <= 3; i++) {
      hv = h[i] + 0; nv = n[i] + 0;
      if (hv > nv) exit 0;
      if (hv < nv) exit 1;
    }
    exit 0;
  }'
}

bootstrap_github_cli() {
  if [ "$(uname -s)" != "Darwin" ]; then
    echo "GitHub CLI was not found. Automatic temporary setup currently supports macOS only."
    echo "Use the browser alternative in docs/GITHUB-DEPLOYMENT.md on this operating system."
    exit 1
  fi

  case "$(uname -m)" in
    arm64) GH_ARCH="arm64" ;;
    x86_64) GH_ARCH="amd64" ;;
    *)
      echo "Unsupported Mac architecture: $(uname -m)."
      exit 1
      ;;
  esac

  for required_command in curl shasum unzip; do
    if ! command -v "$required_command" >/dev/null 2>&1; then
      echo "macOS command '$required_command' is required for verified GitHub CLI setup."
      exit 1
    fi
  done

  ensure_temp_dir
  ARCHIVE_NAME="gh_${GH_CLI_VERSION}_macOS_${GH_ARCH}.zip"
  ARCHIVE_PATH="$TEMP_WORK_DIR/$ARCHIVE_NAME"
  CHECKSUMS_NAME="gh_${GH_CLI_VERSION}_checksums.txt"
  CHECKSUMS_PATH="$TEMP_WORK_DIR/$CHECKSUMS_NAME"

  echo "GitHub CLI is not installed. Downloading the official temporary macOS ${GH_ARCH} binary…"
  if ! curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 --retry 3 \
    --output "$CHECKSUMS_PATH" "$GH_RELEASE_BASE_URL/$CHECKSUMS_NAME"; then
    echo "Could not download the official GitHub CLI checksum manifest."
    exit 1
  fi
  if ! curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 --retry 3 \
    --output "$ARCHIVE_PATH" "$GH_RELEASE_BASE_URL/$ARCHIVE_NAME"; then
    echo "Could not download the official GitHub CLI archive."
    exit 1
  fi

  ACTUAL_CHECKSUMS_SHA256="$(shasum -a 256 "$CHECKSUMS_PATH" | awk '{print $1}')"
  if [ "$ACTUAL_CHECKSUMS_SHA256" != "$GH_CHECKSUMS_SHA256" ]; then
    echo "GitHub CLI checksum manifest verification failed. Nothing was executed."
    exit 1
  fi

  EXPECTED_ARCHIVE_SHA256="$(awk -v filename="$ARCHIVE_NAME" '$2 == filename { print $1; exit }' "$CHECKSUMS_PATH")"
  if ! printf '%s' "$EXPECTED_ARCHIVE_SHA256" | grep -Eq '^[0-9a-f]{64}$'; then
    echo "The verified checksum manifest does not contain $ARCHIVE_NAME."
    exit 1
  fi
  ACTUAL_ARCHIVE_SHA256="$(shasum -a 256 "$ARCHIVE_PATH" | awk '{print $1}')"
  if [ "$ACTUAL_ARCHIVE_SHA256" != "$EXPECTED_ARCHIVE_SHA256" ]; then
    echo "GitHub CLI archive verification failed. Nothing was executed."
    exit 1
  fi

  EXTRACT_DIR="$TEMP_WORK_DIR/extracted"
  mkdir -p "$EXTRACT_DIR"
  unzip -q "$ARCHIVE_PATH" -d "$EXTRACT_DIR"
  GH_COMMAND="$EXTRACT_DIR/gh_${GH_CLI_VERSION}_macOS_${GH_ARCH}/bin/gh"
  if [ ! -x "$GH_COMMAND" ] || ! "$GH_COMMAND" version >/dev/null 2>&1; then
    echo "The verified GitHub CLI archive did not contain a runnable binary."
    exit 1
  fi
  GH_WAS_BOOTSTRAPPED="1"
  echo "Verified GitHub CLI ${GH_CLI_VERSION}. It will run from a temporary folder and will not be installed."
}

echo "[insert company here] Demo Prep — one-time GitHub deployment setup"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Run automation/setup-clasp.command first."
  exit 1
fi

for required_file in .clasp.json .clasp-deployment-id "$CLASP_CREDENTIALS_FILE"; do
  if [ ! -f "$required_file" ]; then
    echo "Missing $required_file. Run automation/setup-clasp.command first."
    exit 1
  fi
done

if [ "${GH_CLI_FORCE_BOOTSTRAP:-0}" != "1" ] && command -v gh >/dev/null 2>&1; then
  GH_COMMAND="$(command -v gh)"
  INSTALLED_GH_VERSION="$("$GH_COMMAND" version 2>/dev/null | sed -nE 's/^gh version ([0-9]+\.[0-9]+\.[0-9]+).*/\1/p' | head -n 1)"
  if [ -z "$INSTALLED_GH_VERSION" ] || ! version_at_least "$INSTALLED_GH_VERSION" "$GH_CLI_VERSION"; then
    echo "The installed GitHub CLI is older than the secure baseline ${GH_CLI_VERSION}; using a verified temporary copy."
    bootstrap_github_cli
  fi
else
  bootstrap_github_cli
fi

if ! "$GH_COMMAND" auth status --hostname github.com >/dev/null 2>&1; then
  echo "A browser window will open for GitHub authorization."
  "$GH_COMMAND" auth login --hostname github.com --git-protocol https --web
fi

"$GH_COMMAND" repo view "$REPOSITORY" >/dev/null

SCRIPT_ID="$(node -e "const c=require('./.clasp.json'); process.stdout.write(String(c.scriptId || ''))")"
DEPLOYMENT_ID="$(tr -d '[:space:]' < .clasp-deployment-id)"

if ! printf '%s' "$SCRIPT_ID" | grep -Eq '^[A-Za-z0-9_-]{20,}$'; then
  echo "The Script ID in .clasp.json is not valid."
  exit 1
fi
if ! printf '%s' "$DEPLOYMENT_ID" | grep -Eq '^[A-Za-z0-9_-]{20,}$'; then
  echo "The value in .clasp-deployment-id is not valid."
  exit 1
fi
CLASP_CREDENTIALS_FILE="$CLASP_CREDENTIALS_FILE" node -e "JSON.parse(require('node:fs').readFileSync(process.env.CLASP_CREDENTIALS_FILE, 'utf8'))"

ensure_temp_dir
TEMP_SECRET_DIR="$TEMP_WORK_DIR/secrets"
mkdir -p "$TEMP_SECRET_DIR"
umask 077
printf '%s' "$SCRIPT_ID" > "$TEMP_SECRET_DIR/script-id"
printf '%s' "$DEPLOYMENT_ID" > "$TEMP_SECRET_DIR/deployment-id"

echo "Storing three encrypted Actions secrets in ${REPOSITORY}..."
"$GH_COMMAND" secret set APPS_SCRIPT_ID --repo "$REPOSITORY" < "$TEMP_SECRET_DIR/script-id"
"$GH_COMMAND" secret set APPS_SCRIPT_DEPLOYMENT_ID --repo "$REPOSITORY" < "$TEMP_SECRET_DIR/deployment-id"
"$GH_COMMAND" secret set CLASP_CREDENTIALS --repo "$REPOSITORY" < "$CLASP_CREDENTIALS_FILE"

echo
echo "Configured secret names:"
"$GH_COMMAND" secret list --repo "$REPOSITORY" | awk '$1 ~ /^(APPS_SCRIPT_ID|APPS_SCRIPT_DEPLOYMENT_ID|CLASP_CREDENTIALS)$/ { print "- " $1 }'

echo
echo "Setup complete. Review changes on main, then explicitly run the Deploy Apps Script workflow when ready to release."
echo "The web-app URL stays the same."
if [ "$GH_WAS_BOOTSTRAPPED" = "1" ]; then
  cleanup
  TEMP_WORK_DIR=""
  echo "The temporary GitHub CLI copy has been removed; no app was installed on this Mac."
fi
