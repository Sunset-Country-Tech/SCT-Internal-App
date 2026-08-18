"use client";

import { AlertTriangle, Bell, CalendarPlus, CheckCircle2, CreditCard, FilePlus2, LogOut, Menu, Plus, Save, Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SettingsPanel } from "@/components/SettingsPanel";
import {
  alerts,
  appointments as seedAppointments,
  customers as seedCustomers,
  defaultSettings,
  invoices as seedInvoices,
  jobs as seedJobs,
  navItems,
  normalizeSettings,
  quotes as seedQuotes,
  type AppSettings,
} from "@/lib/operations-data";
import { calculateTotals, can, formatCurrency, nextNumber, type Role } from "@/lib/workflows";

type Props = {
  user: {
    name: string;
    email: string;
    role: Role;
  };
};

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{children}</span>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[8px] border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black">{title}</h2></div><div className="p-5">{children}</div></section>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p><p className="mt-1 text-sm text-slate-600">{detail}</p></div>;
}

type CustomerRecord = (typeof seedCustomers)[number];
type JobRecord = (typeof seedJobs)[number];
type QuoteRecord = (typeof seedQuotes)[number];
type InvoiceRecord = (typeof seedInvoices)[number];
type AppointmentRecord = (typeof seedAppointments)[number];
type ModalMode = "job" | "customer" | "quote" | "appointment" | "payment" | "workflow" | null;
type ActivityRecord = { id: string; title: string; detail: string; createdAt: string };
type OperationsData = {
  customers: CustomerRecord[];
  jobs: JobRecord[];
  quotes: QuoteRecord[];
  invoices: InvoiceRecord[];
  appointments: AppointmentRecord[];
  activity: ActivityRecord[];
};

function loadRecords<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  const stored = window.localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }
  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function saveRecords<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-800">{label}<div className="mt-1">{children}</div></label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-[#ff8a00]" />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-[#ff8a00]" />;
}

