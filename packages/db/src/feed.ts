import type { PoolClient } from "pg";
import { filtroSemBloqueio } from "./block-db";
import { dimensoesDaColuna } from "./dimensoes";
import { thumbKeyFromFull } from "./storage-key";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `Date` tem milissegundo, a coluna tem microssegundo — diferença é item repetido ou pulado entre páginas. */
const INSTANTE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2}){0,2}$/;

/** 🔴 Única fonte de verdade — pânico tira do telão pela mesma coluna, na mesma consulta. */
const PUBLICADO = "published";

export const TAMANHO_PAGINA = 24;

export type ModoFeed = "espelho" | "completo";

export type ItemFeed = {
  id: string;
  /** Miniatura primeiro: é ela que faz a primeira tela em 3G lento. */
  chaveThumb: string;
  chaveFull: string;
  mime: string;
  missaoId: string | null;
  legenda: string | null;
  lugar: string | null;
  autor: string;
  criadaEm: Date;
  /** Sempre presente — reagir não espera o gate (ADR 0009). */
  reacoes?: number;
  /** Tipo da reação desta sessão. Sempre presente, mesmo antes do gate. */
  minhaReacao?: string | null;
  /** Id opaco do autor. Só depois do gate — para bloqueio simétrico. */
  sessaoAutor?: string;
  /** Foto enviada pela sessão que está lendo. Só depois do gate. */
  minha?: boolean;
  /** Ausente na fila antiga — cai no 4:5; nunca inventar 1080×1920, que faria vídeo deitado parecer em pé. */
  largura?: number;
  altura?: number;
};

export type PaginaFeed = {
  itens: ItemFeed[];
  proximoCursor: string | null;
};

/** `sessaoId` sempre obrigatório — sem ela o servidor não detecta reação prévia nem aplica `filtroSemBloqueio`. */
export type EntradaFeed = {
  eventoId: string;
  modo: ModoFeed;
  missaoId: string | null;
  cursor: string | null;
  limite?: number;
  sessaoId: string;
  /** Só tem efeito em `modo: "completo"` — antes do gate não há `sessaoAutor` legítimo para filtrar. */
  autorId?: string;
};

type LinhaFeed = {
  id: string;
  storage_key: string;
  mime: string;
  challenge_id: string | null;
  caption: string | null;
  place: string | null;
  display_name: string;
  session_id: string;
  created_at: Date;
  created_at_txt: string;
  width: number | null;
  height: number | null;
  reacoes?: number;
  minha_reacao?: string | null;
};

/** `null` quando invisível sob RLS — sessão de outro evento recebe "vazio", não confirmação de existência. */
export async function gateDoEvento(
  cliente: PoolClient,
  eventoId: string,
): Promise<{ interacaoAbreEm: Date | null } | null> {
  if (!UUID.test(eventoId)) return null;

  const { rows } = await cliente.query<{ interaction_opens_at: Date | null }>(
    "SELECT interaction_opens_at FROM events WHERE id = $1",
    [eventoId],
  );

  const linha = rows[0];
  if (!linha) return null;

  return { interacaoAbreEm: linha.interaction_opens_at };
}

