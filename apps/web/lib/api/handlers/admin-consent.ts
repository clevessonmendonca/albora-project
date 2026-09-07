import { aceitesDeEntradaPorVersao, aceitesExternosPorVersao, withEvent } from "@albora/db";
import { rotuloDoConsentimento, textoDoConsentimento, VERSOES_DE_CONSENTIMENTO } from "@albora/core";
import {
  ADMIN_SESSION_REQUIRED,
  jsonOk,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

type VersaoNaResposta = {
  tipo: "entrada" | "externo";
  versao: string;
  vigente: boolean;
  rotulo: string | null;
  texto: string | null;
  aceites: number;
  revogados: number | null;
  primeiroAceiteEm: string | null;
  ultimoAceiteEm: string | null;
};

/** Painel de auditoria LGPD (task 21): versões de consentimento do evento, contagem de aceites por versão e texto completo — nunca nome de convidado. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  try {
    const [entrada, externo] = await withEvent(getPool(), eventId, (c) =>
      Promise.all([aceitesDeEntradaPorVersao(c, eventId), aceitesExternosPorVersao(c, eventId)]),
    );

    const entradaPorVersao = new Map(entrada.map((l) => [l.versao, l] as const));
    const externoPorVersao = new Map(externo.map((l) => [l.versao, l] as const));

    const versoes: VersaoNaResposta[] = [];

    // Versões conhecidas do registro primeiro (mesmo sem nenhum aceite ainda).
    for (const conhecida of VERSOES_DE_CONSENTIMENTO) {
      if (conhecida.tipo === "entrada") {
        const linha = entradaPorVersao.get(conhecida.versao);
        versoes.push({
          tipo: "entrada",
          versao: conhecida.versao,
          vigente: true,
          rotulo: conhecida.rotulo,
          texto: conhecida.texto,
          aceites: linha?.aceites ?? 0,
          revogados: null,
          primeiroAceiteEm: linha?.primeiroEm.toISOString() ?? null,
          ultimoAceiteEm: linha?.ultimoEm.toISOString() ?? null,
        });
        entradaPorVersao.delete(conhecida.versao);
      } else {
        const linha = externoPorVersao.get(conhecida.versao);
        versoes.push({
          tipo: "externo",
          versao: conhecida.versao,
          vigente: true,
          rotulo: conhecida.rotulo,
          texto: conhecida.texto,
          aceites: linha?.aceites ?? 0,
          revogados: linha?.revogados ?? 0,
          primeiroAceiteEm: linha?.primeiroEm.toISOString() ?? null,
          ultimoAceiteEm: linha?.ultimoEm.toISOString() ?? null,
        });
        externoPorVersao.delete(conhecida.versao);
      }
    }

    // Sobra: versão que existe no banco (alguém aceitou) mas saiu do registro — texto
    // ausente, a contagem continua auditável em vez de desaparecer da tela.
    for (const linha of entradaPorVersao.values()) {
      versoes.push({
        tipo: "entrada",
        versao: linha.versao,
        vigente: false,
        rotulo: rotuloDoConsentimento("entrada", linha.versao),
        texto: textoDoConsentimento("entrada", linha.versao),
        aceites: linha.aceites,
        revogados: null,
        primeiroAceiteEm: linha.primeiroEm.toISOString(),
        ultimoAceiteEm: linha.ultimoEm.toISOString(),
      });
    }

    for (const linha of externoPorVersao.values()) {
      versoes.push({
        tipo: "externo",
        versao: linha.versao,
        vigente: false,
        rotulo: rotuloDoConsentimento("externo", linha.versao),
        texto: textoDoConsentimento("externo", linha.versao),
        aceites: linha.aceites,
        revogados: linha.revogados,
        primeiroAceiteEm: linha.primeiroEm.toISOString(),
        ultimoAceiteEm: linha.ultimoEm.toISOString(),
      });
    }

    console.log("admin.consentimento_visualizado", { eventoId: eventId });

    return jsonOk({ versoes });
  } catch (e) {
    return unexpectedError("admin.consentimento", e);
  }
}
