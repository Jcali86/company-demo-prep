# [insert company here] Demo Prep — current upgrade

This upgrade preserves existing Sheet records, settings, company folders, and the current web-app URL.

## What changes

- Saving a demo creates or reuses a child folder named for the Company Name inside the configured `Generated Demo Records` folder.
- Generated Google Docs and final PDFs are saved in that company folder.
- A Google Slides URL can be linked for AE/SE collaboration.
- New demos default to the example **WOW Demo** for a Finance Manager: Home → Goals & OKRs → Conversations (Anytime, then Scheduled) → Outlook / Gmail integration → Succession Planning → Calibration → AI capabilities. Supply the corresponding active catalog rows described in `apps-script/README.md`.
- **Custom Demo** opens the full active module catalog.
- Multiple personas can be added when required.
- The demo plan is built dynamically from the selected scope and can be reordered.
- Admin View replaces the former Supporting Experience choices.
- Module-selection and AE-approval controls are aligned consistently.
- A Gong URL can be added during closeout and is linked in the finalized document.
- If no recording exists, an explicit **No Gong recording available** confirmation permits manual completion.
- The app uses company text from `Settings.COMPANY_NAME` and an optional title from `Settings.APP_NAME`; no company logo is embedded.
- Required Sheet columns are added automatically by the app at runtime.

## Preferred: GitHub release

Configure your own Workspace resources and the optional GitHub connection in `docs/GITHUB-DEPLOYMENT.md`. Review a pull request and merge it into `main` after validation passes. When ready to release to your configured app, explicitly start **Actions → Deploy Apps Script → Run workflow** on `main`; this creates an immutable Apps Script version and updates that deployment. Merging alone does not deploy.

No Apps Script migration function is required for this release. On the first app load, the Sheet schema self-upgrades by appending missing workflow and Gong columns without deleting or reordering existing data.

## Browser-based fallback

In the existing Apps Script project, replace the complete contents of these seven files:

1. `Config.gs`
2. `Data.gs`
3. `Documents.gs`
4. `Setup.gs`
5. `Index.html`
6. `Client.html`
7. `Styles.html`

Also update `Code.gs` and `Notifications.gs` for the configurable company title. Preserve `appsscript.json` access `DOMAIN` and execution `USER_ACCESSING`.

Save the project, create a new deployment version, and refresh the existing web-app URL. The first authenticated app load performs the additive schema check. `runDemoPrepDiagnostics()` remains available for an explicit health check.

After it succeeds, run `runDemoPrepDiagnostics` and confirm the execution result contains `ok: true`.

## Publish the browser-based upgrade

1. Select **Deploy → Manage deployments**.
2. Edit the active web-app deployment.
3. Under **Version**, select **New version**.
4. Add the description `WOW/Custom workflow and company folders`.
5. Select **Deploy**.
6. Refresh the existing web-app URL.

## Acceptance test

1. Create a new WOW Demo and save it as a draft.
2. Confirm a company-named folder appears inside `Generated Demo Records`.
3. Confirm the default persona is Finance Manager and the configured story is Home → Goals & OKRs → Conversations (Anytime, then Scheduled) → Outlook / Gmail integration → Succession Planning → Calibration → AI capabilities; confirm the six sample modules are present and enabled in your catalog.
4. Add a valid Google Slides URL and confirm the link appears after saving.
5. Select Admin View, add its rationale, and confirm it appears in the dynamic plan.
6. Reorder the selected steps with the arrow controls.
7. Switch a separate test record to Custom Demo and confirm the full active catalog appears.
8. Enable multiple personas and add a second persona.
9. Have the configured AE approve the selected items and adjust the flow.
10. Generate the Google Doc and confirm it is saved in the company folder.
11. Add a valid Gong URL, complete the record, and confirm the Doc and final PDF contain the recording link.
12. In a separate disposable record, select **No Gong recording available** and confirm manual completion succeeds.

## Settings after the upgrade

The additive schema check supplies `COMPANY_NAME` with `[insert company here]`. Set it to your company name. Replace any previous `APP_NAME` value, or clear it to derive the title from `COMPANY_NAME`; existing settings and generated documents are never changed by editing this source alone. `ARCHIVE_FOLDER_ID` continues to contain your archive-parent folder ID, with prospect company folders created underneath it. Preserve and verify your own `ALLOWED_DOMAIN`.
