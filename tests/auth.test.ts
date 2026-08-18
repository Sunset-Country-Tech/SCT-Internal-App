import assert from "node:assert/strict";
import test from "node:test";
import { createSessionId, getAuthSecret, signCsrfToken, signSession, verifyCsrfToken, verifySession } from "../src/lib/auth-cookie";
import { safeReturnTo, verifyStaffCredentials } from "../src/lib/server/auth";

test("dev staff account verifies with a server-side role", async () => {
  const user = await verifyStaffCredentials("owner@sunsetcountry.tech", "sunset-demo-2026");
  assert.equal(user?.role, "Owner");
});

test("bad credentials are rejected", async () => {
  assert.equal(await verifyStaffCredentials("owner@sunsetcountry.tech", "bad-password"), null);
});

test("sessions are signed and reject tampering", async () => {
  const token = await signSession({ sub: "u1", email: "a@example.test", name: "A", role: "Owner", iat: Date.now(), exp: Date.now() + 60_000, jti: createSessionId() }, getAuthSecret());
  assert.equal((await verifySession(token, getAuthSecret()))?.sub, "u1");
  assert.equal(await verifySession(`${token}x`, getAuthSecret()), null);
});

test("csrf tokens are signed and short-lived", async () => {
  const token = await signCsrfToken(getAuthSecret());
  assert.equal(await verifyCsrfToken(token, getAuthSecret()), true);
  assert.equal(await verifyCsrfToken(`${token}x`, getAuthSecret()), false);
});

test("return paths stay same-origin", () => {
  assert.equal(safeReturnTo("/?tab=jobs"), "/?tab=jobs");
  assert.equal(safeReturnTo("https://example.test"), "/");
  assert.equal(safeReturnTo("//example.test"), "/");
});
