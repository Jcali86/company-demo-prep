# Use the demo workspace

**SE** means the person preparing and running the demonstration; **AE** means its account executive/reviewer. The AE is the email entered on each record, rather than a separate centrally managed application role. Team members access the same configured Sheet; this is a shared team workspace, with no per-prospect or per-record visibility boundary.

## Prepare and save

1. Open your deployed app, check the Workspace identity shown in its header, and choose **New demo**.
2. Enter the prospect's **Company name**, date/time, duration, AE and SE emails, objective, and notes. Company name and valid duration are required even for a draft. Saving creates or reuses that prospect company's Drive folder.
3. Choose **WOW Demo** for the configured sample story, or **Custom Demo** to choose from the active catalog. Selection and approval are separate controls. Fill in why each selected module belongs, the prospect goal, intended outcome, timing, and setup notes.
4. Add personas, Google Slides, handoffs, and run-of-show notes as needed. In Custom Demo, use the flow arrows to change module order. WOW Demo's standard steps stay fixed; optional steps can follow them.
5. Select **Save draft**. Wait for the saved message. Reopen saved work with the record picker in the header; use it to confirm the expected company/date/status.

The app does not autosave. Save before switching records or closing the page. A Google Slides URL must begin with `https://docs.google.com/presentation/d/`; it remains a reference to the existing Slides file, with its existing permissions.

## Request and record approval

Select **Request AE review** after entering a valid AE email. This saves the record as **AE Review**, generates or refreshes the working Doc, and attempts to email the AE links to the record and Doc. If email authorization is requested, authorize it and request review again. A saved review record, a generated Doc, and a delivered email are distinct results; read the message shown after the action.

The AE opens the same app with the exact account entered in **AE email**, checks **AE approved** for every selected module, and saves. The app prevents a different signed-in account from granting a new module approval. After required fields and approvals are complete, select **Mark approved**.

Approval/completion requires a date/time, valid AE and SE emails, at least one persona, a second persona when multiple-persona mode is enabled, and every selected module approved. WOW Demo also requires all six configured standard modules. An SE's changes to previously approved scope/details clear the affected module's approval on save; request review again when that happens.

## Generate documents and finish

**Generate / refresh Doc** saves the form and writes the current selected scope to the working Google Doc. It can be used before final approval; the document includes approval state. Refreshing replaces the generated Doc body, so make durable changes in the app rather than editing generated text by hand.

After the meeting, complete **What landed**, **Recommended next step**, any questions/objections, and follow-up actions. Choose exactly one recording path: a valid HTTPS Gong URL, or **No Gong recording available**. The URL records a reference; it does not upload, fetch, or verify the recording's sharing permissions. Follow-up rows record owners/dates/status; the app does not send reminders or create external tasks for them.

Select **Complete and archive** and confirm the prompt. The action saves **Complete**, refreshes the working Doc, and creates a PDF when `GENERATE_PDF_SNAPSHOT` is `TRUE`. Open the resulting links and check the folder and recording reference. Completed records are locked by default. For a correction, an authorized operator must deliberately call `reopenDemo(demoId, reason)`; its reason is recorded in the audit log. There is no reopen button in the normal UI.

If a step fails, check [troubleshooting](TROUBLESHOOTING.md) before retrying. Completion saves the locked state before Doc/PDF generation; a file error can leave a completed record without a final artifact. The audit log and saved record help the operator recover without re-entering the demo.

## Keep the record and catalog reliable

The Sheet holds structured records and approval/audit data. Working Docs can be refreshed; PDFs are snapshots, not a tamper-proof or immutable records system. Govern edits and retention through your organization's Workspace controls.

Keep catalog module IDs and display names stable after use. The current reader joins stored selections by display name to the **currently active** catalog; renaming, disabling, expiring, or removing a module can affect how older records appear. Preserve completed Doc/PDF snapshots and evaluate catalog changes against copied test data first. [Contributor notes](../CONTRIBUTING.md) explain how to validate source changes without connecting production credentials.
