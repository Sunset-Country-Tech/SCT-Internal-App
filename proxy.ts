import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, getAuthSecret, verifySession } from "@/lib/auth-cookie";

const publicPrefixes = ["/login", "/q", "/api/auth", "/api/quotes", "/_next", "/favicon.ico"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const session = await verifySession(request.cookies.get(AUTH_COOKIE)?.value, getAuthSecret());
  if (session) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
