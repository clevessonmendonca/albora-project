/** Flags de experimento — desligadas por padrão, ligadas por env no deploy. Diferente de `config`
 *  (segredos, quebra na entrada), flag ausente é o estado normal: o caminho atual é o fallback.
 *
 *  `NEXT_PUBLIC_*` porque o wizard é client component e o guard de `/admin/new` é servidor — a
 *  mesma flag precisa ser lida nos dois lados; o valor é inlinado no build. */

/** Delayed auth (ADR 0020): criar o evento sem cadastro e capturar o e-mail como acesso só no
 *  fim. Hipótese em teste A/B — enquanto desligada, vale o login-antes (o caminho atual). O
 *  backend anônimo (evento sem conta, conta pendente por e-mail, associação no magic-link) ainda
 *  não existe: ligar isto em produção sem ele é decisão consciente, não default. */
export function delayedAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DELAYED_AUTH === "1";
}
