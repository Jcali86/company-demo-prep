# GitHub deployment

GitHub stores the reusable application code. Connect your own Google Sheet, Apps Script project, and deployment only when you choose to run an instance. The template contains no connected project or deployment IDs. Deployment is manual by default; pushes and merges only validate.

## Release flow

1. Make changes on a branch and open a pull request.
2. The **Validate** workflow checks every Apps Script server file, the browser JavaScript, the manifest, and required system markers.
3. Review the pull request and merge it into `main` only after validation passes.
4. When ready to release, a maintainer explicitly starts **Actions → Deploy Apps Script → Run workflow** on `main`. The workflow validates again, uploads the complete `apps-script/` directory to the configured project, creates an immutable Apps Script version, and points the configured deployment to that version.

There is no browser copy-and-paste step in this release flow.

## One-time connection

First complete [first-time setup](SETUP.md), including your first domain-restricted web-app deployment. Preserve the manifest's `DOMAIN` access and `USER_ACCESSING` execution. The optional deploy workflow needs your own Apps Script project and deployment IDs plus clasp authorization for that project. Reusing source does not authorize access to another instance.

### Automated setup

From a local copy of the repository:

On a Mac, run `bash automation/setup-clasp.command` once after creating the first deployment. It asks for the Script ID from your project's settings, authorizes clasp through your browser, lists your existing deployments, and asks which deployment ID to preserve. It writes ignored local connection files; it does not upload this source or create the initial deployment. Use the same Node.js 22-or-later environment described in [setup](SETUP.md).

1. Select your destination explicitly: run `GITHUB_REPOSITORY=OWNER/company-demo-prep bash automation/finish-github-setup.command`, replacing `OWNER` with your GitHub account or organization. Both setup helpers also accept `OWNER/REPO` as their first argument. If downloaded separately, replace the script path with its full local path.
2. Complete the GitHub browser sign-in when it opens.

No Homebrew, administrator access, or permanent software installation is required. When a current secure GitHub CLI is not already present, the script downloads the official GitHub CLI `2.97.0` zip for the Mac's architecture, verifies the official checksum manifest and archive, runs `gh` from a private temporary folder, and removes it on exit. Both Apple Silicon (`arm64`) and Intel (`x86_64`) Macs are supported.

When run from Downloads, the script automatically uses `$HOME/Documents/company-demo-prep-system`. When run inside the repository's `automation` folder, it uses that repository root. It does not invoke or replace the older `configure-github.command` file and does not modify project source.

Use `COMPANY_DEMO_PREP_ROOT=/full/path/to/company-demo-prep` if the configured project lives elsewhere. The helpers require an explicit `GITHUB_REPOSITORY` or repository argument; they do not assume an owner's account or silently infer a destination. Check that destination before running a setup helper.

The script validates the local configuration and creates these encrypted repository secrets in the repository you selected:

| Secret | Source |
| --- | --- |
| `APPS_SCRIPT_ID` | `scriptId` in the local `.clasp.json` |
| `APPS_SCRIPT_DEPLOYMENT_ID` | The local `.clasp-deployment-id` |
| `CLASP_CREDENTIALS` | The complete local `$HOME/.clasprc.json` created by `clasp login` |

The script never prints the credential value. GitHub exposes secret names, but cannot show their stored values later.

### Browser alternative

If the Mac cannot download GitHub release assets, open your selected repository and go to **Settings → Secrets and variables → Actions → New repository secret**. Create the same three secrets in the table above. Paste the entire contents of `.clasprc.json`, including its opening and closing braces, into `CLASP_CREDENTIALS`.

## Repository protection

After the first **Validate** run appears in GitHub, protect `main` with a branch ruleset:

- require a pull request before merge;
- require the **Apps Script validation** status check;
- block force pushes and branch deletion;
- do not require an approving reviewer until a second maintainer exists, because GitHub does not count self-approval.

The deploy job uses a `production` environment. A deployment approval gate can be added to that environment later without changing the workflow file.

## Routine changes

- Edit the files in `apps-script/` locally or through a coding agent.
- Review the generated pull request and its validation result.
- Merge the validated pull request. This updates source only.
- Explicitly start **Actions → Deploy Apps Script → Run workflow** on `main` to update your configured app while preserving its URL.
- Check **Actions → Deploy Apps Script** for the immutable Apps Script version number and verification result.

Do not edit production files directly in the Apps Script browser. A later GitHub deployment replaces the complete remote Apps Script project, as designed.

## Manual release and rollback

Use **Actions → Deploy Apps Script → Run workflow** to redeploy the current `main` branch without making a commit.

For a code rollback, revert the unwanted pull request, merge the revert, and explicitly run the deployment workflow on `main`. For an emergency before a revert is ready, Apps Script also retains prior immutable versions, so the existing deployment can be pointed to a prior version in the Apps Script deployment manager.

`automation/deploy.command` remains available as a local emergency fallback. It calls the same deployment implementation used by GitHub Actions.
