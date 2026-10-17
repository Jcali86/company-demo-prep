import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const configureSource = await fs.readFile(path.join(projectRoot, 'automation', 'configure-github.command'), 'utf8');
const finishSource = await fs.readFile(path.join(projectRoot, 'automation', 'finish-github-setup.command'), 'utf8');

assert.doesNotMatch(
  finishSource,
  /\$[A-Za-z_][A-Za-z0-9_]*[^\x00-\x7F]/,
  'Unbraced shell variables immediately followed by Unicode can be parsed as a longer variable name by macOS Bash.'
);
const secretSentinel = 'SUPER_SECRET_REFRESH_TOKEN_DO_NOT_PRINT';
const manifestDigest = '61905c69ec8660f310814ec98395cdd0c2d07aabf024c597ec45813984a02334';
const armDigest = 'a58b8fd77b417a38f47a0b54d1370c59b0fcdb324ccc9ca002b0998f7c4c999e';
const amdDigest = '63298c998cc2a924c9e254c6af6a1caad6ece281122687a91f079bc0a462700e';

assert.match(configureSource, /GH_CLI_VERSION="2\.97\.0"/);
assert.ok(configureSource.includes(`GH_CHECKSUMS_SHA256="${manifestDigest}"`));
assert.match(configureSource, /--proto '=https'/);
assert.match(configureSource, /--tlsv1\.2/);
assert.match(finishSource, /GH_CLI_VERSION="2\.97\.0"/);
assert.ok(finishSource.includes(`GH_CHECKSUMS_SHA256="${manifestDigest}"`));
assert.match(finishSource, /PROJECT_ROOT="\$HOME\/Documents\/company-demo-prep-system"/);
assert.match(finishSource, /--proto '=https'/);
assert.match(finishSource, /--tlsv1\.2/);
assert.doesNotMatch(
  finishSource,
  /(?:bash|source)[^\n]*configure-github\.command/,
  'The standalone finisher must never invoke the stale configure script.'
);

async function writeExecutable(file, contents) {
  await fs.writeFile(file, contents, { mode: 0o700 });
}

