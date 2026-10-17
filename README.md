# [insert company here] Demo Prep

A reusable, domain-restricted Google Workspace app for collaborative demo planning, AE approval, document generation, post-demo closeout, and permanent record archiving.

## Start here

| Need | Guide |
| --- | --- |
| Install a new instance | [First-time setup](docs/SETUP.md) — resources, source files, setup wrapper, permissions, and first deployment |
| Prepare, review, and finish a demo | [AE/SE usage guide](docs/USAGE.md) |
| Configure the sample modules | [Catalog and app reference](apps-script/README.md#supply-your-module-catalog) |
| Release or update an instance | [Optional GitHub deployment](docs/GITHUB-DEPLOYMENT.md) and [upgrade guide](UPGRADE-GUIDE.md) |
| Resolve an error | [Troubleshooting](docs/TROUBLESHOOTING.md) |
| Protect data or contribute | [Security](docs/SECURITY.md) and [contributing/validation](CONTRIBUTING.md) |

AE means account executive/reviewer; SE means the person preparing the demonstration. This is a shared Workspace team tool. It does not provide per-record visibility controls or a hosted service. A new installation requires your own module catalog and Workspace access; the public source is not a connected demo environment.

## Deliverables

- `apps-script/` — production Apps Script source and manifest.
- `.github/workflows/` — validation for pull requests and `main`, plus an explicitly started deployment workflow.
- `automation/` — shared validation/deployment implementation plus secure one-time GitHub and local setup helpers.
- `docs/GITHUB-DEPLOYMENT.md` — concise operating guide for the GitHub source-of-truth workflow.

This template contains source code only. Supply your own Google Sheet, module catalog, template Google Doc, and archive folder. Keep prospect data, generated records, private research, and account credentials in your approved Workspace storage. The header uses configurable company text and contains no company logo.

## Configure your company

Set `COMPANY_NAME` in the Sheet's `Settings` tab to your company name. The default is `[insert company here]`. Leave `APP_NAME` blank to use `<company name> Demo Prep`, or set a custom application title; the same title appears in the browser, generated documents, and email sender name. Existing installations should replace any prior `APP_NAME` value themselves.

Configure `SPREADSHEET_ID`, `TEMPLATE_DOC_ID`, `ARCHIVE_FOLDER_ID`, and `ALLOWED_DOMAIN` with your own Workspace resources. `ALLOWED_DOMAIN` must be your Workspace email domain, without `@`. Preserve the manifest's `DOMAIN` access and `USER_ACCESSING` execution mode. The sample Finance Manager demo story and product modules are editable examples; adapt `Config.gs` and your Sheet's `Module Catalog` for your own product.

Fresh setup seeds only the optional Admin View catalog row. Supply and enable your own module catalog before using the sample story; the six required example module IDs and configuration steps are listed in `apps-script/README.md`.

The Apps Script setup function accepts `companyName` and `appName` alongside the existing setup fields. For example:

```javascript
configureDemoPrepSystem({
  spreadsheetId: 'PASTE_SPREADSHEET_ID_HERE',
  templateDocId: 'PASTE_GOOGLE_DOC_ID_HERE',
  archiveFolderId: 'PASTE_SHARED_DRIVE_FOLDER_ID_HERE',
  allowedDomain: 'your-company.example',
  companyName: '[insert company here]'
});
```

Replace the placeholders, run setup in your own Apps Script project, and resolve every `runDemoPrepDiagnostics()` problem before deploying. The template ships no connected app, deployment IDs, or credentials. Pushing or merging source does not deploy it; a configured maintainer must explicitly start **Deploy Apps Script**.

For the editor's runnable setup wrapper and complete first-install steps, follow [first-time setup](docs/SETUP.md). The short example above describes the configuration shape; the editor's Run menu cannot pass that argument itself.

## Intended workflow

1. The SE creates one demo record.
2. Selecting a module reveals its rationale, prospect goal, intended outcome, timing, and setup notes.
3. The AE approves each selected item separately.
4. The app generates a clean Google Doc containing selected items only.
5. The SE records post-demo outcomes, follow-ups, and the Gong recording—or explicitly confirms that no recording is available.
6. Completion saves and locks the record, refreshes the Google Doc, and creates a final PDF when enabled. Check the resulting links separately; a file-generation failure can occur after the record is saved.

Company-named Drive folders keep the working Doc, final PDF, and related record links together. Google Slides can be attached for AE/SE collaboration. WOW Demo is the default story; Custom Demo opens the complete active module catalog and multi-persona flow controls.

GitHub is the source of truth for application code. The Google Sheet is the source of truth for demo records. Generated Docs and PDFs are shareable outputs and historical snapshots.

For optional GitHub deployment, see [the deployment guide](docs/GITHUB-DEPLOYMENT.md).
For an existing installation, follow [the upgrade guide](UPGRADE-GUIDE.md); browser-based deployment remains available as a fallback.
