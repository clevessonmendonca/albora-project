import type { Pool, PoolClient } from "pg";
import { FUSO_PADRAO, fusoIanaValido, fusoOuPadrao } from "@albora/core";
import { comConta, comEvento } from "./event";
import { agendarRetencaoNaTransacao } from "./retention-jobs";
import { mintarRefDeCompartilhamento } from "./share-attribution";
import { ErroSemAcessoAoFornecedor } from "./vendor-portal";

export type EstadoDoEvento =
  | "aberto"
  | "nao_comecou"
  | "encerrado"
  | "slug_rotacionado"
  | "rascunho"
  | "desconhecido";

export type EventoPublico = {
  eventoId: string;
  packId: string;
  comecaEm: Date;
  terminaEm: Date;
  interacaoAbreEm: Date | null;
  identityTokens: Record<string, unknown>;
  /** Id de preset sugerido pelo anfitrião. `null` = tira na ordem do catálogo. */
  filtroRecomendado: string | null;
  /** IANA do salão. Ancora taken_at, capítulos e a faixa 5h–7h. */
  fuso: string;
  /** Isolado pelo `app.event_id` da transação — convidado do evento A nunca lê tokens do vendor do evento B. */
  vendorBrandTokens: Record<string, unknown> | null;
  /** Chave de storage da imagem de capa enviada pelo casal. Null = usa album. */
  coverImageKey: string | null;
  /** Nome personalizado do casal para o evento. Null = vocabulário do pack. */
  title: string | null;
  /** `draft` = anfitrião ainda não publicou; convidado não entra (task 6, gap I1). */
  status: "draft" | "active" | "ended";
};

export type Resolucao =
  | { estado: "aberto" | "nao_comecou"; evento: EventoPublico }
  | { estado: "encerrado" | "slug_rotacionado" | "rascunho"; evento: EventoPublico }
  | { estado: "desconhecido" };

export const HORAS_APOS_EVENTO = 48;

export async function carregarEventoPublico(
  cliente: PoolClient,
  eventoId: string,
): Promise<EventoPublico | null> {
  const { rows: e } = await cliente.query(
    `SELECT id, pack_id, starts_at, ends_at, interaction_opens_at, identity_tokens,
            recommended_filter, timezone, vendor_id, cover_image_key, title, status
     FROM events WHERE id = $1`,
    [eventoId],
  );
  const linha = e[0];
  if (!linha) return null;

  let vendorBrandTokens: Record<string, unknown> | null = null;
  if (linha.vendor_id) {
    const { rows: v } = await cliente.query<{ brand_tokens: Record<string, unknown> }>(
      `SELECT brand_tokens FROM vendors WHERE id = $1`,
      [linha.vendor_id],
    );
    vendorBrandTokens = (v[0]?.brand_tokens ?? null) as Record<string, unknown> | null;
  }

  return {
    eventoId: linha.id as string,
    packId: linha.pack_id as string,
    comecaEm: linha.starts_at as Date,
    terminaEm: linha.ends_at as Date,
    interacaoAbreEm: linha.interaction_opens_at as Date | null,
    identityTokens: (linha.identity_tokens ?? {}) as Record<string, unknown>,
    filtroRecomendado: (linha.recommended_filter ?? null) as string | null,
    fuso: fusoOuPadrao((linha.timezone ?? null) as string | null),
    vendorBrandTokens,
    coverImageKey: (linha.cover_image_key ?? null) as string | null,
    title: (linha.title ?? null) as string | null,
    status: linha.status as "draft" | "active" | "ended",
  };
}

/** Persiste (ou apaga) a chave de storage da imagem de capa do evento. */
export async function atualizarChaveImagemCapa(
  cliente: PoolClient,
  eventoId: string,
  chave: string | null,
): Promise<void> {
  await cliente.query(
    "UPDATE events SET cover_image_key = $1 WHERE id = $2",
    [chave, eventoId],
  );
}

