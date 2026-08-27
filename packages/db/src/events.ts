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
  /**
   * Tokens de marca do fornecedor B2B2C que criou este evento, ou `null`
   * quando o evento não tem `vendor_id`. Alimenta a camada `vendor` do
   * resolvedor (marca → vendor → pack → evento) nas superfícies do convidado.
   *
   * Lido dentro do mesmo `comEvento` que traz o evento, via a policy
   * `vendor_marca_do_evento` (migration 0047): o isolamento é garantido pelo
   * `app.event_id` da transação — o convidado do evento A nunca lê os tokens
   * do vendor do evento B.
   */
  vendorBrandTokens: Record<string, unknown> | null;
  /** Chave de storage da imagem de capa enviada pelo casal. Null = usa album. */
  coverImageKey: string | null;
};

export type Resolucao =
  | { estado: "aberto" | "nao_comecou"; evento: EventoPublico }
  | { estado: "encerrado" | "slug_rotacionado"; evento: EventoPublico }
  | { estado: "desconhecido" };

/**
 * Janela em que a fila ainda pode drenar depois de a festa acabar.
 *
 * Não é generosidade: é o convidado que fotografou às 2h, guardou o celular
 * sem sinal e só abriu o app no domingo à tarde. Fechar no fim do evento
 * jogaria fora exatamente as fotos do fim da festa.
 */
export const HORAS_APOS_EVENTO = 48;

/**
 * Monta `EventoPublico` a partir do cliente já sob `comEvento` — incluindo
 * `vendorBrandTokens` via policy `vendor_marca_do_evento` (migration 0047).
 * Usado pelo QR (`resolverSlug`) e pelo tema do app (`GET /api/guest/event`).
 */
