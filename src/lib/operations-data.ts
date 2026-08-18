import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  FileText,
  Inbox,
  MessageSquare,
  Package,
  Printer,
  Receipt,
  Search,
  Settings,
  UsersRound,
  Wrench,
} from "lucide-react";
import { roleValues, type LineItem } from "@/lib/workflows";

export const roles = [...roleValues];

export const navItems = [
  { label: "Dashboard", icon: Search },
  { label: "Customers", icon: UsersRound },
  { label: "Jobs", icon: Wrench },
  { label: "Calendar", icon: CalendarDays },
  { label: "Quotes", icon: FileText },
  { label: "Invoices", icon: Receipt },
  { label: "Payments", icon: CreditCard },
  { label: "Digital Literacy", icon: BookOpen },
  { label: "Business IT", icon: BriefcaseBusiness },
  { label: "3D Printing", icon: Printer },
  { label: "Parts", icon: Package },
  { label: "Communications", icon: MessageSquare },
  { label: "Tasks", icon: Inbox },
  { label: "Settings", icon: Settings },
] as const;

export type AppSettings = {
  businessName: string;
  abn: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  gstRegistered: boolean;
  gstRate: number;
  labourRate: number;
  travelRate: number;
  serviceAreas: string[];
  jobStatuses: string[];
  jobTypes: string[];
  tags: string[];
  numbering: {
    job: string;
    quote: string;
    invoice: string;
    receipt: string;
    warranty: string;
    digitalLiteracy: string;
    threeDPrinting: string;
  };
  emailProvider: string;
  emailMode: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: string;
  smtpSecure: boolean;
  smtpRequireTls: boolean;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpReplyToEmail: string;
  smtpAuthMethod: string;
  smtpUsernameEnv: string;
  smtpPasswordEnv: string;
  imapEnabled: boolean;
  imapHost: string;
  imapPort: number;
  imapSecurity: string;
  imapSecure: boolean;
  imapUsernameEnv: string;
  imapPasswordEnv: string;
  imapInboxMailbox: string;
  imapProcessedMailbox: string;
  imapErrorMailbox: string;
  imapPollingMinutes: number;
  smsProvider: string;
  smsGatewayUrl: string;
  smsSenderId: string;
  smsApiKeyEnv: string;
  smsWebhookPath: string;
  smsSigningSecretEnv: string;
  accountingProvider: string;
  accountingExportFormat: string;
  accountingExportEmail: string;
  calendarProvider: string;
  calendarTimezone: string;
  calendarId: string;
  calendarApiKeyEnv: string;
  fileStorageProvider: string;
  r2Bucket: string;
  r2AccessKeyEnv: string;
  r2SecretKeyEnv: string;
};

export const defaultSettings: AppSettings = {
  businessName: "Sunset Country Tech",
  abn: "",
  phone: "0400 123 456",
  email: "hello@sunsetcountry.tech",
  website: "sunsetcountry.tech",
  currency: "AUD",
  gstRegistered: false,
  gstRate: 0.1,
  labourRate: 95,
  travelRate: 45,
  serviceAreas: ["Mildura", "Irymple", "Red Cliffs", "Merbein", "Buronga", "Gol Gol", "Wentworth"],
  jobStatuses: ["New", "Awaiting Diagnosis", "Awaiting Quote", "Awaiting Approval", "Awaiting Parts", "Scheduled", "In Progress", "Testing", "Ready for Collection", "Awaiting Payment", "Completed", "Collected", "Cancelled", "Unable to Repair"],
  jobTypes: ["Computer Repair", "Remote Support", "On-Site Support", "Business IT", "Digital Literacy", "3D Printing", "Wi-Fi / Networking", "Security Cameras", "Smart Home", "Other"],
  tags: ["VIP", "Business", "Digital Literacy", "Warranty", "Repeat Customer"],
  numbering: {
    job: "SCT",
    quote: "Q-SCT",
    invoice: "INV-SCT",
    receipt: "REC-SCT",
    warranty: "WAR-SCT",
    digitalLiteracy: "DL-SCT",
    threeDPrinting: "3DP-SCT",
  },
  emailProvider: "none",
  emailMode: "outbound-only",
  smtpHost: "",
  smtpPort: 587,
  smtpSecurity: "starttls",
  smtpSecure: false,
  smtpRequireTls: true,
  smtpFromName: "Sunset Country Tech",
  smtpFromEmail: "hello@sunsetcountry.tech",
  smtpReplyToEmail: "hello@sunsetcountry.tech",
  smtpAuthMethod: "login",
  smtpUsernameEnv: "SMTP_USERNAME",
  smtpPasswordEnv: "SMTP_PASSWORD",
  imapEnabled: false,
  imapHost: "",
  imapPort: 993,
  imapSecurity: "ssl-tls",
  imapSecure: true,
  imapUsernameEnv: "IMAP_USERNAME",
  imapPasswordEnv: "IMAP_PASSWORD",
  imapInboxMailbox: "INBOX",
  imapProcessedMailbox: "Processed",
  imapErrorMailbox: "Needs Review",
  imapPollingMinutes: 5,
  smsProvider: "none",
  smsGatewayUrl: "",
  smsSenderId: "SCT",
  smsApiKeyEnv: "SMS_API_KEY",
  smsWebhookPath: "/api/webhooks/sms",
  smsSigningSecretEnv: "SMS_WEBHOOK_SECRET",
  accountingProvider: "none",
  accountingExportFormat: "csv",
  accountingExportEmail: "",
  calendarProvider: "none",
  calendarTimezone: "Australia/Sydney",
  calendarId: "",
  calendarApiKeyEnv: "CALENDAR_API_KEY",
  fileStorageProvider: "cloudflare-r2",
  r2Bucket: "sunset-country-tech-files",
  r2AccessKeyEnv: "R2_ACCESS_KEY_ID",
  r2SecretKeyEnv: "R2_SECRET_ACCESS_KEY",
};

