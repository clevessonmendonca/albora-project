import type { Pool } from "pg";
import { hasCapability, type Actor } from "@albora/core";
import type { DsarRequestRow, RetentionJobAdminRow, SecurityEventRow, SupportTicketAdmin } from "@albora/db";
import { listDsarRequests } from "../lgpd/list-dsar-requests";
import { listRetentionJobs } from "../retention/list-retention-jobs";
import { listSecurity } from "../security/list-security-events";
import { listTicketQueue } from "../support/list-ticket-queue";

export type ConsoleAttentionSeverity = "critico" | "atencao";

export type ConsoleAttentionFonte = "suporte" | "lgpd" | "retencao" | "seguranca";

export type ConsoleAttentionItem = {
  id: string;
  severidade: ConsoleAttentionSeverity;
  titulo: string;
  detalhe: string;
  modulo: string;
  href: string;
};

/** Teto de linhas lidas por fonte — a fila é "o que precisa de você", não relatório. */
export const LIMITE_POR_FONTE = 200;

const HORA_MS = 3_600_000;

export function atrasoLegivel(ms: number): string {
  const horas = Math.floor(ms / HORA_MS);
  const minutos = Math.floor((ms % HORA_MS) / 60_000);
  if (horas <= 0) return `${minutos}min`;
  return `${horas}h${String(minutos).padStart(2, "0")}`;
}

export function pendenciaDeSuporte(rows: readonly SupportTicketAdmin[], agora: Date): ConsoleAttentionItem | null {
  const estourados = rows.filter((t) => t.slaDueAt !== null && t.slaDueAt.getTime() < agora.getTime());
  if (estourados.length === 0) return null;
  const maisAntigo = estourados.reduce((pior, t) =>
    (t.slaDueAt as Date).getTime() < (pior.slaDueAt as Date).getTime() ? t : pior,
  );
  return {
    id: "suporte-sla",
    severidade: "critico",
    titulo: `${estourados.length} ticket(s) estouraram o SLA`,
    detalhe: `o mais antigo venceu há ${atrasoLegivel(agora.getTime() - (maisAntigo.slaDueAt as Date).getTime())}`,
    modulo: "Suporte",
    href: "/console/support",
  };
}

export function pendenciaDeLgpd(rows: readonly DsarRequestRow[], agora: Date): ConsoleAttentionItem | null {
  const vencidos = rows.filter((r) => r.completedAt === null && r.legalDueAt.getTime() < agora.getTime());
  if (vencidos.length === 0) return null;
  const maisAntigo = vencidos.reduce((pior, r) => (r.legalDueAt < pior.legalDueAt ? r : pior));
  return {
    id: "lgpd-vencido",
    severidade: "critico",
    titulo: `${vencidos.length} pedido(s) LGPD vencido(s) — prazo legal`,
    detalhe: `o mais antigo venceu há ${atrasoLegivel(agora.getTime() - maisAntigo.legalDueAt.getTime())}`,
    modulo: "LGPD",
    href: "/console/lgpd",
  };
}

/**
 * `d365_delete` falhado é promessa de retenção quebrada com data no
 * contrato; os outros kinds atrasam entrega, não obrigação. A severidade sai
 * daí, não de um número arbitrário de tentativas.
 */
export function pendenciaDeRetencao(rows: readonly RetentionJobAdminRow[]): ConsoleAttentionItem | null {
  const falhados = rows.filter((j) => j.status === "failed");
  if (falhados.length === 0) return null;
  const exclusoes = falhados.filter((j) => j.kind === "d365_delete").length;
  return {
    id: "retencao-falhada",
    severidade: exclusoes > 0 ? "critico" : "atencao",
    titulo: `${falhados.length} job(s) de retenção falhado(s)`,
    detalhe:
      exclusoes > 0
        ? `${exclusoes} exclusão(ões) do dia 365 entre eles — prazo de retenção`
        : "nenhuma exclusão do dia 365 entre eles",
    modulo: "Retenção",
    href: "/console/retention",
  };
}

/**
 * Só `session.reuse`, e qualquer ocorrência é crítica: é o único kind cujo
 * significado o próprio código já decidiu — ao detectar, revoga a cadeia
 * inteira de sessões. Os demais kinds precisariam de linha de base para
 * virar "pico", e linha de base é métrica que não existe; inventar "+340%"
 * seria exatamente o dado falso que a tela promete não mostrar.
 */
export function pendenciaDeSeguranca(rows: readonly SecurityEventRow[]): ConsoleAttentionItem | null {
  const reusos = rows.filter((e) => e.kind === "session.reuse").length;
  if (reusos === 0) return null;
  return {
    id: "seguranca-reuso",
    severidade: "critico",
    titulo: `${reusos} reuso(s) de sessão de staff nas últimas 24h`,
    detalhe: "cadeia de sessões revogada automaticamente · investigar origem",
    modulo: "Segurança",
    href: "/console/security",
  };
}

export function pendenciaDeInadimplencia(overdueCount: number): ConsoleAttentionItem | null {
  if (overdueCount <= 0) return null;
  return {
    id: "assinatura-inadimplente",
    severidade: "atencao",
    titulo: `${overdueCount} assinatura(s) de fornecedor em atraso`,
    detalhe: "cobrança não confirmada pelo provedor",
    modulo: "Assinaturas",
    href: "/console/subscriptions",
  };
}

const ORDEM: Readonly<Record<ConsoleAttentionSeverity, number>> = { critico: 0, atencao: 1 };

