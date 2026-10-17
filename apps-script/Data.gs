function getAppBootstrap(demoId) {
  const userEmail = enforceDomainAccess_();
  ensureRuntimeSchema_();
  return {
    userEmail: userEmail,
    appName: getBranding_().appName,
    durations: DEMO_PREP.durations,
    demoModes: DEMO_PREP.demoModes,
    statuses: DEMO_PREP.statuses,
    wowDefinition: {
      moduleIds: DEMO_PREP.wowModuleIds.slice(),
      flowSteps: DEMO_PREP.wowFlowSteps.map(step => Object.assign({}, step)),
      defaults: JSON.parse(JSON.stringify(DEMO_PREP.wowDefaults))
    },
    demos: listDemos_(),
    catalog: getCatalog_(),
    record: demoId ? getDemoRecord_(demoId) : newDemoRecord_(userEmail),
    webAppUrl: ScriptApp.getService().getUrl() || ''
  };
}

function listDemos_() {
  const sheet = getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.demos);
  return rowsAsObjects_(sheet)
    .filter(row => row['Demo ID'])
    .map(row => ({
      demoId: row['Demo ID'],
      company: row.Company,
      demoDateTime: dateForClient_(row['Demo Date/Time']),
      status: row.Status || 'Draft'
    }))
    .sort((a, b) => String(b.demoDateTime).localeCompare(String(a.demoDateTime)));
}