export async function carregarEventoPublico(
  cliente: PoolClient,
  eventoId: string,
): Promise<EventoPublico | null> {
  const { rows: e } = await cliente.query(
    `SELECT id, pack_id, starts_at, ends_at, interaction_opens_at, identity_tokens,
            recommended_filter, timezone, vendor_id, cover_image_key
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

/**
 * Resolve o slug do QR. É a primeira coisa que roda quando alguém escaneia a
 * placa da mesa, e a única consulta além do token que precisa acontecer antes
 * de existir contexto de evento.
 */
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

  if (!encontrado.active) return { estado: "slug_rotacionado", evento };

  const limite = new Date(evento.terminaEm.getTime() + HORAS_APOS_EVENTO * 3600_000);
  if (agora >= limite) return { estado: "encerrado", evento };

  // Antes de começar o evento existe e é legítimo — só não é hora. A tela
  // diz quando é, em vez de dizer que não existe.
  if (agora < evento.comecaEm) return { estado: "nao_comecou", evento };

  return { estado: "aberto", evento };
}

/**
 * O pack do evento, de dentro de uma transação já escopada.
 *
 * Existe para o servidor validar contra conjunto fechado o que o cliente
 * manda — lugar, missão, filtro. Whitelist vinda do banco, não do corpo da
 * requisição.
 */
export async function packDoEvento(cliente: PoolClient, eventoId: string): Promise<string | null> {
  const { rows } = await cliente.query<{ pack_id: string }>(
    "SELECT pack_id FROM events WHERE id = $1",
    [eventoId],
  );

  return rows[0]?.pack_id ?? null;
}

/**
 * IANA persistido do evento, de dentro de uma transação já escopada.
 * Ausente ou inválido cai no default — o álbum e o confirm nunca ficam sem âncora.
 */
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
  /**
   * Evento nasce vinculado a este fornecedor: grava `events.vendor_id` e
   * `plan = 'vendor'`. Conferido contra `vendor_members` dentro da mesma
   * transação — sob a conta de `accountId` (o membro do fornecedor
   * autenticado), nunca aceito só porque o cliente mandou o id.
   */
  vendorId?: string;
  /**
   * Obrigatório quando `vendorId` está presente: a conta do CASAL, resolvida
   * (ou criada) via `emitirMagicLink` por quem chama — nunca a do membro do
   * fornecedor. Vira `events.account_id` (dona da fatura, `canManageCoupleOnly`)
   * e entra em `event_members` como `couple`. `accountId` (quem está
   * autenticado) entra separadamente como `planner`. Ausente quando `vendorId`
   * também está ausente — o caminho de hoje, `accountId` é dono.
   *
   * 🔴 Precisa ser DIFERENTE de `accountId`: se o membro do fornecedor usar o
   * próprio e-mail como e-mail do casal, `emitirMagicLink` resolve pra conta
   * dele mesmo, e sem este guard o GUC nunca trocaria — ele nasceria owner
   * por coincidência de e-mail. `criarEvento` recusa antes de qualquer INSERT.
   */
  coupleAccountId?: string;
};

/**
 * Cria o evento de uma conta (spec 009).
 *
 * 🔴 Roda em `comConta`: a política `conta_evento` de `events` e o `WITH CHECK`
 * garantem que a linha nasce presa ao `account_id` setado em `app.account_id`
 * — uma conta não cria evento para outra. O `event_slugs` (fora da RLS) e o
 * `events` nascem na mesma transação: um evento sem porta de QR não existiria
 * para o convidado.
 *
 * O slug é sorteado e reaposta na colisão — improvável, mas não pode virar erro
 * na cara do casal que só quis criar a festa. O `pack_id` é conferido pela FK:
 * pack fora do conjunto estoura antes de qualquer linha.
 *
 * `vendorId` (canal do fornecedor, spec-canal-fornecedor §2) é opcional: quando
 * presente, o pertencimento a `vendor_members` é conferido dentro desta mesma
 * transação, sob a conta de `accountId` — o cliente nunca decide por conta
 * própria em que fornecedor o evento nasce. O evento ganha `plan = 'vendor'`,
 * mas o **dono** (`events.account_id`, e o papel `couple` em `event_members`)
 * é `coupleAccountId`, nunca o membro do fornecedor: `canManageCoupleOnly`
 * (ZIP, "há menores", assinar completo) é do casal, nunca do fornecedor
 * (CLAUDE.md/spec §2). O membro do fornecedor entra em `event_members` como
 * `planner` — mesmo papel operacional de um cerimonialista convidado.
 *
 * 🔴 Isso exige `SET LOCAL app.account_id` **duas vezes** dentro da mesma
 * transação: a política `conta_evento`/`conta_membro` (`WITH CHECK`) exige
 * que `account_id` da linha case com `app.account_id` no momento do INSERT —
 * não existe um único GUC que sirva para checar `vendor_members` sob a conta
 * do fornecedor E gravar `events`/o `couple` de `event_members` sob a conta do
 * casal. `SET LOCAL` é escopado à transação, não à conexão: reafirmá-lo várias
 * vezes antes de cada escrita mantém tudo atômico num único `BEGIN…COMMIT`,
 * sem tocar `roleForAccountOnEvent` nem a política.
 */
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

  // 🔴 Defesa em profundidade: mesmo que a borda (admin-events.ts) deixe
  // passar, o casal não pode ser a MESMA conta do membro do fornecedor. Sem
  // este guard, `donoDoEvento === entrada.accountId` e o `if` abaixo nunca
  // troca o GUC — o fornecedor nasceria owner por coincidência de e-mail, a
  // exata fronteira que este arquivo existe para fechar.
  if (entrada.vendorId !== undefined && entrada.coupleAccountId === entrada.accountId) {
    throw new ErroContaDoCasalInvalida();
  }

  const donoDoEvento = entrada.vendorId !== undefined ? entrada.coupleAccountId! : entrada.accountId;

  return comConta(pool, entrada.accountId, async (c) => {
    // Portão antes de qualquer INSERT: confere pertencimento em
    // `vendor_members` sob a conta de quem está autenticado (`app.account_id`
    // ainda é `entrada.accountId` aqui) — nunca confia no `vendorId` que o
    // cliente mandou. RLS de `vendor_members` (`conta_vendor_member`) já
    // restringe a linha por `account_id`; o `AND account_id = $2` explícito é
    // defesa em profundidade, mesma forma de `roleForAccountOnVendor`.
    if (entrada.vendorId !== undefined) {
      const { rowCount } = await c.query(
        "SELECT 1 FROM vendor_members WHERE vendor_id = $1 AND account_id = $2",
        [entrada.vendorId, entrada.accountId],
      );
      if (!rowCount) throw new ErroSemAcessoAoFornecedor(entrada.vendorId);
    }

    // Canal do fornecedor: o evento nasce do CASAL, não de quem clicou
    // "criar". `conta_evento`/`conta_membro` exigem `account_id = app.account_id`
    // no `WITH CHECK` — reseta o GUC para o dono antes de qualquer escrita
    // que carregue essa coluna.
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

        // `event_share_refs` está sob a mesma política de isolamento comum
        // (event_id via NULLIF), mas `criarEvento` roda em `comConta`
        // (app.account_id) — o GUC de evento precisa existir antes desta e de
        // qualquer outra escrita RLS-por-evento nesta transação.
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
          // `app.account_id` volta pro membro do fornecedor — a mesma linha de
          // `conta_membro` que valeu pro `couple` acima exige account_id =
          // app.account_id também aqui, e agora a linha é a do fornecedor.
          await c.query("SELECT set_config('app.account_id', $1, true)", [entrada.accountId]);
          await c.query(
            `INSERT INTO event_members (event_id, account_id, role)
             VALUES ($1, $2, 'planner')
             ON CONFLICT (event_id, account_id) DO NOTHING`,
            [eventoId, entrada.accountId],
          );
        }

        // scheduleRetentionJobs (spec drive-export §10, risco #4): esta era a
        // única chamada real do produto e, até aqui, reimplementava a mesma
        // lista de retention_jobs à mão em vez de usar `planRetention`
        // (@albora/core) — as duas listas podiam divergir silenciosamente.
        // `agendarRetencaoNaTransacao` roda dentro desta mesma transação
        // (retention_jobs não tem RLS de evento, então não precisa de um
        // `comEvento` próprio aqui).
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

/**
 * Rotaciona o slug. O antigo **não** é apagado: ele continua resolvendo, como
 * inativo, para quem escanear a placa que já foi impressa.
 */
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
