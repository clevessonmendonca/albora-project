import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { SignInForm } from "@/features/admin/components/client/sign-in-form";

export const dynamic = "force-dynamic";

/**
 * Entrar no painel do anfitrião. Tema neutro da marca — o painel é da conta, não
 * de um evento, então não há identidade de casal aqui. O `m` é o magic link
 * vindo do e-mail; sem ele, a tela pede o e-mail. `next` (path /admin…) sobrevive
 * ao login para o CTA Completo da landing.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const vars = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as CSSProperties;

  return (
    <div style={vars}>
      <Suspense fallback={<p className="p-8 text-ink-2">Carregando…</p>}>
        <SignInForm magic={m ?? null} />
      </Suspense>
    </div>
  );
}