function getCatalog_() {
  const sheet = getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.catalog);
  const now = new Date();
  return rowsAsObjects_(sheet)
    .filter(row => row['Module ID'] && asBoolean_(row.Enabled))
    .filter(row => (!row['Active From'] || new Date(row['Active From']) <= now) && (!row['Active To'] || new Date(row['Active To']) >= now))
    .map(row => ({
      moduleId: row['Module ID'],
      displayName: row['Display Name'],
      productArea: row['Product Area'],
      itemType: row['Item Type'],
      displayOrder: Number(row['Display Order']) || 999,
      sourceUrl: row['Source URL'] || ''
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

function newDemoRecord_(userEmail) {
  return {
    demo: {
      demoId: '', company: '', demoDateTime: '', duration: '30 minutes', aeEmail: '', seEmail: userEmail,
      opportunityUrl: '', status: 'Draft', meetingObjective: '', aeNotes: '', runOfShow: '', handoffs: '',
      whatLanded: '', questionsObjections: '', nextStep: '', workingDocUrl: '', finalPdfUrl: '',
      demoMode: 'WOW Demo', useMultiplePersonas: false, personas: [DEMO_PREP.defaultPersona], slidesUrl: '',
      companyFolderId: '', companyFolderUrl: '', gongUrl: '', noGongRecording: false
    },
    modules: getCatalog_().map((item, index) => newModuleState_(item, index)),
    followUps: []
  };
}

function newModuleState_(item, index) {
  const wowIndex = DEMO_PREP.wowModuleIds.indexOf(item.moduleId);
  const wowDefault = DEMO_PREP.wowDefaults[item.moduleId] || {};
  const isWowModule = wowIndex >= 0;
  return Object.assign({}, item, {
    selected: isWowModule,
    aeApproved: false,
    whyShow: wowDefault.whyShow || '',
    prospectGoal: wowDefault.prospectGoal || '',
    intendedOutcome: wowDefault.intendedOutcome || '',
    minutes: wowDefault.minutes || '',
    setupNotes: wowDefault.setupNotes || '',
    approvedBy: '',
    approvedAt: '',
    flowOrder: isWowModule ? wowIndex + 1 : index + 1
  });
}

function getDemoRecord_(demoId) {
  const demo = getDemoObject_(demoId);
  if (!demo) throw new Error('Demo record not found: ' + demoId);
  const catalog = getCatalog_();
  const moduleRows = rowsAsObjects_(getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.modules)).filter(row => row['Demo ID'] === demoId);
  const byName = {};
  moduleRows.forEach(row => { byName[row.Module] = row; });
  const modules = catalog.map((item, index) => {
    const row = byName[item.displayName] || {};
    return Object.assign({}, item, {
      selected: asBoolean_(row.Selected),
      aeApproved: asBoolean_(row['AE Approved']),
      whyShow: row['Why Show'] || '',
      prospectGoal: row['Prospect Goal'] || '',
      intendedOutcome: row['Intended Outcome'] || '',
      minutes: row.Minutes === '' ? '' : row.Minutes,
      setupNotes: row['Setup Notes'] || '',
      approvedBy: row['Approved By'] || '',
      approvedAt: dateForClient_(row['Approved At']),
      flowOrder: Number(row['Flow Order']) || index + 1
    });
  });
  const currentNames = {};
  catalog.forEach(item => { currentNames[item.displayName] = true; });
  moduleRows.filter(row => !currentNames[row.Module]).forEach(row => {
    modules.push({
      moduleId: 'HISTORICAL_' + Utilities.base64EncodeWebSafe(String(row.Module)).slice(0, 16),
      displayName: row.Module,
      productArea: row['Product Area'] || 'Historical',
      itemType: row['Item Type'] || 'Module',
      displayOrder: 9999,
      sourceUrl: '',
      selected: asBoolean_(row.Selected),
      aeApproved: asBoolean_(row['AE Approved']),
      whyShow: row['Why Show'] || '',
      prospectGoal: row['Prospect Goal'] || '',
      intendedOutcome: row['Intended Outcome'] || '',
      minutes: row.Minutes === '' ? '' : row.Minutes,
      setupNotes: row['Setup Notes'] || '',
      approvedBy: row['Approved By'] || '',
      approvedAt: dateForClient_(row['Approved At']),
      flowOrder: Number(row['Flow Order']) || 9999
    });
  });
  const followUps = rowsAsObjects_(getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.followUps))
    .filter(row => row['Demo ID'] === demoId)
    .map(row => ({ action: row.Action || '', ownerEmail: row['Owner Email'] || '', dueDate: dateOnlyForClient_(row['Due Date']), status: row.Status || 'Open', notes: row.Notes || '' }));
  return { demo: demo, modules: modules, followUps: followUps };
}

function getDemoObject_(demoId) {
  const sheet = getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.demos);
  const row = rowsAsObjects_(sheet).find(item => item['Demo ID'] === demoId);
  if (!row) return null;
  return {
    demoId: row['Demo ID'], company: row.Company || '', demoDateTime: dateForClient_(row['Demo Date/Time']), duration: row.Duration || '30 minutes',
    aeEmail: row['AE Email'] || '', seEmail: row['SE Email'] || '', opportunityUrl: row['Opportunity URL'] || '', status: row.Status || 'Draft',
    meetingObjective: row['Meeting Objective'] || '', aeNotes: row['AE Notes'] || '', runOfShow: row['Run of Show'] || '', handoffs: row['AE / SE Handoffs'] || '',
    whatLanded: row['What Landed'] || '', questionsObjections: row['Questions / Objections'] || '', nextStep: row['Next Step'] || '',
    workingDocUrl: row['Working Doc URL'] || '', finalPdfUrl: row['Final PDF URL'] || '',
    demoMode: row['Demo Mode'] || 'Custom Demo',
    useMultiplePersonas: asBoolean_(row['Use Multiple Personas']),
    personas: parsePersonas_(row['Personas JSON']),
    slidesUrl: row['Slides URL'] || '',
    companyFolderId: row['Company Folder ID'] || '',
    companyFolderUrl: row['Company Folder URL'] || '',
    gongUrl: row['Gong URL'] || '',
    noGongRecording: asBoolean_(row['No Gong Recording'])
  };
}

function parsePersonas_(value) {
  if (!value) return [DEMO_PREP.defaultPersona];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) && parsed.length ? parsed.map(safeText_).filter(Boolean) : [DEMO_PREP.defaultPersona];
  } catch (error) {
    const values = String(value).split(/\n|,/).map(safeText_).filter(Boolean).slice(0, 10);
    return values.length ? values : [DEMO_PREP.defaultPersona];
  }
}

