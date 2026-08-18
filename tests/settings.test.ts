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
  assert.equal(settings.smsApiKeyEnv, "SMS_API_KEY");
  assert.equal(settings.r2Bucket, "sunset-country-tech-files");
});
