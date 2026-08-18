import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, getAuthSecret, verifySession } from "@/lib/auth-cookie";
import { relativeRedirect } from "@/lib/server/http";

const publicPrefixes = ["/login", "/q", "/api/auth", "/api/quotes", "/api/public-contact-intake", "/_next", "/favicon.ico"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const session = await verifySession(request.cookies.get(AUTH_COOKIE)?.value, getAuthSecret());
  if (session) {
    return NextResponse.next();
  }

  const returnTo = encodeURIComponent(`${pathname}${request.nextUrl.search}`);
  return relativeRedirect(`/login?returnTo=${returnTo}`, 307);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
