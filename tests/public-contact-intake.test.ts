import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../src/app/api/public-contact-intake/route";
import {
  createPublicContactIntake,
  parsePublicContactFormData,
  PublicContactIntakeError,
  publicIntakeSecretFromEnv,
  type PublicContactCustomer,
  type PublicContactIntakeRepository,
} from "../src/lib/public-contact-intake";

function validFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields = {
    name: "Mia Thompson",
    email: "mia@example.test",
    phone: "0400 123 456",
    suburb: "Irymple",
    service: "Computer Repair",
    message: "My laptop is running very slowly and I need help this week.",
    device: "Lenovo IdeaPad",
    preferredSupport: "On-site",
    companyWebsite: "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

function fakeRepository() {
  const calls: Record<string, unknown[]> = {
    createCustomer: [],
    updateCustomer: [],
    createJob: [],
    createJobNote: [],
    createJobAttachment: [],
    createAuditLog: [],
  };
  const repo: PublicContactIntakeRepository = {
    findCustomer: async () => null,
    createCustomer: async (input) => {
      calls.createCustomer.push(input);
      return { id: "cust_1", ...input };
    },
    updateCustomer: async (id, input) => {
      calls.updateCustomer.push({ id, input });
      return { id, customerNumber: "CUST-1", ...input };
    },
    countJobs: async () => 4,
    createJob: async (input) => {
      calls.createJob.push(input);
      return { id: "job_1", jobNumber: input.jobNumber };
    },
    createJobNote: async (input) => {
      calls.createJobNote.push(input);
      return { id: "note_1" };
    },
    createJobAttachment: async (input) => {
      calls.createJobAttachment.push(input);
      return { id: "attachment_1", originalName: input.photo.name, url: `/api/job-attachments/attachment_1` };
    },
    createAuditLog: async (input) => {
      calls.createAuditLog.push(input);
      return { id: "audit_1" };
    },
  };
  return { repo, calls };
}

function addPhoto(formData: FormData) {
  formData.append("photos", new File([new Uint8Array([137, 80, 78, 71])], "slow-laptop.png", { type: "image/png" }));
  return formData;
}

test("valid public contact submission creates intake job records", async () => {
  const { input, photos } = parsePublicContactFormData(validFormData());
  const { repo, calls } = fakeRepository();

  const result = await createPublicContactIntake(repo, input, photos, "203.0.113.10", new Date("2026-08-18T00:00:00.000Z"));

  assert.deepEqual(result, { intakeId: "audit_1", jobId: "WEB-2026-0005" });
  assert.equal((calls.createCustomer[0] as PublicContactCustomer).email, "mia@example.test");
  assert.equal((calls.createJob[0] as { status: string; type: string; description: string }).status, "Intake");
  assert.equal((calls.createJob[0] as { status: string; type: string; description: string }).type, "Computer Repair");
  assert.match((calls.createJob[0] as { description: string }).description, /Source: Public Website/);
  assert.equal(calls.createJobNote.length, 1);
  assert.equal(calls.createAuditLog.length, 1);
});

test("valid public contact submission stores uploaded photo attachments", async () => {
  const { input, photos } = parsePublicContactFormData(addPhoto(validFormData()));
  const { repo, calls } = fakeRepository();

  await createPublicContactIntake(repo, input, photos, "203.0.113.10", new Date("2026-08-18T00:00:00.000Z"));

  assert.equal(photos.length, 1);
  assert.equal(photos[0].file?.name, "slow-laptop.png");
  assert.equal(calls.createJobAttachment.length, 1);
  assert.equal((calls.createJobAttachment[0] as { photo: { name: string } }).photo.name, "slow-laptop.png");
  assert.equal(calls.createJobNote.length, 2);
  assert.match((calls.createJobNote[1] as { body: string }).body, /Saved 1 public website photo upload/);
  assert.doesNotMatch((calls.createJob[0] as { description: string }).description, /TODO/);
});

test("missing shared public intake secret is rejected", async () => {
  process.env.PUBLIC_INTAKE_SECRET = "test-secret";
  const response = await POST(new Request("http://localhost/api/public-contact-intake", { method: "POST", body: validFormData() }));
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(body, { ok: false, message: "Contact intake is not available." });
});

test("invalid shared public intake secret is rejected", async () => {
  process.env.PUBLIC_INTAKE_SECRET = "test-secret";
  const response = await POST(new Request("http://localhost/api/public-contact-intake", {
    method: "POST",
    headers: { "x-sct-public-intake-secret": "wrong-secret" },
    body: validFormData(),
  }));
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(body, { ok: false, message: "Contact intake is not available." });
});

test("public intake secret supports SCT env alias", () => {
  assert.equal(publicIntakeSecretFromEnv({ SCT_PUBLIC_INTAKE_SECRET: "alias-secret" }), "alias-secret");
  assert.equal(publicIntakeSecretFromEnv({ PUBLIC_INTAKE_SECRET: "primary-secret" }), "primary-secret");
  assert.equal(
    publicIntakeSecretFromEnv({
      PUBLIC_INTAKE_SECRET: "docker-dev-public-intake-secret",
      SCT_PUBLIC_INTAKE_SECRET: "production-secret",
    }),
    "production-secret",
  );
});

test("honeypot spam is rejected", () => {
  assert.throws(
    () => parsePublicContactFormData(validFormData({ companyWebsite: "https://spam.example" })),
    (error) => error instanceof PublicContactIntakeError && error.message === "Contact enquiry rejected.",
  );
});

test("invalid service and preferred support are rejected", () => {
  assert.throws(() => parsePublicContactFormData(validFormData({ service: "Screen Psychic" })));
  assert.throws(() => parsePublicContactFormData(validFormData({ preferredSupport: "Teleport" })));
});
