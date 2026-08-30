import { relative } from "node:path";
import { arquivos, cli, linhas, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de rotas de API — o event_id vem da sessão, nunca do corpo.
 *
 * O token do convidado escopa a UM evento. Aceitar `eventoId` do cliente sem
 * validar contra a sessão é trocar de festa com um JSON — e o isolamento
 * entre eventos deixa de valer na borda HTTP.
 *
 * Duas verificações estáticas:
 * 1. Rotas de convidado precisam resolver sessão (via @/lib/api ou @/lib/session).
 * 2. Nenhuma rota de convidado passa `corpo.evento*` para `comEvento`.
 */

const ALVO = "apps/web/app/api";

/** Rotas que legitimamente leem eventoId do corpo ou usam outra credencial. */
const ISENTAS = [
  "sessions/route.ts",
  "admin/",
  "parede/",
  "app/parear/",
  "jobs/",
  // Probes de infra (liveness/readiness) — sem convidado, sem host, sem evento.
  "health/",
];

const AUTH_CONVIDADO =
  /(?:requireGuestSession|guestSessionFromRequest|from\s+["']@\/lib\/api["'])/;
const AUTH_HOST = /(?:requireHostSession|hostFromRequest|from\s+["']@\/lib\/host-session["'])/;
const AUTH_PAREDE = /wallFromRequest/;

/** Passar evento do corpo direto ao banco — a forma que o guard existe para pegar. */
const EVENTO_DO_CORPO_NO_BANCO = /comEvento\s*\([^,]+,\s*corpo\.(?:eventoId|evento|event_id)\b/;

/** Desestruturar eventoId do corpo fora da rota de criação de sessão. */
const EVENTO_ID_DO_CORPO = /\beventoId\b[^=]*=\s*corpo\.(?:eventoId|evento|event_id)\b/;

function relativoApi(raiz, caminho) {
  return relative(`${raiz}/${ALVO}`, caminho).replace(/\\/g, "/");
}

function isenta(relativo) {
  return ISENTAS.some((prefixo) => relativo.startsWith(prefixo));
}

function temAuth(conteudo) {
  return (
    AUTH_CONVIDADO.test(conteudo) ||
    AUTH_HOST.test(conteudo) ||
    AUTH_PAREDE.test(conteudo)
  );
}

/** Rotas que só reexportam outro handler — a auth está na rota de origem. */
const ALIAS_DE_ROTA = /export\s*\{[^}]+\}\s*from\s+["'][^"']+\/route["']/;

/** Rotas finas que delegam para @/lib/api/handlers — a auth está no módulo handler. */
const DELEGA_PARA_HANDLER = /export\s*\{[^}]+\}\s*from\s+["']@\/lib\/api\/handlers\//;

function ehAlias(conteudo) {
  return ALIAS_DE_ROTA.test(conteudo) || DELEGA_PARA_HANDLER.test(conteudo);
}

export function verificar(raiz) {
  const violacoes = [];

  for (const caminho of arquivos(`${raiz}/${ALVO}`, [".ts"])) {
    if (!caminho.endsWith("route.ts")) continue;

    const relativo = relativoApi(raiz, caminho);
    const conteudo = linhas(caminho).join("\n");
    const codigo = linhasDeCodigo(caminho);

    if (!isenta(relativo) && !temAuth(conteudo) && !ehAlias(conteudo)) {
      violacoes.push(
        violacao(
          raiz,
          caminho,
          0,
          relativo,
          "rota sem resolução de sessão — importe requireGuestSession de @/lib/api ou guestSessionFromRequest de @/lib/session",
        ),
      );
    }

    if (isenta(relativo)) continue;

    codigo.forEach((semComentario, i) => {
      if (EVENTO_DO_CORPO_NO_BANCO.test(semComentario)) {
        violacoes.push(
          violacao(
            raiz,
            caminho,
            i,
            semComentario,
            "event_id do corpo passado a comEvento — use sessao.eventoId após validar a sessão",
          ),
        );
        return;
      }

      if (EVENTO_ID_DO_CORPO.test(semComentario)) {
        violacoes.push(
          violacao(
            raiz,
            caminho,
            i,
            semComentario,
            "event_id lido do corpo — o evento vem da sessão, nunca do cliente",
          ),
        );
      }
    });
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("api-routes", verificar);
