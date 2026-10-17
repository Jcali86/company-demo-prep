function generateOrRefreshDemoDocument(demoId) {
  const userEmail = enforceDomainAccess_();
  ensureRuntimeSchema_();
  const record = getDemoRecord_(demoId);
  const settings = getSettings_();
  const folderId = safeText_(settings.ARCHIVE_FOLDER_ID);
  const templateId = safeText_(settings.TEMPLATE_DOC_ID);
  if (!folderId || folderId.indexOf('PASTE_') === 0) throw new Error('Configure ARCHIVE_FOLDER_ID in Settings.');
  if (!templateId || templateId.indexOf('PASTE_') === 0) throw new Error('Configure TEMPLATE_DOC_ID in Settings.');
  const folder = getCompanyFolderForRecord_(record, folderId);
  let docId = extractGoogleFileId_(record.demo.workingDocUrl);
  let file;
  if (docId) {
    try { file = DriveApp.getFileById(docId); } catch (error) { docId = ''; }
  }
  if (!docId) {
    const title = record.demo.company + ' – Demo Prep – ' + (dateOnlyForClient_(record.demo.demoDateTime) || 'Date TBD');
    file = DriveApp.getFileById(templateId).makeCopy(title, folder);
    docId = file.getId();
  }
  const doc = DocumentApp.openById(docId);
  writeGeneratedDocument_(doc, record);
  doc.saveAndClose();
  updateDemoLinks_(demoId, 'https://docs.google.com/document/d/' + docId + '/edit', null);
  audit_(demoId, userEmail, 'DOCUMENT_GENERATED', docId);
  return { demoId: demoId, documentId: docId, documentUrl: 'https://docs.google.com/document/d/' + docId + '/edit' };
}

function completeDemo(payload) {
  const saved = saveDemo(payload, 'Complete');
  const result = generateOrRefreshDemoDocument(saved.demo.demoId);
  const settings = getSettings_();
  if (asBoolean_(settings.GENERATE_PDF_SNAPSHOT)) {
    const pdf = createFinalPdf_(saved.demo.demoId, result.documentId);
    result.pdfUrl = pdf.pdfUrl;
  }
  return Object.assign(result, { record: getDemoRecord_(saved.demo.demoId) });
}

