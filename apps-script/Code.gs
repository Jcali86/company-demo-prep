function doGet(e) {
  enforceDomainAccess_();
  const template = HtmlService.createTemplateFromFile('Index');
  template.demoId = e && e.parameter ? (e.parameter.demoId || '') : '';
  const branding = getBranding_();
  template.companyName = branding.companyName;
  template.appName = branding.appName;
  return template.evaluate()
    .setTitle(template.appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function runDemoPrepDiagnostics() {
  const ss = getSpreadsheet_();
  ensureSystemSheets_(ss);
  const problems = [];
  Object.keys(DEMO_PREP.headers).forEach(key => {
    const sheet = ss.getSheetByName(DEMO_PREP.sheets[key]);
    if (!sheet) {
      problems.push('Missing sheet: ' + DEMO_PREP.sheets[key]);
      return;
    }
    const headers = sheet.getRange(1, 1, 1, DEMO_PREP.headers[key].length).getValues()[0];
    DEMO_PREP.headers[key].forEach((header, index) => {
      if (headers[index] !== header) problems.push(DEMO_PREP.sheets[key] + ' header ' + (index + 1) + ' should be ' + header);
    });
  });
  const settings = getSettings_();
  ['TEMPLATE_DOC_ID', 'ARCHIVE_FOLDER_ID', 'ALLOWED_DOMAIN'].forEach(key => {
    if (!settings[key] || String(settings[key]).indexOf('PASTE_') === 0 || settings[key] === 'example.com') problems.push('Configure Settings.' + key);
  });
  return { ok: problems.length === 0, problems: problems, catalogItems: getCatalog_().length, spreadsheetUrl: ss.getUrl() };
}
