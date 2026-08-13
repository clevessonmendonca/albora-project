import type { Pool } from "pg";
import { emitirCrachaDaParede } from "./wall";
import { assinaturaValida, emitirToken, hashDoToken } from "./token";

/**
 * O pareamento do telão, do lado do banco (spec 010).
 *
 * A TV cria um pareamento, mostra o código e guarda o token de poll. Quem já
 * está no evento autoriza pelo código — e o `event_id` vem da **sessão de quem
 * autoriza**, nunca da TV. Depois a TV troca o token de poll pelo crachá de
 * leitura. Guarda-se o hash do token de poll, nunca o token, como em toda
 * credencial do produto.
 */

/** Sem I, O, 0, 1, L: some a ambiguidade de quem digita o código olhando a TV. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TAMANHO_CODIGO = 6;
const MAX_TENTATIVAS_DE_CODIGO = 5;

export type PareamentoCriado = {
  /** Curto e humano — mostrado na tela para alguém digitar. */
  code: string;
  /** Segredo de máquina — vai para o cookie da TV, nunca para a tela. */
  pollToken: string;
};

export type StatusDoPareamento =
  | { status: "pendente" }
  | { status: "pronto"; cracha: string; eventoId: string }
  | { status: "expirado" };

export type MotivoAutorizacaoInvalida = "desconhecido" | "expirado" | "ja_usado";

export class ErroAutorizacaoDePareamento extends Error {
  constructor(readonly motivo: MotivoAutorizacaoInvalida) {
    super(`autorização de pareamento inválida: ${motivo}`);
    this.name = "ErroAutorizacaoDePareamento";
  }
}

function gerarCodigo(rand: () => number): string {
  let s = "";
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    s += ALFABETO[Math.floor(rand() * ALFABETO.length)];
  }
  return s;
}

function ehColisaoDeChave(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

/**
 * Abre um pareamento. Devolve o código para a tela e o token de poll para o
 * cookie da TV. Repete se sortear um código já em uso — a chance é ínfima, mas
 * a colisão não pode virar erro na cara de quem só abriu o telão.
 */
export async function criarPareamento(
  pool: Pool,
  segredo: string,
  expiraEm: Date,
  rand: () => number = Math.random,
): Promise<PareamentoCriado> {
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS_DE_CODIGO; tentativa++) {
    const code = gerarCodigo(rand);
    const { token, hash } = emitirToken(segredo);
    try {
      await pool.query(
        "INSERT INTO wall_pairings (code, poll_token_hash, expires_at) VALUES ($1, $2, $3)",
        [code, hash, expiraEm],
      );
      return { code, pollToken: token };
    } catch (e) {
      if (ehColisaoDeChave(e)) continue;
      throw e;
    }
  }
  throw new Error("não foi possível gerar um código de pareamento livre");
}

/**
 * Autoriza um pareamento pelo código, prendendo-o ao evento de quem autoriza.
 *
 * 🔴 `eventoId` vem da sessão do autorizador — a TV não escolhe o evento que vai
 * mostrar. Único uso: só transita de `pendente`, e um código já usado ou
 * expirado é recusado com motivo próprio, sem revelar qual dos dois.
 */
export async function autorizarPareamento(
  pool: Pool,
  code: string,
  eventoId: string,
  consentimentoVersao: string,
  agora: Date,
): Promise<void> {
  const { rows } = await pool.query(
    `UPDATE wall_pairings
        SET event_id = $2, status = 'autorizado', consent_version = $3
      WHERE code = $1 AND status = 'pendente' AND expires_at > $4
      RETURNING id`,
    [code, eventoId, consentimentoVersao, agora],
  );

  if (rows.length > 0) return;

  const { rows: atual } = await pool.query<{ status: string }>(
    "SELECT status FROM wall_pairings WHERE code = $1",
    [code],
  );
  const linha = atual[0];
  if (!linha) throw new ErroAutorizacaoDePareamento("desconhecido");
  if (linha.status !== "pendente") throw new ErroAutorizacaoDePareamento("ja_usado");
  throw new ErroAutorizacaoDePareamento("expirado");
}

/**
 * O poll da TV. Enquanto pendente, diz pendente. Quando autorizado, **consome**
 * o pareamento e emite o crachá — atômico no `UPDATE ... RETURNING`, então dois
 * polls simultâneos não emitem dois crachás: só um casa com `status =
 * 'autorizado'`, o outro vê zero linhas.
 *
 * Token de poll desconhecido, expirado ou já consumido devolve `expirado` — a
 * TV que perdeu a janela repareia, e nada aqui distingue os casos para quem
 * está só tentando adivinhar.
 */
export async function finalizarPareamento(
  pool: Pool,
  segredo: string,
  pollToken: string,
  expiraCrachaEm: Date,
  agora: Date,
): Promise<StatusDoPareamento> {
  if (!assinaturaValida(segredo, pollToken)) return { status: "expirado" };

  const hash = hashDoToken(pollToken);

  const { rows } = await pool.query<{ event_id: string }>(
    `UPDATE wall_pairings
        SET status = 'consumido'
      WHERE poll_token_hash = $1 AND status = 'autorizado' AND expires_at > $2
      RETURNING event_id`,
    [hash, agora],
  );

  const consumida = rows[0];
  if (consumida) {
    const cracha = await emitirCrachaDaParede(pool, segredo, consumida.event_id, expiraCrachaEm);
    return { status: "pronto", cracha, eventoId: consumida.event_id };
  }

  const { rows: atual } = await pool.query<{ status: string; expirado: boolean }>(
    "SELECT status, (expires_at <= $2) AS expirado FROM wall_pairings WHERE poll_token_hash = $1",
    [hash, agora],
  );
  const linha = atual[0];
  if (linha && linha.status === "pendente" && !linha.expirado) return { status: "pendente" };
  return { status: "expirado" };
}
