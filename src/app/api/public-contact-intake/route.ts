import { NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import {
  createPublicContactIntake,
  getSourceIp,
  parsePublicContactFormData,
  PublicContactIntakeError,
  publicIntakeSecretFromEnv,
  verifyPublicIntakeSecret,
  type PublicContactIntakeRepository,
} from "@/lib/public-contact-intake";
import { prisma } from "@/lib/server/db";
import { storeLocalJobImage } from "@/lib/server/local-storage";
import { currentTimeMs } from "@/lib/server/time";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function rateLimited(key: string) {
  const now = currentTimeMs();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 20;
}

function prismaRepository(): PublicContactIntakeRepository {
  return {
    findCustomer: (email, phone) => prisma.customer.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    }),
    createCustomer: (input) => prisma.customer.create({ data: input }),
    updateCustomer: (id, input) => prisma.customer.update({ where: { id }, data: input }),
    countJobs: () => prisma.job.count(),
    createJob: (input) => prisma.job.create({ data: input }),
    createJobNote: (input) => prisma.jobNote.create({ data: input }),
    createJobAttachment: async ({ jobId, jobNumber, photo }) => {
      if (!photo.file) {
        throw new PublicContactIntakeError("Photo upload could not be saved.", 400);
      }
      const stored = await storeLocalJobImage(photo.file, jobNumber);
      const attachment = await prisma.jobAttachment.create({
        data: {
          jobId,
          originalName: stored.originalName,
          storedName: stored.storedName,
          relativePath: stored.relativePath,
          mimeType: stored.mimeType,
          size: stored.size,
          source: "Public Website",
        },
      });
      return {
        id: attachment.id,
        originalName: attachment.originalName,
        url: `/api/job-attachments/${attachment.id}`,
      };
    },
    createAuditLog: (input) => prisma.auditLog.create({ data: { ...input, after: input.after as Prisma.InputJsonValue } }),
  };
}

export async function POST(request: Request) {
  const sourceIp = getSourceIp(request.headers);
  if (rateLimited(sourceIp)) {
    return jsonError("Too many contact enquiries. Please try again later.", 429);
  }

  if (!verifyPublicIntakeSecret(request.headers.get("x-sct-public-intake-secret"), publicIntakeSecretFromEnv())) {
    return jsonError("Contact intake is not available.", 401);
  }

  try {
    const { input, photos } = parsePublicContactFormData(await request.formData());
    const result = await createPublicContactIntake(prismaRepository(), input, photos, sourceIp);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof PublicContactIntakeError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Contact enquiry could not be saved.", 503);
  }
}
