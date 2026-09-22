import { nomeNeutroDoTelao, validarNomeDeExibicao } from "@albora/core";
import type { Pool, PoolClient } from "pg";
import { comConta, comEvento } from "./event";
import { ErroNomeInvalido } from "./sessions";

export type SessaoDoHost = {
  id: string;
  nome: string;
  fotos: number;
};

/**
 * Uma pessoa do evento na visão do anfitrião. Sem telefone e sem e-mail de
 * propósito: a identidade do convidado é a foto e o primeiro nome
 * (`docs/redesign/painel.md` §Pessoas). O contato existe em `guest_contacts`
 * e nenhuma tela do painel o toca.
 */
export type PessoaDoEvento = {
  id: string;
  nome: string;
  fotos: number;
  entrouEm: Date;
  primeiraFotoEm: Date | null;
  ultimaFotoEm: Date | null;
};

export type AcaoNomeDaSessao =
  | { acao: "ocultar" }
  | { acao: "renomear"; nome: string };

type Linha = {
  id: string;
  display_name: string;
  fotos: number;
};

function paraSessao(l: Linha): SessaoDoHost {
  return { id: l.id, nome: l.display_name, fotos: l.fotos };
}

export async function listarSessoesDoHost(
  cliente: PoolClient,
  eventoId: string,
): Promise<SessaoDoHost[]> {
  const { rows } = await cliente.query<Linha>(
    `SELECT s.id, s.display_name,
            count(u.id)::int AS fotos
       FROM guest_sessions s
       JOIN uploads u
         ON u.session_id = s.id
        AND u.event_id = s.event_id
        AND u.state = 'published'
      WHERE s.event_id = $1
      GROUP BY s.id, s.display_name
      ORDER BY max(u.created_at) DESC, s.id DESC
      LIMIT 200`,
    [eventoId],
  );
  return rows.map(paraSessao);
}

/**
 * Todo mundo que entrou, inclusive quem não fotografou — `listarSessoesDoHost`
 * usa JOIN e some com essas pessoas, que são justamente quem o anfitrião
 * precisa enxergar para agir.
 */
export async function listarPessoasDoEvento(
  cliente: PoolClient,
  eventoId: string,
): Promise<PessoaDoEvento[]> {
  const { rows } = await cliente.query<{
    id: string;
    display_name: string;
    fotos: number;
    created_at: Date;
    primeira: Date | null;
    ultima: Date | null;
  }>(
    `SELECT s.id, s.display_name, s.created_at,
            count(u.id)::int AS fotos,
            min(u.created_at) AS primeira,
            max(u.created_at) AS ultima
       FROM guest_sessions s
       LEFT JOIN uploads u
         ON u.session_id = s.id
        AND u.event_id = s.event_id
        AND u.state = 'published'
      WHERE s.event_id = $1
      GROUP BY s.id, s.display_name, s.created_at
      ORDER BY count(u.id) DESC, s.created_at ASC, s.id ASC
      LIMIT 500`,
    [eventoId],
  );

  return rows.map((l) => ({
    id: l.id,
    nome: l.display_name,
    fotos: l.fotos,
    entrouEm: l.created_at,
    primeiraFotoEm: l.primeira,
    ultimaFotoEm: l.ultima,
  }));
}

export async function definirNomeDaSessaoDoHost(
  pool: Pool,
  accountId: string,
  eventoId: string,
  sessaoId: string,
  acao: AcaoNomeDaSessao,
): Promise<SessaoDoHost | null> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return null;

  return comEvento(pool, eventoId, async (c) => {
    const { rows: atuais } = await c.query<{ display_name: string }>(
      `SELECT display_name FROM guest_sessions WHERE id = $1 AND event_id = $2`,
      [sessaoId, eventoId],
    );
    const atual = atuais[0];
    if (!atual) return null;

    const nome =
      acao.acao === "ocultar"
        ? nomeNeutroDoTelao(atual.display_name)
        : validarNomeDeExibicao(acao.nome);
    if (!nome) throw new ErroNomeInvalido(acao.acao === "renomear" ? acao.nome.length : 0);

    const { rows } = await c.query<Linha>(
      `UPDATE guest_sessions
          SET display_name = $3
        WHERE id = $1 AND event_id = $2
      RETURNING id, display_name,
                (SELECT count(*)::int FROM uploads u
                  WHERE u.session_id = guest_sessions.id
                    AND u.event_id = $2
                    AND u.state = 'published') AS fotos`,
      [sessaoId, eventoId, nome],
    );
    return rows[0] ? paraSessao(rows[0]) : null;
  });
}
