import { defaultSettings, quotes } from "@/lib/operations-data";
import { prisma } from "@/lib/server/db";
import type { LineItem } from "@/lib/workflows";

export type ApprovalQuote = {
  id?: string;
  number: string;
  token: string;
  customer: string;
  job: string;
  status: string;
  items: LineItem[];
  gstRegistered: boolean;
};

type DbQuoteItem = {
  description: string;
  quantity: unknown;
  unitPrice: unknown;
  taxRate: unknown;
};

export async function findQuoteForApproval(token: string): Promise<ApprovalQuote | null> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { token },
      include: { customer: true, job: true, items: true },
    });

    if (quote) {
      return {
        id: quote.id,
        number: quote.quoteNumber,
        token: quote.token,
        customer: quote.customer.name,
        job: quote.job?.jobNumber ?? "",
        status: quote.status,
        gstRegistered: defaultSettings.gstRegistered,
        items: quote.items.map((item: DbQuoteItem) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
        })),
      };
    }
  } catch {
    // Local development can run without a database; fall back to bundled demo quotes.
  }

  const seeded = quotes.find((item) => item.token === token);
  if (!seeded) {
    return null;
  }

  return {
    number: seeded.number,
    token: seeded.token,
    customer: seeded.customer,
    job: seeded.job,
    status: seeded.status,
    gstRegistered: defaultSettings.gstRegistered,
    items: seeded.items,
  };
}
