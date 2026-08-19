import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, getAuthSecret, verifySession } from "@/lib/auth-cookie";
import { prisma } from "@/lib/server/db";
import { storeLocalJobImage } from "@/lib/server/local-storage";

export const runtime = "nodejs";

const maxFiles = 8;
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxImageSize = 5 * 1024 * 1024;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

async function requireSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(AUTH_COOKIE)?.value, getAuthSecret());
}

export async function POST(request: Request, { params }: { params: Promise<{ jobNumber: string }> }) {
  const session = await requireSession();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const { jobNumber } = await params;
  const job = await prisma.job.findUnique({ where: { jobNumber: decodeURIComponent(jobNumber) } });
  if (!job) {
    return jsonError("Job not found", 404);
  }

  const formData = await request.formData();
  const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length) {
    return jsonError("Choose at least one image.");
  }
  if (files.length > maxFiles) {
    return jsonError(`Upload up to ${maxFiles} images at a time.`);
  }
  if (files.some((file) => !imageTypes.has(file.type) || file.size > maxImageSize)) {
    return jsonError("Images must be PNG, JPEG, or WebP files under 5MB.");
  }

  const attachments = [];
  for (const file of files) {
    const stored = await storeLocalJobImage(file, job.jobNumber);
    const attachment = await prisma.jobAttachment.create({
      data: {
        jobId: job.id,
        originalName: stored.originalName,
        storedName: stored.storedName,
        relativePath: stored.relativePath,
        mimeType: stored.mimeType,
        size: stored.size,
        source: "Internal Upload",
      },
    });
    attachments.push({
      id: attachment.id,
      name: attachment.originalName,
      url: `/api/job-attachments/${attachment.id}`,
      mimeType: attachment.mimeType,
      size: attachment.size,
      source: attachment.source,
      createdAt: attachment.createdAt.toLocaleString("en-AU"),
    });
  }

  await prisma.jobNote.create({
    data: {
      jobId: job.id,
      visibility: "Internal",
      body: `Saved ${attachments.length} image upload${attachments.length === 1 ? "" : "s"} from ${session.name}.`,
    },
  });

  return NextResponse.json({ ok: true, attachments });
}
