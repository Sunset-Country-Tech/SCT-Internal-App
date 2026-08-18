import { ShieldCheck } from "lucide-react";
import { getAuthSecret, signCsrfToken } from "@/lib/auth-cookie";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const error = searchParams.error;
  const returnTo = typeof searchParams.returnTo === "string" ? searchParams.returnTo : "/";
  const csrfToken = await signCsrfToken(getAuthSecret());

  return (
    <main className="grid min-h-screen place-items-center bg-[#0d1220] px-4">
      <section className="w-full max-w-md rounded-[8px] bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-[8px] bg-gradient-to-br from-[#ff8a00] via-[#ff5e7d] to-[#7861ff] text-white"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <h1 className="text-xl font-black">Sunset Country Tech</h1>
            <p className="text-sm text-slate-600">Internal operations sign-in</p>
          </div>
        </div>
        {error ? <p className="mt-5 rounded-[8px] bg-red-50 p-3 text-sm font-bold text-red-700">Sign-in failed. Check your staff email and password.</p> : null}
        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <label className="block text-sm font-bold">Staff email<input name="email" type="email" autoComplete="username" defaultValue="owner@sunsetcountry.tech" className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-[#ff8a00]" /></label>
          <label className="block text-sm font-bold">Password<input name="password" type="password" autoComplete="current-password" className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-[#ff8a00]" /></label>
          <button className="h-11 w-full rounded-[8px] bg-[#ff8a00] font-black text-[#0d1220]">Sign in</button>
        </form>
        <p className="mt-4 text-xs text-slate-500">Dev account: owner@sunsetcountry.tech / sunset-demo-2026.</p>
      </section>
    </main>
  );
}