export async function resolverSlug(
  pool: Pool,
  slug: string,
  agora: Date,
): Promise<Resolucao> {
  const { rows } = await pool.query<{ event_id: string; active: boolean }>(
    "SELECT event_id, active FROM event_slugs WHERE slug = $1",
    [slug],
  );

  const encontrado = rows[0];
  if (!encontrado) return { estado: "desconhecido" };

  const evento = await comEvento(pool, encontrado.event_id, (c) =>
    carregarEventoPublico(c, encontrado.event_id),
  );

  if (!evento) return { estado: "desconhecido" };

  // Rascunho vence rotação de slug: o anfitrião ainda não publicou, então nem
  // o QR mais novo deve chegar no convidado (task 6, gap I1).
  if (evento.status === "draft") return { estado: "rascunho", evento };

  if (!encontrado.active) return { estado: "slug_rotacionado", evento };

  const limite = new Date(evento.terminaEm.getTime() + HORAS_APOS_EVENTO * 3600_000);
  if (agora >= limite) return { estado: "encerrado", evento };

  // Evento existe e é legítimo — a tela diz quando começa, não que não existe.
  if (agora < evento.comecaEm) return { estado: "nao_comecou", evento };

  return { estado: "aberto", evento };
}

/** Whitelist vinda do banco — lugar, missão e filtro são validados contra ela, nunca contra o corpo da requisição. */
export async function packDoEvento(cliente: PoolClient, eventoId: string): Promise<string | null> {
  const { rows } = await cliente.query<{ pack_id: string }>(
    "SELECT pack_id FROM events WHERE id = $1",
    [eventoId],
  );

  return rows[0]?.pack_id ?? null;
}

/** Ausente ou inválido cai no default — o álbum e o confirm nunca ficam sem âncora de fuso. */
export async function fusoDoEvento(cliente: PoolClient, eventoId: string): Promise<string> {
  const { rows } = await cliente.query<{ timezone: string }>(
    "SELECT timezone FROM events WHERE id = $1",
    [eventoId],
  );

  return fusoOuPadrao(rows[0]?.timezone);
}

/** Slug legível, sem l/o/0/1: vai impresso na placa e alguém pode reconferir. */
const ALFABETO_SLUG = "abcdefghijkmnpqrstuvwxyz23456789";
const TAMANHO_SLUG = 8;

function gerarSlug(rand: () => number): string {
  let s = "";
  for (let i = 0; i < TAMANHO_SLUG; i++) s += ALFABETO_SLUG[Math.floor(rand() * ALFABETO_SLUG.length)];
  return s;
}

