function configureDemoPrepSystem(config) {
  if (!config || !config.spreadsheetId) throw new Error('spreadsheetId is required.');
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('SPREADSHEET_ID', String(config.spreadsheetId).trim());
  const ss = SpreadsheetApp.openById(config.spreadsheetId);
  ensureSystemSheets_(ss);
  const settings = ss.getSheetByName(DEMO_PREP.sheets.settings);
  const changes = {
    TEMPLATE_DOC_ID: config.templateDocId || '',
    ARCHIVE_FOLDER_ID: config.archiveFolderId || '',
    ALLOWED_DOMAIN: config.allowedDomain || '',
    DEFAULT_TIMEZONE: config.timezone || 'America/Los_Angeles'
  };
  if (config.companyName != null) changes.COMPANY_NAME = String(config.companyName).trim();
  if (config.appName != null) changes.APP_NAME = String(config.appName).trim();
  updateSettings_(settings, changes);
  return initializeDemoPrepSystem();
}

function initializeDemoPrepSystem() {
  const ss = getSpreadsheet_();
  ensureSystemSheets_(ss);
  syncModuleCatalog_();
  formatSystemSheets_(ss);
  return {
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    catalogItems: getCatalog_().length,
    status: 'ready'
  };
}

function upgradeDemoPrepSystem() {
  const result = initializeDemoPrepSystem();
  const diagnostics = runDemoPrepDiagnostics();
  if (!diagnostics.ok) throw new Error('Upgrade diagnostics failed: ' + diagnostics.problems.join('; '));
  return { upgrade: result, diagnostics: diagnostics };
}

function ensureRuntimeSchema_() {
  ensureSystemSheets_(getSpreadsheet_());
}

function ensureSystemSheets_(ss) {
  Object.keys(DEMO_PREP.sheets).forEach(key => {
    const name = DEMO_PREP.sheets[key];
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const expected = DEMO_PREP.headers[key];
    if (!expected) return;
    const width = Math.max(sheet.getLastColumn(), expected.length);
    const current = sheet.getRange(1, 1, 1, width).getValues()[0];
    if (current.every(value => value === '')) {
      sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
    } else {
      const existingHeaders = current.filter(value => value !== '');
      const prefixMatches = existingHeaders.every((value, index) => expected[index] === value);
      if (!prefixMatches) {
        throw new Error('Header mismatch in sheet "' + name + '". Restore the supplied headers before upgrading.');
      }
      if (existingHeaders.length < expected.length) {
        const additions = expected.slice(existingHeaders.length);
        sheet.getRange(1, existingHeaders.length + 1, 1, additions.length).setValues([additions]);
      }
    }
  });
  updateSettings_(ss.getSheetByName(DEMO_PREP.sheets.settings), {
    COMPANY_NAME: '[insert company here]',
    APP_NAME: '',
    TEMPLATE_DOC_ID: 'PASTE_GOOGLE_DOC_ID_HERE',
    ARCHIVE_FOLDER_ID: 'PASTE_SHARED_DRIVE_FOLDER_ID_HERE',
    ALLOWED_DOMAIN: 'example.com',
    DEFAULT_TIMEZONE: 'America/Los_Angeles',
    LOCK_COMPLETED_RECORDS: 'TRUE',
    GENERATE_PDF_SNAPSHOT: 'TRUE'
  }, true);
}

function updateSettings_(sheet, updates, onlyIfMissing) {
  const rows = sheet.getDataRange().getValues();
  const index = {};
  rows.slice(1).forEach((row, i) => { if (row[0]) index[row[0]] = i + 2; });
  Object.keys(updates).forEach(key => {
    if (index[key]) {
      if (!onlyIfMissing || !sheet.getRange(index[key], 2).getValue()) sheet.getRange(index[key], 2).setValue(updates[key]);
    } else {
      sheet.appendRow([key, updates[key], '']);
    }
  });
}

function syncModuleCatalog_() {
  const sheet = getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.catalog);
  disableLegacySupportingExperiences_(sheet);
  const existing = rowsAsObjects_(sheet);
  const byId = {};
  existing.forEach(item => { byId[item['Module ID']] = item; });
  const catalog = defaultCatalog_();
  catalog.forEach(item => {
    if (!byId[item[0]]) sheet.appendRow(item);
  });
}

function disableLegacySupportingExperiences_(sheet) {
  const legacyIds = ['SUP_HOME', 'SUP_TEAMS', 'SUP_ORG', 'SUP_RESOURCES', 'SUP_ADMIN'];
  const rows = rowsAsObjects_(sheet);
  const headers = DEMO_PREP.headers.catalog;
  const enabledColumn = headers.indexOf('Enabled') + 1;
  rows.forEach((row, index) => {
    if (legacyIds.indexOf(row['Module ID']) >= 0) {
      sheet.getRange(index + 2, enabledColumn).setValue(false);
    }
  });
}

function defaultCatalog_() {
  const effective = new Date('2026-04-01T00:00:00-07:00');
  return [
    ['SUP_ADMIN_VIEW', 'Admin View', 'Admin View', 'Optional view', effective, '', 310, true, '', 'Optional admin experience; include or avoid based on audience readiness']
  ];
}

function formatSystemSheets_(ss) {
  Object.keys(DEMO_PREP.sheets).forEach(key => {
    const sheet = ss.getSheetByName(DEMO_PREP.sheets[key]);
    if (!sheet || !DEMO_PREP.headers[key]) return;
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, DEMO_PREP.headers[key].length)
      .setFontWeight('bold')
      .setBackground('#e8eaed')
      .setFontColor('#202124')
      .setWrap(true);
  });
}
