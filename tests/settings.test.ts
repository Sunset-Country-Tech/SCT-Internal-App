import assert from "node:assert/strict";
import test from "node:test";
import { defaultSettings, normalizeSettings } from "../src/lib/operations-data";

test("saved settings from older app versions are upgraded with integration defaults", () => {
  const settings = normalizeSettings({
    businessName: "Sunset Country Tech",
    numbering: { job: "JOB" },
  });

  assert.equal(settings.businessName, "Sunset Country Tech");
  assert.equal(settings.numbering.job, "JOB");
  assert.equal(settings.numbering.invoice, defaultSettings.numbering.invoice);
  assert.equal(settings.smtpHost, "");
  assert.equal(settings.smtpPort, 587);
  assert.equal(settings.smtpSecurity, "starttls");
  assert.equal(settings.smtpRequireTls, true);
  assert.equal(settings.smtpReplyToEmail, "hello@sunsetcountry.tech");
  assert.match(settings.emailSignature, /Sunset Country Tech/);
  assert.equal(settings.emailSignatureImageUrl, "");
  assert.equal(settings.emailSignatureImageAlt, "Sunset Country Tech");
  assert.equal(settings.imapEnabled, false);
  assert.equal(settings.imapHost, "");
  assert.equal(settings.imapPort, 993);
  assert.equal(settings.imapSecurity, "ssl-tls");
  assert.equal(settings.imapUsernameEnv, "IMAP_USERNAME");
  assert.equal(settings.smsApiKeyEnv, "SMS_API_KEY");
  assert.equal(settings.r2Bucket, "sunset-country-tech-files");
});

test("mail settings normalize saved SMTP and IMAP values", () => {
  const settings = normalizeSettings({
    emailProvider: "smtp-imap",
    emailMode: "inbound-and-outbound",
    smtpHost: "smtp.mail.test",
    smtpPort: 465,
    smtpSecurity: "ssl-tls",
    smtpSecure: false,
    smtpReplyToEmail: "support@mail.test",
    imapEnabled: true,
    imapHost: "imap.mail.test",
    imapPort: 143,
    imapSecurity: "starttls",
    imapPollingMinutes: 10,
  });

  assert.equal(settings.emailProvider, "smtp-imap");
  assert.equal(settings.emailMode, "inbound-and-outbound");
  assert.equal(settings.smtpHost, "smtp.mail.test");
  assert.equal(settings.smtpPort, 465);
  assert.equal(settings.smtpSecure, true);
  assert.equal(settings.smtpReplyToEmail, "support@mail.test");
  assert.equal(settings.imapEnabled, true);
  assert.equal(settings.imapHost, "imap.mail.test");
  assert.equal(settings.imapPort, 143);
  assert.equal(settings.imapSecurity, "starttls");
  assert.equal(settings.imapSecure, false);
  assert.equal(settings.imapPollingMinutes, 10);
});
