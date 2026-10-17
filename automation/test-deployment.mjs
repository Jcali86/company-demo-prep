import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'demo-prep-deploy-test-'));
const fakeBin = path.join(fixtureRoot, 'fake-bin');
const deploymentId = 'AKfycbx12345678901234567890';
const argsFile = path.join(fixtureRoot, 'create-deployment-args.txt');

const fakeNpx = `#!/usr/bin/env bash
set -euo pipefail
shift 2
command="$1"
shift
case "$command" in
  push)
    echo "Pushed test files"
    ;;
  create-version)
    echo "Created version 42"
    ;;
  create-deployment)
    printf '%s\\n' "$@" > "$FAKE_CLASP_ARGS_FILE"
    if [ "\${FAKE_CLASP_MODE:-success}" = "error" ]; then
      echo "error: simulated zero-exit clasp failure"
    else
      echo "Redeployed \${APPS_SCRIPT_DEPLOYMENT_ID} @42"
    fi
    ;;
  list-deployments)
    printf 'Found 1 deployments.\\n- %s @42 - Test deployment\\n' "$APPS_SCRIPT_DEPLOYMENT_ID"
    ;;
  *)
    echo "Unexpected fake clasp command: $command" >&2
    exit 2
    ;;
esac
`;

try {
  await fs.cp(path.join(projectRoot, 'apps-script'), path.join(fixtureRoot, 'apps-script'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'automation'));
  for (const file of ['deploy-apps-script.sh', 'validate.mjs']) {
    await fs.copyFile(path.join(projectRoot, 'automation', file), path.join(fixtureRoot, 'automation', file));
  }
  await fs.writeFile(path.join(fixtureRoot, '.clasp.json'), JSON.stringify({ scriptId: 'script12345678901234567890', rootDir: 'apps-script' }));
  await fs.mkdir(fakeBin);
  await fs.writeFile(path.join(fakeBin, 'npx'), fakeNpx, { mode: 0o700 });

  const baseEnvironment = {
    ...process.env,
    APPS_SCRIPT_DEPLOYMENT_ID: deploymentId,
    CLASP_PACKAGE: '@google/clasp@3.3.0',
    FAKE_CLASP_ARGS_FILE: argsFile,
    PATH: `${fakeBin}:${process.env.PATH}`,
    RELEASE_DESCRIPTION: 'CI deployment test'
  };

  const success = spawnSync('bash', ['automation/deploy-apps-script.sh'], {
    cwd: fixtureRoot,
    env: { ...baseEnvironment, FAKE_CLASP_MODE: 'success' },
    encoding: 'utf8'
  });
  assert.equal(success.status, 0, success.stdout + success.stderr);
  assert.match(success.stdout, /Deployment verified at version 42/);
  const deploymentArgs = (await fs.readFile(argsFile, 'utf8')).trim().split('\n');
  assert.deepEqual(deploymentArgs, [
    '--deploymentId', deploymentId,
    '--versionNumber', '42',
    '--description', 'CI deployment test'
  ]);

  const falseSuccess = spawnSync('bash', ['automation/deploy-apps-script.sh'], {
    cwd: fixtureRoot,
    env: { ...baseEnvironment, FAKE_CLASP_MODE: 'error' },
    encoding: 'utf8'
  });
  assert.notEqual(falseSuccess.status, 0, 'A clasp error with exit code zero must still fail deployment.');
  assert.doesNotMatch(falseSuccess.stdout, /Deployment verified/);
  assert.match(falseSuccess.stdout, /live web app was not updated/);

  console.log('Deployment test passed: clasp 3.3.0 arguments and false-success handling are verified.');
} finally {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
}
