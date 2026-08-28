import type { ViaDeEntrada } from "@albora/core";
import type { Pool, PoolClient } from "pg";
import { comEvento } from "./event";
import { assinaturaValida, emitirToken, hashDoToken } from "./token";

export type SessaoResolvida = {
  eventoId: string;
  sessaoId: string;
};

export type NovaSessao = {
  eventoId: string;
  nome: string;
  consentimentoVersao: string;
  duracaoHoras: number;
  via?: ViaDeEntrada;
};

export async function criarSessao(
  pool: Pool,
  segredo: string,
  entrada: NovaSessao,
): Promise<{ token: string; sessaoId: string }> {
  const nome = entrada.nome.trim();
  if (nome.length === 0 || nome.length > 40) {
    throw new ErroNomeInvalido(entrada.nome.length);
  }

  const { token, hash } = emitirToken(segredo);

  const sessaoId = await comEvento(pool, entrada.eventoId, async (c) => {
    const { rows } = await c.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at, via)
       VALUES ($1, $2, $3, now(), $4) RETURNING id`,
      [entrada.eventoId, nome, entrada.consentimentoVersao, entrada.via ?? "link"],
    );
    const id = rows[0]!.id;

    // Mesma transação: um token sem sessão, ou uma sessão sem token, seria um
    // convidado que consentiu e não consegue subir foto.
    await c.query(
      `INSERT INTO session_tokens (token_hash, event_id, session_id, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(hours => $4))`,
      [hash, entrada.eventoId, id, entrada.duracaoHoras],
    );

    return id;
  });

  return { token, sessaoId };
}

/** Única consulta fora da RLS. Assinatura primeiro — token forjado custa microssegundos, não uma consulta ao banco. */
export async function resolverSessao(
  pool: Pool,
  segredo: string,
  token: string,
): Promise<SessaoResolvida> {
  if (!assinaturaValida(segredo, token)) {
    throw new ErroSessaoInvalida("assinatura");
  }

  const { rows } = await pool.query<{
    event_id: string;
    session_id: string;
    expirado: boolean;
    revogado: boolean;
  }>(
    `SELECT event_id, session_id,
            (expires_at <= now())    AS expirado,
            (revoked_at IS NOT NULL) AS revogado
     FROM session_tokens WHERE token_hash = $1`,
    [hashDoToken(token)],
  );

  const linha = rows[0];
  if (!linha) throw new ErroSessaoInvalida("desconhecido");
  if (linha.revogado) throw new ErroSessaoInvalida("revogado");
  if (linha.expirado) throw new ErroSessaoInvalida("expirado");

  return { eventoId: linha.event_id, sessaoId: linha.session_id };
}

/** Revoga só as sessões deste evento — derruba uma festa sem tocar em outra na mesma noite. */
export async function revogarSessoesDoEvento(pool: Pool, eventoId: string): Promise<number> {
  const { rowCount } = await pool.query(
    "UPDATE session_tokens SET revoked_at = now() WHERE event_id = $1 AND revoked_at IS NULL",
    [eventoId],
  );
  return rowCount ?? 0;
}

/** Atalho para o caminho autenticado: resolve e já entra no escopo do evento. */
export async function comSessao<T>(
  pool: Pool,
  segredo: string,
  token: string,
  executar: (cliente: PoolClient, sessao: SessaoResolvida) => Promise<T>,
): Promise<T> {
  const sessao = await resolverSessao(pool, segredo, token);
  return comEvento(pool, sessao.eventoId, (c) => executar(c, sessao));
}

export type MotivoSessaoInvalida = "assinatura" | "desconhecido" | "expirado" | "revogado";

export class ErroSessaoInvalida extends Error {
  readonly code = "sessao.invalida";
  constructor(readonly motivo: MotivoSessaoInvalida) {
    // A mensagem é genérica de propósito: o motivo serve para log e métrica,
    // não para a resposta. "expirado" e "desconhecido" contam ao atacante se
    // ele acertou um token que já existiu.
    super("sessão inválida");
  }
}

export class ErroNomeInvalido extends Error {
  readonly code = "sessao.nome_invalido";
  constructor(readonly tamanho: number) {
    super("nome obrigatório, até 40 caracteres");
  }
}
