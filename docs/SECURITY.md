# Deployment security

- This repository is a source template. Keep your connected Sheet, prospect records, generated documents, internal research, private deployment configuration, and credentials out of public repositories.
- Never commit `.clasp.json`, `.clasp-deployment-id`, `.clasprc.json`, exported environment files, or copied secret values. The three clasp files are ignored by Git; other exports must be kept outside the checkout or explicitly ignored before creation.
- The one-time Mac setup does not install GitHub CLI. If a current secure version is unavailable, it downloads GitHub's immutable official `2.97.0` release, verifies the checksum manifest against a pinned SHA-256 digest, verifies the architecture-specific archive, and deletes the temporary binary on exit.
- For Actions, store clasp authorization in GitHub Actions secrets. Local authorization remains in your account-level clasp configuration; keep it private. Workflow permissions are read-only for repository content.
- The deploy workflow runs only on GitHub-hosted `ubuntu-latest` runners, writes credentials with owner-only permissions, and removes the temporary credential file even when deployment fails.
- Deployment is manual by default: a maintainer explicitly starts **Deploy Apps Script** on `main` after configuring their own project and credentials. Pushes, merges, and pull requests do not deploy; pull requests never receive deployment secrets.
- Preserve manifest access `DOMAIN` and execution `USER_ACCESSING`. Set `Settings.ALLOWED_DOMAIN` to your Workspace domain and confirm diagnostics before deploying. Repository publication does not make the connected app or Workspace records public.
- GitHub Actions dependencies are pinned to immutable commit SHAs. Dependabot proposes updates weekly.
- If clasp credentials may have been exposed, revoke the Google authorization, run `clasp login` again, and replace `CLASP_CREDENTIALS` in GitHub before the next deployment.
- Review GitHub's Actions log after every deployment. A release is complete only when the script confirms that the existing deployment ID points to the newly created Apps Script version.

## Workspace data and reporting

Domain access is the outer boundary, not per-record authorization. Permitted team members share the configured records and can choose the AE email on a record; this is not an immutable enterprise role or approval-governance system. Use it only where team-wide access is appropriate. Review underlying Drive permissions and retention, and avoid confidential customer data in test fixtures or screenshots.

For a suspected vulnerability, use GitHub private vulnerability reporting if available. Otherwise ask for a private contact without publishing exploit details. Do not post credentials, active deployment identifiers, prospect records, or unredacted logs in an issue. [Contributor guidance](../CONTRIBUTING.md) covers ordinary bug reports; [troubleshooting](TROUBLESHOOTING.md) covers operational failures.
