import assert from "node:assert/strict";
import test from "node:test";
import { calculateTotals, can, nextNumber, quoteDecisionTransition } from "../src/lib/workflows";

test("totals do not include GST when disabled", () => {
  assert.deepEqual(calculateTotals([{ description: "Labour", quantity: 2, unitPrice: 100, taxRate: 0.1 }], false), { subtotal: 200, tax: 0, total: 200 });
});

test("totals include GST when enabled", () => {
  assert.deepEqual(calculateTotals([{ description: "Labour", quantity: 2, unitPrice: 100, taxRate: 0.1 }], true), { subtotal: 200, tax: 20, total: 220 });
});

test("numbering advances by prefix and year", () => {
  assert.equal(nextNumber("SCT", 2026, ["SCT-2026-0001", "SCT-2026-0009", "SCT-2025-0200"]), "SCT-2026-0010");
});

test("permissions are role-based", () => {
  assert.equal(can("Owner", "settings:write"), true);
  assert.equal(can("Technician", "payments:write"), false);
});

test("quote decision transitions update workflow state", () => {
  assert.equal(quoteDecisionTransition("Approved").jobStatus, "Awaiting Parts");
  assert.equal(quoteDecisionTransition("Declined").quoteStatus, "Declined");
  assert.equal(quoteDecisionTransition("Contact Requested").quoteStatus, "Viewed");
});