async function makeFixture(arch, checksumMode = 'good', options = {}) {
  const script = options.script ?? 'configure';
  const location = options.location ?? 'automation';
  const authMode = options.authMode ?? 'authenticated';
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `demo-prep-github-${arch}-`));
  const automationDir = path.join(root, 'automation');
  const downloadsDir = path.join(root, 'Downloads');
  const fakeBin = path.join(root, 'fake-bin');
  const tempRoot = path.join(root, 'temp');
  const logFile = path.join(root, 'calls.log');
  const credentialsFile = path.join(root, 'clasprc.json');
  const fakeGhSource = path.join(root, 'fake-gh');
  await fs.mkdir(automationDir);
  await fs.mkdir(downloadsDir);
  await fs.mkdir(fakeBin);
  await fs.mkdir(tempRoot);
  const scriptName = script === 'finish' ? 'finish-github-setup.command' : 'configure-github.command';
  const commandDir = location === 'downloads' ? downloadsDir : automationDir;
  await fs.copyFile(path.join(projectRoot, 'automation', scriptName), path.join(commandDir, scriptName));
  await fs.writeFile(path.join(root, '.clasp.json'), JSON.stringify({ scriptId: 'script12345678901234567890', rootDir: 'apps-script' }));
  await fs.writeFile(path.join(root, '.clasp-deployment-id'), 'AKfycbx12345678901234567890\n');
  await fs.writeFile(credentialsFile, JSON.stringify({ token: secretSentinel }));

  await writeExecutable(path.join(fakeBin, 'uname'), `#!/usr/bin/env bash
if [ "\${1:-}" = "-s" ]; then
  echo Darwin
elif [ "\${1:-}" = "-m" ]; then
  echo "\${FAKE_ARCH}"
else
  echo Darwin
fi
`);

  await writeExecutable(path.join(fakeBin, 'curl'), `#!/usr/bin/env bash
set -euo pipefail
output=""
url=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output)
      output="$2"
      shift 2
      ;;
    http*)
      url="$1"
      shift
      ;;
    *)
      shift
      ;;
  esac
done
printf 'curl:%s\\n' "$url" >> "$GH_TEST_LOG"
case "$url" in
  *checksums.txt)
    printf '${armDigest}  gh_2.97.0_macOS_arm64.zip\\n${amdDigest}  gh_2.97.0_macOS_amd64.zip\\n' > "$output"
    ;;
  *macOS_arm64.zip|*macOS_amd64.zip)
    printf 'simulated archive' > "$output"
    ;;
  *)
    exit 22
    ;;
esac
`);

  await writeExecutable(path.join(fakeBin, 'shasum'), `#!/usr/bin/env bash
set -euo pipefail
target="\${!#}"
name="$(basename "$target")"
case "$name" in
  gh_2.97.0_checksums.txt)
    if [ "$FAKE_CHECKSUM_MODE" = "bad" ]; then
      digest="0000000000000000000000000000000000000000000000000000000000000000"
    else
      digest="${manifestDigest}"
    fi
    ;;
  gh_2.97.0_macOS_arm64.zip) digest="${armDigest}" ;;
  gh_2.97.0_macOS_amd64.zip) digest="${amdDigest}" ;;
  *) exit 2 ;;
esac
printf '%s  %s\\n' "$digest" "$target"
`);

  await writeExecutable(fakeGhSource, `#!/usr/bin/env bash
set -euo pipefail
printf 'gh:%s\\n' "$*" >> "$GH_TEST_LOG"
case "\${1:-} \${2:-}" in
  "version ") echo "gh version 2.97.0 (test)" ;;
  "auth status")
    if [ "$GH_FAKE_AUTH_MODE" = "login" ]; then
      exit 1
    fi
    exit 0
    ;;
  "auth login") exit 0 ;;
  "repo view") exit 0 ;;
  "secret set") command cat >/dev/null ;;
  "secret list")
    printf 'APPS_SCRIPT_ID\\t2026-08-12\\nAPPS_SCRIPT_DEPLOYMENT_ID\\t2026-08-12\\nCLASP_CREDENTIALS\\t2026-08-12\\n'
    ;;
  *) exit 2 ;;
esac
`);

  await writeExecutable(path.join(fakeBin, 'unzip'), `#!/usr/bin/env bash
set -euo pipefail
archive=""
destination=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -d)
      destination="$2"
      shift 2
      ;;
    *.zip)
      archive="$1"
      shift
      ;;
    *)
      shift
      ;;
  esac
done
folder="$(basename "$archive" .zip)"
mkdir -p "$destination/$folder/bin"
cp "$GH_FAKE_SOURCE" "$destination/$folder/bin/gh"
chmod 700 "$destination/$folder/bin/gh"
`);

  return {
    root,
    logFile,
    command: path.join(commandDir, scriptName),
    environment: {
      ...process.env,
      CLASP_CREDENTIALS_FILE: credentialsFile,
      FAKE_ARCH: arch,
      FAKE_CHECKSUM_MODE: checksumMode,
      GH_CLI_FORCE_BOOTSTRAP: '1',
      GH_FAKE_AUTH_MODE: authMode,
      GH_FAKE_SOURCE: fakeGhSource,
      GH_TEST_LOG: logFile,
      PATH: `${fakeBin}:${process.env.PATH}`,
      TMPDIR: tempRoot,
      GITHUB_REPOSITORY: 'example-owner/company-demo-prep',
      COMPANY_DEMO_PREP_ROOT: script === 'finish' && location === 'downloads' ? root : ''
    }
  };
}

async function runArchitectureTest(arch, archiveSuffix, options = {}) {
  const fixture = await makeFixture(arch, 'good', options);
  try {
    const result = spawnSync('bash', [fixture.command], {
      cwd: fixture.root,
      env: fixture.environment,
      encoding: 'utf8'
    });
    const output = result.stdout + result.stderr;
    assert.equal(result.status, 0, output);
    assert.ok(output.includes(`official temporary macOS ${archiveSuffix} binary`), output);
    assert.ok(output.includes('Verified GitHub CLI 2.97.0'));
    assert.ok(output.includes('no app was installed on this Mac'));
    assert.ok(!output.includes(secretSentinel), 'Credential content must never be printed.');
    if (options.script === 'finish') {
      assert.ok(output.includes(`Using project: ${fixture.root}`), output);
      assert.ok(output.includes('Storing three encrypted Actions secrets in example-owner/company-demo-prep...'), output);
      assert.ok(output.includes('The project files were not changed.'), output);
    }

    const calls = await fs.readFile(fixture.logFile, 'utf8');
    assert.ok(calls.includes(`gh_2.97.0_macOS_${archiveSuffix}.zip`));
    assert.ok(calls.includes('gh:secret set APPS_SCRIPT_ID'));
    assert.ok(calls.includes('gh:secret set APPS_SCRIPT_DEPLOYMENT_ID'));
    assert.ok(calls.includes('gh:secret set CLASP_CREDENTIALS'));
    if (options.authMode === 'login') {
      const statusIndex = calls.indexOf('gh:auth status --hostname github.com');
      const loginIndex = calls.indexOf('gh:auth login --hostname github.com --git-protocol https --web');
      const repoIndex = calls.indexOf('gh:repo view example-owner/company-demo-prep');
      const firstSecretIndex = calls.indexOf('gh:secret set APPS_SCRIPT_ID');
      assert.ok(statusIndex >= 0, calls);
      assert.ok(loginIndex > statusIndex, calls);
      assert.ok(repoIndex > loginIndex, calls);
      assert.ok(firstSecretIndex > repoIndex, calls);
    }
  } finally {
    await fs.rm(fixture.root, { recursive: true, force: true });
  }
}

