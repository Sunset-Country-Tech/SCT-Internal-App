import { NextResponse } from "next/server";

export function relativeRedirect(location: string, status = 303) {
  return new NextResponse(null, {
    status,
    headers: { Location: location },
  });
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function urlOrigin(value: string | undefined) {
  if (!value) {
    return "";
  }
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function allowedRequestOrigins(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host")) || firstHeaderValue(request.headers.get("host"));
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto")) || requestUrl.protocol.replace(":", "");
  const origins = new Set([requestUrl.origin]);
  if (forwardedHost) {
    origins.add(`${forwardedProto}://${forwardedHost}`);
  }
  const configuredOrigin = urlOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredOrigin) {
    origins.add(configuredOrigin);
  }
  return origins;
}

export function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }
  return allowedRequestOrigins(request).has(origin);
}

export function shouldSetSecureCookie(request: Request) {
  if (process.env.AUTH_COOKIE_SECURE === "true") {
    return true;
  }

  if (process.env.AUTH_COOKIE_SECURE === "false") {
    return false;
  }

  return request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
}
