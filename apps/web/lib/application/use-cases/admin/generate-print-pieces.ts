/**
 * Use Case: Generate Print Pieces
 *
 * Gera peças impressas (SVG, PDF ou ZIP) com QR codes e identidade visual.
 */
import { withAccount, withEvent, listChallenges, recordProductEvent } from "@albora/db";
import { PACKS } from "@albora/packs";
import {
  ALBORA_BRAND,
  resolveTokens,
  type TokenLayer,
} from "@albora/tokens";
import type { Pool } from "pg";
import { generatePiecePdf } from "@/lib/generate-piece-pdf";
import { generatePieceSvg } from "@/lib/generate-piece-svg";
import { packPrintPieces } from "@/lib/pack-print-pieces";
import { missionTitlesForPrint } from "@/lib/piece-missions";
import { identityToFrame } from "@/lib/frame-identity";
import { eventEntryUrl } from "@/lib/qr";

async function tokensDoEvento(
  accountId: string,
  eventId: string,
  pool: Pool,
): Promise<{
  slug: string;
  packId: string;
  comecaEm: Date;
  identityTokens: Record<string, unknown>;
} | null> {
  return withAccount(pool, accountId, async (c) => {
    const { rows } = await c.query<{
      slug: string;
      pack_id: string;
      starts_at: Date;
      identity_tokens: unknown;
    }>("SELECT slug, pack_id, starts_at, identity_tokens FROM events WHERE id = $1", [eventId]);
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

export type PrintPieceRequest = 
  | {
      kind: "zip";
      includeSvg: boolean;
    }
  | {
      kind: "single";
      tipo: "pdf" | "svg";
      formato: string;
    };

export type GeneratePrintPiecesInput = {
  accountId: string;
  eventId: string;
  pedido: PrintPieceRequest;
  origin: string;
  host: string;
};

export type GeneratePrintPiecesResult =
  | {
      ok: true;
      kind: "zip";
      zip: Uint8Array;
      filename: string;
      contentType: string;
      avisos: string[];
    }
  | {
      ok: true;
      kind: "pdf";
      pdf: Uint8Array;
      filename: string;
      contentType: string;
      avisos: string[];
    }
  | {
      ok: true;
      kind: "svg";
      svg: string;
      filename: string;
      contentType: string;
      avisos: string[];
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: {
        problemas: string[];
        avisos: string[];
      };
    };

export async function generatePrintPieces(
  input: GeneratePrintPiecesInput,
  pool: Pool,
): Promise<GeneratePrintPiecesResult> {
  const [dados, desafios] = await Promise.all([
    tokensDoEvento(input.accountId, input.eventId, pool),
    withEvent(pool, input.eventId, (c) => listChallenges(c, input.eventId, null)),
  ]);

  if (!dados) {
    return {
      ok: false,
      code: "evento.nao_encontrado",
      message: "Evento não encontrado",
    };
  }

  const pack = PACKS[dados.packId];
  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    ...(pack ? { pack: pack.tokens } : {}),
    evento: dados.identityTokens as TokenLayer,
  });

  const identidade = identityToFrame(
    dados.slug,
    dados.comecaEm,
    dados.identityTokens,
    pack,
  );

  const base = {
    urlQr: eventEntryUrl(input.origin, dados.slug, "qr"),
    urlLegivel: `${input.host}/e/${dados.slug}`,
    monograma: identidade.monograma,
    titulo: identidade.titulo,
    data: identidade.data,
    cores: tokens.cores,
    missoes: missionTitlesForPrint(
      pack,
      desafios.map((d) => d.chaveTitulo).filter((k): k is string => k !== null),
    ),
  };

  if (input.pedido.kind === "zip") {
    const resultado = await packPrintPieces(base, {
      slug: dados.slug,
      includeSvg: input.pedido.includeSvg,
    });

    if (resultado.problemas.length > 0) {
      return {
        ok: false,
        code: "peca.invalida",
        message: "Esta peça não passa na validação",
        details: {
          problemas: resultado.problemas,
          avisos: resultado.avisos,
        },
      };
    }

    void recordProductEvent(pool, "qr_downloaded");

    console.log("admin.pecas_zip", {
      accountId: input.accountId,
      eventId: input.eventId,
      arquivos: resultado.arquivos,
    });

    return {
      ok: true,
      kind: "zip",
      zip: resultado.zip,
      filename: `albora-${dados.slug}-pecas.zip`,
      contentType: "application/zip",
      avisos: resultado.avisos,
    };
  }

  const entrada = { ...base, formato: input.pedido.formato };

  if (input.pedido.tipo === "pdf") {
    const resultado = await generatePiecePdf(entrada);

    if (resultado.problemas.length > 0) {
      return {
        ok: false,
        code: "peca.invalida",
        message: "Esta peça não passa na validação",
        details: {
          problemas: resultado.problemas,
          avisos: resultado.avisos,
        },
      };
    }

    void recordProductEvent(pool, "qr_downloaded");

    console.log("admin.peca_gerada", {
      accountId: input.accountId,
      eventId: input.eventId,
      formato: input.pedido.formato,
      tipo: input.pedido.tipo,
    });

    return {
      ok: true,
      kind: "pdf",
      pdf: resultado.pdf,
      filename: `albora-${dados.slug}-${input.pedido.formato}.pdf`,
      contentType: "application/pdf",
      avisos: resultado.avisos,
    };
  }

  const resultado = await generatePieceSvg(entrada);

  if (resultado.problemas.length > 0) {
    return {
      ok: false,
      code: "peca.invalida",
      message: "Esta peça não passa na validação",
      details: {
        problemas: resultado.problemas,
        avisos: resultado.avisos,
      },
    };
  }

  console.log("admin.peca_gerada", {
    accountId: input.accountId,
    eventId: input.eventId,
    formato: input.pedido.formato,
    tipo: input.pedido.tipo,
  });

  return {
    ok: true,
    kind: "svg",
    svg: resultado.svg,
    filename: `albora-${dados.slug}-${input.pedido.formato}.svg`,
    contentType: "image/svg+xml; charset=utf-8",
    avisos: resultado.avisos,
  };
}
