import type { EventoPublico } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import { identityToFrame } from "@/lib/frame-identity";

export type PublicEventIdentity = {
  nomeDoEvento: string;
  dataDoEvento: string;
  mensagemVazia: string;
};

/**
 * Nome, data e a mensagem de "ainda vazio" — a mesma fonte que a peça
 * impressa usa (`identityToFrame`, `apps/web/lib/frame-identity.ts`).
 *
 * `identityTokens.titulo` é o campo do anfitrião quando ele existir; hoje
 * nenhuma tela do admin o preenche, então cai sempre no exemplo do pack
 * (`landing.exemplo.nome`) — o mesmo placeholder que `/e/[slug]` e a Home já
 * mostram (`features/guest/lib/pack-text.ts`). Nenhuma string de domínio
 * aparece aqui: tudo sai do vocabulário do pack.
 */
export function resolvePublicEventIdentity(slug: string, evento: EventoPublico): PublicEventIdentity {
  const pack = PACKS[evento.packId];
  const identidade = identityToFrame(slug, evento.comecaEm, evento.identityTokens, pack);

  return {
    nomeDoEvento: identidade.titulo,
    dataDoEvento: identidade.data,
    mensagemVazia: pack
      ? resolvePackText(pack, "telao.vazio")
      : "As primeiras fotos aparecem aqui",
  };
}
