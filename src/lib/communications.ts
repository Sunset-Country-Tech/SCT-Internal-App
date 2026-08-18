import { z } from "zod";

const trimmedString = z.string().trim();

export const communicationSendSchema = z.object({
  channel: z.enum(["email", "sms"]),
  customerName: trimmedString.min(1).max(160),
  to: trimmedString.min(3).max(320),
  subject: trimmedString.max(200).optional().default(""),
  body: trimmedString.min(1).max(4000),
  settings: z.object({
    emailProvider: trimmedString.default("none"),
    emailMode: trimmedString.default("outbound-only"),
    smtpHost: trimmedString.default(""),
    smtpPort: z.number().int().min(1).max(65535).default(587),
    smtpSecurity: trimmedString.default("starttls"),
    smtpSecure: z.boolean().default(false),
    smtpRequireTls: z.boolean().default(true),
    smtpFromName: trimmedString.default("Sunset Country Tech"),
    smtpFromEmail: trimmedString.default(""),
    smtpReplyToEmail: trimmedString.default(""),
    smtpAuthMethod: trimmedString.default("login"),
    smtpUsernameEnv: trimmedString.default("SMTP_USERNAME"),
    smtpPasswordEnv: trimmedString.default("SMTP_PASSWORD"),
    smsProvider: trimmedString.default("none"),
    smsGatewayUrl: trimmedString.default(""),
    smsSenderId: trimmedString.default("SCT"),
    smsApiKeyEnv: trimmedString.default("SMS_API_KEY"),
  }).passthrough(),
});

export type CommunicationSendInput = z.infer<typeof communicationSendSchema>;

export const mailConnectionEnvNames = [
  "EMAIL_PROVIDER",
  "EMAIL_MODE",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURITY",
  "SMTP_SECURE",
  "SMTP_REQUIRE_TLS",
  "SMTP_FROM_NAME",
  "SMTP_FROM_EMAIL",
  "SMTP_REPLY_TO_EMAIL",
  "SMTP_AUTH_METHOD",
  "IMAP_ENABLED",
  "IMAP_HOST",
  "IMAP_PORT",
  "IMAP_SECURITY",
  "IMAP_SECURE",
  "IMAP_INBOX_MAILBOX",
  "IMAP_PROCESSED_MAILBOX",
  "IMAP_ERROR_MAILBOX",
  "IMAP_POLLING_MINUTES",
] as const;

export function buildMailtoUrl(to: string, subject: string, body: string) {
  const query = new URLSearchParams();
  if (subject.trim()) {
    query.set("subject", subject.trim());
  }
  query.set("body", body.trim());
  return `mailto:${encodeURIComponent(to.trim())}?${query.toString()}`;
}

export function buildSmsUrl(to: string, body: string) {
  const query = new URLSearchParams({ body: body.trim() });
  return `sms:${encodeURIComponent(to.trim())}?${query.toString()}`;
}

export function contactTargetFor(channel: "email" | "sms", customer: { email?: string; phone?: string } | undefined) {
  if (!customer) {
    return "";
  }
  return channel === "email" ? customer.email ?? "" : customer.phone ?? "";
}
