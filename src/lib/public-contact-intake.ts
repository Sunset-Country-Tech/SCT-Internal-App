import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const publicContactServices = [
  "Computer Repair",
  "Computer Upgrade",
  "PC Build",
  "Home Tech Support",
  "Digital Literacy",
  "Wi-Fi / Networking",
  "Printer",
  "Security Cameras",
  "Smart Home",
  "Business IT",
  "3D Printing",
  "Remote Support",
  "Other",
] as const;

export const preferredSupportOptions = ["On-site", "Remote", "Collection/drop-off", "Not sure"] as const;

const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxPhotos = 4;
const maxPhotoSize = 5 * 1024 * 1024;

export const publicContactIntakeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).optional().default(""),
  suburb: z.string().trim().min(1).max(120),
  service: z.enum(publicContactServices),
  message: z.string().trim().min(15).max(4000),
  device: z.string().trim().max(180).optional().default(""),
  preferredSupport: z.enum(preferredSupportOptions),
  companyWebsite: z.string().trim().max(500).optional().default(""),
});

export type PublicContactIntakeInput = z.infer<typeof publicContactIntakeSchema>;
export type PublicContactPhoto = { name: string; type: string; size: number };
export type PublicContactCustomer = { id: string; customerNumber: string; name: string; email: string | null; phone: string | null; serviceArea: string | null };
export type PublicContactJob = { id: string; jobNumber: string };
export type PublicContactAudit = { id: string };

export type PublicContactIntakeRepository = {
  findCustomer: (email: string, phone: string) => Promise<PublicContactCustomer | null>;
  createCustomer: (input: { customerNumber: string; name: string; email: string; phone: string; serviceArea: string; type: string }) => Promise<PublicContactCustomer>;
  updateCustomer: (id: string, input: { name: string; email: string; phone: string; serviceArea: string }) => Promise<PublicContactCustomer>;
  countJobs: () => Promise<number>;
  createJob: (input: { jobNumber: string; customerId: string; type: string; status: string; priority: string; device: string; description: string }) => Promise<PublicContactJob>;
  createJobNote: (input: { jobId: string; body: string; visibility: string }) => Promise<{ id: string }>;
  createAuditLog: (input: { event: string; entityType: string; entityId: string; after: Record<string, unknown> }) => Promise<PublicContactAudit>;
};

export class PublicContactIntakeError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function getSourceIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

export function verifyPublicIntakeSecret(provided: string | null, expected: string | undefined) {
  if (!expected) {
    return false;
  }
  if (!provided) {
    return false;
  }
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export function publicIntakeSecretFromEnv(env: Record<string, string | undefined> = process.env) {
  return env.SCT_PUBLIC_INTAKE_SECRET || env.PUBLIC_INTAKE_SECRET;
}

export function parsePublicContactFormData(formData: FormData) {
  const parsed = publicContactIntakeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    suburb: formData.get("suburb"),
    service: formData.get("service"),
    message: formData.get("message"),
    device: formData.get("device") ?? "",
    preferredSupport: formData.get("preferredSupport"),
    companyWebsite: formData.get("companyWebsite") ?? "",
  });

  if (!parsed.success) {
    throw new PublicContactIntakeError("Invalid contact enquiry.", 400);
  }
  if (parsed.data.companyWebsite) {
    throw new PublicContactIntakeError("Contact enquiry rejected.", 400);
  }

  const photos = formData.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (photos.length > maxPhotos) {
    throw new PublicContactIntakeError("Too many photos uploaded.", 400);
  }
  const photoMetadata = photos.map((photo) => ({ name: photo.name, type: photo.type, size: photo.size }));
  if (photoMetadata.some((photo) => !imageTypes.has(photo.type) || photo.size > maxPhotoSize)) {
    throw new PublicContactIntakeError("Photos must be PNG, JPEG, or WebP files under 5MB.", 400);
  }

  return { input: parsed.data, photos: photoMetadata };
}

export function buildPublicContactJobDescription(input: PublicContactIntakeInput, photos: PublicContactPhoto[]) {
  const photoLines = photos.length
    ? photos.map((photo) => `- ${photo.name} (${photo.type}, ${Math.round(photo.size / 1024)}KB)`).join("\n")
    : "No photos uploaded.";
  return [
    "Source: Public Website",
    `Requested service: ${input.service}`,
    `Preferred support: ${input.preferredSupport}`,
    `Suburb: ${input.suburb}`,
    `Device/equipment: ${input.device || "Not supplied"}`,
    "",
    "Customer message:",
    input.message,
    "",
    "Photo uploads:",
    photoLines,
    "",
    "TODO: Persist uploaded photo files when file storage is implemented.",
  ].join("\n");
}

export async function createPublicContactIntake(repo: PublicContactIntakeRepository, input: PublicContactIntakeInput, photos: PublicContactPhoto[], sourceIp: string, now = new Date()) {
  const existing = await repo.findCustomer(input.email, input.phone);
  const customer = existing
    ? await repo.updateCustomer(existing.id, { name: input.name, email: input.email, phone: input.phone, serviceArea: input.suburb })
    : await repo.createCustomer({
      customerNumber: `WEB-CUST-${now.getTime()}`,
      name: input.name,
      email: input.email,
      phone: input.phone,
      serviceArea: input.suburb,
      type: input.service === "Business IT" ? "Business" : "Website Lead",
    });

  const nextJobIndex = (await repo.countJobs()) + 1;
  const year = now.getFullYear();
  const job = await repo.createJob({
    jobNumber: `WEB-${year}-${String(nextJobIndex).padStart(4, "0")}`,
    customerId: customer.id,
    type: input.service,
    status: "Intake",
    priority: "Normal",
    device: input.device,
    description: buildPublicContactJobDescription(input, photos),
  });

  await repo.createJobNote({
    jobId: job.id,
    visibility: "Internal",
    body: `Public Website intake from ${input.name} <${input.email}>. Preferred support: ${input.preferredSupport}. Source IP: ${sourceIp}.`,
  });

  const audit = await repo.createAuditLog({
    event: "Public website contact intake",
    entityType: "Job",
    entityId: job.jobNumber,
    after: {
      source: "Public Website",
      sourceIp,
      customer: { name: input.name, email: input.email, phone: input.phone, suburb: input.suburb },
      service: input.service,
      preferredSupport: input.preferredSupport,
      device: input.device,
      photoUploads: photos,
    },
  });

  return { intakeId: audit.id, jobId: job.jobNumber };
}
