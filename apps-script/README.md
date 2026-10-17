# [insert company here] Demo Prep — Apps Script application

This package deploys a domain-restricted Apps Script web app backed by your own Google Sheet. The app is the source of truth; it generates a clean Google Doc for AE review and a final PDF snapshot when a demo is completed.

## Included behavior

- One permanent record per demo
- Separate module selection and AE approval
- Conditional rationale, goal, outcome, time, and setup fields
- Draft → AE Review → Approved → Complete lifecycle
- Google Doc generation containing selected items only
- Post-demo notes and assigned follow-ups
- Completed-record locking and timestamped audit log
- Effective-dated module catalog beginning April 1, 2026
- Company-named Drive folders for every demo record, generated Doc, and final PDF
- Optional collaborative Google Slides link
- Example WOW Demo story for a Finance Manager: Home → Goals & OKRs → Conversations (Anytime, then Scheduled) → Outlook / Gmail integration → Succession Planning → Calibration → AI capabilities
- Custom Demo mode with full module selection
- Multiple personas and a dynamically ordered demo story
- Admin View as the only optional supporting experience
- Gong recording evidence, with an explicit no-recording completion path
- A responsive interface with configurable company text and application title
- Runtime-safe, additive Sheet schema upgrades

## Demo modes

- **WOW Demo** is the default example. It uses the Finance Manager persona and the complete configured sequence: Home → Goals & OKRs → Conversations (Anytime, then Scheduled) → Outlook / Gmail integration → Succession Planning → Calibration → AI capabilities. Its six modules are selected automatically when present in the active catalog. Admin View remains optional.
- **Custom Demo** opens the full current module catalog. The SE or AE selects the scope, records the rationale and intended outcome, and reorders the selected steps in the dynamic demo flow.
- Selecting **Use more than one persona** enables additional persona rows. The personas are shown in the generated record and demo flow.

## Supply your module catalog

A fresh setup seeds only the optional `SUP_ADMIN_VIEW` (Admin View) row. This source template includes no private or external product catalog. Before using the sample WOW story, add and enable your own `Module Catalog` rows with the following `Module ID` values:

| Module ID | Example display name |
| --- | --- |
| `PM_GOALS` | Goals & OKRs |
| `PM_CONVERSATIONS` | Conversations |
| `CAP_INTEGRATIONS` | Outlook / Gmail integration |
| `TI_SUCCESSION` | Succession Planning |
| `TI_CALIBRATION` | Calibration |
| `CAP_AI` | AI capabilities |

Use the catalog headers created by setup. Set `Enabled` to true and active dates that include today. `PM_CONVERSATIONS` supplies both conversation story steps. To demonstrate another product, replace the sample `wowModuleIds`, `wowFlowSteps`, `wowDefaults`, and persona in `Config.gs` together with your catalog. Until you supply that catalog, the fresh template does not offer the six sample modules; the configured WOW story alone does not create them.

## Company filing behavior

The configured `ARCHIVE_FOLDER_ID` is the parent folder. When a demo is first saved, the app creates or reuses a child folder whose name matches the Company Name. The generated Google Doc and final PDF are created inside that company folder. The linked Google Slides file remains in its existing Drive location and is referenced from the demo record.

## Deployment and upgrades

Use the root `README.md` to configure your company and Workspace resources. The manifest remains domain-restricted and executes as the accessing user. The public template does not include a connected Sheet, app project, or credentials.

Use `docs/GITHUB-DEPLOYMENT.md` for the optional GitHub connection. Pull requests and `main` validate automatically. Deployment requires explicitly starting **Deploy Apps Script** on `main` after configuring your own target; a merge alone does not release anything.

Schema upgrades are additive and automatic. On app bootstrap, save, document generation, and diagnostics, the server appends missing expected columns while preserving every existing row. `upgradeDemoPrepSystem()` remains available for an explicit full catalog/format refresh but is not required for routine releases.

## Acceptance test

1. Create a draft demo and select at least one module.
2. Confirm selecting a module reveals its rationale fields.
3. Send the record to AE Review.
4. Confirm a non-AE user cannot add AE approval.
5. Approve every selected module while signed in as the configured AE.
6. Mark the record Approved and generate the Google Doc.
7. Confirm the Doc contains only selected modules and the correct approval state.
8. Add post-demo notes and a follow-up action.
9. Add a valid Gong URL and complete the demo.
10. Confirm the generated Doc and final PDF include the Gong link.
11. Confirm the completed record is locked and remains searchable in the Sheet.
12. Confirm a separate record can be completed with the explicit no-recording option.

## Operational notes

- Keep the Sheet, template Doc, archive folder, and Apps Script project under a stable team-owned Workspace account or Shared Drive governance process.
- Update the `Module Catalog` tab instead of editing module names in application code. Completed records preserve the names and selections captured at that time.
- Use `reopenDemo(demoId, reason)` only for an explicit correction; the action is written to the audit log.
