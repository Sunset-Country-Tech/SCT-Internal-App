import { NextResponse } from "next/server";

export function relativeRedirect(location: string, status = 303) {
  return new NextResponse(null, {
    status,
    headers: { Location: location },
  });
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
