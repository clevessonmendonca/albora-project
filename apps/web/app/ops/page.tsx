import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isPlatformOperator } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ops · Albora",
  robots: { index: false, follow: false },
};

export default async function OpsHomePage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/ops");

  const allowed = await isPlatformOperator(getPool(), host.accountId);
  if (!allowed) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="font-titulo text-2xl">Ops</h1>
        <p className="mt-3 text-ink-2">Só da equipe Albora.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="m-0 font-titulo text-3xl font-light">Ops</h1>
      <p className="mt-2 text-ink-2">Plataforma · sem galeria · sem PII de convidado.</p>
      <ul className="mt-8 flex list-none flex-col gap-3 p-0">
        <li>
          <Link href="/ops/support" className="text-acento underline">
            Inbox de suporte
          </Link>
        </li>
        <li>
          <Link href="/ops/insights" className="text-acento underline">
            KPIs da plataforma
          </Link>
        </li>
        <li>
          <Link href="/ops/events" className="text-acento underline">
            Lookup de evento (slug)
          </Link>
        </li>
      </ul>
    </main>
  );
}
