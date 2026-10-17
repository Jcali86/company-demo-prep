import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(projectRoot, 'apps-script');
const required = [
  'Code.gs',
  'Config.gs',
  'Data.gs',
  'Documents.gs',
  'Notifications.gs',
  'Setup.gs',
  'Index.html',
  'Client.html',
  'Styles.html',
  'appsscript.json'
];

const missing = required.filter(file => !fs.existsSync(path.join(sourceDir, file)));
if (missing.length) {
  throw new Error(`Missing required Apps Script files: ${missing.join(', ')}`);
}

const serverSource = required
  .filter(file => file.endsWith('.gs'))
  .map(file => fs.readFileSync(path.join(sourceDir, file), 'utf8'))
  .join('\n');
new vm.Script(serverSource, { filename: 'combined-apps-script.gs' });

const clientFile = fs.readFileSync(path.join(sourceDir, 'Client.html'), 'utf8');
const clientSource = clientFile.slice(clientFile.indexOf('>') + 1, clientFile.lastIndexOf('<'));
new vm.Script(clientSource, { filename: 'Client.html' });

const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'appsscript.json'), 'utf8'));
if (!manifest.dependencies || !Array.isArray(manifest.dependencies.libraries) || manifest.dependencies.libraries.length !== 0) {
  throw new Error('Manifest must explicitly declare an empty libraries array so stale Apps Script libraries are removed.');
}
if (!Array.isArray(manifest.dependencies.enabledAdvancedServices) || manifest.dependencies.enabledAdvancedServices.length !== 0) {
  throw new Error('Manifest must explicitly declare an empty advanced-services array for this project.');
}
if (!manifest.webapp || manifest.webapp.executeAs !== 'USER_ACCESSING' || manifest.webapp.access !== 'DOMAIN') {
  throw new Error('Manifest must preserve the domain-restricted web-app configuration.');
}
if (!manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.send_mail')) {
  throw new Error('Manifest must include the MailApp send-only scope for AE review notifications.');
}

for (const token of ['upgradeDemoPrepSystem', 'WOW Demo', 'Admin View', 'Company Folder ID', 'Gong URL', 'No Gong Recording']) {
  const found = required.some(file => fs.readFileSync(path.join(sourceDir, file), 'utf8').includes(token));
  if (!found) throw new Error(`Expected upgrade token is missing: ${token}`);
}

const fileMarkers = {
  'Config.gs': ['Gong URL', 'No Gong Recording'],
  'Data.gs': ['isValidGongUrl_', 'demo.gongUrl', 'demo.noGongRecording'],
  'Index.html': ['name="gongUrl"', 'name="noGongRecording"'],
  'Client.html': ['demo.gongUrl', 'demo.noGongRecording', 'updateGongControls_'],
  'Documents.gs': ['Open Gong recording', 'completion confirmed manually'],
  'Notifications.gs': ['requestAeReview', 'getAeReviewMailAuthorization_', 'AE_REVIEW_EMAIL_AUTHORIZATION_REQUIRED', 'AE_REVIEW_EMAIL_SENT', 'AE_REVIEW_EMAIL_FAILED']
};

for (const [file, markers] of Object.entries(fileMarkers)) {
  const contents = fs.readFileSync(path.join(sourceDir, file), 'utf8');
  for (const marker of markers) {
    if (!contents.includes(marker)) throw new Error(`${file} is missing Gong integration marker: ${marker}`);
  }
}

const gongRulesTest = `
${fs.readFileSync(path.join(sourceDir, 'Config.gs'), 'utf8')}
${fs.readFileSync(path.join(sourceDir, 'Data.gs'), 'utf8')}

(function runGongRulesTests() {
  function basePayload() {
    return {
      demo: {
        company: 'Validation Company',
        demoDateTime: '2026-08-12T12:00',
        duration: '30 minutes',
        demoMode: 'Custom Demo',
        aeEmail: 'ae@example.com',
        seEmail: 'se@example.com',
        personas: ['Finance Manager'],
        whatLanded: 'The value landed.',
        nextStep: 'Schedule a follow-up.',
        gongUrl: 'https://app.gong.io/call?id=validation',
        noGongRecording: false
      },
      modules: [{
        displayName: 'Goals & OKRs',
        selected: true,
        aeApproved: true,
        whyShow: 'Why',
        prospectGoal: 'Goal',
        intendedOutcome: 'Outcome'
      }]
    };
  }

  function expectPass(mutator) {
    const payload = basePayload();
    if (mutator) mutator(payload.demo);
    validatePayload_(payload, 'Complete', 'ae@example.com', null);
  }

  function expectFailure(expectedMessage, mutator) {
    const payload = basePayload();
    mutator(payload.demo);
    let error = null;
    try {
      validatePayload_(payload, 'Complete', 'ae@example.com', null);
    } catch (caught) {
      error = caught;
    }
    if (!error || !String(error.message).includes(expectedMessage)) {
      throw new Error('Expected Gong validation failure containing: ' + expectedMessage);
    }
  }

  expectPass();
  expectPass(demo => { demo.gongUrl = ''; demo.noGongRecording = true; });
  expectPass(demo => { demo.gongUrl = 'https://us-12345.app.gong.io/call/validation'; });
  expectFailure('Add the Gong recording URL', demo => { demo.gongUrl = ''; demo.noGongRecording = false; });
  expectFailure('secure gong.io URL', demo => { demo.gongUrl = 'http://app.gong.io/call/validation'; });
  expectFailure('secure gong.io URL', demo => { demo.gongUrl = 'https://gong.io.example.com/call/validation'; });
  expectFailure('not both', demo => { demo.noGongRecording = true; });
})();
`;
new vm.Script(gongRulesTest, { filename: 'gong-rules.test.gs' }).runInNewContext({});

