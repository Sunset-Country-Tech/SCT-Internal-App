import { LocalQuoteApproval } from "@/components/LocalQuoteApproval";
import { findQuoteForApproval } from "@/lib/server/quotes";
import { calculateTotals, formatCurrency } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export default async function QuoteApprovalPage(props: PageProps<"/q/[token]">) {
  const { token } = await props.params;
  const searchParams = await props.searchParams;
  const quote = await findQuoteForApproval(token);

  if (!quote) {
    return <LocalQuoteApproval token={token} />;
  }

  const totals = calculateTotals(quote.items, quote.gstRegistered);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-3xl rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff8a00]">Secure Quote Approval</p>
          <h1 className="mt-2 text-3xl font-black">Sunset Country Tech</h1>
          <p className="mt-1 text-sm text-slate-600">{quote.number} for {quote.customer} - Job {quote.job}</p>
        </div>
        <div className="p-6">
          {searchParams.result ? <p className="mb-5 rounded-[8px] bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Your response has been recorded.</p> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="text-xs uppercase text-slate-500"><th className="py-3">Description</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Unit</th><th className="py-3 text-right">Total</th></tr></thead>
              <tbody>{quote.items.map((item) => <tr key={item.description} className="border-t border-slate-100"><td className="py-3">{item.description}</td><td className="px-3 py-3">{item.quantity}</td><td className="px-3 py-3">{formatCurrency(item.unitPrice)}</td><td className="py-3 text-right font-black">{formatCurrency(item.quantity * item.unitPrice)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-5 rounded-[8px] bg-[#0d1220] p-4 text-white">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="mt-2 flex justify-between text-sm"><span>{quote.gstRegistered ? "GST" : "GST not applied"}</span><span>{formatCurrency(totals.tax)}</span></div>
            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-xl font-black"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
          </div>
          <form action={`/api/quotes/${token}/approval`} method="post" className="mt-6 grid gap-3">
            <label className="text-sm font-bold">Your name<input name="name" required className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3" /></label>
            <label className="text-sm font-bold">Comment<textarea name="comment" className="mt-1 min-h-24 w-full rounded-[8px] border border-slate-200 p-3" /></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <button name="decision" value="Approved" className="h-11 rounded-[8px] bg-emerald-600 font-black text-white">Approve</button>
              <button name="decision" value="Declined" className="h-11 rounded-[8px] bg-red-600 font-black text-white">Decline</button>
              <button name="decision" value="Contact Requested" className="h-11 rounded-[8px] border border-slate-200 font-black">Contact me</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
