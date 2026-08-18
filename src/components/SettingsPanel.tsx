"use client";

import { Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { normalizeSettings, type AppSettings, type CommunicationTemplate, roles } from "@/lib/operations-data";
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

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-32 w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#ff8a00] disabled:bg-slate-100" />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-800">{label}<div className="mt-1">{children}</div></label>;
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function TemplateEditor({
  value,
  disabled,
  onChange,
}: {
  value: CommunicationTemplate[];
  disabled: boolean;
  onChange: (value: CommunicationTemplate[]) => void;
}) {
  const [draft, setDraft] = useState<CommunicationTemplate>({
    id: "custom-template",
    name: "",
    channel: "email",
    subject: "",
    body: "",
  });

  function updateTemplate(id: string, patch: Partial<CommunicationTemplate>) {
    onChange(value.map((template) => template.id === id ? { ...template, ...patch } : template));
  }

  function addTemplate() {
    const name = draft.name.trim();
    const body = draft.body.trim();
    if (!name || !body) {
      return;
    }
    const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom-template";
    const id = value.some((template) => template.id === baseId) ? `${baseId}-${value.length + 1}` : baseId;
    onChange([...value, { ...draft, id, name, body }]);
    setDraft({ id: "custom-template", name: "", channel: "email", subject: "", body: "" });
  }

  return (
    <div className="rounded-[8px] border border-slate-200 p-4 md:col-span-2">
      <p className="font-black">Communication templates</p>
      <div className="mt-4 grid gap-3">
        {value.map((template) => (
          <div key={template.id} className="grid gap-3 rounded-[8px] border border-slate-200 p-3 md:grid-cols-4">
            <Field label="Name"><Input disabled={disabled} value={template.name} onChange={(event) => updateTemplate(template.id, { name: event.target.value })} /></Field>
            <Field label="Channel"><Select disabled={disabled} value={template.channel} onChange={(event) => updateTemplate(template.id, { channel: event.target.value === "sms" ? "sms" : "email" })}><option value="email">Email</option><option value="sms">SMS</option></Select></Field>
            <div className="md:col-span-2"><Field label="Subject"><Input disabled={disabled || template.channel === "sms"} value={template.subject} onChange={(event) => updateTemplate(template.id, { subject: event.target.value })} /></Field></div>
            <div className="md:col-span-4"><Field label="Body"><TextArea disabled={disabled} value={template.body} onChange={(event) => updateTemplate(template.id, { body: event.target.value })} /></Field></div>
            <div className="md:col-span-4 flex justify-end"><button disabled={disabled} type="button" onClick={() => onChange(value.filter((candidate) => candidate.id !== template.id))} className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-xs font-black text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /> Delete</button></div>
          </div>
        ))}
        <div className="grid gap-3 rounded-[8px] bg-slate-50 p-3 md:grid-cols-4">
          <Field label="New template"><Input disabled={disabled} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Follow-up" /></Field>
          <Field label="Channel"><Select disabled={disabled} value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value === "sms" ? "sms" : "email", subject: event.target.value === "sms" ? "" : draft.subject })}><option value="email">Email</option><option value="sms">SMS</option></Select></Field>
          <div className="md:col-span-2"><Field label="Subject"><Input disabled={disabled || draft.channel === "sms"} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Update for {customer}" /></Field></div>
          <div className="md:col-span-4"><Field label="Body"><TextArea disabled={disabled} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Hi {customer},&#10;&#10;Thanks from {business}." /></Field></div>
          <div className="md:col-span-4 flex justify-end"><button disabled={disabled || !draft.name.trim() || !draft.body.trim()} type="button" onClick={addTemplate} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#ff8a00] px-4 text-sm font-black text-[#0d1220] disabled:opacity-40"><Plus className="h-4 w-4" /> Add Template</button></div>
        </div>
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

  function setMany(value: Partial<AppSettings>) {
    onChange({ ...settings, ...value });
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
              <p className="font-black">Email accounts</p>
              <p className="mt-1 text-xs text-slate-500">Configure outbound SMTP and inbound IMAP here. Secret values stay in environment variables; this page stores hosts, ports, security modes, sender details, mailbox names, and env var names.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <Field label="Email provider"><Select disabled={!canWrite} value={settings.emailProvider} onChange={(event) => set("emailProvider", event.target.value)}><option>none</option><option>smtp-imap</option><option>smtp</option><option>api</option><option>microsoft-365</option><option>google-workspace</option></Select></Field>
                <Field label="Email mode"><Select disabled={!canWrite} value={settings.emailMode} onChange={(event) => set("emailMode", event.target.value)}><option>outbound-only</option><option>inbound-only</option><option>inbound-and-outbound</option></Select></Field>
                <Field label="From name"><Input disabled={!canWrite} value={settings.smtpFromName} onChange={(event) => set("smtpFromName", event.target.value)} /></Field>
                <Field label="From email"><Input disabled={!canWrite} type="email" value={settings.smtpFromEmail} onChange={(event) => set("smtpFromEmail", event.target.value)} /></Field>
                <Field label="Reply-to email"><Input disabled={!canWrite} type="email" value={settings.smtpReplyToEmail} onChange={(event) => set("smtpReplyToEmail", event.target.value)} /></Field>
                <div className="md:col-span-4"><Field label="Email signature"><TextArea disabled={!canWrite} value={settings.emailSignature} onChange={(event) => set("emailSignature", event.target.value)} placeholder="Kind regards,&#10;Sunset Country Tech" /></Field></div>
                <Field label="Signature image URL"><Input disabled={!canWrite} value={settings.emailSignatureImageUrl} onChange={(event) => set("emailSignatureImageUrl", event.target.value)} placeholder="/signature.png or https://example.com/signature.png" /></Field>
                <Field label="Signature image alt text"><Input disabled={!canWrite} value={settings.emailSignatureImageAlt} onChange={(event) => set("emailSignatureImageAlt", event.target.value)} /></Field>
                {settings.emailSignatureImageUrl ? (
                  <div className="md:col-span-2">
                    <p className="mb-1 text-sm font-bold text-slate-800">Signature image preview</p>
                    <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={settings.emailSignatureImageUrl} alt={settings.emailSignatureImageAlt || "Email signature"} className="max-h-32 max-w-full object-contain" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <TemplateEditor value={settings.communicationTemplates} disabled={!canWrite} onChange={(value) => set("communicationTemplates", value)} />

            <div className="rounded-[8px] border border-slate-200 p-4 md:col-span-2">
              <p className="font-black">SMTP outbound mail</p>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <Field label="SMTP host"><Input disabled={!canWrite} value={settings.smtpHost} onChange={(event) => set("smtpHost", event.target.value)} placeholder="smtp.example.com" /></Field>
                <Field label="SMTP port"><Input disabled={!canWrite} type="number" min="1" max="65535" value={settings.smtpPort} onChange={(event) => set("smtpPort", numberValue(event.target.value, settings.smtpPort))} /></Field>
                <Field label="SMTP security"><Select disabled={!canWrite} value={settings.smtpSecurity} onChange={(event) => { const value = event.target.value; setMany({ smtpSecurity: value, smtpSecure: value === "ssl-tls" }); }}><option value="starttls">STARTTLS on 587</option><option value="ssl-tls">SSL/TLS on 465</option><option value="none">None</option></Select></Field>
                <Field label="SMTP auth"><Select disabled={!canWrite} value={settings.smtpAuthMethod} onChange={(event) => set("smtpAuthMethod", event.target.value)}><option>login</option><option>plain</option><option>oauth2</option><option>none</option></Select></Field>
                <label className="flex items-center gap-3 rounded-[8px] border border-slate-200 p-3 text-sm font-black"><input disabled={!canWrite} type="checkbox" checked={settings.smtpRequireTls} onChange={(event) => set("smtpRequireTls", event.target.checked)} className="h-5 w-5 accent-[#ff8a00]" /> Require TLS when available</label>
                <label className="flex items-center gap-3 rounded-[8px] border border-slate-200 p-3 text-sm font-black"><input disabled={!canWrite || settings.smtpSecurity === "ssl-tls"} type="checkbox" checked={settings.smtpSecure} onChange={(event) => set("smtpSecure", event.target.checked)} className="h-5 w-5 accent-[#ff8a00]" /> Secure socket</label>
                <Field label="SMTP username env var"><Input disabled={!canWrite} value={settings.smtpUsernameEnv} onChange={(event) => set("smtpUsernameEnv", event.target.value)} /></Field>
                <Field label="SMTP password env var"><Input disabled={!canWrite} value={settings.smtpPasswordEnv} onChange={(event) => set("smtpPasswordEnv", event.target.value)} /></Field>
              </div>
            </div>

            <div className="rounded-[8px] border border-slate-200 p-4 md:col-span-2">
              <p className="font-black">IMAP inbound mail</p>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <label className="flex items-center gap-3 rounded-[8px] border border-slate-200 p-3 text-sm font-black"><input disabled={!canWrite} type="checkbox" checked={settings.imapEnabled} onChange={(event) => set("imapEnabled", event.target.checked)} className="h-5 w-5 accent-[#ff8a00]" /> Enable IMAP intake</label>
                <Field label="IMAP host"><Input disabled={!canWrite} value={settings.imapHost} onChange={(event) => set("imapHost", event.target.value)} placeholder="imap.example.com" /></Field>
                <Field label="IMAP port"><Input disabled={!canWrite} type="number" min="1" max="65535" value={settings.imapPort} onChange={(event) => set("imapPort", numberValue(event.target.value, settings.imapPort))} /></Field>
                <Field label="IMAP security"><Select disabled={!canWrite} value={settings.imapSecurity} onChange={(event) => { const value = event.target.value; setMany({ imapSecurity: value, imapSecure: value === "ssl-tls" }); }}><option value="ssl-tls">SSL/TLS on 993</option><option value="starttls">STARTTLS on 143</option><option value="none">None</option></Select></Field>
                <label className="flex items-center gap-3 rounded-[8px] border border-slate-200 p-3 text-sm font-black"><input disabled={!canWrite || settings.imapSecurity === "ssl-tls"} type="checkbox" checked={settings.imapSecure} onChange={(event) => set("imapSecure", event.target.checked)} className="h-5 w-5 accent-[#ff8a00]" /> Secure socket</label>
                <Field label="IMAP username env var"><Input disabled={!canWrite} value={settings.imapUsernameEnv} onChange={(event) => set("imapUsernameEnv", event.target.value)} /></Field>
                <Field label="IMAP password env var"><Input disabled={!canWrite} value={settings.imapPasswordEnv} onChange={(event) => set("imapPasswordEnv", event.target.value)} /></Field>
                <Field label="Polling minutes"><Input disabled={!canWrite} type="number" min="1" value={settings.imapPollingMinutes} onChange={(event) => set("imapPollingMinutes", numberValue(event.target.value, settings.imapPollingMinutes))} /></Field>
                <Field label="Inbox mailbox"><Input disabled={!canWrite} value={settings.imapInboxMailbox} onChange={(event) => set("imapInboxMailbox", event.target.value)} /></Field>
                <Field label="Processed mailbox"><Input disabled={!canWrite} value={settings.imapProcessedMailbox} onChange={(event) => set("imapProcessedMailbox", event.target.value)} /></Field>
                <Field label="Review mailbox"><Input disabled={!canWrite} value={settings.imapErrorMailbox} onChange={(event) => set("imapErrorMailbox", event.target.value)} /></Field>
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