const reviewRulesTest = `
${fs.readFileSync(path.join(sourceDir, 'Config.gs'), 'utf8')}
${fs.readFileSync(path.join(sourceDir, 'Data.gs'), 'utf8')}

(function runReviewRulesTests() {
  const base = {
    demo: {
      company: 'Validation Company',
      duration: '30 minutes',
      demoMode: 'Custom Demo',
      personas: []
    },
    modules: []
  };
  validatePayload_(base, 'Draft', 'se@example.com', null);
  base.demo.aeEmail = 'ae@example.com';
  validatePayload_(base, 'AE Review', 'se@example.com', null);
  if (DEMO_PREP.wowFlowSteps.map(step => step.displayName).join('|') !== 'Home|Goals & OKRs|Conversations — Anytime|Conversations — Scheduled|Outlook / Gmail integration|Succession Planning|Calibration|AI capabilities') {
    throw new Error('The configured WOW flow does not match the approved standard path.');
  }
})();
`;
new vm.Script(reviewRulesTest, { filename: 'review-rules.test.gs' }).runInNewContext({});

// No Workspace APIs run here: exercise company configuration against an in-memory Sheet.
let settingsFixture = {};
const brandingContext = vm.createContext({ readSettings: () => settingsFixture });
new vm.Script(
  fs.readFileSync(path.join(sourceDir, 'Config.gs'), 'utf8') + '\n' +
  fs.readFileSync(path.join(sourceDir, 'Setup.gs'), 'utf8') + '\n' +
  'getSettings_ = function () { return readSettings(); };',
  { filename: 'company-settings.test.gs' }
).runInContext(brandingContext);
function branding() {
  return JSON.parse(JSON.stringify(brandingContext.getBranding_()));
}
assert.deepEqual(branding(), { companyName: '[insert company here]', appName: '[insert company here] Demo Prep' });
settingsFixture = { COMPANY_NAME: 'Example Company' };
assert.deepEqual(branding(), { companyName: 'Example Company', appName: 'Example Company Demo Prep' });
settingsFixture = { COMPANY_NAME: 'Example Company', APP_NAME: 'Custom Demo Workspace' };
assert.deepEqual(branding(), { companyName: 'Example Company', appName: 'Custom Demo Workspace' });

function makeSettingsSheet(initialRows = []) {
  const rows = [['Key', 'Value', 'Notes'], ...initialRows.map(row => row.slice())];
  return {
    rows,
    getLastColumn: () => 3,
    getDataRange: () => ({ getValues: () => rows }),
    getRange: (row, column) => ({
      getValues: () => [rows[row - 1]],
      getValue: () => rows[row - 1][column - 1],
      setValue: value => { rows[row - 1][column - 1] = value; }
    }),
    appendRow: row => { rows.push(Array.from(row)); }
  };
}
function applySetupDefaults(sheet) {
  const emptySheet = {
    getLastColumn: () => 0,
    getRange: () => ({ getValues: () => [[]], setValues: () => {} })
  };
  brandingContext.ensureSystemSheets_({
    getSheetByName: name => name === 'Settings' ? sheet : emptySheet
  });
  return Object.fromEntries(sheet.rows.slice(1).map(row => [row[0], row[1]]));
}
const defaults = applySetupDefaults(makeSettingsSheet());
assert.equal(defaults.COMPANY_NAME, '[insert company here]');
assert.equal(defaults.APP_NAME, '');
assert.equal(defaults.ALLOWED_DOMAIN, 'example.com');
const existing = applySetupDefaults(makeSettingsSheet([
  ['COMPANY_NAME', 'Existing Company', ''],
  ['APP_NAME', 'Existing Workspace', ''],
  ['ALLOWED_DOMAIN', 'existing.example', '']
]));
assert.equal(existing.COMPANY_NAME, 'Existing Company');
assert.equal(existing.APP_NAME, 'Existing Workspace');
assert.equal(existing.ALLOWED_DOMAIN, 'existing.example');

console.log('Validation passed: required files, syntax, manifest JSON, company settings and preservation, review notifications, WOW flow, and Gong completion rules.');
