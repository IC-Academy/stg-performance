'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {renderICAdminEmail} = require('./render-email.js');

test('all supported variants provide branded HTML and a text alternative', () => {
  for (const type of ['otp','self_submitted','leader_submitted','result_released','agreements_ready','closed','reminder']) {
    const out = renderICAdminEmail({type, name:'Sample User', code:'000000', periodName:'TEST ICA'});
    assert.match(out.html, /<html lang="en">/);
    assert.match(out.html, /role="presentation"/);
    assert.match(out.html, /ic-admin-email-logo.png/);
    assert.match(out.html, /Organizational Development \(DO\)/);
    assert.match(out.text, /IC ADMIN/);
    assert.ok(out.subject.length > 0);
    assert.doesNotMatch(out.html, /<script|evaluacion\.intercon|\bRH\b|\bHR\b/);
  }
});

test('OTP requires an existing six-digit value and never generates one', () => {
  for (const code of ['', null, '12345', '1234567', '<script>']) {
    assert.throws(() => renderICAdminEmail({type:'otp',code}), /six-digit/);
  }
  const out = renderICAdminEmail({type:'otp',code:'000000'});
  assert.match(out.html, />000000<\/p>/);
  assert.match(out.text, /Expires in 10 minutes/);
  assert.match(out.html, /Do not share this code/);
});

test('recipient names and period labels are HTML escaped', () => {
  const out = renderICAdminEmail({type:'result_released',name:'<img src=x onerror=alert(1)>',periodName:'A & B'});
  assert.match(out.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(out.html, /A &amp; B/);
  assert.doesNotMatch(out.html, /<img src=x/);
});

test('caller cannot inject links or OTP into non-auth notifications', () => {
  const out = renderICAdminEmail({type:'closed',url:'javascript:alert(1)',code:'654321'});
  assert.doesNotMatch(out.html, /javascript:|654321/);
  assert.match(out.html, /https:\/\/stgperformance\.intercon\.com\.mx\/#\/colaborador\/retroalimentacion/);
  assert.throws(() => renderICAdminEmail({type:'unknown'}), /Unsupported/);
});
