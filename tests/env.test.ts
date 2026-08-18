import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mailConnectionEnvNames } from "../src/lib/communications";
import { defaultSettings } from "../src/lib/operations-data";

const rootEnvNames = [
  "NEXT_PUBLIC_SITE_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_COOKIE_SECURE",
  "INTERNAL_USERS_JSON",
  "STAFF_EMAIL",
  "STAFF_NAME",
  "STAFF_ROLE",
  "STAFF_PASSWORD_HASH_B64",
  "PUBLIC_INTAKE_SECRET",
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
];

const settingEnvNames = [
  defaultSettings.smtpUsernameEnv,
  defaultSettings.smtpPasswordEnv,
  defaultSettings.imapUsernameEnv,
  defaultSettings.imapPasswordEnv,
  defaultSettings.smsApiKeyEnv,
  defaultSettings.smsSigningSecretEnv,
  defaultSettings.calendarApiKeyEnv,
  defaultSettings.r2AccessKeyEnv,
  defaultSettings.r2SecretKeyEnv,
];

test(".env.example documents every runtime and settings-backed env var", () => {
  const envExample = readFileSync(".env.example", "utf8");

  for (const name of [...rootEnvNames, ...mailConnectionEnvNames, ...settingEnvNames]) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"), `${name} is missing from .env.example`);
  }
});

test("docker compose passes every mail setting env var into the app container", () => {
  const compose = readFileSync("docker-compose.yml", "utf8");

  for (const name of [...mailConnectionEnvNames, ...settingEnvNames]) {
    assert.match(compose, new RegExp(`${name}: \\$\\{${name}:-`), `${name} is missing from docker-compose.yml`);
  }
});

test("docker compose app uses the bundled database service", () => {
  const compose = readFileSync("docker-compose.yml", "utf8");

  assert.match(compose, /DATABASE_URL: postgresql:\/\/\$\{POSTGRES_USER:-sct\}:\$\{POSTGRES_PASSWORD:-sct_dev_password\}@db:5432\/\$\{POSTGRES_DB:-sct_internal\}/);
  assert.match(compose, /pg_isready/);
  assert.match(compose, /\$\$\{POSTGRES_USER\}/);
  assert.match(compose, /\$\$\{POSTGRES_DB\}/);
});

test("docker compose allows staff users to be overridden from env", () => {
  const compose = readFileSync("docker-compose.yml", "utf8");

  assert.match(compose, /INTERNAL_USERS_JSON: \$\{INTERNAL_USERS_JSON:-/);
  assert.match(compose, /STAFF_PASSWORD_HASH_B64: \$\{STAFF_PASSWORD_HASH_B64:-\}/);
});
