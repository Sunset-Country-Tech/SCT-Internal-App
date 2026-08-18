import assert from "node:assert/strict";
import test from "node:test";
import { buildQuoteApprovalAudit, quoteApprovalSchema } from "../src/lib/quote-approval";

test("quote approval requires a customer name", () => {
  assert.equal(quoteApprovalSchema.safeParse({ token: "sample-approval-token", name: "", decision: "Approved" }).success, false);
});

test("quote approval audit includes decision metadata", () => {
  const audit = buildQuoteApprovalAudit({ token: "sample-approval-token", name: "Mia Thompson", decision: "Approved" }, "203.0.113.10");
  assert.equal(audit.auditEvent, "Quote approved by customer");
  assert.equal(audit.ipAddress, "203.0.113.10");
});
