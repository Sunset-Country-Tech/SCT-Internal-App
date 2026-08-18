import { z } from "zod";
import { quoteDecisionTransition } from "@/lib/workflows";

export const quoteApprovalSchema = z.object({
  token: z.string().min(8).max(160),
  name: z.string().trim().min(2).max(120),
  comment: z.string().trim().max(1000).optional(),
  decision: z.enum(["Approved", "Declined", "Contact Requested"]),
});

export function buildQuoteApprovalAudit(input: z.infer<typeof quoteApprovalSchema>, ipAddress?: string | null) {
  return {
    ...quoteDecisionTransition(input.decision),
    name: input.name,
    comment: input.comment ?? "",
    ipAddress: ipAddress ?? null,
    createdAt: new Date().toISOString(),
  };
}
