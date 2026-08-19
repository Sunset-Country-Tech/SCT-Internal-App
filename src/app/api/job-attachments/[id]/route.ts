import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, getAuthSecret, verifySession } from "@/lib/auth-cookie";
import { prisma } from "@/lib/server/db";
import { readLocalJobImage } from "@/lib/server/local-storage";

export const runtime = "nodejs";

function contentDispositionName(value: string) {
  return value.replace(/[\r\n"]/g, "").slice(0, 180) || "attachment";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(AUTH_COOKIE)?.value, getAuthSecret());
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.jobAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  try {
    const bytes = await readLocalJobImage(attachment.relativePath);
    return new Response(bytes, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.size),
        "Content-Disposition": `inline; filename="${contentDispositionName(attachment.originalName)}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Attachment file missing" }, { status: 404 });
  }
}