function ehColisaoDeSlug(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ErroContaDoCasalInvalida extends Error {
  readonly code = "event.invalid_couple_account";
  constructor() {
    super(
      "coupleAccountId ausente, malformado, ou igual ao accountId autenticado ao criar evento sob fornecedor",
    );
    this.name = "ErroContaDoCasalInvalida";
  }
}

export type NovoEvento = {
  accountId: string;
  packId: string;
  comecaEm: Date;
  terminaEm: Date;
  expectedGuests?: number;
  identityTokens?: Record<string, unknown>;
  /** IANA. Ausente = `America/Sao_Paulo`. */
  fuso?: string;
  /** Chaves de vocabulário do pack (`missao.*`). Vazio = nenhuma missão semeada. */
  missoes?: readonly string[];
  /** Nome amigável no painel. Ausente = vocabulário do pack. */
  title?: string | null;
  /** Conferido contra `vendor_members` na transação — nunca aceito só porque o cliente mandou o id. */
  vendorId?: string;
  /** 🔴 Deve ser DIFERENTE de `accountId` — igual faria o fornecedor nascer owner por coincidência; `accountId` entra como `planner`. */
  coupleAccountId?: string;
};

/** 🔴 `SET LOCAL app.account_id` duas vezes: `conta_evento`/`conta_membro` exige GUC correto no INSERT; `event_slugs` e `events` nascem juntos — evento sem QR não existe. */
export async function criarEvento(
  pool: Pool,
  entrada: NovoEvento,
  rand: () => number = Math.random,
): Promise<{ eventoId: string; slug: string }> {
  const convidados =
    entrada.expectedGuests !== undefined ? Math.trunc(entrada.expectedGuests) : 150;
  if (!Number.isFinite(convidados) || convidados <= 0) {
    throw new Error("expected_guests inválido");
  }

  const fuso = entrada.fuso ?? FUSO_PADRAO;
  if (!fusoIanaValido(fuso)) {
    throw new Error("timezone inválido");
  }

  if (entrada.vendorId !== undefined && !UUID_RE.test(entrada.vendorId)) {
    throw new ErroSemAcessoAoFornecedor(entrada.vendorId);
  }

  if (
    entrada.vendorId !== undefined &&
    (entrada.coupleAccountId === undefined || !UUID_RE.test(entrada.coupleAccountId))
  ) {
    throw new ErroContaDoCasalInvalida();
  }

  // 🔴 Defesa em profundidade: mesmo com borda permissiva, casal ≠ fornecedor — e-mail igual faria fornecedor nascer owner, a fronteira que este arquivo fecha.
  if (entrada.vendorId !== undefined && entrada.coupleAccountId === entrada.accountId) {
    throw new ErroContaDoCasalInvalida();
  }

  const donoDoEvento = entrada.vendorId !== undefined ? entrada.coupleAccountId! : entrada.accountId;

  return comConta(pool, entrada.accountId, async (c) => {
    // Nunca confia no vendorId que o cliente mandou — confere pertencimento antes de qualquer INSERT.
    if (entrada.vendorId !== undefined) {
      const { rowCount } = await c.query(
        "SELECT 1 FROM vendor_members WHERE vendor_id = $1 AND account_id = $2",
        [entrada.vendorId, entrada.accountId],
      );
      if (!rowCount) throw new ErroSemAcessoAoFornecedor(entrada.vendorId);
    }

    // Canal do fornecedor: evento nasce do CASAL — reseta GUC antes de qualquer escrita que `conta_evento`/`conta_membro` (WITH CHECK) valida.
    if (donoDoEvento !== entrada.accountId) {
      await c.query("SELECT set_config('app.account_id', $1, true)", [donoDoEvento]);
    }

    const plano = entrada.vendorId !== undefined ? "vendor" : "free";

    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const slug = gerarSlug(rand);
      try {
        const { rows } = await c.query<{ id: string }>(
          `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, identity_tokens, expected_guests, timezone, title, vendor_id, plan)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          [
            donoDoEvento,
            entrada.packId,
            slug,
            entrada.comecaEm,
            entrada.terminaEm,
            JSON.stringify(entrada.identityTokens ?? {}),
            convidados,
            fuso,
            entrada.title?.trim() || null,
            entrada.vendorId ?? null,
            plano,
          ],
        );
        const eventoId = rows[0]!.id;

        // `criarEvento` roda em `comConta` — event_id GUC precisa existir antes de qualquer escrita RLS-por-evento nesta transação.
        await c.query("SELECT set_config('app.event_id', $1, true)", [eventoId]);

        await c.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [slug, eventoId]);
        await mintarRefDeCompartilhamento(c, eventoId, rand);

        await c.query(
          `INSERT INTO event_members (event_id, account_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (event_id, account_id) DO NOTHING`,
          [eventoId, donoDoEvento, "couple"],
        );

        if (entrada.vendorId !== undefined) {
          // `conta_membro` (WITH CHECK) exige account_id = app.account_id — reseta GUC pro membro do fornecedor antes do INSERT.
          await c.query("SELECT set_config('app.account_id', $1, true)", [entrada.accountId]);
          await c.query(
            `INSERT INTO event_members (event_id, account_id, role)
             VALUES ($1, $2, 'planner')
             ON CONFLICT (event_id, account_id) DO NOTHING`,
            [eventoId, entrada.accountId],
          );
        }

        await agendarRetencaoNaTransacao(c, eventoId, entrada.terminaEm);

        const missoes = entrada.missoes ?? [];
        if (missoes.length > 0) {
          await c.query("SELECT set_config('app.event_id', $1, true)", [eventoId]);
          for (const [i, chave] of missoes.entries()) {
            await c.query(
              "INSERT INTO challenges (event_id, title_key, position) VALUES ($1, $2, $3)",
              [eventoId, chave, i + 1],
            );
          }
        }

        return { eventoId, slug };
      } catch (e) {
        if (ehColisaoDeSlug(e)) continue;
        throw e;
      }
    }
    throw new Error("não foi possível gerar um slug livre");
  });
}

/** O slug antigo não é apagado — continua resolvendo (inativo) para quem escanear a placa impressa. */
export async function rotacionarSlug(
  pool: Pool,
  eventoId: string,
  novoSlug: string,
): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("UPDATE event_slugs SET active = false WHERE event_id = $1", [eventoId]);
    await cliente.query(
      "INSERT INTO event_slugs (slug, event_id, active) VALUES ($1, $2, true)",
      [novoSlug, eventoId],
    );
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    cliente.release();
  }
}