export function OperationsApp({ user }: Props) {
  const [active, setActive] = useState<(typeof navItems)[number]["label"]>("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [customerRecords, setCustomerRecords] = useState<CustomerRecord[]>(seedCustomers);
  const [jobRecords, setJobRecords] = useState<JobRecord[]>(seedJobs);
  const [quoteRecords, setQuoteRecords] = useState<QuoteRecord[]>(seedQuotes);
  const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>(seedInvoices);
  const [appointmentRecords, setAppointmentRecords] = useState<AppointmentRecord[]>(seedAppointments);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const quoteTotal = calculateTotals(quoteRecords[0]?.items ?? [], settings.gstRegistered).total;
  const outstanding = invoiceRecords.reduce((total, invoice) => total + invoice.total - invoice.paid, 0);
  const loweredQuery = query.toLowerCase();
  const filteredJobs = jobRecords.filter((job) => [job.number, job.customer, job.type, job.device, job.status].join(" ").toLowerCase().includes(loweredQuery));
  const filteredCustomers = customerRecords.filter((customer) => [customer.id, customer.name, customer.phone, customer.email, customer.area, customer.type].join(" ").toLowerCase().includes(loweredQuery));
  const newJobNumber = useMemo(() => nextNumber(settings.numbering.job, 2026, jobRecords.map((job) => job.number)), [settings.numbering.job, jobRecords]);
  const alertMessages = useMemo(() => [
    ...alerts.map((alert, index) => ({ id: `seed-alert-${index}`, text: alert })),
    ...activityRecords.slice(0, 3).map((activity) => ({ id: activity.id, text: activity.title })),
  ], [activityRecords]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) {
        return;
      }
      setCustomerRecords(loadRecords("sct-customers", seedCustomers));
      setJobRecords(loadRecords("sct-jobs", seedJobs));
      setQuoteRecords(loadRecords("sct-quotes", seedQuotes));
      setInvoiceRecords(loadRecords("sct-invoices", seedInvoices));
      setAppointmentRecords(loadRecords("sct-appointments", seedAppointments));
      setActivityRecords(loadRecords("sct-activity", [] as ActivityRecord[]));
      const storedSettings = window.localStorage.getItem("sct-settings");
      if (storedSettings) {
        try {
          setSettings(normalizeSettings(JSON.parse(storedSettings)));
        } catch {
          window.localStorage.removeItem("sct-settings");
        }
      }
    });

    fetch("/api/operations")
      .then((response) => response.json() as Promise<{ source: string; data: OperationsData }>)
      .then((payload) => {
        if (!mounted || payload.source !== "database") {
          return;
        }
        setCustomerRecords(payload.data.customers);
        setJobRecords(payload.data.jobs);
        setQuoteRecords(payload.data.quotes);
        setInvoiceRecords(payload.data.invoices);
        setAppointmentRecords(payload.data.appointments);
        setActivityRecords(payload.data.activity);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function syncOperation(payload: unknown) {
    try {
      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        showNotice("Saved locally. Database sync is waiting for configuration.");
      }
    } catch {
      showNotice("Saved locally. Database sync is waiting for configuration.");
    }
  }

  function openSection(section: (typeof navItems)[number]["label"]) {
    setActive(section);
    setMobileOpen(false);
    setAlertsOpen(false);
  }

  function guardedOpen(mode: Exclude<ModalMode, null>, permission: Parameters<typeof can>[1]) {
    if (!can(user.role, permission)) {
      showNotice("Your role can view this area but cannot make that change.");
      return;
    }
    setAlertsOpen(false);
    setModal(mode);
  }

  function addActivity(title: string, detail: string) {
    const nextId = `ACT-${String(activityRecords.length + 1).padStart(4, "0")}`;
    const next = [{ id: nextId, title, detail, createdAt: new Date().toLocaleString("en-AU") }, ...activityRecords].slice(0, 20);
    setActivityRecords(next);
    saveRecords("sct-activity", next);
  }

  function createCustomer(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      showNotice("Customer name is required.");
      return;
    }
    const next: CustomerRecord[] = [{
      id: `CUST-${String(1042 + customerRecords.length + 1).padStart(4, "0")}`,
      name,
      type: String(formData.get("type") ?? "Individual"),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      area: String(formData.get("area") ?? settings.serviceAreas[0] ?? ""),
      tags: [String(formData.get("tag") ?? settings.tags[0] ?? "Repeat Customer")],
    }, ...customerRecords];
    setCustomerRecords(next);
    saveRecords("sct-customers", next);
    void syncOperation({ action: "create-customer", customer: next[0] });
    addActivity("Customer added", `${name} is ready for jobs, quotes, and appointments.`);
    setModal(null);
    openSection("Customers");
    showNotice("Customer created.");
  }

  function createJob(formData: FormData) {
    const customer = String(formData.get("customer") ?? customerRecords[0]?.name ?? "").trim();
    const device = String(formData.get("device") ?? "").trim();
    const type = String(formData.get("type") ?? settings.jobTypes[0] ?? "Computer Repair");
    if (!customer || !device) {
      showNotice("Job needs a customer and device.");
      return;
    }
    const number = nextNumber(settings.numbering.job, 2026, jobRecords.map((job) => job.number));
    const next: JobRecord[] = [{
      number,
      customer,
      type,
      device,
      status: settings.jobStatuses[0] ?? "New",
      due: String(formData.get("due") ?? ""),
      next: String(formData.get("next") ?? "Diagnose and update customer"),
    }, ...jobRecords];
    setJobRecords(next);
    saveRecords("sct-jobs", next);
    void syncOperation({ action: "create-job", job: next[0] });
    addActivity("Job created", `${number} opened for ${customer}.`);
    setModal(null);
    openSection("Jobs");
    showNotice(`${number} created.`);
  }

  function createQuote(formData: FormData) {
    const customer = String(formData.get("customer") ?? customerRecords[0]?.name ?? "").trim();
    const job = String(formData.get("job") ?? jobRecords[0]?.number ?? "").trim();
    const amount = Number(formData.get("amount") ?? settings.labourRate);
    if (!customer || !job || amount <= 0) {
      showNotice("Quote needs customer, job, and amount.");
      return;
    }
    const number = nextNumber(settings.numbering.quote, 2026, quoteRecords.map((quote) => quote.number));
    const next: QuoteRecord[] = [{
      number,
      token: `approval-${String(quoteRecords.length + 1).padStart(4, "0")}`,
      customer,
      job,
      status: "Draft",
      expiry: String(formData.get("expiry") ?? ""),
      items: [{ description: String(formData.get("description") ?? "Service labour"), quantity: 1, unitPrice: amount, taxRate: settings.gstRate }],
    }, ...quoteRecords];
    setQuoteRecords(next);
    saveRecords("sct-quotes", next);
    void syncOperation({ action: "create-quote", quote: next[0] });
    addActivity("Quote drafted", `${number} drafted for ${customer}.`);
    setModal(null);
    openSection("Quotes");
    showNotice(`${number} drafted.`);
  }

  function createAppointment(formData: FormData) {
    const customer = String(formData.get("customer") ?? customerRecords[0]?.name ?? "").trim();
    const nextRecord: AppointmentRecord = {
      time: String(formData.get("time") ?? ""),
      type: String(formData.get("type") ?? settings.jobTypes[0] ?? "Computer Repair"),
      customer,
      location: String(formData.get("location") ?? "Workshop"),
    };
    if (!nextRecord.time || !customer) {
      showNotice("Appointment needs time and customer.");
      return;
    }
    const next = [nextRecord, ...appointmentRecords];
    setAppointmentRecords(next);
    saveRecords("sct-appointments", next);
    void syncOperation({ action: "create-appointment", appointment: next[0] });
    addActivity("Appointment booked", `${nextRecord.time} with ${customer}.`);
    setModal(null);
    openSection("Calendar");
    showNotice("Appointment booked.");
  }

  function recordPayment(formData: FormData) {
    const number = String(formData.get("invoice") ?? "");
    const amount = Number(formData.get("amount") ?? 0);
    if (!number || amount <= 0) {
      showNotice("Choose an invoice and enter a payment amount.");
      return;
    }
    const next = invoiceRecords.map((invoice) => {
      if (invoice.number !== number) {
        return invoice;
      }
      const paid = Math.min(invoice.total, invoice.paid + amount);
      return { ...invoice, paid, status: paid >= invoice.total ? "Paid" : "Partially Paid" };
    });
    setInvoiceRecords(next);
    saveRecords("sct-invoices", next);
    void syncOperation({ action: "record-payment", invoiceNumber: number, amount });
    addActivity("Payment recorded", `${formatCurrency(amount, settings.currency)} applied to ${number}.`);
    setModal(null);
    openSection("Payments");
    showNotice("Payment recorded.");
  }

  function draftWorkflow(formData: FormData) {
    const title = String(formData.get("title") ?? `${active} workflow`).trim();
    const detail = String(formData.get("detail") ?? "Draft workflow queued.");
    if (!title) {
      showNotice("Workflow title is required.");
      return;
    }
    addActivity(title, detail);
    void syncOperation({ action: "draft-workflow", title, detail });
    setModal(null);
    openSection("Tasks");
    showNotice("Workflow draft added to Tasks.");
  }

  function completeJob(number: string) {
    const next = jobRecords.map((job) => job.number === number ? { ...job, status: "Completed", next: "Invoice or archive" } : job);
    setJobRecords(next);
    saveRecords("sct-jobs", next);
    void syncOperation({ action: "complete-job", jobNumber: number });
    addActivity("Job completed", `${number} marked completed.`);
    showNotice(`${number} marked completed.`);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-[#0d1220]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 bg-[#0d1220] text-white lg:block">
        <div className="border-b border-white/10 p-5">
          <p className="text-lg font-black">{settings.businessName}</p>
          <p className="text-xs text-slate-300">Internal Operations</p>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => openSection(label)} className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-sm font-bold ${active === label ? "bg-[#ff8a00] text-[#0d1220]" : "text-slate-200 hover:bg-white/10"}`}><Icon className="h-4 w-4" />{label}</button>)}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="grid h-10 w-10 place-items-center rounded-[8px] border border-slate-200 lg:hidden" aria-label="Toggle navigation"><Menu className="h-5 w-5" /></button>
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers, jobs, invoices..." className="h-10 w-full rounded-[8px] border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-[#ff8a00]" /></div>
            <button onClick={() => setAlertsOpen(!alertsOpen)} className="relative grid h-10 w-10 place-items-center rounded-[8px] border border-slate-200" aria-label="Notifications"><Bell className="h-5 w-5" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff5e7d]" /></button>
            <a href="/api/auth/logout" className="hidden h-10 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-bold sm:inline-flex"><LogOut className="h-4 w-4" /> Sign out</a>
          </div>
          {alertsOpen ? <div className="absolute right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-[8px] border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between"><p className="font-black">Notifications</p><button onClick={() => setAlertsOpen(false)} aria-label="Close notifications"><X className="h-4 w-4" /></button></div>
            <div className="space-y-2">{alertMessages.map((alert) => <button key={alert.id} onClick={() => openSection(alert.text.includes("Invoice") ? "Invoices" : alert.text.includes("Quote") ? "Quotes" : "Tasks")} className="flex w-full gap-2 rounded-[8px] bg-slate-50 p-3 text-left text-sm font-bold text-slate-700 hover:bg-amber-50"><AlertTriangle className="h-4 w-4 shrink-0 text-[#ff8a00]" />{alert.text}</button>)}</div>
          </div> : null}
          {mobileOpen ? <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-white p-3 sm:grid-cols-4 lg:hidden">{navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => openSection(label)} className={`flex items-center gap-2 rounded-[8px] px-3 py-2 text-left text-xs font-bold ${active === label ? "bg-[#0d1220] text-white" : "bg-slate-100"}`}><Icon className="h-4 w-4" />{label}</button>)}</div> : null}
        </header>
        <main className="space-y-6 p-4 sm:p-6">
          {notice ? <div className="fixed bottom-4 right-4 z-50 rounded-[8px] bg-[#0d1220] px-4 py-3 text-sm font-bold text-white shadow-xl">{notice}</div> : null}
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff8a00]">{active}</p>
              <h1 className="mt-1 text-3xl font-black">{settings.businessName} Operations</h1>
              <p className="mt-2 text-sm text-slate-600">Signed in as {user.name} ({user.role}). Workflow-first rebuild for daily repair, IT, finance and field service operations.</p>
            </div>
            <button onClick={() => guardedOpen("job", "jobs:write")} disabled={!can(user.role, "jobs:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#ff8a00] px-4 text-sm font-black text-[#0d1220] disabled:opacity-40"><Plus className="h-4 w-4" /> New Job</button>
          </div>
          {active === "Dashboard" ? <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Open jobs" value={String(jobRecords.length)} detail={`Next number ${newJobNumber}`} />
              <Metric label="Quote pending" value={formatCurrency(quoteTotal, settings.currency)} detail={settings.gstRegistered ? "GST enabled" : "GST not applied"} />
              <Metric label="Outstanding" value={formatCurrency(outstanding, settings.currency)} detail="1 invoice due" />
              <Metric label="Today" value={String(appointmentRecords.length)} detail="appointments booked" />
            </div>
            <Panel title="Quick Actions"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <button onClick={() => guardedOpen("customer", "customers:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><UserPlus className="h-4 w-4" /> Customer</button>
              <button onClick={() => guardedOpen("job", "jobs:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><Plus className="h-4 w-4" /> Job</button>
              <button onClick={() => guardedOpen("quote", "quotes:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><FilePlus2 className="h-4 w-4" /> Quote</button>
              <button onClick={() => guardedOpen("appointment", "jobs:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><CalendarPlus className="h-4 w-4" /> Appointment</button>
              <button onClick={() => guardedOpen("payment", "payments:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><CreditCard className="h-4 w-4" /> Payment</button>
            </div></Panel>
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <Panel title="Job Pipeline"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-xs uppercase text-slate-500"><th className="p-3">Job</th><th className="p-3">Customer</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Next</th><th className="p-3">Action</th></tr></thead><tbody>{filteredJobs.map((job) => <tr key={job.number} className="border-t border-slate-100"><td className="p-3 font-black">{job.number}<p className="text-xs font-normal text-slate-500">{job.device}</p></td><td className="p-3">{job.customer}</td><td className="p-3">{job.type}</td><td className="p-3"><Badge>{job.status}</Badge></td><td className="p-3">{job.next}</td><td className="p-3"><button onClick={() => completeJob(job.number)} className="inline-flex items-center gap-1 rounded-[8px] border border-slate-200 px-2 py-1 text-xs font-black"><CheckCircle2 className="h-3 w-3" /> Complete</button></td></tr>)}</tbody></table></div></Panel>
              <Panel title="Alerts">{alertMessages.map((alert) => <button key={alert.id} onClick={() => openSection(alert.text.includes("Invoice") ? "Invoices" : alert.text.includes("Quote") ? "Quotes" : "Tasks")} className="mb-3 flex w-full gap-3 rounded-[8px] bg-amber-50 p-3 text-left text-sm font-bold text-amber-900 hover:bg-amber-100"><AlertTriangle className="h-4 w-4 shrink-0" />{alert.text}</button>)}</Panel>
            </div>
          </> : null}
          {active === "Customers" ? <Panel title="Customers"><div className="mb-4 flex justify-end"><button onClick={() => guardedOpen("customer", "customers:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><UserPlus className="h-4 w-4" /> New Customer</button></div><div className="grid gap-3 md:grid-cols-3">{filteredCustomers.map((customer) => <button key={customer.id} onClick={() => showNotice(`${customer.name} selected.`)} className="rounded-[8px] border border-slate-200 p-4 text-left hover:border-[#ff8a00]"><p className="font-black">{customer.name}</p><p className="text-sm text-slate-600">{customer.phone}</p><p className="text-sm text-slate-600">{customer.email}</p><div className="mt-3 flex flex-wrap gap-2">{customer.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div></button>)}</div></Panel> : null}
          {active === "Jobs" ? <Panel title="Jobs"><div className="grid gap-3">{filteredJobs.map((job) => <div key={job.number} className="flex flex-col justify-between gap-3 rounded-[8px] border border-slate-200 p-4 md:flex-row"><button onClick={() => showNotice(`${job.number}: ${job.next}`)} className="text-left"><p className="font-black">{job.number} - {job.customer}</p><p className="text-sm text-slate-600">{job.type} - {job.device}</p></button><div className="flex items-center gap-2"><Badge>{job.status}</Badge><button onClick={() => completeJob(job.number)} className="rounded-[8px] border border-slate-200 px-3 py-2 text-xs font-black">Complete</button></div></div>)}</div></Panel> : null}
          {active === "Calendar" ? <Panel title="Calendar"><div className="mb-4 flex justify-end"><button onClick={() => guardedOpen("appointment", "jobs:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><CalendarPlus className="h-4 w-4" /> Book</button></div><div className="grid gap-3 md:grid-cols-3">{appointmentRecords.map((appointment) => <button key={`${appointment.time}-${appointment.customer}-${appointment.location}`} onClick={() => showNotice(`${appointment.customer} at ${appointment.location}`)} className="rounded-[8px] border border-slate-200 p-4 text-left hover:border-[#ff8a00]"><p className="text-sm font-black text-[#ff8a00]">{appointment.time}</p><p className="font-black">{appointment.type}</p><p className="text-sm text-slate-600">{appointment.customer} - {appointment.location}</p></button>)}</div></Panel> : null}
          {active === "Quotes" ? <Panel title="Quotes"><div className="mb-4 flex justify-end"><button onClick={() => guardedOpen("quote", "quotes:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><FilePlus2 className="h-4 w-4" /> New Quote</button></div><div className="grid gap-3">{quoteRecords.map((quote) => <div key={quote.number} className="rounded-[8px] border border-slate-200 p-4"><p className="font-black">{quote.number}</p><p className="text-sm text-slate-600">{quote.customer} - {quote.job} - {quote.status}</p><a className="mt-3 inline-flex rounded-[8px] bg-[#ff8a00] px-3 py-2 text-xs font-black text-[#0d1220]" href={`/q/${quote.token}`}>Open approval link</a></div>)}</div></Panel> : null}
          {active === "Invoices" || active === "Payments" ? <Panel title="Invoices & Payments"><div className="mb-4 flex justify-end"><button onClick={() => guardedOpen("payment", "payments:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><CreditCard className="h-4 w-4" /> Record Payment</button></div><div className="grid gap-3">{invoiceRecords.map((invoice) => <div key={invoice.number} className="flex justify-between rounded-[8px] border border-slate-200 p-4"><button onClick={() => showNotice(`${invoice.number} status: ${invoice.status}`)} className="text-left"><p className="font-black">{invoice.number}</p><p className="text-sm text-slate-600">{invoice.customer}</p></button><p className="font-black">{formatCurrency(invoice.total - invoice.paid, settings.currency)}</p></div>)}</div></Panel> : null}
          {["Digital Literacy", "Business IT", "3D Printing", "Parts", "Communications", "Tasks"].includes(active) ? <Panel title={active}>{active === "Tasks" ? <div className="grid gap-3">{activityRecords.length ? activityRecords.map((activity) => <div key={activity.id} className="rounded-[8px] border border-slate-200 p-4"><p className="font-black">{activity.title}</p><p className="text-sm text-slate-600">{activity.detail}</p><p className="mt-2 text-xs font-bold text-slate-400">{activity.createdAt}</p></div>) : <p className="text-sm text-slate-600">No workflow drafts yet.</p>}</div> : <><p className="text-sm text-slate-600">Create reusable operating checklists, follow-up tasks, and customer communications from this module.</p><button onClick={() => guardedOpen("workflow", "jobs:write")} className="mt-4 inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 px-4 text-sm font-bold"><Save className="h-4 w-4" /> Draft workflow</button></>}</Panel> : null}
          {active === "Settings" ? <SettingsPanel role={user.role} settings={settings} onChange={setSettings} /> : null}
          <footer className="rounded-[8px] border border-slate-200 bg-white p-4 text-xs text-slate-500">{settings.businessName} - internal only - public access limited to quote approval links.</footer>
        </main>
      </div>
      {modal ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
        <div className="w-full max-w-2xl rounded-[8px] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 p-5"><p className="text-lg font-black">{modal === "job" ? "New Job" : modal === "customer" ? "New Customer" : modal === "quote" ? "New Quote" : modal === "appointment" ? "Book Appointment" : modal === "payment" ? "Record Payment" : "Draft Workflow"}</p><button onClick={() => setModal(null)} aria-label="Close dialog"><X className="h-5 w-5" /></button></div>
          <form action={(formData) => { if (modal === "job") createJob(formData); if (modal === "customer") createCustomer(formData); if (modal === "quote") createQuote(formData); if (modal === "appointment") createAppointment(formData); if (modal === "payment") recordPayment(formData); if (modal === "workflow") draftWorkflow(formData); }} className="grid gap-4 p-5 md:grid-cols-2">
            {modal === "customer" ? <>
              <Field label="Name"><Input name="name" required /></Field>
              <Field label="Type"><Select name="type"><option>Individual</option><option>Business</option><option>Digital Literacy</option></Select></Field>
              <Field label="Phone"><Input name="phone" /></Field>
              <Field label="Email"><Input name="email" type="email" /></Field>
              <Field label="Area"><Select name="area">{settings.serviceAreas.map((area) => <option key={area}>{area}</option>)}</Select></Field>
              <Field label="Tag"><Select name="tag">{settings.tags.map((tag) => <option key={tag}>{tag}</option>)}</Select></Field>
            </> : null}
            {modal === "job" ? <>
              <Field label="Customer"><Select name="customer">{customerRecords.map((customer) => <option key={customer.id}>{customer.name}</option>)}</Select></Field>
              <Field label="Job type"><Select name="type">{settings.jobTypes.map((type) => <option key={type}>{type}</option>)}</Select></Field>
              <Field label="Device"><Input name="device" required placeholder="Laptop, printer, router..." /></Field>
              <Field label="Due date"><Input name="due" type="date" /></Field>
              <div className="md:col-span-2"><Field label="Next action"><Input name="next" defaultValue="Diagnose and update customer" /></Field></div>
            </> : null}
            {modal === "quote" ? <>
              <Field label="Customer"><Select name="customer">{customerRecords.map((customer) => <option key={customer.id}>{customer.name}</option>)}</Select></Field>
              <Field label="Job"><Select name="job">{jobRecords.map((job) => <option key={job.number}>{job.number}</option>)}</Select></Field>
              <Field label="Description"><Input name="description" defaultValue="Service labour" /></Field>
              <Field label="Amount"><Input name="amount" type="number" defaultValue={settings.labourRate} min="1" /></Field>
              <Field label="Expiry"><Input name="expiry" type="date" /></Field>
            </> : null}
            {modal === "appointment" ? <>
              <Field label="Customer"><Select name="customer">{customerRecords.map((customer) => <option key={customer.id}>{customer.name}</option>)}</Select></Field>
              <Field label="Type"><Select name="type">{settings.jobTypes.map((type) => <option key={type}>{type}</option>)}</Select></Field>
              <Field label="Time"><Input name="time" type="time" required /></Field>
              <Field label="Location"><Input name="location" defaultValue="Workshop" /></Field>
            </> : null}
            {modal === "payment" ? <>
              <Field label="Invoice"><Select name="invoice">{invoiceRecords.map((invoice) => <option key={invoice.number}>{invoice.number}</option>)}</Select></Field>
              <Field label="Amount"><Input name="amount" type="number" min="1" step="0.01" required /></Field>
            </> : null}
            {modal === "workflow" ? <>
              <Field label="Title"><Input name="title" defaultValue={`${active} workflow`} required /></Field>
              <div className="md:col-span-2"><Field label="Detail"><Input name="detail" defaultValue={`Draft operating workflow for ${active}.`} /></Field></div>
            </> : null}
            <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setModal(null)} className="h-10 rounded-[8px] border border-slate-200 px-4 text-sm font-bold">Cancel</button><button className="h-10 rounded-[8px] bg-[#ff8a00] px-4 text-sm font-black text-[#0d1220]">Save</button></div>
          </form>
        </div>
      </div> : null}
    </div>
  );
}