function saveDemo(payload, requestedStatus) {
  const userEmail = enforceDomainAccess_();
  if (!payload || !payload.demo) throw new Error('Demo payload is required.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = getSpreadsheet_();
    ensureSystemSheets_(ss);
    const sheet = ss.getSheetByName(DEMO_PREP.sheets.demos);
    const input = payload.demo;
    const existing = input.demoId ? getDemoObject_(input.demoId) : null;
    if (existing) {
      if (input.gongUrl == null) input.gongUrl = existing.gongUrl;
      if (input.noGongRecording == null) input.noGongRecording = existing.noGongRecording;
    }
    const settings = getSettings_();
    if (existing && existing.status === 'Complete' && asBoolean_(settings.LOCK_COMPLETED_RECORDS)) {
      throw new Error('Completed records are locked. Reopen the record explicitly before editing.');
    }
    const status = requestedStatus || input.status || 'Draft';
    if (existing) normalizeApprovalChanges_(payload, existing.demoId, userEmail);
    validatePayload_(payload, status, userEmail, existing);
    const demoId = existing ? existing.demoId : createDemoId_();
    const companyFolder = ensureCompanyFolder_(input.company, existing);
    const now = new Date();
    const row = [
      demoId, safeText_(input.company), sheetDate_(input.demoDateTime), input.duration || '30 minutes', safeText_(input.aeEmail).toLowerCase(), safeText_(input.seEmail).toLowerCase(),
      safeText_(input.opportunityUrl), status, safeText_(input.meetingObjective), safeText_(input.aeNotes), safeText_(input.runOfShow), safeText_(input.handoffs),
      safeText_(input.whatLanded), safeText_(input.questionsObjections), safeText_(input.nextStep), existing ? existing.workingDocUrl : safeText_(input.workingDocUrl),
      existing ? existing.finalPdfUrl : safeText_(input.finalPdfUrl), existing ? getRawDemoValue_(demoId, 'Created At') : now, now, status === 'Complete' ? now : '',
      input.demoMode || 'WOW Demo', asBoolean_(input.useMultiplePersonas), JSON.stringify(normalizePersonas_(input.personas)), safeText_(input.slidesUrl),
      companyFolder.folderId, companyFolder.folderUrl, safeText_(input.gongUrl), asBoolean_(input.noGongRecording)
    ];
    upsertRow_(sheet, 'Demo ID', demoId, row);
    replaceChildRows_(ss.getSheetByName(DEMO_PREP.sheets.modules), 'Demo ID', demoId, moduleRowsForSheet_(payload.modules || [], demoId, userEmail));
    replaceChildRows_(ss.getSheetByName(DEMO_PREP.sheets.followUps), 'Demo ID', demoId, followUpRowsForSheet_(payload.followUps || [], demoId));
    audit_(demoId, userEmail, existing ? 'DEMO_UPDATED' : 'DEMO_CREATED', 'Status: ' + status);
    return getDemoRecord_(demoId);
  } finally {
    lock.releaseLock();
  }
}

function normalizeApprovalChanges_(payload, demoId, userEmail) {
  const prior = getDemoRecord_(demoId);
  const priorByName = {};
  prior.modules.forEach(item => { priorByName[item.displayName] = item; });
  (payload.modules || []).forEach(item => {
    const before = priorByName[item.displayName];
    if (!before || !before.aeApproved || userEmail === safeText_(payload.demo.aeEmail).toLowerCase()) return;
    const fields = ['selected', 'whyShow', 'prospectGoal', 'intendedOutcome', 'minutes', 'setupNotes', 'flowOrder'];
    const changed = fields.some(field => String(before[field] == null ? '' : before[field]) !== String(item[field] == null ? '' : item[field]));
    if (changed) item.aeApproved = false;
  });
}

