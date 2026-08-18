import { AUTH_COOKIE } from "@/lib/auth-cookie";
import { relativeRedirect } from "@/lib/server/http";

export function GET() {
  const response = relativeRedirect("/login");
  response.cookies.set({ name: AUTH_COOKIE, value: "", path: "/", maxAge: 0 });
  return response;
}
