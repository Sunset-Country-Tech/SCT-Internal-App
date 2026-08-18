import assert from "node:assert/strict";
import test from "node:test";
import { createSessionId, getAuthSecret, signCsrfToken, signSession, verifyCsrfToken, verifySession } from "../src/lib/auth-cookie";
import { POST as loginPost } from "../src/app/api/auth/login/route";
import { safeReturnTo, verifyStaffCredentials } from "../src/lib/server/auth";
import { allowedRequestOrigins, sameOriginRequest } from "../src/lib/server/http";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

test("dev staff account verifies with a server-side role", async () => {
  const user = await verifyStaffCredentials("owner@sunsetcountry.tech", "sunset-demo-2026");
  assert.equal(user?.role, "Owner");
});

test("bad credentials are rejected", async () => {
  assert.equal(await verifyStaffCredentials("owner@sunsetcountry.tech", "bad-password"), null);
});

test("single staff env with base64 hash overrides bundled JSON", async () => {
  const previousEmail = process.env.STAFF_EMAIL;
  const previousHash = process.env.STAFF_PASSWORD_HASH_B64;
  const previousJson = process.env.INTERNAL_USERS_JSON;
  process.env.STAFF_EMAIL = "admin@example.test";
  process.env.STAFF_PASSWORD_HASH_B64 = Buffer.from("$2b$12$AaTOUWJQBb1KpyNpA0uOlurGrPr43.67hJpHCFI/vUx734nNy.1.i", "utf8").toString("base64");
  process.env.INTERNAL_USERS_JSON = JSON.stringify([{ id: "wrong", email: "wrong@example.test", name: "Wrong", role: "Owner", passwordHash: "$2b$12$AaTOUWJQBb1KpyNpA0uOlurGrPr43.67hJpHCFI/vUx734nNy.1.i" }]);

  const user = await verifyStaffCredentials("admin@example.test", "sunset-demo-2026");

  assert.equal(user?.email, "admin@example.test");
  restoreEnv("STAFF_EMAIL", previousEmail);
  restoreEnv("STAFF_PASSWORD_HASH_B64", previousHash);
  restoreEnv("INTERNAL_USERS_JSON", previousJson);
});

test("single staff env tolerates a pasted base64 assignment", async () => {
  const previousEmail = process.env.STAFF_EMAIL;
  const previousHash = process.env.STAFF_PASSWORD_HASH_B64;
  process.env.STAFF_EMAIL = "admin@example.test";
  process.env.STAFF_PASSWORD_HASH_B64 = `STAFF_PASSWORD_HASH_B64=${Buffer.from("$2b$12$AaTOUWJQBb1KpyNpA0uOlurGrPr43.67hJpHCFI/vUx734nNy.1.i", "utf8").toString("base64")}`;

  const user = await verifyStaffCredentials("admin@example.test", "sunset-demo-2026");

  assert.equal(user?.email, "admin@example.test");
  restoreEnv("STAFF_EMAIL", previousEmail);
  restoreEnv("STAFF_PASSWORD_HASH_B64", previousHash);
});

test("single staff env tolerates quoted base64 values", async () => {
  const previousEmail = process.env.STAFF_EMAIL;
  const previousHash = process.env.STAFF_PASSWORD_HASH_B64;
  process.env.STAFF_EMAIL = "admin@example.test";
  process.env.STAFF_PASSWORD_HASH_B64 = `"${Buffer.from("$2b$12$AaTOUWJQBb1KpyNpA0uOlurGrPr43.67hJpHCFI/vUx734nNy.1.i", "utf8").toString("base64")}"`;

  const user = await verifyStaffCredentials("admin@example.test", "sunset-demo-2026");

  assert.equal(user?.email, "admin@example.test");
  restoreEnv("STAFF_EMAIL", previousEmail);
  restoreEnv("STAFF_PASSWORD_HASH_B64", previousHash);
});

test("single staff env accepts raw bcrypt hash when supplied", async () => {
  const previousEmail = process.env.STAFF_EMAIL;
  const previousHash = process.env.STAFF_PASSWORD_HASH;
  const previousB64 = process.env.STAFF_PASSWORD_HASH_B64;
  process.env.STAFF_EMAIL = "admin@example.test";
  process.env.STAFF_PASSWORD_HASH = "$2b$12$AaTOUWJQBb1KpyNpA0uOlurGrPr43.67hJpHCFI/vUx734nNy.1.i";
  delete process.env.STAFF_PASSWORD_HASH_B64;

  const user = await verifyStaffCredentials("admin@example.test", "sunset-demo-2026");

  assert.equal(user?.email, "admin@example.test");
  restoreEnv("STAFF_EMAIL", previousEmail);
  restoreEnv("STAFF_PASSWORD_HASH", previousHash);
  restoreEnv("STAFF_PASSWORD_HASH_B64", previousB64);
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

test("login origin check allows configured public domain behind a proxy", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://internal.sunsetcountry.tech";
  const request = new Request("http://app:3000/api/auth/login", {
    method: "POST",
    headers: { origin: "https://internal.sunsetcountry.tech" },
  });

  assert.equal(sameOriginRequest(request), true);
  assert.ok(allowedRequestOrigins(request).has("https://internal.sunsetcountry.tech"));
  restoreEnv("NEXT_PUBLIC_SITE_URL", previous);
});

test("login origin check still rejects unknown origins", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://internal.sunsetcountry.tech";
  const request = new Request("http://app:3000/api/auth/login", {
    method: "POST",
    headers: { origin: "https://evil.example" },
  });

  assert.equal(sameOriginRequest(request), false);
  restoreEnv("NEXT_PUBLIC_SITE_URL", previous);
});

test("login route reports credential failures distinctly", async () => {
  const formData = new FormData();
  formData.set("email", "owner@sunsetcountry.tech");
  formData.set("password", "bad-password");
  formData.set("csrfToken", await signCsrfToken(getAuthSecret()));
  formData.set("returnTo", "/");

  const response = await loginPost(new Request("http://localhost/api/auth/login", { method: "POST", body: formData }));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/login?error=credentials&returnTo=%2F");
});