export function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") {
    return defaultSettings;
  }

  const partial = value as Partial<AppSettings>;
  const numberOrDefault = (candidate: unknown, fallback: number) => (typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback);
  const booleanOrDefault = (candidate: unknown, fallback: boolean) => (typeof candidate === "boolean" ? candidate : fallback);
  const smtpSecurity = typeof partial.smtpSecurity === "string" ? partial.smtpSecurity : defaultSettings.smtpSecurity;
  const imapSecurity = typeof partial.imapSecurity === "string" ? partial.imapSecurity : defaultSettings.imapSecurity;

  return {
    ...defaultSettings,
    ...partial,
    serviceAreas: Array.isArray(partial.serviceAreas) ? partial.serviceAreas : defaultSettings.serviceAreas,
    jobStatuses: Array.isArray(partial.jobStatuses) ? partial.jobStatuses : defaultSettings.jobStatuses,
    jobTypes: Array.isArray(partial.jobTypes) ? partial.jobTypes : defaultSettings.jobTypes,
    tags: Array.isArray(partial.tags) ? partial.tags : defaultSettings.tags,
    numbering: {
      ...defaultSettings.numbering,
      ...(partial.numbering && typeof partial.numbering === "object" ? partial.numbering : {}),
    },
    smtpPort: numberOrDefault(partial.smtpPort, defaultSettings.smtpPort),
    smtpSecurity,
    smtpSecure: smtpSecurity === "ssl-tls" ? true : booleanOrDefault(partial.smtpSecure, false),
    smtpRequireTls: booleanOrDefault(partial.smtpRequireTls, defaultSettings.smtpRequireTls),
    smtpReplyToEmail: partial.smtpReplyToEmail ?? partial.smtpFromEmail ?? defaultSettings.smtpReplyToEmail,
    imapEnabled: booleanOrDefault(partial.imapEnabled, defaultSettings.imapEnabled),
    imapPort: numberOrDefault(partial.imapPort, defaultSettings.imapPort),
    imapSecurity,
    imapSecure: imapSecurity === "ssl-tls" ? true : booleanOrDefault(partial.imapSecure, false),
    imapPollingMinutes: numberOrDefault(partial.imapPollingMinutes, defaultSettings.imapPollingMinutes),
    gstRate: numberOrDefault(partial.gstRate, defaultSettings.gstRate),
    labourRate: numberOrDefault(partial.labourRate, defaultSettings.labourRate),
    travelRate: numberOrDefault(partial.travelRate, defaultSettings.travelRate),
    gstRegistered: booleanOrDefault(partial.gstRegistered, defaultSettings.gstRegistered),
  };
}

export const quoteItems: LineItem[] = [
  { description: "Diagnostic and repair labour", quantity: 1.5, unitPrice: 95, taxRate: 0.1 },
  { description: "Replacement laptop battery", quantity: 1, unitPrice: 129, taxRate: 0.1 },
];

export const customers = [
  { id: "CUST-1042", name: "Mia Thompson", type: "Individual", phone: "0400 123 456", email: "mia@example.test", area: "Irymple", tags: ["VIP", "Repeat Customer"] },
  { id: "CUST-1043", name: "Red Cliffs Dental", type: "Business", phone: "03 5000 2211", email: "admin@redcliffsdental.test", area: "Red Cliffs", tags: ["Business"] },
  { id: "CUST-1044", name: "Leo Nguyen", type: "Digital Literacy", phone: "0400 987 654", email: "leo@example.test", area: "Mildura", tags: ["Digital Literacy"] },
];

export const jobs = [
  { number: "SCT-2026-0021", customer: "Mia Thompson", type: "Computer Repair", device: "Lenovo IdeaPad 5", status: "Awaiting Approval", due: "2026-08-13", next: "Customer quote approval" },
  { number: "SCT-2026-0020", customer: "Red Cliffs Dental", type: "Business IT", device: "Brother MFC-L8900", status: "Scheduled", due: "2026-08-14", next: "On-site network visit" },
  { number: "SCT-2026-0019", customer: "Mia Thompson", type: "Computer Upgrade", device: "Lenovo IdeaPad 5", status: "Ready for Collection", due: "2026-08-12", next: "Payment and collection" },
];

export const quotes = [
  { number: "Q-SCT-2026-0007", token: "sample-approval-token", customer: "Mia Thompson", job: "SCT-2026-0021", status: "Sent", expiry: "2026-08-18", items: quoteItems },
];

export const invoices = [
  { number: "INV-SCT-2026-0009", customer: "Mia Thompson", job: "SCT-2026-0019", status: "Awaiting Payment", total: 318, paid: 0 },
  { number: "INV-SCT-2026-0008", customer: "Sunraysia Makers Club", job: "3DP-SCT-2026-0004", status: "Paid", total: 86, paid: 86 },
];

export const appointments = [
  { time: "09:30", type: "Digital Literacy", customer: "Leo Nguyen", location: "Mildura Library" },
  { time: "13:00", type: "Business IT", customer: "Red Cliffs Dental", location: "Red Cliffs" },
  { time: "16:30", type: "Device collection", customer: "Mia Thompson", location: "Workshop" },
];

export const alerts = [
  "Quote Q-SCT-2026-0007 is awaiting customer approval",
  "Invoice INV-SCT-2026-0009 is due",
  "Part ETA missing for SCT-2026-0021",
  "Digital Literacy summary due for Leo",
];
