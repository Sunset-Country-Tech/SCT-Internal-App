import { NextResponse } from "next/server";
import { buildQuoteApprovalAudit, quoteApprovalSchema } from "@/lib/quote-approval";
import { findQuoteForApproval } from "@/lib/server/quotes";
import { prisma } from "@/lib/server/db";
import { relativeRedirect } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request, props: RouteContext<"/api/quotes/[token]/approval">) {
  const { token } = await props.params;
  const quote = await findQuoteForApproval(token);
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const parsed = quoteApprovalSchema.safeParse({
    token,
    name: formData.get("name"),
    comment: formData.get("comment"),
    decision: formData.get("decision"),
  });

  if (!parsed.success) {
    return relativeRedirect(`/q/${token}?error=validation`);
  }

  const audit = buildQuoteApprovalAudit(parsed.data, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
  if (quote.id) {
    try {
      await prisma.quote.update({ where: { id: quote.id }, data: { status: audit.quoteStatus } });
      await prisma.quoteApproval.create({
        data: {
          quoteId: quote.id,
          decision: parsed.data.decision,
          name: parsed.data.name,
          comment: parsed.data.comment,
          ipAddress: audit.ipAddress,
        },
      });
      await prisma.auditLog.create({
        data: {
          event: audit.auditEvent,
          entityType: "Quote",
          entityId: quote.number,
          after: audit,
        },
      });
    } catch {
      return relativeRedirect(`/q/${token}?error=storage`);
    }
  }

  const result = parsed.data.decision.toLowerCase().replace(/\s+/g, "-");
  const response = relativeRedirect(`/q/${token}?result=${result}`);
  response.headers.set("x-sct-audit-event", audit.auditEvent);
  return response;
}
