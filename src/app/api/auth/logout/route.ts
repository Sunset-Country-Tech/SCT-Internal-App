import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth-cookie";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set({ name: AUTH_COOKIE, value: "", path: "/", maxAge: 0 });
  return response;
}