function writeGeneratedDocument_(doc, record) {
  const body = doc.getBody();
  body.clear();
  const demo = record.demo;
  appendStyledParagraph_(body, getBranding_().appName, 26, true, '#273553', 0, 3, 'Merriweather');
  appendStyledParagraph_(body, demo.company + '  •  ' + formatDemoDate_(demo.demoDateTime) + '  •  ' + demo.duration, 11, false, '#596273', 0, 12);
  appendLabelValue_(body, 'AE', demo.aeEmail);
  appendLabelValue_(body, 'SE', demo.seEmail);
  appendLabelValue_(body, 'Status', demo.status);
  appendLabelValue_(body, 'Demo approach', demo.demoMode || 'WOW Demo');
  appendLabelValue_(body, 'Persona' + (demo.personas.length === 1 ? '' : 's'), demo.personas.join(', '));
  const opportunity = body.appendParagraph('');
  opportunity.appendText('Opportunity: ').setBold(true).setFontFamily('Manrope').setFontSize(11).setForegroundColor('#273553');
  const opportunityValue = opportunity.appendText(demo.opportunityUrl || 'Not provided').setFontFamily('Manrope').setFontSize(11).setForegroundColor('#2E2F2F');
  if (demo.opportunityUrl) opportunityValue.setLinkUrl(demo.opportunityUrl);
  opportunity.setSpacingAfter(3);
  if (demo.slidesUrl) appendLinkedValue_(body, 'Collaborative Google Slides', demo.slidesUrl, 'Open Google Slides');

  appendHeading_(body, 'Demo objective', 1);
  appendBodyText_(body, demo.meetingObjective || 'Not provided');
  appendHeading_(body, 'AE notes', 1);
  appendBodyText_(body, demo.aeNotes || 'None recorded');

  appendHeading_(body, 'Approved demo scope', 1);
  appendBodyText_(body, 'Only selected items appear below. AE approval is recorded separately from selection.');
  const selected = record.modules.filter(item => item.selected).sort((a, b) => Number(a.flowOrder) - Number(b.flowOrder));
  const scopeRows = [['Module or capability', 'Why show it', 'Prospect goal', 'Intended outcome', 'Time']];
  selected.forEach(item => scopeRows.push([item.displayName + (item.aeApproved ? ' — Approved' : ' — Pending'), item.whyShow, item.prospectGoal, item.intendedOutcome, item.minutes ? item.minutes + ' min' : '—']));
  if (!selected.length) scopeRows.push(['No items selected', '', '', '', '']);
  const scope = body.appendTable(scopeRows);
  styleDocumentTable_(scope, [100, 125, 115, 140, 60]);

  appendHeading_(body, 'Demo plan and process', 1);
  const planRows = [['Order', 'Story step', 'Persona', 'Approval']];
  if ((demo.demoMode || 'WOW Demo') === 'WOW Demo') {
    const byModuleId = {};
    selected.forEach(item => { byModuleId[item.moduleId] = item; });
    DEMO_PREP.wowFlowSteps.forEach((step, index) => {
      const module = step.moduleId ? byModuleId[step.moduleId] : null;
      const approval = step.standard ? 'Standard WOW step' : (module && module.aeApproved ? 'AE approved' : 'Pending');
      planRows.push([String(index + 1), step.displayName, demo.personas.join(', ') || DEMO_PREP.defaultPersona, approval]);
    });
    const optional = selected.filter(item => DEMO_PREP.wowModuleIds.indexOf(item.moduleId) < 0);
    optional.forEach((item, index) => {
      planRows.push([String(DEMO_PREP.wowFlowSteps.length + index + 1), item.displayName, demo.personas.join(', '), item.aeApproved ? 'AE approved' : 'Pending']);
    });
  } else {
    selected.forEach((item, index) => {
      planRows.push([String(index + 1), item.displayName, demo.personas.join(', '), item.aeApproved ? 'AE approved' : 'Pending']);
    });
  }
  const plan = body.appendTable(planRows);
  styleDocumentTable_(plan, [55, 235, 115, 90]);
  appendHeading_(body, 'Additional run-of-show notes', 2);
  appendBodyText_(body, demo.runOfShow || 'None recorded');
  appendHeading_(body, 'AE / SE handoffs', 2);
  appendBodyText_(body, demo.handoffs || 'Not provided');

  appendHeading_(body, 'Post-demo notes', 1);
  appendHeading_(body, 'What landed', 2);
  appendBodyText_(body, demo.whatLanded || 'Pending demo completion');
  appendHeading_(body, 'Questions and objections', 2);
  appendBodyText_(body, demo.questionsObjections || 'None recorded');
  appendHeading_(body, 'Recommended next step', 2);
  appendBodyText_(body, demo.nextStep || 'Pending demo completion');
  if (demo.gongUrl) {
    appendLinkedValue_(body, 'Gong recording', demo.gongUrl, 'Open Gong recording');
  } else if (demo.noGongRecording) {
    appendLabelValue_(body, 'Gong recording', 'Not available — completion confirmed manually');
  } else {
    appendLabelValue_(body, 'Gong recording', 'Not recorded (legacy record)');
  }

  appendHeading_(body, 'Follow-up actions', 1);
  const followRows = [['Action', 'Owner', 'Due date', 'Status']];
  record.followUps.forEach(item => followRows.push([item.action, item.ownerEmail, item.dueDate || '—', item.status]));
  if (!record.followUps.length) followRows.push(['No follow-ups recorded', '', '', '']);
  const follow = body.appendTable(followRows);
  styleDocumentTable_(follow, [180, 100, 80, 80]);

  appendStyledParagraph_(body, 'Generated from ' + getBranding_().appName + '. The structured record and approval history remain the source of truth.', 9, false, '#596273', 18, 0);
}

function appendHeading_(body, text, level) {
  const p = body.appendParagraph(text);
  p.setHeading(level === 1 ? DocumentApp.ParagraphHeading.HEADING1 : DocumentApp.ParagraphHeading.HEADING2);
  const attrs = {};
  attrs[DocumentApp.Attribute.FONT_FAMILY] = 'Merriweather';
  attrs[DocumentApp.Attribute.FONT_SIZE] = level === 1 ? 20 : 16;
  attrs[DocumentApp.Attribute.BOLD] = false;
  attrs[DocumentApp.Attribute.FOREGROUND_COLOR] = '#273553';
  p.setAttributes(attrs);
  p.setSpacingBefore(level === 1 ? 20 : 18).setSpacingAfter(6);
  return p;
}

