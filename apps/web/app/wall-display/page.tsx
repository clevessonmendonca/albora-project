import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import { WallClient } from "@/features/wall/components/client/wall-client";

export const dynamic = "force-dynamic";

/**
 * O telão do salão (spec 010).
 *
 * Não recebe slug nem token: a TV não pertence a nenhum evento até alguém
 * pareá-la. A página desenha o tema neutro da marca (fundo escuro do salão) para
 * a tela de código; o tema do casal chega quando o pareamento termina, junto com
 * o crachá. Toda a lógica — parear, poll, exibir — vive no cliente.
 */
export default function Pagina() {
  const neutro = paraVariaveis(
    resolverTokens({ marca: MARCA_ALBORA, pack: { fundo: "escuro" } }),
  );

  return <WallClient initialVars={neutro} />;
}