function validatePayload_(payload, status, userEmail, existing) {
  const demo = payload.demo || {};
  if (!safeText_(demo.company)) throw new Error('Company name is required.');
  if (DEMO_PREP.statuses.indexOf(status) === -1) throw new Error('Choose a valid demo status.');
  if (DEMO_PREP.durations.indexOf(demo.duration) === -1) throw new Error('Choose a valid demo duration.');
  if (DEMO_PREP.demoModes.indexOf(demo.demoMode || 'WOW Demo') === -1) throw new Error('Choose WOW Demo or Custom Demo.');
  const personas = normalizePersonas_(demo.personas);
  if (status !== 'Draft' && (!safeText_(demo.aeEmail) || safeText_(demo.aeEmail).indexOf('@') === -1)) {
    throw new Error('A valid AE email is required before requesting review.');
  }
  if (status === 'Approved' || status === 'Complete') {
    if (!demo.demoDateTime) throw new Error('Demo date and time are required before approval or completion.');
    if (!safeText_(demo.seEmail) || safeText_(demo.seEmail).indexOf('@') === -1) throw new Error('A valid SE email is required before approval or completion.');
    if (!personas.length) throw new Error('Add at least one persona before approval or completion.');
    if (asBoolean_(demo.useMultiplePersonas) && personas.length < 2) throw new Error('Add a second persona or turn off multiple personas.');
  }
  if (safeText_(demo.slidesUrl) && !/^https:\/\/docs\.google\.com\/presentation\/d\//i.test(safeText_(demo.slidesUrl))) {
    throw new Error('Google Slides must be a Google Slides URL beginning with https://docs.google.com/presentation/d/.');
  }
  const gongUrl = safeText_(demo.gongUrl);
  const noGongRecording = asBoolean_(demo.noGongRecording);
  if (gongUrl && !isValidGongUrl_(gongUrl)) {
    throw new Error('Gong recording must be a secure gong.io URL.');
  }
  if (gongUrl && noGongRecording) {
    throw new Error('Provide a Gong recording URL or confirm that no recording is available, not both.');
  }
  const selected = (payload.modules || []).filter(item => item.selected);
  if ((status === 'Approved' || status === 'Complete') && selected.length === 0) {
    throw new Error('Select at least one module or capability before approval or completion.');
  }
  if ((status === 'Approved' || status === 'Complete') && (demo.demoMode || 'WOW Demo') === 'WOW Demo') {
    const selectedIds = selected.map(item => item.moduleId);
    const missingWowModules = DEMO_PREP.wowModuleIds.filter(moduleId => selectedIds.indexOf(moduleId) < 0);
    if (missingWowModules.length) throw new Error('The standard WOW Demo scope is incomplete. Reopen WOW Demo to restore its required steps.');
  }
  const prior = existing ? getDemoRecord_(existing.demoId) : null;
  const priorByName = {};
  if (prior) prior.modules.forEach(item => { priorByName[item.displayName] = item; });
  selected.forEach(item => {
    const wasApproved = priorByName[item.displayName] && priorByName[item.displayName].aeApproved;
    if (item.aeApproved && !wasApproved && userEmail !== safeText_(demo.aeEmail).toLowerCase()) {
      throw new Error('Only the configured AE can approve new module selections.');
    }
  });
  if (status === 'Approved' || status === 'Complete') {
    const unapproved = selected.filter(item => !item.aeApproved);
    if (unapproved.length) throw new Error('Every selected item must be approved by the AE before approval or completion.');
  }
  if (status === 'Complete') {
    if (!safeText_(demo.whatLanded)) throw new Error('Complete “What landed” before closing the demo record.');
    if (!safeText_(demo.nextStep)) throw new Error('A recommended next step is required before completion.');
    if (!gongUrl && !noGongRecording) {
      throw new Error('Add the Gong recording URL or confirm that no Gong recording is available before completion.');
    }
  }
}