/** Cursor `(created_at, id)`, nunca OFFSET — foto nova não empurra janela. Par porque `created_at` sozinho não é único. */
export async function listarFeed(cliente: PoolClient, entrada: EntradaFeed): Promise<PaginaFeed> {
  const limite = Math.min(Math.max(entrada.limite ?? TAMANHO_PAGINA, 1), TAMANHO_PAGINA);

  const parametros: unknown[] = [entrada.eventoId, PUBLICADO];
  const filtros: string[] = ["u.event_id = $1", "u.state = $2"];

  if (entrada.missaoId !== null) {
    if (!UUID.test(entrada.missaoId)) return { itens: [], proximoCursor: null };
    parametros.push(entrada.missaoId);
    filtros.push(`u.challenge_id = $${parametros.length}`);
  }

  if (entrada.modo === "completo" && entrada.autorId !== undefined) {
    if (!UUID.test(entrada.autorId)) return { itens: [], proximoCursor: null };
    parametros.push(entrada.autorId);
    filtros.push(`u.session_id = $${parametros.length}`);
  }

  if (entrada.cursor !== null) {
    const posicao = decodificarCursor(entrada.cursor);
    parametros.push(posicao.instante, posicao.id);
    filtros.push(
      `(u.created_at, u.id) < ($${parametros.length - 1}::timestamptz, $${parametros.length}::uuid)`,
    );
  }

  // Reagir não espera o gate (ADR 0009, atualizado): a contagem e a própria
  // reação da sessão são calculadas em qualquer modo.
  const contagem = ", (SELECT count(*) FROM reactions r WHERE r.upload_id = u.id)::int AS reacoes";

  parametros.push(entrada.sessaoId);
  const sessaoIdxParam = parametros.length;
  const minha = `, (SELECT r.kind FROM reactions r WHERE r.upload_id = u.id AND r.session_id = $${sessaoIdxParam}) AS minha_reacao`;

  // O bloqueio simétrico só se aplica quando a identidade do autor já é visível (modo completo) — antes disso não há perfil nem foto "de fulano" para esconder, é espelho puro do telão.
  if (entrada.modo === "completo") {
    filtros.push(filtroSemBloqueio("u.session_id", sessaoIdxParam));
  }

  parametros.push(limite + 1);

  const { rows } = await cliente.query<LinhaFeed>(
    `SELECT u.id, u.storage_key, u.mime, u.challenge_id, u.caption, u.place,
            u.created_at, u.created_at::text AS created_at_txt,
            u.width, u.height,
            s.display_name, u.session_id${contagem}${minha}
       FROM uploads u
       JOIN guest_sessions s ON s.id = u.session_id AND s.event_id = u.event_id
      WHERE ${filtros.join(" AND ")}
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $${parametros.length}`,
    parametros,
  );

  const temMais = rows.length > limite;
  const pagina = temMais ? rows.slice(0, limite) : rows;
  const ultima = pagina[pagina.length - 1];

  return {
    itens: pagina.map((l) => paraItem(l, entrada.modo, entrada.sessaoId)),
    proximoCursor: temMais && ultima ? codificarCursor(ultima.created_at_txt, ultima.id) : null,
  };
}

function paraItem(linha: LinhaFeed, modo: ModoFeed, sessaoLeitora: string): ItemFeed {
  const tamanho = dimensoesDaColuna(linha.width, linha.height);
  const item: ItemFeed = {
    id: linha.id,
    chaveThumb: thumbKeyFromFull(linha.storage_key),
    chaveFull: linha.storage_key,
    mime: linha.mime,
    missaoId: linha.challenge_id,
    legenda: linha.caption,
    lugar: linha.place,
    autor: linha.display_name,
    criadaEm: linha.created_at,
    reacoes: linha.reacoes ?? 0,
    minhaReacao: linha.minha_reacao ?? null,
    ...(tamanho ? { largura: tamanho.largura, altura: tamanho.altura } : {}),
  };

  if (modo === "completo") {
    item.sessaoAutor = linha.session_id;
    item.minha = linha.session_id === sessaoLeitora;
  }

  return item;
}

/** Sem `event_id` — cursor de outra festa não vira caminho até ela; RLS pararia de qualquer forma. */
export function codificarCursor(instante: string, id: string): string {
  return Buffer.from(`${instante}|${id}`, "utf8").toString("base64url");
}

export function decodificarCursor(bruto: string): { instante: string; id: string } {
  let texto: string;
  try {
    texto = Buffer.from(bruto, "base64url").toString("utf8");
  } catch {
    throw new ErroCursorInvalido();
  }

  const separador = texto.lastIndexOf("|");
  if (separador < 0) throw new ErroCursorInvalido();

  const instante = texto.slice(0, separador);
  const id = texto.slice(separador + 1);

  // Postgres estoura ao comparar com texto que não é timestamp nem uuid, e um cursor chega do cliente — a recusa aqui é um 422; lá seria 500 com a consulta na mensagem.
  if (!INSTANTE.test(instante) || !UUID.test(id)) throw new ErroCursorInvalido();

  return { instante, id };
}

export class ErroCursorInvalido extends Error {
  readonly code = "feed.cursor_invalido";
  constructor() {
    super("cursor inválido");
  }
}
