# Install your own Workspace instance

This is source code, not a hosted service. You supply the Google Workspace account, Sheet, Doc, folder, and deployment. Start with fictional demo data. Your Workspace administrator may need to allow Apps Script, domain-restricted web apps, and the requested Google permissions.

## 1. Get the source

Download the repository ZIP and extract it, or clone your own copy:

```bash
git clone https://github.com/OWNER/company-demo-prep.git
cd company-demo-prep
```

Replace `OWNER` with the account or organization containing your copy. A browser-only installation needs no Node.js, clasp, or GitHub credentials. Optional local validation and the Mac automation require Node.js 22 or later; the Actions workflow uses Node.js 24.

## 2. Prepare the Workspace resources

Use a dedicated team-owned location and create:

| Resource | What to prepare |
| --- | --- |
| Google Sheet | A new, empty spreadsheet for this app. Setup creates its tabs and headers. Do not use an unrelated business spreadsheet. |
| Google Doc | A blank document to copy when generating records. The app clears the copy's body and writes its own layout; it does not fill template merge fields. |
| Drive folder | A parent archive folder for prospect company folders, working Docs, and final PDFs. |

The app executes as each person using it. Give each intended AE and SE the required access to the Sheet, template Doc, and archive folder, including permission to edit records and create files. Sharing a web-app link alone does not grant access to these resources. Review your organization's Drive sharing rules; the app does not create public sharing links or manage membership for you.

Keep the resource IDs private. The Sheet and Doc IDs are the text between `/d/` and the next `/` in their URLs; the folder ID follows `/folders/`. Use IDs, not complete URLs, in setup.

## 3. Add the application files

Open the new Sheet's Apps Script editor, or create a standalone Apps Script project under the same Workspace account. Add the files below using their supplied contents and names. Replace the editor's initial `Code.gs`; do not keep a duplicate `doGet` function.

| Script files | HTML files |
| --- | --- |
| `Code.gs` | `Index.html` |
| `Config.gs` | `Client.html` |
| `Data.gs` | `Styles.html` |
| `Documents.gs` | |
| `Notifications.gs` | |
| `Setup.gs` | |

Copy [appsscript.json](../apps-script/appsscript.json) into the project's manifest, exposing the manifest through the editor's project settings if needed. Preserve `webapp.executeAs: USER_ACCESSING` and `webapp.access: DOMAIN`. Keep the explicit empty libraries arrays. If you change the manifest timezone, also set the matching timezone below.

## 4. Run first-time setup

The editor's Run menu cannot supply a configuration argument. Add a temporary file named `LocalSetup.gs` **in your own Apps Script project**, paste the wrapper below, and replace every placeholder. This is installation configuration; keep the filled version out of the public repository.

```javascript
function setupMyDemoPrep() {
  configureDemoPrepSystem({
    spreadsheetId: 'PASTE_SPREADSHEET_ID_HERE',
    templateDocId: 'PASTE_GOOGLE_DOC_ID_HERE',
    archiveFolderId: 'PASTE_DRIVE_FOLDER_ID_HERE',
    allowedDomain: 'YOUR_WORKSPACE_DOMAIN',
    companyName: '[insert company here]',
    appName: '',
    timezone: 'America/Los_Angeles'
  });
  console.log(JSON.stringify(runDemoPrepDiagnostics()));
}
```

`allowedDomain` is your actual Workspace email domain without `@`, a URL, or a wildcard. Replace the company placeholder with your company name. Leave `appName` blank for `<company name> Demo Prep`, or supply a custom title.

Select `setupMyDemoPrep` and run it. Review the Google permission request for Sheets, Docs, Drive, your signed-in email identity, and sending review emails. If your administrator blocks it, resolve that with the administrator while preserving the domain restriction. The setup writes settings, creates tabs, and seeds one optional Admin View catalog row. It does not send an email or deploy the app.

Check the execution log for `ok: true`. Resolve every listed problem. You can remove `LocalSetup.gs` after successful setup; settings remain in the Sheet and the spreadsheet ID remains in script properties. Re-running `configureDemoPrepSystem` replaces the setup fields you pass, so do not run a placeholder wrapper against an existing installation.

## 5. Supply your module catalog

Follow [the catalog schema and sample module IDs](../apps-script/README.md#supply-your-module-catalog). Fresh setup does not supply the six product modules used by WOW Demo. Add your own enabled rows before testing that mode, or adapt the sample story and catalog together for your product.

Keep setup-created sheet names and column headers intact. The `Settings` tab has these editable keys:

| Key | Meaning |
| --- | --- |
| `COMPANY_NAME` | Header text; defaults to `[insert company here]`. |
| `APP_NAME` | Optional custom browser/document/email sender title. Blank derives it from the company name. |
| `TEMPLATE_DOC_ID` | Your blank source Doc ID. |
| `ARCHIVE_FOLDER_ID` | Your archive-parent folder ID. |
| `ALLOWED_DOMAIN` | Your Workspace email domain. Configure before deployment. |
| `DEFAULT_TIMEZONE` | Timezone used for dates and generated IDs; defaults to `America/Los_Angeles`. |
| `LOCK_COMPLETED_RECORDS` | `TRUE` keeps completed records locked through the normal save path. |
| `GENERATE_PDF_SNAPSHOT` | `TRUE` creates the final PDF during completion. |

`SPREADSHEET_ID` is a **script property**, set by setup, rather than a `Settings` row. A successful diagnostics result checks schema and required settings; it does not prove catalog completeness, other users' Drive permissions, email delivery, or a working deployment.

## 6. Create the first domain-restricted deployment

In your Apps Script project's deployment controls, create a **Web app** deployment. Set it to execute as the **user accessing the web app** and allow only your Workspace domain. These selections must match `USER_ACCESSING` and `DOMAIN` in the manifest. If your account cannot offer domain access, this installation path is unavailable; ask your administrator instead of opening access to everyone.

Save the deployment ID privately and copy its `/exec` web-app URL. Open that URL with your Workspace account. Confirm the identity displayed in the header is the account you intended. Each participating user must authorize their own access and have the required Drive permissions.

Follow [the usage guide](USAGE.md) and the [acceptance checklist](../apps-script/README.md#acceptance-test) with fictional data and two accounts if separate AE/SE approval is required. Confirm the Doc and PDF actually open, and separately confirm any review email arrives. Source validation alone proves none of those live actions.

## 7. Choose how to release later changes

You may keep using the [browser-based upgrade path](../UPGRADE-GUIDE.md#browser-based-fallback), or connect your existing deployment to [optional GitHub release automation](GITHUB-DEPLOYMENT.md). The Mac setup helper expects the project and first web-app deployment to exist already. It does not install this app from scratch.

GitHub pushes and merges validate only. A configured maintainer must explicitly start **Deploy Apps Script** on `main` to release. Keep [security guidance](SECURITY.md) and [troubleshooting](TROUBLESHOOTING.md) available to the people operating the instance.