await runArchitectureTest('arm64', 'arm64');
await runArchitectureTest('x86_64', 'amd64');
await runArchitectureTest('arm64', 'arm64', { script: 'finish', location: 'downloads', authMode: 'login' });
await runArchitectureTest('x86_64', 'amd64', { script: 'finish', location: 'downloads' });
await runArchitectureTest('arm64', 'arm64', { script: 'finish', location: 'automation' });

for (const script of ['configure', 'finish']) {
  const fixture = await makeFixture('arm64', 'good', { script });
  try {
    for (const repository of ['', 'owner/repository/extra']) {
      const result = spawnSync('bash', [fixture.command], {
        cwd: fixture.root,
        env: { ...fixture.environment, GITHUB_REPOSITORY: repository },
        encoding: 'utf8'
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stdout, /Set GITHUB_REPOSITORY/);
      assert.ok(!result.stdout.includes(secretSentinel));
      await assert.rejects(fs.access(fixture.logFile), 'Missing/invalid destinations must fail before CLI or network activity.');
    }

    const selectedRepository = 'selected-owner/company-demo-prep';
    const explicit = spawnSync('bash', [fixture.command, selectedRepository], {
      cwd: fixture.root,
      env: fixture.environment,
      encoding: 'utf8'
    });
    assert.equal(explicit.status, 0, explicit.stdout + explicit.stderr);
    const calls = await fs.readFile(fixture.logFile, 'utf8');
    assert.ok(calls.includes(`gh:repo view ${selectedRepository}`));
    assert.ok(calls.includes(`gh:secret set CLASP_CREDENTIALS --repo ${selectedRepository}`));
    assert.ok(!calls.includes('example-owner/company-demo-prep'), 'An explicit destination must override the environment.');
    assert.ok(!(explicit.stdout + explicit.stderr).includes(secretSentinel));
  } finally {
    await fs.rm(fixture.root, { recursive: true, force: true });
  }
}

const badChecksum = await makeFixture('arm64', 'bad', { script: 'finish', location: 'downloads' });
try {
  const result = spawnSync('bash', [badChecksum.command], {
    cwd: badChecksum.root,
    env: badChecksum.environment,
    encoding: 'utf8'
  });
  const output = result.stdout + result.stderr;
  assert.notEqual(result.status, 0);
  assert.match(output, /checksum manifest verification failed/);
  assert.ok(!output.includes(secretSentinel));
  const calls = await fs.readFile(badChecksum.logFile, 'utf8');
  assert.doesNotMatch(calls, /gh:/, 'No downloaded executable may run after checksum failure.');
} finally {
  await fs.rm(badChecksum.root, { recursive: true, force: true });
}

const missingProjectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'demo-prep-github-missing-'));
try {
  const downloadedCommand = path.join(missingProjectRoot, 'finish-github-setup.command');
  const absentProject = path.join(missingProjectRoot, 'project-is-elsewhere');
  await fs.copyFile(path.join(projectRoot, 'automation', 'finish-github-setup.command'), downloadedCommand);
  const result = spawnSync('bash', [downloadedCommand], {
    cwd: missingProjectRoot,
    env: {
      ...process.env,
      COMPANY_DEMO_PREP_ROOT: absentProject
    },
    encoding: 'utf8'
  });
  const output = (result.stdout + result.stderr).trim();
  assert.notEqual(result.status, 0);
  assert.equal(
    output,
    [
      'I could not find the configured [insert company here] Demo Prep project.',
      `Expected it at: ${process.env.HOME}/Documents/company-demo-prep-system`,
      'That folder must contain .clasp.json and .clasp-deployment-id.',
      'If you saved it elsewhere, run this command with COMPANY_DEMO_PREP_ROOT set to its full path.'
    ].join('\n')
  );
} finally {
  await fs.rm(missingProjectRoot, { recursive: true, force: true });
}

console.log('GitHub setup test passed: explicit repository selection, standalone Downloads/project launch, arm64/x86_64 bootstrap, checksum rejection, secret setup, missing-project guidance, and credential redaction are verified.');
