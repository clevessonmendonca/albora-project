import { Suspense } from "react";
import { SignInForm } from "@/features/admin/components/client/sign-in-form";
import { adminVars } from "@/features/admin/components/server/admin-shell";

export const dynamic = "force-dynamic";

/** `m` é o magic link do e-mail — sem ele, pede o e-mail; `next` sobrevive ao login para o CTA da landing. */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;

  return (
    <div style={adminVars()}>
      <Suspense fallback={<p className="p-8 text-ink-2">Carregando…</p>}>
        <SignInForm magic={m ?? null} />
      </Suspense>
    </div>
  );
}
