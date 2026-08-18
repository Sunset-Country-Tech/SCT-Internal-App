import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultSettings } from "../src/lib/operations-data";

const rootEnvNames = [
  "NEXT_PUBLIC_SITE_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_COOKIE_SECURE",
  "INTERNAL_USERS_JSON",
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

  for (const name of [...rootEnvNames, ...settingEnvNames]) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"), `${name} is missing from .env.example`);
  }
});

test("docker compose passes every settings-backed secret env var into the app container", () => {
  const compose = readFileSync("docker-compose.yml", "utf8");

  for (const name of settingEnvNames) {
    assert.match(compose, new RegExp(`${name}: \\$\\{${name}:-\\}`), `${name} is missing from docker-compose.yml`);
  }
});
