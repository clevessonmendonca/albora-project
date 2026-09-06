import React from "react";
import { redirect } from "next/navigation";
import {
  groupSecurityEvents,
  listSecurity,
  type SecurityEventKind,
  type SecurityEventRow,
} from "@albora/application";
import { ConsoleEmptyState, PageHeader, StatusBadge } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

const KINDS: SecurityEventKind[] = [
  "login.failed",
  "magic_link.abuse",
  "capability.denied",
  "rate_limit.exceeded",
  "session.reuse",
  "reauth.failed",
];

const ROTULO_KIND: Record<SecurityEventKind, string> = {
  "login.failed": "Login falho",
  "magic_link.abuse": "Abuso de magic link",
  "capability.denied": "Capacidade negada",
  "rate_limit.exceeded": "Rate limit excedido",
  "session.reuse": "Reuso de sessão",
  "reauth.failed": "Reautenticação falha",
};

/** Mesma disciplina de `calcularDesde` da Auditoria (T9): período é sempre relativo a agora, nunca uma data literal na querystring. */
function calcularDesde(period: string | undefined): Date | undefined {
  if (period === "24h") return new Date(Date.now() - UM_DIA_MS);
  if (period === "7d") return new Date(Date.now() - 7 * UM_DIA_MS);
  if (period === "30d") return new Date(Date.now() - 30 * UM_DIA_MS);
  return undefined;
}

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const MAX_METADATA_CHARS = 300;

/**
 * Mesma disciplina de `formatarMetadata` (T9, `audit-table.tsx`): mascara
 * e-mail e trunca antes de qualquer coisa chegar à tela. Não mascara dígito
 * solto — `metadata` costuma carregar contador e id, e um regex de telefone
 * apagaria o próprio dado que a tela existe para mostrar.
 */
function formatarMetadataSeguranca(metadata: Record<string, unknown> | null | undefined): string {
  const bruto = JSON.stringify(metadata ?? {});
  const semEmail = bruto.replace(EMAIL_RE, "«contato»");
  return semEmail.length > MAX_METADATA_CHARS ? `${semEmail.slice(0, MAX_METADATA_CHARS)}…` : semEmail;
}

function formatarQuando(at: Date): string {
  return new Date(at).toLocaleString("pt-BR");
}

/** `ip_hash` já é pseudonimizado por HMAC — exibir como identificador opaco de correlação não é "desmascarar"; nunca tentar reconstruir o IP. */
function formatarIp(ipHash: string | null): string {
  return ipHash ? `${ipHash.slice(0, 10)}…` : "—";
}

function formatarAtor(row: SecurityEventRow): string {
  if (row.actorId) return row.actorId;
  if (row.actorKind) return row.actorKind;
  return "—";
}

function selectClassName(): string {
  return (
    "tipo-caption min-h-11 rounded-token border border-linha bg-superficie px-2 text-ink outline-none " +
    "focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
  );
}

/**
 * Tela só-leitura por desenho (§8.1.8): `security_events` é a trilha que
 * *avisa*, não a que *prova* — alto volume, escrita assíncrona que nunca
 * derruba a operação, retenção própria. Agrupada por tipo com contagem é o
 * formato que responde "está acontecendo algo anormal?" numa olhada; o
 * detalhe (dentro de cada grupo) lista as ocorrências.
 *
 * `session.reuse` é o evento mais grave da lista — token já rotacionado
 * apresentado de novo é sinal de roubo, e o sistema matou a cadeia inteira.
 * Por isso ganha destaque `--critico`, não uma linha igual às outras.
 *
 * Nenhum controle de mutação chega aqui em nenhuma Onda: nem "marcar como
 * revisado", nem "ignorar". Isso é estado novo, não leitura — se a vontade
 * aparecer, é decisão da Onda C.
 */
export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; period?: string }>;
}) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { kind, period } = await searchParams;
  const desde = calcularDesde(period);
  const kindValido = kind && (KINDS as string[]).includes(kind) ? (kind as SecurityEventKind) : undefined;

  const { rows } = await listSecurity(
    { pool: getPool() },
    {
      actor,
      limit: 200,
      ...(kindValido ? { kind: kindValido } : {}),
      ...(desde ? { since: desde } : {}),
    },
  );

  const grupos = groupSecurityEvents(rows);
  const ocorrenciasPorTipo = new Map<SecurityEventKind, SecurityEventRow[]>();
  for (const row of rows) {
    const lista = ocorrenciasPorTipo.get(row.kind) ?? [];
    lista.push(row);
    ocorrenciasPorTipo.set(row.kind, lista);
  }

  return (
    <>
      <PageHeader
        title="Segurança"
        description="security_events agrupado por tipo — trilha que avisa, não que prova. Sem ação."
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="tipo-caption text-ink-3">Tipo</span>
          <select name="kind" defaultValue={kindValido ?? ""} className={selectClassName()}>
            <option value="">Todos os tipos</option>
            {KINDS.map((valor) => (
              <option key={valor} value={valor}>
                {ROTULO_KIND[valor]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="tipo-caption text-ink-3">Período</span>
          <select name="period" defaultValue={period ?? ""} className={selectClassName()}>
            <option value="">Todo o período</option>
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
        </label>
        <button
          type="submit"
          className="tipo-den-corpo min-h-11 rounded-token border border-linha bg-superficie px-4 text-ink"
        >
          Aplicar
        </button>
      </form>

      {rows.length === 0 ? (
        <ConsoleEmptyState
          title="Nenhum evento de segurança neste filtro"
          description="Login falho, rate limit e reuso de sessão aparecem aqui, agrupados por tipo, quando acontecerem."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map(({ kind: tipoGrupo, count }) => {
            const critico = tipoGrupo === "session.reuse";
            return (
              <details
                key={tipoGrupo}
                className={
                  critico
                    ? "rounded-token border border-critico bg-superficie p-4"
                    : "rounded-token border border-linha bg-superficie p-4"
                }
              >
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                  <span className={critico ? "tipo-den-corpo text-critico" : "tipo-den-corpo text-ink"}>
                    {ROTULO_KIND[tipoGrupo]}
                  </span>
                  <span className="flex items-center gap-2">
                    {critico && <StatusBadge tone="critico">crítico</StatusBadge>}
                    <span
                      className={critico ? "tipo-den-dado text-critico" : "tipo-den-dado text-ink"}
                    >
                      {count}
                    </span>
                  </span>
                </summary>
                <ul className="mt-3 flex flex-col gap-2">
                  {(ocorrenciasPorTipo.get(tipoGrupo) ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="tipo-caption flex flex-col gap-0.5 border-t border-linha pt-2 text-ink-3"
                    >
                      <span>
                        {formatarQuando(row.at)} · {formatarAtor(row)} · {formatarIp(row.ipHash)}
                      </span>
                      {Object.keys(row.metadata ?? {}).length > 0 && (
                        <span className="break-words">{formatarMetadataSeguranca(row.metadata)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
