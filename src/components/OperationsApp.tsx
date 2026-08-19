"use client";

import { AlertTriangle, Bell, CalendarPlus, CheckCircle2, CreditCard, FilePlus2, LogOut, Mail, Menu, MessageCircle, Plus, Save, Search, Send, UserPlus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SettingsPanel } from "@/components/SettingsPanel";
import { contactTargetFor, renderCommunicationTemplate } from "@/lib/communications";
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
type JobNoteRecord = { id: string; body: string; visibility: string; createdAt: string };
type JobAttachmentRecord = { id: string; name: string; url: string; mimeType: string; size: number; source: string; createdAt: string };
type JobRecord = (typeof seedJobs)[number] & { notes?: JobNoteRecord[]; attachments?: JobAttachmentRecord[] };
type QuoteRecord = (typeof seedQuotes)[number];
type InvoiceRecord = (typeof seedInvoices)[number];
type AppointmentRecord = (typeof seedAppointments)[number];
type ModalMode = "job" | "customer" | "quote" | "appointment" | "payment" | "workflow" | "communication" | null;
type ActivityRecord = { id: string; title: string; detail: string; createdAt: string };
type CommunicationDraft = { customer: string; channel: "email" | "sms"; to: string; subject: string; body: string; templateId: string; jobNumber?: string };
type CommunicationRecord = CommunicationDraft & { id: string; status: string; fallbackUrl?: string; createdAt: string };
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

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-32 w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#ff8a00]" />;
}

