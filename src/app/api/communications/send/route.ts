import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { appendEmailSignature, buildMailtoUrl, buildSmsUrl, communicationSendSchema, type CommunicationSendInput } from "@/lib/communications";

export const runtime = "nodejs";

function fallbackResponse(input: CommunicationSendInput, message: string) {
  return NextResponse.json({
    ok: false,
    mode: "draft",
    message,
    fallbackUrl: input.channel === "email" ? buildMailtoUrl(input.to, input.subject, input.body) : buildSmsUrl(input.to, input.body),
  });
}

function readSecret(envName: string) {
  const normalized = envName.trim();
  return normalized ? process.env[normalized] ?? "" : "";
}

function readEnvString(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function readEnvNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readEnvBoolean(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function resolveSmtpSettings(settings: CommunicationSendInput["settings"]) {
  const smtpHost = readEnvString("SMTP_HOST", settings.smtpHost);
  const smtpSecurity = readEnvString("SMTP_SECURITY", settings.smtpSecurity);
  const smtpSecure = readEnvBoolean("SMTP_SECURE", smtpSecurity === "ssl-tls" || settings.smtpSecure);
  return {
    emailProvider: readEnvString("EMAIL_PROVIDER", smtpHost && settings.emailProvider === "none" ? "smtp-imap" : settings.emailProvider),
    emailMode: readEnvString("EMAIL_MODE", settings.emailMode),
    smtpHost,
    smtpPort: readEnvNumber("SMTP_PORT", settings.smtpPort),
    smtpSecurity,
    smtpSecure,
    smtpRequireTls: readEnvBoolean("SMTP_REQUIRE_TLS", smtpSecurity === "starttls" || settings.smtpRequireTls),
    smtpFromName: readEnvString("SMTP_FROM_NAME", settings.smtpFromName),
    smtpFromEmail: readEnvString("SMTP_FROM_EMAIL", settings.smtpFromEmail),
    smtpReplyToEmail: readEnvString("SMTP_REPLY_TO_EMAIL", settings.smtpReplyToEmail),
    emailSignature: readEnvString("EMAIL_SIGNATURE", settings.emailSignature),
    smtpAuthMethod: readEnvString("SMTP_AUTH_METHOD", settings.smtpAuthMethod),
    smtpUsernameEnv: settings.smtpUsernameEnv,
    smtpPasswordEnv: settings.smtpPasswordEnv,
  };
}

async function sendEmail(input: CommunicationSendInput) {
  const settings = resolveSmtpSettings(input.settings);
  if (settings.emailProvider === "none" || !settings.smtpHost || !settings.smtpFromEmail) {
    return fallbackResponse(input, "SMTP is not fully configured yet.");
  }

  const needsPassword = settings.smtpAuthMethod !== "none";
  const username = readSecret(settings.smtpUsernameEnv);
  const password = readSecret(settings.smtpPasswordEnv);
  if (needsPassword && (!username || !password)) {
    return fallbackResponse(input, `SMTP credentials are missing. Set ${settings.smtpUsernameEnv} and ${settings.smtpPasswordEnv} in the server environment.`);
  }

  const transport = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecurity === "ssl-tls" || settings.smtpSecure,
    requireTLS: settings.smtpSecurity === "starttls" || settings.smtpRequireTls,
    auth: needsPassword ? { user: username, pass: password } : undefined,
  });

  const info = await transport.sendMail({
    from: settings.smtpFromName ? `${settings.smtpFromName} <${settings.smtpFromEmail}>` : settings.smtpFromEmail,
    replyTo: settings.smtpReplyToEmail || settings.smtpFromEmail,
    to: input.to,
    subject: input.subject || `Message from ${settings.smtpFromName || "Sunset Country Tech"}`,
    text: input.body,
  });

  return NextResponse.json({ ok: true, mode: "sent", provider: "smtp", id: info.messageId ?? "" });
}

async function sendSms(input: CommunicationSendInput) {
  const { settings } = input;
  if (settings.smsProvider === "none" || !settings.smsGatewayUrl) {
    return fallbackResponse(input, "SMS gateway is not configured yet.");
  }

  const apiKey = readSecret(settings.smsApiKeyEnv);
  if (!apiKey) {
    return fallbackResponse(input, `SMS gateway key is missing. Set ${settings.smsApiKeyEnv} in the server environment.`);
  }

  const response = await fetch(settings.smsGatewayUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to: input.to,
      message: input.body,
      senderId: settings.smsSenderId,
      customerName: input.customerName,
    }),
  });

  if (!response.ok) {
    return fallbackResponse(input, `SMS gateway returned ${response.status}.`);
  }

  return NextResponse.json({ ok: true, mode: "sent", provider: "sms-gateway" });
}

export async function POST(request: Request) {
  const parsed = communicationSendSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid communication payload" }, { status: 400 });
  }

  const input = parsed.data.channel === "email"
    ? { ...parsed.data, body: appendEmailSignature(parsed.data.body, resolveSmtpSettings(parsed.data.settings).emailSignature) }
    : parsed.data;

  try {
    if (input.channel === "email") {
      return await sendEmail(input);
    }
    return await sendSms(input);
  } catch {
    return fallbackResponse(input, "Delivery failed. The message was kept as a draft.");
  }
}
