import type { EventoPublico } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import { identityToFrame } from "@/lib/frame-identity";

export type PublicEventIdentity = {
  nomeDoEvento: string;
  dataDoEvento: string;
  mensagemVazia: string;
};

/** Nome/data/vazio — mesma fonte da peça impressa (`identityToFrame`); cai no exemplo do pack quando `titulo` não está preenchido; sem string de domínio. */
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
