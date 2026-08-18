"use client";

import { useEffect, useState } from "react";
import { defaultSettings } from "@/lib/operations-data";
import { calculateTotals, formatCurrency, type LineItem } from "@/lib/workflows";

type LocalQuote = {
  number: string;
  token: string;
  customer: string;
  job: string;
  status: string;
  items: LineItem[];
};

function readLocalQuote(token: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem("sct-quotes");
    const quotes = stored ? JSON.parse(stored) as LocalQuote[] : [];
    return quotes.find((item) => item.token === token) ?? null;
  } catch {
    return null;
  }
}

export function LocalQuoteApproval({ token }: { token: string }) {
  const [quote, setQuote] = useState<LocalQuote | null | undefined>(undefined);
  const [result, setResult] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (mounted) {
        setQuote(readLocalQuote(token));
      }
    });

    return () => {
      mounted = false;
    };
  }, [token]);

  function decide(decision: "Approved" | "Declined" | "Contact Requested") {
    if (!quote) {
      return;
    }
    const nextStatus = decision === "Approved" ? "Approved" : decision === "Declined" ? "Declined" : "Contact Requested";
    const stored = window.localStorage.getItem("sct-quotes");
    const quotes = stored ? JSON.parse(stored) as LocalQuote[] : [];
    window.localStorage.setItem("sct-quotes", JSON.stringify(quotes.map((item) => item.token === token ? { ...item, status: nextStatus } : item)));
    setQuote({ ...quote, status: nextStatus });
    setResult(nextStatus);
  }

  if (quote === undefined) {
    return <main className="min-h-screen bg-slate-100 px-4 py-8"><section className="mx-auto max-w-3xl rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">Loading quote...</section></main>;
  }

  if (!quote) {
    return <main className="min-h-screen bg-slate-100 px-4 py-8"><section className="mx-auto max-w-3xl rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-2xl font-black">Quote not found</h1><p className="mt-2 text-sm text-slate-600">This approval link is not available in this browser or database.</p></section></main>;
  }

  const totals = calculateTotals(quote.items, defaultSettings.gstRegistered);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-3xl rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff8a00]">Local Quote Approval</p>
          <h1 className="mt-2 text-3xl font-black">Sunset Country Tech</h1>
          <p className="mt-1 text-sm text-slate-600">{quote.number} for {quote.customer} - Job {quote.job}</p>
        </div>
        <div className="p-6">
          {result ? <p className="mb-5 rounded-[8px] bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Your response has been recorded locally: {result}.</p> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="text-xs uppercase text-slate-500"><th className="py-3">Description</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Unit</th><th className="py-3 text-right">Total</th></tr></thead>
              <tbody>{quote.items.map((item) => <tr key={item.description} className="border-t border-slate-100"><td className="py-3">{item.description}</td><td className="px-3 py-3">{item.quantity}</td><td className="px-3 py-3">{formatCurrency(item.unitPrice)}</td><td className="py-3 text-right font-black">{formatCurrency(item.quantity * item.unitPrice)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-5 rounded-[8px] bg-[#0d1220] p-4 text-white">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="mt-2 flex justify-between text-sm"><span>GST not applied</span><span>{formatCurrency(totals.tax)}</span></div>
            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-xl font-black"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button onClick={() => decide("Approved")} className="h-11 rounded-[8px] bg-emerald-600 font-black text-white">Approve</button>
            <button onClick={() => decide("Declined")} className="h-11 rounded-[8px] bg-red-600 font-black text-white">Decline</button>
            <button onClick={() => decide("Contact Requested")} className="h-11 rounded-[8px] border border-slate-200 font-black">Contact me</button>
          </div>
        </div>
      </section>
    </main>
  );
}
