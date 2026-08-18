import { AUTH_COOKIE, createSessionId, getAuthSecret, signSession, verifyCsrfToken } from "@/lib/auth-cookie";
import { loginSchema, safeReturnTo, verifyStaffCredentials } from "@/lib/server/auth";
import { relativeRedirect, shouldSetSecureCookie } from "@/lib/server/http";
import { currentTimeMs } from "@/lib/server/time";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string) {
  const now = currentTimeMs();
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
  if (!origin) {
    return true;
  }

  const requestOrigin = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestOrigin;
  return origin === requestOrigin || origin === forwardedOrigin;
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
    return relativeRedirect("/login?error=1");
  }

  const attemptKey = `${request.headers.get("x-forwarded-for") ?? "local"}:${parsed.data.email}`;
  if (rateLimited(attemptKey)) {
    return relativeRedirect("/login?error=rate");
  }

  const user = await verifyStaffCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return relativeRedirect(`/login?error=1&returnTo=${encodeURIComponent(parsed.data.returnTo)}`);
  }

  attempts.delete(attemptKey);
  const now = currentTimeMs();
  const response = relativeRedirect(parsed.data.returnTo);
  response.cookies.set({
    name: AUTH_COOKIE,
    value: await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role, iat: now, exp: now + 43_200_000, jti: createSessionId() }, getAuthSecret()),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldSetSecureCookie(request),
    path: "/",
    maxAge: 43_200,
  });
  return response;
}
