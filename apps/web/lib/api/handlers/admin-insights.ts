import { fotosPorMissao, fotosPorHora, withEvent } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import type { CodigoDaTese, EtapaDaEspinha } from "@albora/core";
import {
  ADMIN_SESSION_REQUIRED,
  jsonOk,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { buildCsv, csvRow } from "@/lib/csv";
import { getEventInsights, getGuestMetrics } from "@/lib/application/use-cases/admin";

export const dynamic = "force-dynamic";

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
    const [missoes, horas] = await withEvent(getPool(), eventId, (c) =>
      Promise.all([
        fotosPorMissao(c, eventId),
        fotosPorHora(c, eventId, owned.evento.fuso ?? "UTC"),
      ]),
    );

    const pack = owned.evento.packId ? (PACKS[owned.evento.packId] ?? null) : null;

    const missaoSer = missoes.map((m) => ({
      challengeId: m.challengeId,
      titulo:
        m.customTitle ??
        (pack && m.titleKey ? resolvePackText(pack, m.titleKey) : (m.titleKey ?? "")),
      emoji: m.emoji,
      fotos: m.fotos,
    }));

    return jsonOk({ missoes: missaoSer, horas });
  } catch (e) {
    return unexpectedError("admin.insights", e);
  }
}

const ROTULO_VEREDITO: Record<CodigoDaTese, string> = {
  "funil.tese_validada": "A festa está pegando — meta de participação alcançada",
  "funil.mexe_em_friccao": "Ainda abaixo da meta — vale anunciar no microfone",
  "funil.parar": "Participação crítica — priorize o QR e o anúncio ao vivo",
};

const ROTULO_ETAPA: Record<EtapaDaEspinha, string> = {
  qr_scan: "QR escaneado",
  page_open: "Abriu o evento",
  consent: "Consentiu",
  capture: "Tirou foto",
  upload_start: "Começou envio",
  upload_ok: "Foto no ar",
};

/**
 * CSV dos insights agregados do evento — mesmos números do dashboard.
 *
 * Só métricas agregadas: sem nome de convidado, sem foto, sem sessão
 * individual. `getGuestMetrics` retorna `sessoes` e `ultimas` (nomes e
 * thumbs) que ficam de fora de propósito — moderação por nome vive em
 * Convidados, não aqui.
 */
export async function getInsightsCsv(
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
    const pool = getPool();
    const [insights, resumo] = await Promise.all([
      getEventInsights(
        { eventId, packId: owned.evento.packId, fuso: owned.evento.fuso ?? "UTC" },
        pool,
      ),
      getGuestMetrics(
        {
          eventId,
          expectedGuests: owned.evento.expectedGuests,
          actualGuests: owned.evento.actualGuests,
        },
        pool,
      ),
    ]);

    const rows: string[] = [];

    rows.push(csvRow(["Resumo geral"]));
    rows.push(csvRow(["Métrica", "Valor"]));
    rows.push(csvRow(["Convidados esperados", resumo.expectedGuests]));
    rows.push(csvRow(["Base usada na participação", resumo.denominador]));
    rows.push(csvRow(["Sessões totais", resumo.totalSessoes]));
    rows.push(csvRow(["Sessões com upload", resumo.sessoesComUpload]));
    rows.push(csvRow(["Fotos no ar", resumo.totalFotos]));
    rows.push(csvRow(["Compartilhamentos", resumo.sharesTotais]));
    rows.push(csvRow(["Participação (%)", Math.round(resumo.participacao * 100)]));
    rows.push(csvRow(["Veredito", ROTULO_VEREDITO[resumo.veredito]]));
    rows.push(csvRow(["Uploads antes do feed", resumo.uploadsAntesDoFeed]));
    rows.push(csvRow(["Uploads depois do feed", resumo.uploadsDepoisDoFeed]));
    rows.push("");

    rows.push(csvRow(["Jornada do convidado"]));
    rows.push(csvRow(["Etapa", "Sessões", "Retenção (%)"]));
    for (const d of resumo.degraus) {
      rows.push(
        csvRow([
          ROTULO_ETAPA[d.etapa],
          d.sessoes,
          d.retencao === null ? "" : Math.round(d.retencao * 100),
        ]),
      );
    }
    rows.push("");

    rows.push(csvRow(["Canais de entrada"]));
    rows.push(csvRow(["Via", "Sessões"]));
    rows.push(csvRow(["QR impresso", resumo.entradasPorVia?.qr ?? 0]));
    rows.push(csvRow(["WhatsApp", resumo.entradasPorVia?.wa ?? 0]));
    rows.push(csvRow(["Link copiado", resumo.entradasPorVia?.link ?? 0]));
    rows.push(csvRow(["Código digitado", resumo.entradasPorVia?.code ?? 0]));
    rows.push("");

    rows.push(csvRow(["Missões mais fotografadas"]));
    rows.push(csvRow(["Posição", "Missão", "Fotos"]));
    insights.missoes.forEach((m, i) => {
      rows.push(csvRow([i + 1, m.titulo, m.fotos]));
    });
    rows.push("");

    rows.push(csvRow(["Fotos por hora"]));
    rows.push(csvRow(["Hora", "Fotos"]));
    for (const h of insights.horas) {
      rows.push(csvRow([`${h.hora}h`, h.fotos]));
    }

    const csv = buildCsv(rows);
    const slug = owned.evento.slug || "evento";

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="insights-${slug}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return unexpectedError("admin.insights_csv", e);
  }
}
