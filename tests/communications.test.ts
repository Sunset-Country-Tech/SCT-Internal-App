import assert from "node:assert/strict";
import test from "node:test";
import { appendEmailSignature, buildEmailHtml, buildMailtoUrl, buildSmsUrl, contactTargetFor, renderCommunicationTemplate } from "../src/lib/communications";

test("email fallback URL preserves address, subject, and body", () => {
  const url = buildMailtoUrl("customer@example.test", "Repair update", "Your laptop is ready.");

  assert.equal(url, "mailto:customer%40example.test?subject=Repair+update&body=Your+laptop+is+ready.");
});

test("sms fallback URL preserves phone and message body", () => {
  const url = buildSmsUrl("0400 123 456", "Your appointment is booked.");

  assert.equal(url, "sms:0400%20123%20456?body=Your+appointment+is+booked.");
});

test("contact targets switch between email and sms", () => {
  const customer = { email: "hello@example.test", phone: "0400 111 222" };

  assert.equal(contactTargetFor("email", customer), "hello@example.test");
  assert.equal(contactTargetFor("sms", customer), "0400 111 222");
});

test("email signature is appended with a clean separator", () => {
  assert.equal(appendEmailSignature("Your laptop is ready.\n", "Kind regards,\nSCT"), "Your laptop is ready.\n\nKind regards,\nSCT");
  assert.equal(appendEmailSignature("No signature here.", ""), "No signature here.");
});

test("email HTML includes escaped body text and optional image signature", () => {
  const html = buildEmailHtml("Ready <today>", "Kind regards,\nSCT", "https://cdn.example/signature.png", "SCT signature");

  assert.match(html, /Ready &lt;today&gt;/);
  assert.match(html, /Kind regards,<br>SCT/);
  assert.match(html, /<img src="https:\/\/cdn.example\/signature.png" alt="SCT signature"/);
});

test("communication templates render known placeholders and leave unknown ones intact", () => {
  const rendered = renderCommunicationTemplate("Hi {customer}, {business} is ready. {unknown}", {
    customer: "Mia",
    business: "Sunset Country Tech",
  });

  assert.equal(rendered, "Hi Mia, Sunset Country Tech is ready. {unknown}");
});
