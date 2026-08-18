export const AUTH_COOKIE = "sct_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
  jti: string;
};

function encode(input: string | ArrayBuffer) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }
  return secret ?? "development-only-change-me";
}

async function hmac(data: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encode(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

function equal(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function randomToken(bytes = 24) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return encode(value.buffer);
}

export function createSessionId() {
  return randomToken(24);
}

export async function signSession(payload: SessionPayload, secret: string) {
  const body = encode(JSON.stringify(payload));
  return `${body}.${await hmac(body, secret)}`;
}

export async function verifySession(cookie: string | undefined, secret: string) {
  if (!cookie) {
    return null;
  }

  const [body, signature] = cookie.split(".");
  if (!body || !signature || !equal(signature, await hmac(body, secret))) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(body)) as SessionPayload;
    if (!payload.sub || !payload.email || !payload.role || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function signCsrfToken(secret: string) {
  const body = encode(JSON.stringify({ nonce: randomToken(32), exp: Date.now() + 600_000 }));
  return `${body}.${await hmac(body, secret)}`;
}

export async function verifyCsrfToken(token: string | undefined, secret: string) {
  if (!token) {
    return false;
  }

  const [body, signature] = token.split(".");
  if (!body || !signature || !equal(signature, await hmac(body, secret))) {
    return false;
  }

  try {
    return (JSON.parse(decode(body)) as { exp: number }).exp >= Date.now();
  } catch {
    return false;
  }
}
