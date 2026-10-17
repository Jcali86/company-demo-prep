# Contributing

Start with [installation](docs/SETUP.md), [the user workflow](docs/USAGE.md), and [the Apps Script/catalog reference](apps-script/README.md). Use fictional demo records and a separate test Workspace instance. Public pull requests must not include production data or connected project configuration.

## Validate locally

With Node.js 22 or later, run from the repository root:

```bash
node automation/validate.mjs
node automation/test-deployment.mjs
node automation/test-configure-github.mjs
```

No `npm install` or account connection is needed for these checks. The validator checks source syntax, manifest/domain settings, branding defaults, additive setup preservation, and demo workflow rules. The other scripts use temporary fixtures and fake CLI/network tools; they do not deploy or write real repository secrets. These checks do not prove live Workspace authorization, email delivery, Drive sharing, or a rendered browser experience.

## Change and review

1. Create a branch for one bounded change.
2. Preserve `DOMAIN` access, `USER_ACCESSING` execution, explicit deployment targets, and the manual release trigger.
3. Keep sheet headers in their expected order. Test additive schema changes against a disposable copy containing existing rows; never use production as a migration test.
4. Update the relevant setup, workflow, or catalog instructions when behavior changes. Keep the generic company placeholder and examples free of private branding/data.
5. Run the checks above and open a pull request explaining the problem, the resulting behavior, and what you verified. Include sanitized screenshots only when they add useful visual evidence.

[GitHub deployment](docs/GITHUB-DEPLOYMENT.md) describes the release controls. A pull request or merge does not release code to a live app. Maintainers explicitly choose the configured deployment when ready.

## Report a problem

For an ordinary bug, include the source revision, expected/actual behavior, a minimal fictional example, and sanitized validation or error output. Do not attach live Sheets, Docs, recordings, account emails, deployment IDs, local credential files, or unredacted execution logs.

Security problems should be reported privately: use GitHub's private vulnerability reporting if it is available, or request a private contact without publishing the details. Follow [security guidance](docs/SECURITY.md). Review the repository's stated license/permissions before redistributing code; this contribution guide does not grant additional rights or choose a license.
