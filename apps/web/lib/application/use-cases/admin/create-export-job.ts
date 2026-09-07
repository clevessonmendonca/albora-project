/**
 * Use Case: Create Export Job
 *
 * Cria job de export de álbum (full ou curated).
 */
import {
  consumirStepUp,
  criarJobExport,
  ErroMagicLinkInvalido,
  midiaParaCuradoria,
  type JobExport,
} from "@albora/db";
import {
  resolver,
  selecionarParaAlbum,
  planejarCapitulos,
  TETO_DE_PAGINAS_PADRAO,
} from "@albora/core";
import { PACKS } from "@albora/packs";
import type { Pool } from "pg";
import { sendHostEmail } from "@/lib/email";

export type CreateExportJobInput = {
  eventId: string;
  accountId: string;
  hostEmail: string;
  sessionSecret: string;
  token: string;
  curated: boolean;
  requestOrigin: string;
};

export type CreateExportJobResult =
  | {
      ok: true;
      job: {
        id: string;
        estado: string;
        modo: string;
        fotos: number;
        criadoEm: string;
        baixar: string | null;
      };
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

function telaDoJob(eventId: string, job: JobExport) {
  return {
    id: job.id,
    estado: job.estado,
    modo: job.modo,
    fotos: job.fotos,
    criadoEm: job.criadoEm.toISOString(),
    baixar: job.estado === "pronto" ? `/api/admin/events/${eventId}/export/arquivo?job=${job.id}` : null,
  };
}

export async function createExportJob(
  input: CreateExportJobInput,
  pool: Pool,
): Promise<CreateExportJobResult> {
  try {
    await consumirStepUp(pool, input.sessionSecret, input.token, input.accountId, new Date());
  } catch (e) {
    if (e instanceof ErroMagicLinkInvalido) {
      return {
        ok: false,
        code: "admin.reauth_invalida",
        message: "Confirmação inválida ou expirada",
      };
    }
    throw e;
  }

  let curatedIds: string[] | undefined;
  if (input.curated) {
    const data = await midiaParaCuradoria(pool, input.eventId);
    if (data.janela && data.midias.length > 0) {
      const pack = data.packId ? PACKS[data.packId] : undefined;
      const plano = {
        janela: {
          comecaEm: data.janela.comecaEm,
          terminaEm: data.janela.terminaEm,
          offsetMinutos: data.janela.offsetMinutos,
        },
        capitulos: planejarCapitulos(
          {
            comecaEm: data.janela.comecaEm,
            terminaEm: data.janela.terminaEm,
            offsetMinutos: data.janela.offsetMinutos,
          },
          pack?.momentos?.map((m) => m.id) ?? [],
        ),
        tetoDePaginas: TETO_DE_PAGINAS_PADRAO,
      };
      const resolvidas = resolver(data.midias, plano);
      const selecao = selecionarParaAlbum(resolvidas, plano);
      curatedIds = selecao.mantidas.map((m) => m.id);
    }
  }

  const opts = input.curated && curatedIds ? { curated: input.curated, curatedIds } : input.curated ? { curated: input.curated } : undefined;
  const job = await criarJobExport(pool, input.accountId, input.eventId, opts);
  
  if (!job) {
    return {
      ok: false,
      code: "evento.nao_encontrado",
      message: "Evento não encontrado",
    };
  }

  console.log("admin.export.job", {
    accountId: input.accountId,
    modo: job.modo,
    fotos: job.fotos,
    estado: job.estado,
  });

  if (job.estado === "pronto") {
    void sendHostEmail({
      to: input.hostEmail,
      subject: "As fotos da festa estão prontas",
      text: [
        `O álbum está pronto: ${job.fotos} ${job.fotos === 1 ? "arquivo" : "arquivos"}.`,
        "Entre no painel para baixar. O download pede que você esteja conectado.",
        "",
        `${input.requestOrigin}/admin/e/${input.eventId}/album`,
      ].join("\n"),
    });
  }

  return { ok: true, job: telaDoJob(input.eventId, job) };
}