function appendBodyText_(body, text) {
  const p = body.appendParagraph(text || '');
  styleParagraph_(p, 11, false, '#2E2F2F', 0, 8);
  return p;
}

function appendLabelValue_(body, label, value) {
  const p = body.appendParagraph('');
  const labelRun = p.appendText(label + ': ');
  labelRun.setBold(true).setFontFamily('Manrope').setFontSize(11).setForegroundColor('#273553');
  p.appendText(value || 'Not provided').setFontFamily('Manrope').setFontSize(11).setForegroundColor('#2E2F2F');
  p.setSpacingAfter(3);
  return p;
}

function appendLinkedValue_(body, label, url, linkText) {
  const p = body.appendParagraph('');
  p.appendText(label + ': ').setBold(true).setFontFamily('Manrope').setFontSize(11).setForegroundColor('#273553');
  p.appendText(linkText || 'Open link').setFontFamily('Manrope').setFontSize(11).setForegroundColor('#523384').setUnderline(true).setLinkUrl(url);
  p.setSpacingAfter(3);
  return p;
}

function appendStyledParagraph_(body, text, size, bold, color, before, after, fontFamily) {
  const p = body.appendParagraph(text);
  styleParagraph_(p, size, bold, color, before, after, fontFamily);
  return p;
}

function styleParagraph_(p, size, bold, color, before, after, fontFamily) {
  const attrs = {};
  attrs[DocumentApp.Attribute.FONT_FAMILY] = fontFamily || 'Manrope';
  attrs[DocumentApp.Attribute.FONT_SIZE] = size;
  attrs[DocumentApp.Attribute.BOLD] = bold;
  attrs[DocumentApp.Attribute.FOREGROUND_COLOR] = color;
  p.setAttributes(attrs).setSpacingBefore(before).setSpacingAfter(after).setLineSpacing(1.15);
}

function styleDocumentTable_(table, widths) {
  table.setBorderColor('#D4DADF').setBorderWidth(1);
  for (let r = 0; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    for (let c = 0; c < row.getNumCells(); c++) {
      const cell = row.getCell(c);
      cell.setWidth(widths[c]);
      cell.setBackgroundColor(r === 0 ? '#273553' : (r % 2 === 0 ? '#ECEFF1' : '#FFFFFF'));
      const text = cell.editAsText();
      text.setFontFamily('Manrope').setFontSize(10).setForegroundColor(r === 0 ? '#FFFFFF' : '#2E2F2F').setBold(r === 0);
    }
  }
}

function createFinalPdf_(demoId, docId) {
  const record = getDemoRecord_(demoId);
  const folder = getCompanyFolderForRecord_(record, getSettings_().ARCHIVE_FOLDER_ID);
  const name = record.demo.company + ' – Demo Record – ' + dateOnlyForClient_(record.demo.demoDateTime) + ' – Final.pdf';
  const blob = DriveApp.getFileById(docId).getAs(MimeType.PDF).setName(name);
  const file = folder.createFile(blob);
  updateDemoLinks_(demoId, null, file.getUrl());
  audit_(demoId, getCurrentUserEmail_(), 'FINAL_PDF_CREATED', file.getId());
  return { pdfId: file.getId(), pdfUrl: file.getUrl() };
}

function getCompanyFolderForRecord_(record, fallbackFolderId) {
  const id = safeText_(record.demo.companyFolderId);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (error) { /* Fall back below. */ }
  }
  return DriveApp.getFolderById(fallbackFolderId);
}

function updateDemoLinks_(demoId, documentUrl, pdfUrl) {
  const sheet = getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.demos);
  const rows = rowsAsObjects_(sheet);
  const rowIndex = rows.findIndex(row => row['Demo ID'] === demoId);
  if (rowIndex < 0) throw new Error('Demo not found.');
  if (documentUrl) sheet.getRange(rowIndex + 2, DEMO_PREP.headers.demos.indexOf('Working Doc URL') + 1).setValue(documentUrl);
  if (pdfUrl) sheet.getRange(rowIndex + 2, DEMO_PREP.headers.demos.indexOf('Final PDF URL') + 1).setValue(pdfUrl);
}

function extractGoogleFileId_(url) {
  const match = safeText_(url).match(/[-\w]{25,}/);
  return match ? match[0] : '';
}

function formatDemoDate_(value) {
  if (!value) return 'Date not set';
  const date = new Date(value);
  return Utilities.formatDate(date, getTimezone_(), 'MMM d, yyyy h:mm a z');
}
