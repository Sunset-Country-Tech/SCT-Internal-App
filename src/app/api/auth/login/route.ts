import { NextResponse } from "next/server";
import { AUTH_COOKIE, createSessionId, getAuthSecret, signSession, verifyCsrfToken } from "@/lib/auth-cookie";
import { loginSchema, safeReturnTo, verifyStaffCredentials } from "@/lib/server/auth";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 8;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    csrfToken: formData.get("csrfToken"),
    returnTo: safeReturnTo(formData.get("returnTo")),
  });

  if (!parsed.success || !sameOrigin(request) || !(await verifyCsrfToken(parsed.data.csrfToken, getAuthSecret()))) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), { status: 303 });
  }

  const attemptKey = `${request.headers.get("x-forwarded-for") ?? "local"}:${parsed.data.email}`;
  if (rateLimited(attemptKey)) {
    return NextResponse.redirect(new URL("/login?error=rate", request.url), { status: 303 });
  }

  const user = await verifyStaffCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.redirect(new URL(`/login?error=1&returnTo=${encodeURIComponent(parsed.data.returnTo)}`, request.url), { status: 303 });
  }

  attempts.delete(attemptKey);
  const now = Date.now();
  const response = NextResponse.redirect(new URL(parsed.data.returnTo, request.url));
  response.cookies.set({
    name: AUTH_COOKIE,
    value: await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role, iat: now, exp: now + 43_200_000, jti: createSessionId() }, getAuthSecret()),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 43_200,
  });
  return response;
}
