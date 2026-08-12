import { buscarEventoDoHost, comConta } from "@albora/db";
import { PACKS } from "@albora/packs";
import {
  MARCA_ALBORA,
  resolverTokens,
  type CamadaTokens,
  type FormatoDePeca,
} from "@albora/tokens";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { gerarPecaSvg } from "@/lib/gerar-peca-svg";
import { identidadeParaMoldura } from "@/lib/identidade-moldura";
import { hostDaRequisicao } from "@/lib/host-sessao";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado } from "@/lib/resposta";

export const dynamic = "force-dynamic";

const FORMATOS: FormatoDePeca[] = ["placa-a4", "card-de-mesa", "card-de-missao"];

function comoFormato(valor: string | null): FormatoDePeca | null {
  if (!valor) return null;
  return FORMATOS.includes(valor as FormatoDePeca) ? (valor as FormatoDePeca) : null;
}

async function tokensDoEvento(
  accountId: string,
  eventoId: string,
): Promise<{
  slug: string;
  packId: string;
  comecaEm: Date;
  identityTokens: Record<string, unknown>;
} | null> {
  return comConta(banco(), accountId, async (c) => {
    const { rows } = await c.query<{
      slug: string;
      pack_id: string;
      starts_at: Date;
      identity_tokens: unknown;
    }>("SELECT slug, pack_id, starts_at, identity_tokens FROM events WHERE id = $1", [eventoId]);
    const linha = rows[0];
    if (!linha) return null;
    return {
      slug: linha.slug,
      packId: linha.pack_id,
      comecaEm: linha.starts_at,
      identityTokens: (linha.identity_tokens ?? {}) as Record<string, unknown>,
    };
  });
}

/**
 * Gera SVG de peça impressa para download (spec 009, MVP).
 *
 * PDF em fila fica para depois; o SVG já leva sangria, QR nível H e URL legível.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("admin.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const host = await hostDaRequisicao(req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para continuar");

  const { eventoId } = await params;
  const resumo = await buscarEventoDoHost(banco(), host.accountId, eventoId);
  if (!resumo) return erro(404, "evento.nao_encontrado", "Evento não encontrado");

  const limite = consumir(`admin_pecas:${host.accountId}`, 30, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  const url = new URL(req.url);
  const formato = comoFormato(url.searchParams.get("formato"));
  if (!formato) {
    return erro(422, "validation_error", "Formato inválido", {
      campo: "formato",
      aceitos: FORMATOS,
    });
  }

  try {
    const dados = await tokensDoEvento(host.accountId, eventoId);
    if (!dados) return erro(404, "evento.nao_encontrado", "Evento não encontrado");

    const pack = PACKS[dados.packId];
    const tokens = resolverTokens({
      marca: MARCA_ALBORA,
      ...(pack ? { pack: pack.tokens } : {}),
      evento: dados.identityTokens as CamadaTokens,
    });

    const identidade = identidadeParaMoldura(
      dados.slug,
      dados.comecaEm,
      dados.identityTokens,
      pack,
    );

    const origem = url.origin;
    const urlQr = `${origem}/e/${encodeURIComponent(dados.slug)}`;
    const urlLegivel = `${url.host}/e/${dados.slug}`;

    const resultado = await gerarPecaSvg({
      formato,
      urlQr,
      urlLegivel,
      monograma: identidade.monograma,
      titulo: identidade.titulo,
      data: identidade.data,
      cores: tokens.cores,
    });

    if (resultado.problemas.length > 0) {
      return erro(422, "peca.invalida", "Esta peça não passa na validação", {
        problemas: resultado.problemas,
        avisos: resultado.avisos,
      });
    }

    console.log("admin.peca_gerada", {
      accountId: host.accountId,
      eventoId,
      formato,
    });

    return new Response(resultado.svg, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="albora-${dados.slug}-${formato}.svg"`,
        "x-albora-avisos": encodeURIComponent(JSON.stringify(resultado.avisos)),
      },
    });
  } catch (e) {
    return erroInesperado("admin.pecas", e);
  }
}
