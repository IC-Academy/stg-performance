# IC Admin branded emails

Presentation templates only: nothing in this folder sends email or changes authentication. The live n8n Auth workflow must be updated by its maintainer before received emails change.

## n8n integration

Copy `render-email.js` into a Code node after the authorized recipient and existing OTP/event have been resolved. Use Run Once for All Items and append:

```js
return $input.all().map((item, index) => {
  const email = renderICAdminEmail({
    type: item.json.emailType,
    name: item.json.recipientName,
    code: item.json.existingOtp,
    periodName: item.json.periodName
  });
  return {json: {...item.json, emailSubject: email.subject, emailHtml: email.html, emailText: email.text}, pairedItem: {item: index}};
});
```

These adapter field names are placeholders to map to the actual upstream node fields; do not guess or change OTP creation. Use the recipient already verified from the ICA employee record, never an email from the browser body. Configure the Outlook node with subject=emailSubject, body=emailHtml and HTML content type (verify the deployed node version). Keep emailText for providers supporting a plain-text alternative. Do not pass the generated code through public previews or logs.

Supported emailType values: otp, self_submitted, leader_submitted, result_released, agreements_ready, closed, reminder. Result and agreement variants are for the employee; select a separate authorized notification for the manager instead of sending employee wording to everyone.

The header uses a hosted PNG rather than SVG for email-client compatibility. Publish assets/ic-admin-email-logo.png on performance.intercon.com.mx before testing. If remote images are blocked, the alt text and all essential content still remain readable. No CSS background image, JavaScript, flexbox or external stylesheet is needed in the email.

The template assumes a ten-minute OTP TTL, matching the current ICA contract. If the server policy changes, update the displayed validity in both HTML and text. The template does not generate, validate or extend OTPs. Do not change HMAC, attempts, cooldown, session tokens, authorization, workflow publication or any Mexico node as part of this visual change.

Before rollout: check hash routes against js/app.js, confirm CTA after login reaches the intended view, test in desktop/web/mobile Outlook, confirm HTML is rendered rather than escaped, check delivery to the verified test recipient and preserve test allowlist restrictions. Provider acceptance is not confirmation of mailbox receipt.

Preview files contain synthetic sample data only. Run `node --test backend/emails/render-email.test.js` for structural/escaping tests; visual checks in actual email clients are still required.
