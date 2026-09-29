/* IC Admin email presentation only. No recipients, OTP generation, or sending.
 * Copy into an n8n Code node, then append the adapter documented in README.md.
 */
'use strict';

function escapeEmail(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function renderICAdminEmail(input) {
  input = input || {};
  const origin = 'https://stgperformance.intercon.com.mx';
  const variants = {
    otp: {subject:'Your IC Admin access code', label:'SECURE ACCESS', title:'Your access code', intro:'Use this one-time code to sign in to IC Admin Performance Evaluation.', button:'Open IC Admin', route:'#/login'},
    self_submitted: {subject:'Self-assessment ready for your review', label:'MANAGER REVIEW', title:'Your next review is ready', intro:'An employee has submitted their self-assessment. Sign in to review it and complete the manager evaluation.', button:'Review your team', route:'#/lider/dashboard'},
    leader_submitted: {subject:'Performance evaluation ready for DO calibration', label:'DO CALIBRATION', title:'Ready for calibration', intro:'A manager evaluation has been submitted. Sign in to review the results and complete the DO calibration stage.', button:'Open DO dashboard', route:'#/admin/dashboard'},
    result_released: {subject:'Your performance review is now available', label:'RESULTS AVAILABLE', title:'Let’s talk about your development', intro:'Your calibrated performance review is available. Sign in to review it and coordinate your feedback meeting with your manager.', button:'View your review', route:'#/colaborador/retroalimentacion'},
    agreements_ready: {subject:'Your feedback agreements are ready to sign', label:'FEEDBACK & AGREEMENTS', title:'Your agreements are ready', intro:'Your manager has signed the feedback agreements. Review the final version and complete your signature in IC Admin.', button:'Review and sign', route:'#/colaborador/retroalimentacion'},
    closed: {subject:'Your performance review has been completed', label:'REVIEW COMPLETED', title:'Thank you for your commitment', intro:'The feedback agreements have been signed by both participants. Your performance review is complete and available in IC Admin.', button:'Open your review', route:'#/colaborador/retroalimentacion'},
    reminder: {subject:'Action required: IC Admin performance review', label:'ACTION REQUIRED', title:'Keep your review moving forward', intro:'You have a pending action in this performance review cycle. Sign in to check the next step and complete it within the agreed timeline.', button:'Open IC Admin', route:'#/login'}
  };
  const content = variants[input.type];
  if (!content) throw new Error('Unsupported IC Admin email type');
  const name = String(input.name || '').trim();
  const greeting = name ? 'Hello ' + name + ',' : 'Hello,';
  const otp = input.type === 'otp';
  if (otp && !/^\d{6}$/.test(String(input.code || ''))) throw new Error('OTP email requires an existing six-digit code');
  // Login performs authorization; links contain no tokens or private record IDs.
  const url = origin + '/' + content.route;
  const period = input.periodName ? '<p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:22px;">Review cycle: <strong>' + escapeEmail(input.periodName) + '</strong></p>' : '';
  const codePanel = otp ? '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;"><tr><td align="center" bgcolor="#eef4fb" style="padding:24px 12px;border:1px solid #d8e3ef;"><p style="margin:0 0 10px;font-size:12px;letter-spacing:1px;color:#45617f;">YOUR ONE-TIME CODE</p><p style="margin:0;font-family:Consolas,Courier New,monospace;font-size:36px;font-weight:bold;letter-spacing:6px;line-height:46px;color:#002a5c;">' + escapeEmail(input.code) + '</p><p style="margin:12px 0 0;font-size:13px;line-height:20px;color:#526780;">Expires in 10 minutes. Do not share this code.</p></td></tr></table>' : '';
  const guidance = otp ? 'If you did not request this code, you can ignore this email. Never share your access code with anyone.' : 'A feedback meeting must take place before the agreements can be signed. Scheduling is handled manually in Outlook; the meeting is confirmed in IC Admin.';
  const text = ['IC ADMIN | PERFORMANCE EVALUATION', content.label, greeting, content.intro, otp ? 'Your one-time code: ' + input.code + '\nExpires in 10 minutes. Do not share this code.' : '', input.periodName ? 'Review cycle: ' + input.periodName : '', content.button + ': ' + url, guidance, 'Automated message from IC Admin Performance Evaluation. Internal use only.'].filter(Boolean).join('\n\n');
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeEmail(content.subject) + '</title></head><body style="margin:0;padding:0;background:#f2f5f9;font-family:Arial,Helvetica,sans-serif;color:#0d1f37;">' +
    '<div style="display:none;font-size:1px;color:#f2f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">' + escapeEmail(content.intro) + '</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f2f5f9"><tr><td align="center" style="padding:24px 12px;">' +
    '<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:600px;border:1px solid #dce5ef;"><tr><td height="5" bgcolor="#fec52a" style="height:5px;font-size:1px;line-height:1px;">&nbsp;</td></tr>' +
    '<tr><td bgcolor="#002a5c" style="padding:28px 32px;"><img src="' + origin + '/assets/ic-admin-email-logo.png" alt="IC ADMIN" width="150" style="display:block;width:150px;max-width:100%;height:auto;border:0;color:#ffffff;font-size:23px;font-weight:bold;"><p style="margin:16px 0 0;color:#bad1ea;font-size:11px;font-weight:bold;letter-spacing:1.4px;line-height:18px;">PERFORMANCE EVALUATION</p></td></tr>' +
    '<tr><td style="padding:32px;"><p style="margin:0 0 14px;color:#0056b8;font-size:12px;font-weight:bold;letter-spacing:1px;line-height:18px;">' + escapeEmail(content.label) + '</p>' +
    '<h1 style="margin:0 0 24px;font-size:27px;line-height:34px;color:#0d1f37;">' + escapeEmail(content.title) + '</h1><p style="margin:0 0 12px;font-size:17px;line-height:25px;font-weight:bold;">' + escapeEmail(greeting) + '</p>' +
    '<p style="margin:0 0 24px;font-size:15px;line-height:25px;color:#4c6078;">' + escapeEmail(content.intro) + '</p>' + codePanel + period +
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#0056b8" style="padding:14px 24px;border-radius:5px;"><a href="' + url + '" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;line-height:20px;">' + escapeEmail(content.button) + '</a></td></tr></table>' +
    '<p style="margin:24px 0 0;font-size:12px;line-height:20px;color:#64748b;">' + escapeEmail(guidance) + '</p>' +
    '<p style="margin:16px 0 0;font-size:12px;line-height:20px;color:#64748b;word-break:break-word;">If the button does not work, open:<br><a href="' + url + '" style="color:#0056b8;">' + url + '</a></p></td></tr>' +
    '<tr><td bgcolor="#f7f9fc" style="padding:22px 32px;border-top:1px solid #e5ebf2;"><p style="margin:0;font-size:11px;line-height:18px;color:#75859a;">Automated message from IC Admin Performance Evaluation.<br>Internal use only · Organizational Development (DO)</p></td></tr></table>' +
    '<!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>';
  return {subject:content.subject, html:html, text:text};
}

if (typeof module !== 'undefined' && module.exports) module.exports = {renderICAdminEmail:renderICAdminEmail};