export function OperationsApp({ user }: Props) {
  const [active, setActive] = useState<(typeof navItems)[number]["label"]>("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selectedJobNumber, setSelectedJobNumber] = useState(seedJobs[0]?.number ?? "");
  const [customerRecords, setCustomerRecords] = useState<CustomerRecord[]>(seedCustomers);
  const [jobRecords, setJobRecords] = useState<JobRecord[]>(seedJobs);
  const [quoteRecords, setQuoteRecords] = useState<QuoteRecord[]>(seedQuotes);
  const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>(seedInvoices);
  const [appointmentRecords, setAppointmentRecords] = useState<AppointmentRecord[]>(seedAppointments);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [communicationRecords, setCommunicationRecords] = useState<CommunicationRecord[]>([]);
  const [communicationDraft, setCommunicationDraft] = useState<CommunicationDraft>({
    customer: seedCustomers[0]?.name ?? "",
    channel: "email",
    to: seedCustomers[0]?.email ?? "",
    subject: "Update from Sunset Country Tech",
    body: "",
    templateId: "",
  });
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const quoteTotal = calculateTotals(quoteRecords[0]?.items ?? [], settings.gstRegistered).total;
  const outstanding = invoiceRecords.reduce((total, invoice) => total + invoice.total - invoice.paid, 0);
  const loweredQuery = query.toLowerCase();
  const filteredJobs = jobRecords.filter((job) => [job.number, job.customer, job.type, job.device, job.status].join(" ").toLowerCase().includes(loweredQuery));
  const filteredCustomers = customerRecords.filter((customer) => [customer.id, customer.name, customer.phone, customer.email, customer.area, customer.type].join(" ").toLowerCase().includes(loweredQuery));
  const selectedJob = jobRecords.find((job) => job.number === selectedJobNumber) ?? filteredJobs[0] ?? jobRecords[0];
  const selectedJobCustomer = selectedJob ? customerRecords.find((customer) => customer.name === selectedJob.customer) : undefined;
  const selectedJobQuotes = selectedJob ? quoteRecords.filter((quote) => quote.job === selectedJob.number || quote.customer === selectedJob.customer) : [];
  const selectedJobInvoices = selectedJob ? invoiceRecords.filter((invoice) => invoice.job === selectedJob.number || invoice.customer === selectedJob.customer) : [];
  const selectedJobAppointments = selectedJob ? appointmentRecords.filter((appointment) => appointment.customer === selectedJob.customer || appointment.type === selectedJob.type) : [];
  const selectedJobCommunications = selectedJob ? communicationRecords.filter((message) => message.jobNumber === selectedJob.number || message.customer === selectedJob.customer) : [];
  const newJobNumber = useMemo(() => nextNumber(settings.numbering.job, 2026, jobRecords.map((job) => job.number)), [settings.numbering.job, jobRecords]);
  const selectedCommunicationCustomer = useMemo(() => customerRecords.find((customer) => customer.name === communicationDraft.customer), [communicationDraft.customer, customerRecords]);
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
      setCommunicationRecords(loadRecords("sct-communications", [] as CommunicationRecord[]));
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

  function openJob(number: string) {
    setSelectedJobNumber(number);
    openSection("Jobs");
  }

  function guardedOpen(mode: Exclude<ModalMode, null>, permission: Parameters<typeof can>[1]) {
    if (!can(user.role, permission)) {
      showNotice("Your role can view this area but cannot make that change.");
      return;
    }
    setAlertsOpen(false);
    setModal(mode);
  }

  function openCommunication(customerName = customerRecords[0]?.name ?? "", channel: "email" | "sms" = "email", jobNumber?: string) {
    if (!can(user.role, "customers:write")) {
      showNotice("Your role can view communications but cannot send messages.");
      return;
    }
    const customer = customerRecords.find((record) => record.name === customerName) ?? customerRecords[0];
    setCommunicationDraft({
      customer: customer?.name ?? "",
      channel,
      to: contactTargetFor(channel, customer),
      subject: "Update from Sunset Country Tech",
      body: "",
      templateId: "",
      jobNumber,
    });
    setAlertsOpen(false);
    setModal("communication");
  }

  function updateCommunicationCustomer(customerName: string) {
    const customer = customerRecords.find((record) => record.name === customerName);
    setCommunicationDraft((draft) => ({
      ...draft,
      customer: customerName,
      to: contactTargetFor(draft.channel, customer),
    }));
  }

  function updateCommunicationChannel(channel: "email" | "sms") {
    setCommunicationDraft((draft) => ({
      ...draft,
      channel,
      to: contactTargetFor(channel, selectedCommunicationCustomer),
      subject: channel === "sms" ? "" : draft.subject,
      templateId: "",
    }));
  }

  function communicationTemplateContext(customerName = communicationDraft.customer) {
    const customer = customerRecords.find((record) => record.name === customerName);
    return {
      customer: customer?.name ?? customerName,
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      area: customer?.area ?? "",
      business: settings.businessName,
      website: settings.website,
      businessphone: settings.phone,
      businessemail: settings.email,
    };
  }

  function applyCommunicationTemplate(templateId: string) {
    const template = settings.communicationTemplates.find((item) => item.id === templateId);
    if (!template) {
      setCommunicationDraft((draft) => ({ ...draft, templateId: "" }));
      return;
    }
    const context = communicationTemplateContext();
    setCommunicationDraft((draft) => ({
      ...draft,
      templateId,
      channel: template.channel,
      to: contactTargetFor(template.channel, selectedCommunicationCustomer),
      subject: template.channel === "email" ? renderCommunicationTemplate(template.subject, context) : "",
      body: renderCommunicationTemplate(template.body, context),
    }));
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
      notes: [],
    }, ...jobRecords];
    setJobRecords(next);
    saveRecords("sct-jobs", next);
    void syncOperation({ action: "create-job", job: next[0] });
    setSelectedJobNumber(number);
    addActivity("Job created", `${number} opened for ${customer}.`);
    setModal(null);
    openSection("Jobs");
    showNotice(`${number} created.`);
  }

  function updateJob(formData: FormData) {
    if (!can(user.role, "jobs:write")) {
      showNotice("Your role can view jobs but cannot edit them.");
      return;
    }
    const number = String(formData.get("number") ?? "").trim();
    const existing = jobRecords.find((job) => job.number === number);
    if (!existing) {
      showNotice("Choose a job to edit.");
      return;
    }
    const updated: JobRecord = {
      ...existing,
      customer: String(formData.get("customer") ?? existing.customer).trim(),
      type: String(formData.get("type") ?? existing.type).trim(),
      device: String(formData.get("device") ?? existing.device).trim(),
      status: String(formData.get("status") ?? existing.status).trim(),
      due: String(formData.get("due") ?? existing.due).trim(),
      next: String(formData.get("next") ?? existing.next).trim(),
    };
    const next = jobRecords.map((job) => job.number === number ? updated : job);
    setJobRecords(next);
    saveRecords("sct-jobs", next);
    setSelectedJobNumber(number);
    void syncOperation({ action: "update-job", job: updated });
    addActivity("Job updated", `${number} details changed.`);
    showNotice(`${number} updated.`);
  }

  function addJobNote(formData: FormData) {
    if (!can(user.role, "jobs:write")) {
      showNotice("Your role can view notes but cannot add them.");
      return;
    }
    const jobNumber = String(formData.get("jobNumber") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const visibility = String(formData.get("visibility") ?? "Internal");
    if (!jobNumber || !body) {
      showNotice("Write a note before saving.");
      return;
    }
    const note: JobNoteRecord = {
      id: `NOTE-${Date.now()}`,
      body,
      visibility,
      createdAt: new Date().toLocaleString("en-AU"),
    };
    const next = jobRecords.map((job) => job.number === jobNumber ? { ...job, notes: [note, ...(job.notes ?? [])] } : job);
    setJobRecords(next);
    saveRecords("sct-jobs", next);
    void syncOperation({ action: "add-job-note", jobNumber, note });
    addActivity("Job note added", `${jobNumber}: ${body.slice(0, 90)}`);
    showNotice("Note saved.");
  }

  async function uploadJobImages(formData: FormData) {
    if (!can(user.role, "jobs:write")) {
      showNotice("Your role can view images but cannot upload them.");
      return;
    }
    const jobNumber = String(formData.get("jobNumber") ?? "").trim();
    const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (!jobNumber || !files.length) {
      showNotice("Choose images before uploading.");
      return;
    }

    const uploadData = new FormData();
    for (const file of files) {
      uploadData.append("images", file);
    }

    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobNumber)}/attachments`, {
        method: "POST",
        body: uploadData,
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; attachments?: JobAttachmentRecord[] } | null;
      if (!response.ok || !result?.ok) {
        throw new Error(result?.message ?? "Images could not be uploaded.");
      }
      const attachments = result.attachments ?? [];
      const next = jobRecords.map((job) => job.number === jobNumber ? { ...job, attachments: [...attachments, ...(job.attachments ?? [])] } : job);
      setJobRecords(next);
      saveRecords("sct-jobs", next);
      setSelectedJobNumber(jobNumber);
      addActivity("Job images uploaded", `${attachments.length} image${attachments.length === 1 ? "" : "s"} added to ${jobNumber}.`);
      showNotice("Images uploaded.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Images could not be uploaded.");
    }
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

  async function sendCommunication(formData: FormData) {
    const draft: CommunicationDraft = {
      customer: String(formData.get("customer") ?? "").trim(),
      channel: String(formData.get("channel") ?? "email") === "sms" ? "sms" : "email",
      to: String(formData.get("to") ?? "").trim(),
      subject: String(formData.get("subject") ?? "").trim(),
      body: String(formData.get("body") ?? "").trim(),
      templateId: String(formData.get("templateId") ?? "").trim(),
      jobNumber: String(formData.get("jobNumber") ?? "").trim() || undefined,
    };
    if (!draft.customer || !draft.to || !draft.body) {
      showNotice("Choose a customer, target, and message.");
      return;
    }

    let result: { ok?: boolean; mode?: string; fallbackUrl?: string; message?: string } = {};
    try {
      const response = await fetch("/api/communications/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, customerName: draft.customer, settings }),
      });
      result = await response.json();
    } catch {
      result = { ok: false, mode: "draft", message: "Delivery service unavailable." };
    }

    const status = result.ok && result.mode === "sent" ? "Sent" : "Draft";
    const record: CommunicationRecord = {
      ...draft,
      id: `COM-${String(communicationRecords.length + 1).padStart(4, "0")}`,
      status,
      fallbackUrl: result.fallbackUrl,
      createdAt: new Date().toLocaleString("en-AU"),
    };
    const next = [record, ...communicationRecords].slice(0, 50);
    setCommunicationRecords(next);
    saveRecords("sct-communications", next);
    addActivity(status === "Sent" ? "Customer contacted" : "Communication drafted", `${draft.channel.toUpperCase()} for ${draft.customer}${draft.jobNumber ? ` on ${draft.jobNumber}` : ""}.`);
    void syncOperation({ action: "draft-workflow", title: status === "Sent" ? "Customer contacted" : "Communication drafted", detail: `${draft.channel.toUpperCase()} for ${draft.customer}${draft.jobNumber ? ` on ${draft.jobNumber}` : ""}: ${draft.subject || draft.body.slice(0, 80)}` });
    setModal(null);
    openSection("Communications");
    showNotice(status === "Sent" ? "Message sent." : result.message ?? "Message saved as a draft.");
  }

  function completeJob(number: string) {
    const next = jobRecords.map((job) => job.number === number ? { ...job, status: "Completed", next: "Invoice or archive" } : job);
    setJobRecords(next);
    saveRecords("sct-jobs", next);
    setSelectedJobNumber(number);
    void syncOperation({ action: "complete-job", jobNumber: number });
    addActivity("Job completed", `${number} marked completed.`);
    showNotice(`${number} marked completed.`);
  }

  function renderModulePanel() {
    if (active === "Tasks") {
      return <div className="space-y-4"><div className="flex justify-end"><button onClick={() => guardedOpen("workflow", "jobs:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><Save className="h-4 w-4" /> New Task</button></div><div className="grid gap-3">{activityRecords.length ? activityRecords.map((activity) => <div key={activity.id} className="rounded-[8px] border border-slate-200 p-4"><p className="font-black">{activity.title}</p><p className="text-sm text-slate-600">{activity.detail}</p><p className="mt-2 text-xs font-bold text-slate-400">{activity.createdAt}</p></div>) : <p className="text-sm text-slate-600">No workflow drafts yet.</p>}</div></div>;
    }

    if (active === "Communications") {
      return <div className="space-y-4"><div className="flex flex-wrap justify-end gap-2"><button onClick={() => openCommunication(undefined, "email")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><Mail className="h-4 w-4" /> New Email</button><button onClick={() => openCommunication(undefined, "sms")} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 px-4 text-sm font-black"><MessageCircle className="h-4 w-4" /> New SMS</button></div><div className="grid gap-3">{communicationRecords.length ? communicationRecords.map((message) => <div key={message.id} className="rounded-[8px] border border-slate-200 p-4"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="font-black">{message.customer}</p><p className="text-sm text-slate-600">{message.channel.toUpperCase()} to {message.to}</p></div><Badge>{message.status}</Badge></div>{message.subject ? <p className="mt-3 text-sm font-bold">{message.subject}</p> : null}<p className="mt-1 text-sm text-slate-600">{message.body}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400"><span>{message.createdAt}</span>{message.fallbackUrl ? <a href={message.fallbackUrl} className="text-[#ff8a00]">Open fallback sender</a> : null}</div></div>) : <p className="text-sm text-slate-600">No customer messages yet.</p>}</div></div>;
    }

    const moduleActions: Record<string, Array<{ label: string; icon: LucideIcon; run: () => void }>> = {
      "Digital Literacy": [
        { label: "Book Session", icon: CalendarPlus, run: () => guardedOpen("appointment", "jobs:write") },
        { label: "Message Learner", icon: MessageCircle, run: () => openCommunication(undefined, "sms") },
        { label: "Draft Lesson Task", icon: Save, run: () => guardedOpen("workflow", "jobs:write") },
      ],
      "Business IT": [
        { label: "Create IT Job", icon: Plus, run: () => guardedOpen("job", "jobs:write") },
        { label: "Send Client Update", icon: Mail, run: () => openCommunication(undefined, "email") },
        { label: "Draft Site Checklist", icon: Save, run: () => guardedOpen("workflow", "jobs:write") },
      ],
      "3D Printing": [
        { label: "Create Print Job", icon: Plus, run: () => guardedOpen("job", "jobs:write") },
        { label: "Quote Print", icon: FilePlus2, run: () => guardedOpen("quote", "quotes:write") },
        { label: "Message Customer", icon: MessageCircle, run: () => openCommunication(undefined, "sms") },
      ],
      Parts: [
        { label: "Parts Job", icon: Plus, run: () => guardedOpen("job", "jobs:write") },
        { label: "Parts Quote", icon: FilePlus2, run: () => guardedOpen("quote", "quotes:write") },
        { label: "Supplier Follow-Up", icon: Save, run: () => guardedOpen("workflow", "jobs:write") },
      ],
    };
    const actions = moduleActions[active] ?? [];

    return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3">{actions.map(({ label, icon: Icon, run }) => <button key={label} onClick={run} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><Icon className="h-4 w-4" />{label}</button>)}</div><div className="grid gap-3">{jobRecords.filter((job) => job.type === active || (active === "Parts" && job.status.includes("Parts"))).slice(0, 6).map((job) => <button key={job.number} onClick={() => openJob(job.number)} className="rounded-[8px] border border-slate-200 p-4 text-left hover:border-[#ff8a00]"><p className="font-black">{job.number} - {job.customer}</p><p className="text-sm text-slate-600">{job.device} - {job.status}</p><p className="mt-2 text-sm text-slate-600">{job.next}</p></button>)}{!jobRecords.some((job) => job.type === active || (active === "Parts" && job.status.includes("Parts"))) ? <p className="text-sm text-slate-600">No active {active.toLowerCase()} jobs yet.</p> : null}</div></div>;
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
            <Panel title="Quick Actions"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <button onClick={() => guardedOpen("customer", "customers:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><UserPlus className="h-4 w-4" /> Customer</button>
              <button onClick={() => guardedOpen("job", "jobs:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><Plus className="h-4 w-4" /> Job</button>
              <button onClick={() => guardedOpen("quote", "quotes:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><FilePlus2 className="h-4 w-4" /> Quote</button>
              <button onClick={() => guardedOpen("appointment", "jobs:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><CalendarPlus className="h-4 w-4" /> Appointment</button>
              <button onClick={() => guardedOpen("payment", "payments:write")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><CreditCard className="h-4 w-4" /> Payment</button>
              <button onClick={() => openCommunication()} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><Send className="h-4 w-4" /> Contact</button>
            </div></Panel>
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <Panel title="Job Pipeline"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-xs uppercase text-slate-500"><th className="p-3">Job</th><th className="p-3">Customer</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Next</th><th className="p-3">Action</th></tr></thead><tbody>{filteredJobs.map((job) => <tr key={job.number} className="border-t border-slate-100"><td className="p-3"><button onClick={() => openJob(job.number)} className="text-left font-black text-[#0d1220] hover:text-[#ff8a00]">{job.number}<p className="text-xs font-normal text-slate-500">{job.device}</p></button></td><td className="p-3">{job.customer}</td><td className="p-3">{job.type}</td><td className="p-3"><Badge>{job.status}</Badge></td><td className="p-3">{job.next}</td><td className="p-3"><button onClick={() => completeJob(job.number)} className="inline-flex items-center gap-1 rounded-[8px] border border-slate-200 px-2 py-1 text-xs font-black"><CheckCircle2 className="h-3 w-3" /> Complete</button></td></tr>)}</tbody></table></div></Panel>
              <Panel title="Alerts">{alertMessages.map((alert) => <button key={alert.id} onClick={() => openSection(alert.text.includes("Invoice") ? "Invoices" : alert.text.includes("Quote") ? "Quotes" : "Tasks")} className="mb-3 flex w-full gap-3 rounded-[8px] bg-amber-50 p-3 text-left text-sm font-bold text-amber-900 hover:bg-amber-100"><AlertTriangle className="h-4 w-4 shrink-0" />{alert.text}</button>)}</Panel>
            </div>
          </> : null}
          {active === "Customers" ? <Panel title="Customers"><div className="mb-4 flex justify-end"><button onClick={() => guardedOpen("customer", "customers:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><UserPlus className="h-4 w-4" /> New Customer</button></div><div className="grid gap-3 md:grid-cols-3">{filteredCustomers.map((customer) => <div key={customer.id} className="rounded-[8px] border border-slate-200 p-4"><p className="font-black">{customer.name}</p><p className="text-sm text-slate-600">{customer.phone}</p><p className="text-sm text-slate-600">{customer.email}</p><div className="mt-3 flex flex-wrap gap-2">{customer.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div><div className="mt-4 flex gap-2"><button onClick={() => openCommunication(customer.name, "email")} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-xs font-black hover:border-[#ff8a00]"><Mail className="h-4 w-4" /> Email</button><button onClick={() => openCommunication(customer.name, "sms")} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[8px] border border-slate-200 px-3 text-xs font-black hover:border-[#ff8a00]"><MessageCircle className="h-4 w-4" /> SMS</button></div></div>)}</div></Panel> : null}
          {active === "Jobs" ? <div className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
            <Panel title="Jobs">
              <div className="mb-4 flex justify-end">
                <button onClick={() => guardedOpen("job", "jobs:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><Plus className="h-4 w-4" /> New Job</button>
              </div>
              <div className="grid gap-3">
                {filteredJobs.map((job) => (
                  <button key={job.number} onClick={() => setSelectedJobNumber(job.number)} className={`rounded-[8px] border p-4 text-left transition hover:border-[#ff8a00] ${selectedJob?.number === job.number ? "border-[#ff8a00] bg-amber-50" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{job.number}</p>
                        <p className="mt-1 text-sm font-bold text-slate-700">{job.customer}</p>
                      </div>
                      <Badge>{job.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{job.type} - {job.device || "No device listed"}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{job.next}</p>
                  </button>
                ))}
                {!filteredJobs.length ? <p className="text-sm text-slate-600">No jobs match your search.</p> : null}
              </div>
            </Panel>

            {selectedJob ? <div className="space-y-6">
              <Panel title={`${selectedJob.number} Job Detail`}>
                <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><Badge>{selectedJob.status}</Badge><Badge>{selectedJob.type}</Badge>{selectedJob.due ? <Badge>Due {selectedJob.due}</Badge> : null}</div>
                    <h2 className="mt-3 text-2xl font-black">{selectedJob.customer}</h2>
                    <p className="mt-1 text-sm text-slate-600">{selectedJob.device || "No device listed"} - {selectedJob.next}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openCommunication(selectedJob.customer, "email", selectedJob.number)} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><Mail className="h-4 w-4" /> Email</button>
                    <button onClick={() => openCommunication(selectedJob.customer, "sms", selectedJob.number)} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><MessageCircle className="h-4 w-4" /> SMS</button>
                    <button onClick={() => completeJob(selectedJob.number)} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#ff8a00] px-3 text-sm font-black text-[#0d1220]"><CheckCircle2 className="h-4 w-4" /> Complete</button>
                  </div>
                </div>

                <form key={selectedJob.number} action={updateJob} className="grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="number" defaultValue={selectedJob.number} />
                  <Field label="Customer"><Select name="customer" defaultValue={selectedJob.customer}>{customerRecords.map((customer) => <option key={customer.id}>{customer.name}</option>)}</Select></Field>
                  <Field label="Job type"><Select name="type" defaultValue={selectedJob.type}>{settings.jobTypes.map((type) => <option key={type}>{type}</option>)}</Select></Field>
                  <Field label="Status"><Select name="status" defaultValue={selectedJob.status}>{settings.jobStatuses.map((status) => <option key={status}>{status}</option>)}{settings.jobStatuses.includes(selectedJob.status) ? null : <option>{selectedJob.status}</option>}</Select></Field>
                  <Field label="Due date"><Input name="due" type="date" defaultValue={selectedJob.due} /></Field>
                  <Field label="Device / Equipment"><Input name="device" defaultValue={selectedJob.device} placeholder="Laptop, printer, router..." /></Field>
                  <div className="md:col-span-2"><Field label="Next action / description"><TextArea name="next" defaultValue={selectedJob.next} /></Field></div>
                  <div className="flex justify-end md:col-span-2"><button disabled={!can(user.role, "jobs:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white disabled:opacity-40"><Save className="h-4 w-4" /> Save Job</button></div>
                </form>
              </Panel>

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="Customer Details">
                  {selectedJobCustomer ? <div className="space-y-3 text-sm">
                    <div><p className="text-xs font-black uppercase text-slate-500">Name</p><p className="font-bold">{selectedJobCustomer.name}</p></div>
                    <div><p className="text-xs font-black uppercase text-slate-500">Phone</p><p>{selectedJobCustomer.phone || "Not supplied"}</p></div>
                    <div><p className="text-xs font-black uppercase text-slate-500">Email</p><p>{selectedJobCustomer.email || "Not supplied"}</p></div>
                    <div><p className="text-xs font-black uppercase text-slate-500">Area</p><p>{selectedJobCustomer.area || "Not supplied"}</p></div>
                    <div className="flex flex-wrap gap-2">{selectedJobCustomer.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
                  </div> : <p className="text-sm text-slate-600">No customer record found for this job yet.</p>}
                </Panel>

                <Panel title="Related Records">
                  <div className="grid gap-3 text-sm">
                    <div><p className="font-black">Quotes</p>{selectedJobQuotes.length ? selectedJobQuotes.map((quote) => <p key={quote.number} className="mt-1 text-slate-600">{quote.number} - {quote.status} - {formatCurrency(calculateTotals(quote.items, settings.gstRegistered).total, settings.currency)}</p>) : <p className="mt-1 text-slate-500">No quotes linked.</p>}</div>
                    <div><p className="font-black">Invoices</p>{selectedJobInvoices.length ? selectedJobInvoices.map((invoice) => <p key={invoice.number} className="mt-1 text-slate-600">{invoice.number} - {invoice.status} - {formatCurrency(invoice.total - invoice.paid, settings.currency)} owing</p>) : <p className="mt-1 text-slate-500">No invoices linked.</p>}</div>
                    <div><p className="font-black">Appointments</p>{selectedJobAppointments.length ? selectedJobAppointments.map((appointment) => <p key={`${appointment.time}-${appointment.customer}-${appointment.location}`} className="mt-1 text-slate-600">{appointment.time} - {appointment.type} - {appointment.location}</p>) : <p className="mt-1 text-slate-500">No appointments linked.</p>}</div>
                  </div>
                </Panel>
              </div>

              <Panel title="Job Notes">
                <form action={addJobNote} className="mb-4 grid gap-3">
                  <input type="hidden" name="jobNumber" defaultValue={selectedJob.number} />
                  <Field label="New note"><TextArea name="body" placeholder="Add diagnosis notes, parts info, access details, or internal follow-up..." /></Field>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <Field label="Visibility"><Select name="visibility" defaultValue="Internal"><option>Internal</option><option>Customer</option><option>Technician</option></Select></Field>
                    <button disabled={!can(user.role, "jobs:write")} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white disabled:opacity-40"><Save className="h-4 w-4" /> Add Note</button>
                  </div>
                </form>
                <div className="grid gap-3">
                  {(selectedJob.notes ?? []).length ? (selectedJob.notes ?? []).map((note) => <div key={note.id} className="rounded-[8px] border border-slate-200 bg-slate-50 p-4"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge>{note.visibility}</Badge><span className="text-xs font-bold text-slate-400">{note.createdAt}</span></div><p className="whitespace-pre-wrap text-sm text-slate-700">{note.body}</p></div>) : <p className="text-sm text-slate-600">No notes on this job yet.</p>}
                </div>
              </Panel>

              <Panel title="Images & Files">
                <form action={uploadJobImages} className="mb-4 grid gap-3 rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                  <input type="hidden" name="jobNumber" defaultValue={selectedJob.number} />
                  <Field label="Add job images"><Input name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple /></Field>
                  <div className="flex justify-end"><button disabled={!can(user.role, "jobs:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white disabled:opacity-40"><Save className="h-4 w-4" /> Upload Images</button></div>
                </form>
                {(selectedJob.attachments ?? []).length ? <div className="grid gap-3 sm:grid-cols-2">
                  {(selectedJob.attachments ?? []).map((attachment) => (
                    <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[8px] border border-slate-200 bg-slate-50 hover:border-[#ff8a00]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Protected attachment URLs rely on the browser session cookie. */}
                      {attachment.mimeType.startsWith("image/") ? <img src={attachment.url} alt={attachment.name} className="aspect-video w-full object-cover" /> : <div className="grid aspect-video place-items-center bg-white text-sm font-black text-slate-500">File</div>}
                      <div className="p-3">
                        <p className="truncate text-sm font-black group-hover:text-[#ff8a00]">{attachment.name}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{Math.round(attachment.size / 1024)}KB - {attachment.source} - {attachment.createdAt}</p>
                      </div>
                    </a>
                  ))}
                </div> : <p className="text-sm text-slate-600">No images or files saved for this job yet. Public website photo uploads will appear here.</p>}
              </Panel>

              <Panel title="Communications">
                <div className="mb-4 flex flex-wrap gap-2">
                  <button onClick={() => openCommunication(selectedJob.customer, "email", selectedJob.number)} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><Mail className="h-4 w-4" /> Email Customer</button>
                  <button onClick={() => openCommunication(selectedJob.customer, "sms", selectedJob.number)} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-black hover:border-[#ff8a00]"><MessageCircle className="h-4 w-4" /> SMS Customer</button>
                </div>
                <div className="grid gap-3">
                  {selectedJobCommunications.length ? selectedJobCommunications.map((message) => <div key={message.id} className="rounded-[8px] border border-slate-200 p-4"><div className="flex flex-col justify-between gap-2 sm:flex-row"><div><p className="font-black">{message.channel.toUpperCase()} to {message.to}</p><p className="text-xs font-bold text-slate-400">{message.createdAt}</p></div><Badge>{message.status}</Badge></div>{message.subject ? <p className="mt-3 text-sm font-bold">{message.subject}</p> : null}<p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{message.body}</p>{message.fallbackUrl ? <a href={message.fallbackUrl} className="mt-3 inline-flex text-xs font-black text-[#ff8a00]">Open fallback sender</a> : null}</div>) : <p className="text-sm text-slate-600">No communications recorded for this job yet.</p>}
                </div>
              </Panel>
            </div> : <Panel title="Job Detail"><p className="text-sm text-slate-600">Select a job to view its full workspace.</p></Panel>}
          </div> : null}
          {active === "Calendar" ? <Panel title="Calendar"><div className="mb-4 flex justify-end"><button onClick={() => guardedOpen("appointment", "jobs:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><CalendarPlus className="h-4 w-4" /> Book</button></div><div className="grid gap-3 md:grid-cols-3">{appointmentRecords.map((appointment) => <button key={`${appointment.time}-${appointment.customer}-${appointment.location}`} onClick={() => showNotice(`${appointment.customer} at ${appointment.location}`)} className="rounded-[8px] border border-slate-200 p-4 text-left hover:border-[#ff8a00]"><p className="text-sm font-black text-[#ff8a00]">{appointment.time}</p><p className="font-black">{appointment.type}</p><p className="text-sm text-slate-600">{appointment.customer} - {appointment.location}</p></button>)}</div></Panel> : null}
          {active === "Quotes" ? <Panel title="Quotes"><div className="mb-4 flex justify-end"><button onClick={() => guardedOpen("quote", "quotes:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><FilePlus2 className="h-4 w-4" /> New Quote</button></div><div className="grid gap-3">{quoteRecords.map((quote) => <div key={quote.number} className="rounded-[8px] border border-slate-200 p-4"><p className="font-black">{quote.number}</p><p className="text-sm text-slate-600">{quote.customer} - {quote.job} - {quote.status}</p><a className="mt-3 inline-flex rounded-[8px] bg-[#ff8a00] px-3 py-2 text-xs font-black text-[#0d1220]" href={`/q/${quote.token}`}>Open approval link</a></div>)}</div></Panel> : null}
          {active === "Invoices" || active === "Payments" ? <Panel title="Invoices & Payments"><div className="mb-4 flex justify-end"><button onClick={() => guardedOpen("payment", "payments:write")} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1220] px-4 text-sm font-black text-white"><CreditCard className="h-4 w-4" /> Record Payment</button></div><div className="grid gap-3">{invoiceRecords.map((invoice) => <div key={invoice.number} className="flex justify-between rounded-[8px] border border-slate-200 p-4"><button onClick={() => showNotice(`${invoice.number} status: ${invoice.status}`)} className="text-left"><p className="font-black">{invoice.number}</p><p className="text-sm text-slate-600">{invoice.customer}</p></button><p className="font-black">{formatCurrency(invoice.total - invoice.paid, settings.currency)}</p></div>)}</div></Panel> : null}
          {["Digital Literacy", "Business IT", "3D Printing", "Parts", "Communications", "Tasks"].includes(active) ? <Panel title={active}>{renderModulePanel()}</Panel> : null}
          {active === "Settings" ? <SettingsPanel role={user.role} settings={settings} onChange={setSettings} /> : null}
          <footer className="rounded-[8px] border border-slate-200 bg-white p-4 text-xs text-slate-500">{settings.businessName} - internal only - public access limited to quote approval links.</footer>
        </main>
      </div>
      {modal ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
        <div className="w-full max-w-2xl rounded-[8px] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 p-5"><p className="text-lg font-black">{modal === "job" ? "New Job" : modal === "customer" ? "New Customer" : modal === "quote" ? "New Quote" : modal === "appointment" ? "Book Appointment" : modal === "payment" ? "Record Payment" : modal === "communication" ? "Contact Customer" : "Draft Workflow"}</p><button onClick={() => setModal(null)} aria-label="Close dialog"><X className="h-5 w-5" /></button></div>
          <form action={(formData) => { if (modal === "job") createJob(formData); if (modal === "customer") createCustomer(formData); if (modal === "quote") createQuote(formData); if (modal === "appointment") createAppointment(formData); if (modal === "payment") recordPayment(formData); if (modal === "workflow") draftWorkflow(formData); if (modal === "communication") void sendCommunication(formData); }} className="grid gap-4 p-5 md:grid-cols-2">
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
            {modal === "communication" ? <>
              {communicationDraft.jobNumber ? <div className="md:col-span-2 rounded-[8px] bg-amber-50 p-3 text-sm font-bold text-amber-900">Linked to job {communicationDraft.jobNumber}</div> : null}
              <input name="jobNumber" type="hidden" defaultValue={communicationDraft.jobNumber ?? ""} />
              <Field label="Customer"><Select name="customer" value={communicationDraft.customer} onChange={(event) => updateCommunicationCustomer(event.target.value)}>{customerRecords.map((customer) => <option key={customer.id}>{customer.name}</option>)}</Select></Field>
              <Field label="Channel"><Select name="channel" value={communicationDraft.channel} onChange={(event) => updateCommunicationChannel(event.target.value === "sms" ? "sms" : "email")}><option value="email">Email</option><option value="sms">SMS</option></Select></Field>
              <div className="md:col-span-2"><Field label="Template"><Select name="templateId" value={communicationDraft.templateId} onChange={(event) => applyCommunicationTemplate(event.target.value)}><option value="">Blank message</option>{settings.communicationTemplates.filter((template) => template.channel === communicationDraft.channel).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</Select></Field></div>
              <Field label={communicationDraft.channel === "email" ? "Email address" : "Phone number"}><Input name="to" value={communicationDraft.to} onChange={(event) => setCommunicationDraft((draft) => ({ ...draft, to: event.target.value }))} required /></Field>
              {communicationDraft.channel === "email" ? <Field label="Subject"><Input name="subject" value={communicationDraft.subject} onChange={(event) => setCommunicationDraft((draft) => ({ ...draft, subject: event.target.value }))} /></Field> : <input name="subject" type="hidden" value="" />}
              <div className="md:col-span-2"><Field label="Message"><TextArea name="body" value={communicationDraft.body} onChange={(event) => setCommunicationDraft((draft) => ({ ...draft, body: event.target.value }))} required placeholder="Write the customer update..." /></Field></div>
            </> : null}
            <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setModal(null)} className="h-10 rounded-[8px] border border-slate-200 px-4 text-sm font-bold">Cancel</button><button className="h-10 rounded-[8px] bg-[#ff8a00] px-4 text-sm font-black text-[#0d1220]">{modal === "communication" ? "Send" : "Save"}</button></div>
          </form>
        </div>
      </div> : null}
    </div>
  );
}
