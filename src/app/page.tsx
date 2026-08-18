import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OperationsApp } from "@/components/OperationsApp";
import { AUTH_COOKIE, getAuthSecret, verifySession } from "@/lib/auth-cookie";
import type { Role } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(AUTH_COOKIE)?.value, getAuthSecret());

  if (!session) {
    redirect("/login");
  }

  return <OperationsApp user={{ name: session.name, email: session.email, role: session.role as Role }} />;
}
