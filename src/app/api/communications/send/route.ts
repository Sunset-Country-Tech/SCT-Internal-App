import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { buildMailtoUrl, buildSmsUrl, communicationSendSchema, type CommunicationSendInput } from "@/lib/communications";

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

async function sendEmail(input: CommunicationSendInput) {
  const { settings } = input;
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

  try {
    return parsed.data.channel === "email" ? await sendEmail(parsed.data) : await sendSms(parsed.data);
  } catch {
    return fallbackResponse(parsed.data, "Delivery failed. The message was kept as a draft.");
  }
}
