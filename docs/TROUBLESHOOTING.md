# Troubleshooting

Start with the exact message shown in the app, the saved record's current status, and the Apps Script execution log. Keep private IDs, emails, prospect notes, generated documents, and credentials out of public issues. Use fictional data when describing a problem.

| Symptom or message | Check and next action |
| --- | --- |
| `SPREADSHEET_ID is not configured` | Complete [first-time setup](SETUP.md#4-run-first-time-setup). The value is a script property; adding a Sheet Settings row does not configure it. |
| `Settings sheet is missing` or a header mismatch | Confirm the project points to the intended Sheet. Compare tab names and header order with `Config.gs`; restore a backup or test repairs on a copy. Do not delete populated tabs to make setup succeed. |
| Diagnostics lists `Configure Settings...` | Replace blank/`PASTE_...`/`example.com` settings with your own Doc, folder, and Workspace domain. Diagnostics can add missing columns; back up populated Sheets before maintenance. |
| Workspace identity unavailable, wrong identity, or domain restriction error | Use the correct Workspace account and a deployment configured as `USER_ACCESSING` / `DOMAIN`. Match `ALLOWED_DOMAIN` to that account's domain. Resolve administrator policy rather than broadening app access. |
| Sheet, template, folder, generated Doc, or PDF cannot be opened | Because the app executes as its user, check that user's direct/shared-drive permissions on every resource. Verify the configured IDs, then retry with fictional data. Web-app access does not grant Drive access. |
| Only Admin View appears, or `standard WOW Demo scope is incomplete` | Fresh setup seeds only Admin View. Supply enabled, currently active rows for all six [sample module IDs](../apps-script/README.md#supply-your-module-catalog), or choose Custom Demo with your own catalog. Diagnostics does not check the WOW IDs. |
| AE approval checkbox is disabled | Save the correct AE email, then open the record signed in with that exact account. Select the module before approving it. Changing scope after approval may require fresh approval. |
| Review record saved but email not sent | Check the app's authorization link, sender's mail quota, and execution/audit log. The record and working Doc may already be saved. Authorize mail and request review again; successful send reporting is still separate from delivery to the recipient's inbox. |
| Gong recording rejected | Use an HTTPS URL on `gong.io` or a subdomain. Do not select the no-recording option at the same time. A valid URL's content and recipient access still need a human check. |
| Completion fails and the record is now locked | Completion saves `Complete` before generating files. Inspect the saved status, audit log, Doc/PDF links, and Drive permissions. An authorized operator can use `reopenDemo(demoId, reason)` for a documented correction and retry; do not create a duplicate record as the first recovery step. |
| Edits made in a generated Doc disappear | Refresh rewrites the generated body from the app. Put durable planning content in the structured form or keep separate supporting documents. |
| Old modules disappear after a catalog change | The app reads the current active catalog and matches saved selections by display name. Restore stable catalog names/active rows after evaluating the change on a copy; consult archived Docs/PDFs for the previous snapshot. |
| GitHub workflow says secrets are missing | A source-only fork is expected to have no deployment credentials. Follow [optional deployment setup](GITHUB-DEPLOYMENT.md) only if you intend to run your own instance. Never copy someone else's deployment credentials. |
| GitHub source updated but app looks unchanged | Merges do not deploy. Explicitly run **Deploy Apps Script** on `main` after reviewing the target, then check the verified version. Browser upgrades must update the existing deployment version. |
| Local helper cannot find the project or repository | Run from the configured repository or set `COMPANY_DEMO_PREP_ROOT`. Supply `GITHUB_REPOSITORY=OWNER/REPO` or an explicit repository argument. The helper intentionally has no default account. |
| CLI checksum verification fails | Stop. Nothing from the failed verification should execute. Use the documented browser alternative or investigate the pinned release/checksum before retrying; do not disable verification. |

`runDemoPrepDiagnostics()` checks expected headers and three required settings. It does not test permissions for a second account, mail delivery, quotas, catalog completeness, or end-to-end completion. Follow the [acceptance checklist](../apps-script/README.md#acceptance-test) after setup and releases.

To report a code bug, follow [CONTRIBUTING.md](../CONTRIBUTING.md). For suspected credential exposure, follow [security guidance](SECURITY.md), revoke the affected authorization, and keep the report private.
