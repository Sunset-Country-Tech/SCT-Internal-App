"use client";

import { Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { normalizeSettings, type AppSettings, roles } from "@/lib/operations-data";
import { can, type Role } from "@/lib/workflows";

type Props = {
  role: Role;
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
};

const tabs = ["Business", "Finance", "Workflow", "Documents", "Users", "Integrations"] as const;

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-[#ff8a00] disabled:bg-slate-100" />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-[#ff8a00] disabled:bg-slate-100" />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-800">{label}<div className="mt-1">{children}</div></label>;
}

function ListEditor({
  title,
  value,
  disabled,
  onChange,
}: {
  title: string;
  value: string[];
  disabled: boolean;
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const item = draft.trim();
    if (!item || value.includes(item)) {
      return;
    }
    onChange([...value, item]);
    setDraft("");
  }

  return (
    <div className="rounded-[8px] border border-slate-200 p-4">
      <p className="font-black">{title}</p>
      <div className="mt-3 flex gap-2">
        <Input disabled={disabled} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder={`Add ${title.toLowerCase()}`} />
        <button disabled={disabled} type="button" onClick={add} className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#ff8a00] text-[#0d1220] disabled:opacity-40" aria-label={`Add ${title}`}><Plus className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {value.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {item}
            <button disabled={disabled} type="button" onClick={() => onChange(value.filter((candidate) => candidate !== item))} aria-label={`Remove ${item}`} className="text-slate-400 hover:text-red-600 disabled:hidden"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({ role, settings, onChange }: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Business");
  const [saved, setSaved] = useState("");
  const [invite, setInvite] = useState({ name: "", email: "", role: "Technician" as Role });
  const [queuedInvites, setQueuedInvites] = useState<typeof invite[]>([]);
  const canWrite = can(role, "settings:write");

  function set<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) {
    onChange({ ...settings, [key]: value });
    setSaved("");
  }

  function setNumbering<Key extends keyof AppSettings["numbering"]>(key: Key, value: string) {
    onChange({ ...settings, numbering: { ...settings.numbering, [key]: value } });
    setSaved("");
  }

  function save() {
    const normalized = normalizeSettings(settings);
    onChange(normalized);
    window.localStorage.setItem("sct-settings", JSON.stringify(normalized));
    setSaved(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));
  }

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black">Settings</h2>
          <p className="text-sm text-slate-500">Live local settings now; Prisma-backed persistence later.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved ? <span className="text-xs font-bold text-emerald-700">Saved {saved}</span> : null}
          <button disabled={!canWrite} onClick={save} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#ff8a00] px-4 text-sm font-black text-[#0d1220] disabled:opacity-40"><Save className="h-4 w-4" /> Save</button>
        </div>
      </div>
      <div className="grid lg:grid-cols-[210px_1fr]">
        <nav className="flex gap-2 overflow-auto border-b border-slate-200 p-3 lg:block lg:border-b-0 lg:border-r">
          {tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-[8px] px-3 py-2 text-sm font-bold lg:mb-1 lg:block lg:w-full lg:text-left ${tab === item ? "bg-[#0d1220] text-white" : "text-slate-600 hover:bg-slate-100"}`}>{item}</button>)}
        </nav>
        <div className="p-5">
          {!canWrite ? <p className="mb-4 rounded-[8px] bg-amber-50 p-3 text-sm font-bold text-amber-900">Your role can view settings but cannot save changes.</p> : null}
          {tab === "Business" ? <div className="grid gap-4 md:grid-cols-2">
            <Field label="Business name"><Input disabled={!canWrite} value={settings.businessName} onChange={(event) => set("businessName", event.target.value)} /></Field>
            <Field label="ABN"><Input disabled={!canWrite} value={settings.abn} onChange={(event) => set("abn", event.target.value)} /></Field>
            <Field label="Phone"><Input disabled={!canWrite} value={settings.phone} onChange={(event) => set("phone", event.target.value)} /></Field>
            <Field label="Email"><Input disabled={!canWrite} value={settings.email} onChange={(event) => set("email", event.target.value)} /></Field>
            <Field label="Website"><Input disabled={!canWrite} value={settings.website} onChange={(event) => set("website", event.target.value)} /></Field>
            <ListEditor title="Service areas" value={settings.serviceAreas} disabled={!canWrite} onChange={(value) => set("serviceAreas", value)} />
          </div> : null}
          {tab === "Finance" ? <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-3 rounded-[8px] border border-slate-200 p-4 text-sm font-black md:col-span-3"><input disabled={!canWrite} type="checkbox" checked={settings.gstRegistered} onChange={(event) => set("gstRegistered", event.target.checked)} className="h-5 w-5 accent-[#ff8a00]" /> GST registered</label>
            <Field label="Currency"><Select disabled={!canWrite} value={settings.currency} onChange={(event) => set("currency", event.target.value)}><option>AUD</option><option>NZD</option><option>USD</option></Select></Field>
            <Field label="GST rate"><Input disabled={!canWrite || !settings.gstRegistered} type="number" step="0.01" value={settings.gstRate} onChange={(event) => set("gstRate", Number(event.target.value))} /></Field>
            <Field label="Labour rate"><Input disabled={!canWrite} type="number" value={settings.labourRate} onChange={(event) => set("labourRate", Number(event.target.value))} /></Field>
            <Field label="Travel rate"><Input disabled={!canWrite} type="number" value={settings.travelRate} onChange={(event) => set("travelRate", Number(event.target.value))} /></Field>
          </div> : null}
          {tab === "Workflow" ? <div className="grid gap-4 md:grid-cols-2">
            <ListEditor title="Job statuses" value={settings.jobStatuses} disabled={!canWrite} onChange={(value) => set("jobStatuses", value)} />
            <ListEditor title="Job types" value={settings.jobTypes} disabled={!canWrite} onChange={(value) => set("jobTypes", value)} />
            <ListEditor title="Tags" value={settings.tags} disabled={!canWrite} onChange={(value) => set("tags", value)} />
          </div> : null}
          {tab === "Documents" ? <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(settings.numbering).map(([key, value]) => <Field key={key} label={`${key} prefix`}><Input disabled={!canWrite} value={value} onChange={(event) => setNumbering(key as keyof AppSettings["numbering"], event.target.value)} /></Field>)}
          </div> : null}
          {tab === "Users" ? <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[8px] border border-slate-200 p-4">
              <p className="font-black">Queue staff invite</p>
              <div className="mt-3 grid gap-3">
                <Input disabled={!canWrite} placeholder="Name" value={invite.name} onChange={(event) => setInvite({ ...invite, name: event.target.value })} />
                <Input disabled={!canWrite} placeholder="Email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} />
                <Select disabled={!canWrite} value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as Role })}>{roles.map((item) => <option key={item}>{item}</option>)}</Select>
                <button disabled={!canWrite || !invite.name || !invite.email} onClick={() => { setQueuedInvites([...queuedInvites, invite]); setInvite({ name: "", email: "", role: "Technician" }); }} className="h-10 rounded-[8px] bg-[#0d1220] text-sm font-black text-white disabled:opacity-40">Queue Invite</button>
              </div>
            </div>
            <div className="space-y-2">
              {queuedInvites.map((item) => <div key={item.email} className="flex items-center justify-between rounded-[8px] border border-slate-200 p-3 text-sm"><span><strong>{item.name}</strong> - {item.email} - {item.role}</span><button onClick={() => setQueuedInvites(queuedInvites.filter((candidate) => candidate.email !== item.email))} className="text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}
            </div>
          </div> : null}
          {tab === "Integrations" ? <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[8px] border border-slate-200 p-4 md:col-span-2">
              <p className="font-black">SMTP email</p>
              <p className="mt-1 text-xs text-slate-500">Store passwords as environment secrets. This page stores host, ports, sender details, and the env var names to read.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Email provider"><Select disabled={!canWrite} value={settings.emailProvider} onChange={(event) => set("emailProvider", event.target.value)}><option>none</option><option>smtp</option><option>api</option></Select></Field>
                <Field label="SMTP host"><Input disabled={!canWrite} value={settings.smtpHost} onChange={(event) => set("smtpHost", event.target.value)} placeholder="smtp.example.com" /></Field>
                <Field label="SMTP port"><Input disabled={!canWrite} type="number" value={settings.smtpPort} onChange={(event) => set("smtpPort", Number(event.target.value))} /></Field>
                <label className="flex items-center gap-3 rounded-[8px] border border-slate-200 p-3 text-sm font-black"><input disabled={!canWrite} type="checkbox" checked={settings.smtpSecure} onChange={(event) => set("smtpSecure", event.target.checked)} className="h-5 w-5 accent-[#ff8a00]" /> Use TLS/SSL</label>
                <Field label="From name"><Input disabled={!canWrite} value={settings.smtpFromName} onChange={(event) => set("smtpFromName", event.target.value)} /></Field>
                <Field label="From email"><Input disabled={!canWrite} type="email" value={settings.smtpFromEmail} onChange={(event) => set("smtpFromEmail", event.target.value)} /></Field>
                <Field label="Username env var"><Input disabled={!canWrite} value={settings.smtpUsernameEnv} onChange={(event) => set("smtpUsernameEnv", event.target.value)} /></Field>
                <Field label="Password env var"><Input disabled={!canWrite} value={settings.smtpPasswordEnv} onChange={(event) => set("smtpPasswordEnv", event.target.value)} /></Field>
              </div>
            </div>

            <div className="rounded-[8px] border border-slate-200 p-4 md:col-span-2">
              <p className="font-black">SMS and SMS-Gate</p>
              <p className="mt-1 text-xs text-slate-500">Webhook path and signing secret name are configurable for SMS-Gate-style gateways.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="SMS provider"><Select disabled={!canWrite} value={settings.smsProvider} onChange={(event) => set("smsProvider", event.target.value)}><option>none</option><option>sms-gate</option><option>api</option></Select></Field>
                <Field label="Gateway URL"><Input disabled={!canWrite} value={settings.smsGatewayUrl} onChange={(event) => set("smsGatewayUrl", event.target.value)} placeholder="https://sms-gateway.example" /></Field>
                <Field label="Sender ID"><Input disabled={!canWrite} value={settings.smsSenderId} onChange={(event) => set("smsSenderId", event.target.value)} /></Field>
                <Field label="API key env var"><Input disabled={!canWrite} value={settings.smsApiKeyEnv} onChange={(event) => set("smsApiKeyEnv", event.target.value)} /></Field>
                <Field label="Webhook path"><Input disabled={!canWrite} value={settings.smsWebhookPath} onChange={(event) => set("smsWebhookPath", event.target.value)} /></Field>
                <Field label="Signing secret env var"><Input disabled={!canWrite} value={settings.smsSigningSecretEnv} onChange={(event) => set("smsSigningSecretEnv", event.target.value)} /></Field>
              </div>
            </div>

            <div className="rounded-[8px] border border-slate-200 p-4">
              <p className="font-black">Accounting exports</p>
              <div className="mt-4 grid gap-4">
                <Field label="Accounting provider"><Select disabled={!canWrite} value={settings.accountingProvider} onChange={(event) => set("accountingProvider", event.target.value)}><option>none</option><option>hnry-export</option><option>xero</option><option>myob</option><option>csv</option></Select></Field>
                <Field label="Export format"><Select disabled={!canWrite} value={settings.accountingExportFormat} onChange={(event) => set("accountingExportFormat", event.target.value)}><option>csv</option><option>xlsx</option><option>json</option></Select></Field>
                <Field label="Export recipient"><Input disabled={!canWrite} type="email" value={settings.accountingExportEmail} onChange={(event) => set("accountingExportEmail", event.target.value)} placeholder="accounts@example.com" /></Field>
              </div>
            </div>

            <div className="rounded-[8px] border border-slate-200 p-4">
              <p className="font-black">Calendar sync</p>
              <div className="mt-4 grid gap-4">
                <Field label="Calendar provider"><Select disabled={!canWrite} value={settings.calendarProvider} onChange={(event) => set("calendarProvider", event.target.value)}><option>none</option><option>google-calendar</option><option>outlook-calendar</option></Select></Field>
                <Field label="Timezone"><Input disabled={!canWrite} value={settings.calendarTimezone} onChange={(event) => set("calendarTimezone", event.target.value)} /></Field>
                <Field label="Calendar ID"><Input disabled={!canWrite} value={settings.calendarId} onChange={(event) => set("calendarId", event.target.value)} placeholder="primary" /></Field>
                <Field label="API key env var"><Input disabled={!canWrite} value={settings.calendarApiKeyEnv} onChange={(event) => set("calendarApiKeyEnv", event.target.value)} /></Field>
              </div>
            </div>

            <div className="rounded-[8px] border border-slate-200 p-4 md:col-span-2">
              <p className="font-black">File storage</p>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <Field label="Storage provider"><Select disabled={!canWrite} value={settings.fileStorageProvider} onChange={(event) => set("fileStorageProvider", event.target.value)}><option>cloudflare-r2</option><option>local-dev</option><option>s3-compatible</option></Select></Field>
                <Field label="Bucket"><Input disabled={!canWrite} value={settings.r2Bucket} onChange={(event) => set("r2Bucket", event.target.value)} /></Field>
                <Field label="Access key env var"><Input disabled={!canWrite} value={settings.r2AccessKeyEnv} onChange={(event) => set("r2AccessKeyEnv", event.target.value)} /></Field>
                <Field label="Secret key env var"><Input disabled={!canWrite} value={settings.r2SecretKeyEnv} onChange={(event) => set("r2SecretKeyEnv", event.target.value)} /></Field>
              </div>
            </div>
          </div> : null}
        </div>
      </div>
    </section>
  );
}