function isValidGongUrl_(value) {
  return /^https:\/\/(?:[a-z0-9-]+\.)*gong\.io(?:[/?#]|$)/i.test(safeText_(value));
}

function moduleRowsForSheet_(modules, demoId, userEmail) {
  const existingRows = rowsAsObjects_(getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.modules));
  const priorByName = {};
  existingRows.filter(row => row['Demo ID'] === demoId).forEach(row => { priorByName[row.Module] = row; });
  return modules.filter(item => item.selected).map(item => {
    const approved = asBoolean_(item.aeApproved);
    const prior = priorByName[item.displayName] || {};
    const priorApproved = asBoolean_(prior['AE Approved']);
    const approvedBy = approved ? (priorApproved ? prior['Approved By'] : userEmail) : '';
    const approvedAt = approved ? (priorApproved ? prior['Approved At'] : new Date()) : '';
    return [demoId, item.productArea, item.itemType, item.displayName, true, approved, safeText_(item.whyShow), safeText_(item.prospectGoal), safeText_(item.intendedOutcome), Number(item.minutes) || '', safeText_(item.setupNotes), approvedBy, approvedAt, Number(item.flowOrder) || 9999];
  });
}

function normalizePersonas_(items) {
  const values = Array.isArray(items) ? items : [items];
  const unique = [];
  values.map(safeText_).filter(Boolean).forEach(value => {
    if (unique.indexOf(value) < 0) unique.push(value);
  });
  return unique.slice(0, 10);
}

function ensureCompanyFolder_(company, existing) {
  const settings = getSettings_();
  const rootId = safeText_(settings.ARCHIVE_FOLDER_ID);
  if (!rootId || rootId.indexOf('PASTE_') === 0) throw new Error('Configure ARCHIVE_FOLDER_ID in Settings.');
  const root = DriveApp.getFolderById(rootId);
  const name = safeFolderName_(company);
  let folder = null;
  if (existing && existing.companyFolderId) {
    try { folder = DriveApp.getFolderById(existing.companyFolderId); } catch (error) { folder = null; }
  }
  if (!folder) {
    const matches = root.getFoldersByName(name);
    folder = matches.hasNext() ? matches.next() : root.createFolder(name);
  } else if (folder.getName() !== name) {
    folder.setName(name);
  }
  return { folderId: folder.getId(), folderUrl: folder.getUrl() };
}

function safeFolderName_(value) {
  const name = safeText_(value).replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) throw new Error('Company name is required before its folder can be created.');
  return name.slice(0, 120);
}

function followUpRowsForSheet_(items, demoId) {
  return items.filter(item => safeText_(item.action)).map(item => [demoId, safeText_(item.action), safeText_(item.ownerEmail).toLowerCase(), sheetDate_(item.dueDate), item.status || 'Open', safeText_(item.notes)]);
}

function rowsAsObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values[0];
  return values.slice(1).map(row => {
    const object = {};
    headers.forEach((header, index) => { object[header] = row[index]; });
    return object;
  });
}

function upsertRow_(sheet, keyHeader, key, row) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyColumn = headers.indexOf(keyHeader) + 1;
  if (!keyColumn) throw new Error('Missing key header: ' + keyHeader);
  const keys = sheet.getLastRow() > 1 ? sheet.getRange(2, keyColumn, sheet.getLastRow() - 1, 1).getValues().flat() : [];
  const offset = keys.indexOf(key);
  const rowNumber = offset >= 0 ? offset + 2 : sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
}

function replaceChildRows_(sheet, keyHeader, key, newRows) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyIndex = headers.indexOf(keyHeader);
  const existing = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues() : [];
  const keep = existing.filter(row => row[keyIndex] !== key);
  const all = keep.concat(newRows);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  if (all.length) sheet.getRange(2, 1, all.length, sheet.getLastColumn()).setValues(all);
}

function createDemoId_() {
  const stamp = Utilities.formatDate(new Date(), getTimezone_(), 'yyyyMMdd-HHmm');
  return 'DEMO-' + stamp + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
}

function getRawDemoValue_(demoId, header) {
  const sheet = getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.demos);
  const row = rowsAsObjects_(sheet).find(item => item['Demo ID'] === demoId);
  return row ? row[header] : '';
}

function audit_(demoId, userEmail, action, details) {
  getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.audit).appendRow([new Date(), demoId, userEmail, action, details || '']);
}

function reopenDemo(demoId, reason) {
  const userEmail = enforceDomainAccess_();
  ensureRuntimeSchema_();
  if (!safeText_(reason)) throw new Error('A reopen reason is required.');
  const sheet = getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.demos);
  const headers = DEMO_PREP.headers.demos;
  const rows = rowsAsObjects_(sheet);
  const index = rows.findIndex(row => row['Demo ID'] === demoId);
  if (index < 0) throw new Error('Demo not found.');
  sheet.getRange(index + 2, headers.indexOf('Status') + 1).setValue('Draft');
  sheet.getRange(index + 2, headers.indexOf('Completed At') + 1).clearContent();
  audit_(demoId, userEmail, 'DEMO_REOPENED', reason);
  return getDemoRecord_(demoId);
}
