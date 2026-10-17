const AE_REVIEW_MAIL_SCOPE = 'https://www.googleapis.com/auth/script.send_mail';

function requestAeReview(payload) {
  const userEmail = enforceDomainAccess_();
  const saved = saveDemo(payload, 'AE Review');
  const demoId = saved.demo.demoId;
  let generated;

  try {
    generated = generateOrRefreshDemoDocument(demoId);
  } catch (error) {
    const detail = safeText_(error && error.message ? error.message : error).slice(0, 500);
    audit_(demoId, userEmail, 'AE_REVIEW_DOCUMENT_FAILED', detail);
    return {
      record: getDemoRecord_(demoId),
      notificationSent: false,
      errorMessage: 'The record was saved for AE review, but its working Doc could not be generated: ' + detail
    };
  }

  const record = getDemoRecord_(demoId);
  const demo = record.demo;
  const webAppUrl = ScriptApp.getService().getUrl() || '';
  const recordUrl = webAppUrl ? webAppUrl + '?demoId=' + encodeURIComponent(demoId) : '';
  const mailAuthorization = getAeReviewMailAuthorization_();
  if (mailAuthorization.required) {
    audit_(demoId, userEmail, 'AE_REVIEW_EMAIL_AUTHORIZATION_REQUIRED', 'Mail permission must be granted before sending.');
    return {
      record: record,
      documentUrl: generated.documentUrl,
      recordUrl: recordUrl,
      notificationSent: false,
      authorizationRequired: true,
      authorizationUrl: mailAuthorization.authorizationUrl,
      errorMessage: 'The record and working Doc were saved. Authorize email notifications, then request AE review again.'
    };
  }

  const subject = '[Demo Prep] AE review requested — ' + demo.company;
  const dateLabel = formatDemoDate_(demo.demoDateTime);
  const sender = safeText_(demo.seEmail) || userEmail;
  const textBody = [
    sender + ' requested your review of the demo plan for ' + demo.company + '.',
    '',
    'Demo date: ' + dateLabel,
    'Demo approach: ' + (demo.demoMode || 'WOW Demo'),
    recordUrl ? 'Open the demo record: ' + recordUrl : '',
    'Open the working Google Doc: ' + generated.documentUrl,
    '',
    'Review the selected scope and record your approval in the Demo Prep app.'
  ].filter(line => line !== '').join('\n');
  const htmlBody = [
    '<p><strong>' + escapeHtmlForNotification_(sender) + '</strong> requested your review of the demo plan for <strong>' + escapeHtmlForNotification_(demo.company) + '</strong>.</p>',
    '<p><strong>Demo date:</strong> ' + escapeHtmlForNotification_(dateLabel) + '<br>',
    '<strong>Demo approach:</strong> ' + escapeHtmlForNotification_(demo.demoMode || 'WOW Demo') + '</p>',
    recordUrl ? '<p><a href="' + escapeHtmlForNotification_(recordUrl) + '">Open the demo record</a></p>' : '',
    '<p><a href="' + escapeHtmlForNotification_(generated.documentUrl) + '">Open the working Google Doc</a></p>',
    '<p>Review the selected scope and record your approval in the Demo Prep app.</p>'
  ].join('');

  try {
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('The sender has no remaining Apps Script email recipient quota today.');
    MailApp.sendEmail({
      to: demo.aeEmail,
      subject: subject,
      body: textBody,
      htmlBody: htmlBody,
      name: getBranding_().appName,
      replyTo: sender
    });
    audit_(demoId, userEmail, 'AE_REVIEW_EMAIL_SENT', 'Recipient: ' + demo.aeEmail);
    return {
      record: getDemoRecord_(demoId),
      documentUrl: generated.documentUrl,
      recordUrl: recordUrl,
      notificationSent: true
    };
  } catch (error) {
    const detail = safeText_(error && error.message ? error.message : error).slice(0, 500);
    audit_(demoId, userEmail, 'AE_REVIEW_EMAIL_FAILED', detail);
    return {
      record: getDemoRecord_(demoId),
      documentUrl: generated.documentUrl,
      recordUrl: recordUrl,
      notificationSent: false,
      errorMessage: 'The record and working Doc were saved, but the AE email was not sent: ' + detail
    };
  }
}

function getAeReviewMailAuthorization_() {
  const authorizationInfo = ScriptApp.getAuthorizationInfo(
    ScriptApp.AuthMode.FULL,
    [AE_REVIEW_MAIL_SCOPE]
  );
  const required = authorizationInfo.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED;
  return {
    required: required,
    authorizationUrl: required ? (authorizationInfo.getAuthorizationUrl() || '') : ''
  };
}

function escapeHtmlForNotification_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}
