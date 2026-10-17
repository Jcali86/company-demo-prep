const DEMO_PREP = Object.freeze({
  sheets: {
    demos: 'Demos',
    modules: 'Demo Modules',
    followUps: 'Follow-ups',
    catalog: 'Module Catalog',
    audit: 'Audit Log',
    settings: 'Settings'
  },
  headers: {
    demos: ['Demo ID', 'Company', 'Demo Date/Time', 'Duration', 'AE Email', 'SE Email', 'Opportunity URL', 'Status', 'Meeting Objective', 'AE Notes', 'Run of Show', 'AE / SE Handoffs', 'What Landed', 'Questions / Objections', 'Next Step', 'Working Doc URL', 'Final PDF URL', 'Created At', 'Updated At', 'Completed At', 'Demo Mode', 'Use Multiple Personas', 'Personas JSON', 'Slides URL', 'Company Folder ID', 'Company Folder URL', 'Gong URL', 'No Gong Recording'],
    modules: ['Demo ID', 'Product Area', 'Item Type', 'Module', 'Selected', 'AE Approved', 'Why Show', 'Prospect Goal', 'Intended Outcome', 'Minutes', 'Setup Notes', 'Approved By', 'Approved At', 'Flow Order'],
    followUps: ['Demo ID', 'Action', 'Owner Email', 'Due Date', 'Status', 'Notes'],
    catalog: ['Module ID', 'Display Name', 'Product Area', 'Item Type', 'Active From', 'Active To', 'Display Order', 'Enabled', 'Source URL', 'Evidence'],
    audit: ['Timestamp', 'Demo ID', 'User Email', 'Action', 'Details'],
    settings: ['Key', 'Value', 'Notes']
  },
  statuses: ['Draft', 'AE Review', 'Approved', 'Complete'],
  durations: ['30 minutes', '60+ minutes'],
  demoModes: ['WOW Demo', 'Custom Demo'],
  defaultPersona: 'Finance Manager',
  wowModuleIds: ['PM_GOALS', 'PM_CONVERSATIONS', 'CAP_INTEGRATIONS', 'TI_SUCCESSION', 'TI_CALIBRATION', 'CAP_AI'],
  wowFlowSteps: [
    { moduleId: '', displayName: 'Home', standard: true },
    { moduleId: 'PM_GOALS', displayName: 'Goals & OKRs' },
    { moduleId: 'PM_CONVERSATIONS', displayName: 'Conversations — Anytime' },
    { moduleId: 'PM_CONVERSATIONS', displayName: 'Conversations — Scheduled' },
    { moduleId: 'CAP_INTEGRATIONS', displayName: 'Outlook / Gmail integration' },
    { moduleId: 'TI_SUCCESSION', displayName: 'Succession Planning' },
    { moduleId: 'TI_CALIBRATION', displayName: 'Calibration' },
    { moduleId: 'CAP_AI', displayName: 'AI capabilities' }
  ],
  wowDefaults: {
    PM_GOALS: {
      whyShow: 'Connect the home experience to clear priorities and goal execution.',
      prospectGoal: 'Show how a finance manager can understand priorities and act on goals quickly.',
      intendedOutcome: 'The prospect sees a clear, connected goal experience that managers can adopt immediately.',
      minutes: 5,
      setupNotes: 'Move from Home into Goals & OKRs.'
    },
    PM_CONVERSATIONS: {
      whyShow: 'Demonstrate both in-the-moment and scheduled manager conversations in one connected workflow.',
      prospectGoal: 'Show how managers prepare for, document, and continue meaningful conversations.',
      intendedOutcome: 'The prospect sees a repeatable conversation experience that supports ongoing performance.',
      minutes: 7,
      setupNotes: 'Show an Anytime Conversation first, followed by a Scheduled Conversation.'
    },
    CAP_INTEGRATIONS: {
      whyShow: 'Bring your product into the tools managers already use every day.',
      prospectGoal: 'Show the Outlook or Gmail experience without forcing a context switch.',
      intendedOutcome: 'The prospect sees how your product fits naturally into the flow of work.',
      minutes: 3,
      setupNotes: 'Use the configured Outlook or Gmail integration.'
    },
    TI_SUCCESSION: {
      whyShow: 'Connect performance context with forward-looking talent decisions.',
      prospectGoal: 'Show how leaders identify succession options and understand readiness.',
      intendedOutcome: 'The prospect sees a practical path from performance insight to succession planning.',
      minutes: 5,
      setupNotes: 'Use a prepared role and successor slate.'
    },
    TI_CALIBRATION: {
      whyShow: 'Show a structured, data-informed calibration experience.',
      prospectGoal: 'Demonstrate how leaders compare talent consistently and make equitable decisions.',
      intendedOutcome: 'The prospect sees a faster, clearer calibration process with shared context.',
      minutes: 4,
      setupNotes: 'Open a prepared calibration session with representative talent data.'
    },
    CAP_AI: {
      whyShow: 'Show AI assistance embedded in your product experience.',
      prospectGoal: 'Demonstrate how AI helps managers move faster while keeping them in control.',
      intendedOutcome: 'The prospect understands AI as practical assistance inside real performance workflows.',
      minutes: 4,
      setupNotes: 'Use the AI capability that best reinforces the preceding workflow.'
    }
  }
});

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const configuredId = properties.getProperty('SPREADSHEET_ID');
  if (configuredId) return SpreadsheetApp.openById(configuredId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('SPREADSHEET_ID is not configured. Run configureDemoPrepSystem().');
}

function getSettings_() {
  const sheet = getSpreadsheet_().getSheetByName(DEMO_PREP.sheets.settings);
  if (!sheet) throw new Error('Settings sheet is missing. Run initializeDemoPrepSystem().');
  const values = sheet.getDataRange().getValues();
  const settings = {};
  values.slice(1).forEach(row => {
    if (row[0]) settings[String(row[0]).trim()] = row[1];
  });
  return settings;
}

function getBranding_() {
  const settings = getSettings_();
  const companyName = String(settings.COMPANY_NAME || '').trim() || '[insert company here]';
  const appName = String(settings.APP_NAME || '').trim() || companyName + ' Demo Prep';
  return { companyName: companyName, appName: appName };
}

function getCurrentUserEmail_() {
  const email = Session.getActiveUser().getEmail();
  if (!email) {
    throw new Error('Your Workspace identity is unavailable. Deploy the web app to execute as the user accessing it and restrict access to your domain.');
  }
  return email.toLowerCase();
}

function enforceDomainAccess_() {
  const email = getCurrentUserEmail_();
  const allowedDomain = String(getSettings_().ALLOWED_DOMAIN || '').toLowerCase().trim();
  if (allowedDomain && allowedDomain !== 'example.com' && !email.endsWith('@' + allowedDomain)) {
    throw new Error('This app is restricted to the configured Google Workspace domain.');
  }
  return email;
}

function asBoolean_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

function getTimezone_() {
  return String(getSettings_().DEFAULT_TIMEZONE || Session.getScriptTimeZone() || 'America/Los_Angeles');
}

function safeText_(value) {
  return value == null ? '' : String(value).trim();
}

function dateForClient_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, getTimezone_(), "yyyy-MM-dd'T'HH:mm");
}

function dateOnlyForClient_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, getTimezone_(), 'yyyy-MM-dd');
}

function sheetDate_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? '' : date;
}