export function ordenarPendencias(itens: readonly ConsoleAttentionItem[]): ConsoleAttentionItem[] {
  return [...itens].sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade]);
}

type Leitura<T> = { estado: "ausente" } | { estado: "ok"; valor: T } | { estado: "falhou" };

/**
 * A fila degrada por fonte, nunca cai inteira. `Promise.all` puro fazia um
 * timeout em `security_events` — tabela de alto volume e escrita assíncrona —
 * derrubar a Visão geral inteira, levando junto tickets e prazos de LGPD que
 * tinham respondido bem. Caminho crítico não tolera terceiro, e aqui cada
 * fonte é um terceiro em relação às outras.
 */
async function lerOuFalhar<T>(promessa: Promise<T> | null): Promise<Leitura<T>> {
  if (promessa === null) return { estado: "ausente" };
  try {
    return { estado: "ok", valor: await promessa };
  } catch {
    return { estado: "falhou" };
  }
}

const FONTE_INDISPONIVEL: Readonly<Record<ConsoleAttentionFonte, { modulo: string; href: string }>> = {
  suporte: { modulo: "Suporte", href: "/console/support" },
  lgpd: { modulo: "LGPD", href: "/console/lgpd" },
  retencao: { modulo: "Retenção", href: "/console/retention" },
  seguranca: { modulo: "Segurança", href: "/console/security" },
};

/**
 * Fonte que não respondeu vira linha, não silêncio. Sumir com ela faria a
 * fila afirmar "tudo em dia" sem ter olhado — o pior estado possível numa
 * tela cujo trabalho é dizer o que falta.
 */
export function pendenciaDeFonteIndisponivel(fonte: ConsoleAttentionFonte): ConsoleAttentionItem {
  const { modulo, href } = FONTE_INDISPONIVEL[fonte];
  return {
    id: `fonte-indisponivel-${fonte}`,
    severidade: "atencao",
    titulo: `Não foi possível ler ${modulo.toLowerCase()}`,
    detalhe: "a fila está incompleta — abra a tela para conferir direto",
    modulo,
    href,
  };
}

export type ConsoleAttentionInput = {
  actor: Actor;
  reason: string;
  overdueSubscriptions: number;
  now?: Date;
};

/**
 * A fila "Precisa de você agora": só o que cruzou prazo, risco ou impacto.
 *
 * Cada fonte só é consultada se o ator tem a capacidade dela — quem não pode
 * ver LGPD não dispara a query de LGPD, e não vê a linha. Ausência, nunca
 * item desabilitado (CLAUDE.md §autorização por capability).
 *
 * Não existe query de contagem para nenhuma destas fontes; a derivação é
 * sobre as linhas que as telas dedicadas já listam. Por isso o teto de
 * `LIMITE_POR_FONTE`: uma fila maior que isso já respondeu a pergunta.
 */
export async function getConsoleAttention(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ConsoleAttentionInput,
): Promise<ConsoleAttentionItem[]> {
  const { actor, reason } = input;
  const agora = input.now ?? new Date();
  const desde24h = new Date(agora.getTime() - 24 * HORA_MS);

  const [tickets, dsars, jobs, seguranca] = await Promise.all([
    lerOuFalhar(
      hasCapability(actor.roles, "tickets.read")
        ? listTicketQueue(deps, { actor, reason, statuses: ["open", "pending"], limit: LIMITE_POR_FONTE })
        : null,
    ),
    lerOuFalhar(
      hasCapability(actor.roles, "lgpd.dsar.read") ? listDsarRequests(deps, { actor, limit: LIMITE_POR_FONTE }) : null,
    ),
    lerOuFalhar(
      hasCapability(actor.roles, "retention.read")
        ? listRetentionJobs(deps, { actor, reason, status: "failed", limit: LIMITE_POR_FONTE })
        : null,
    ),
    // `kind` filtrado no banco, não no resultado: sem isso o teto de linhas
    // devolvia as mais recentes de qualquer tipo, e um reuso de sessão cedo na
    // janela ficava fora da página justamente quando há enxurrada de
    // `login.failed` — que é o cenário em que ele acontece.
    lerOuFalhar(
      hasCapability(actor.roles, "security.read")
        ? listSecurity(deps, { actor, kind: "session.reuse", since: desde24h, limit: LIMITE_POR_FONTE })
        : null,
    ),
  ]);

  const itens = [
    tickets.estado === "ok" ? pendenciaDeSuporte(tickets.valor.rows, agora) : null,
    tickets.estado === "falhou" ? pendenciaDeFonteIndisponivel("suporte") : null,
    dsars.estado === "ok" ? pendenciaDeLgpd(dsars.valor.rows, agora) : null,
    dsars.estado === "falhou" ? pendenciaDeFonteIndisponivel("lgpd") : null,
    jobs.estado === "ok" ? pendenciaDeRetencao(jobs.valor.rows) : null,
    jobs.estado === "falhou" ? pendenciaDeFonteIndisponivel("retencao") : null,
    seguranca.estado === "ok" ? pendenciaDeSeguranca(seguranca.valor.rows) : null,
    seguranca.estado === "falhou" ? pendenciaDeFonteIndisponivel("seguranca") : null,
    hasCapability(actor.roles, "subscription.read")
      ? pendenciaDeInadimplencia(input.overdueSubscriptions)
      : null,
  ].filter((item): item is ConsoleAttentionItem => item !== null);

  return ordenarPendencias(itens);
}
