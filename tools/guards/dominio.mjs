import { arquivos, cli, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de domínio — o que mantém o app Expo barato (ADR 0010).
 *
 * Com duas superfícies, cada regra que mora dentro de um componente passa a
 * existir duas vezes. Duas cópias da mesma regra divergem em silêncio, e aí
 * não são duas interfaces — são dois produtos.
 *
 * A regra: se não desenha pixel, não mora em `ui-*`. Vai para `@albora/core`.
 */

const ALVOS = ["packages/ui-web", "packages/ui-native"];

const PROIBIDO = [
  [/\bfetch\s*\(/, "chamada de rede — o cliente de API vive em @albora/core"],
  [/\bXMLHttpRequest\b/, "chamada de rede — use o cliente de @albora/core"],
  [/\bindexedDB\b/, "acesso a armazenamento — a fila vive em @albora/core"],
  [/\bAsyncStorage\b/, "acesso a armazenamento — a fila vive em @albora/core"],
  [/\blocalStorage\b/, "acesso a armazenamento — a fila vive em @albora/core"],
  [/\bprocess\.env\b/, "configuração — resolvida fora do componente"],
  [/\bnew\s+Date\s*\(\s*\)/, "relógio dentro de componente — receba o instante por prop, senão o gate de interação vira dois relógios"],
];

/**
 * Segunda checagem do mesmo guard: string de domínio dentro de componente.
 *
 * O guard de `packs.mjs` já cobre isso para `packages/{core,db,tokens,ui-*}`
 * e para as rotas (`apps/{web,mobile}/app`) — mas as telas de admin/convidado
 * moram em `apps/web/features`, fora das duas listas, e passavam batido. É o
 * blind spot: o texto "casamento" numa tela de admin (ex.: prova de QR) só
 * falharia hoje se alguém apertasse `dominio.mjs` — e o guard de domínio
 * ignorava justamente a palavra de domínio.
 *
 * Mesma lista e mesma exceção de `packs.mjs` (identificador de pack em CAIXA
 * ALTA não é violação — é o mecanismo de troca de pack funcionando).
 */
const ALVOS_COMPONENTE = ["apps/web/features"];

const DOMINIO = /\b(noiv[oa]s?|casamento|padrinh[oa]s?|madrinhas?|aniversariante|debutante)\b/gi;

function palavraDeDominio(linha) {
  return [...linha.matchAll(DOMINIO)].some(([achado]) => achado !== achado.toUpperCase());
}

export function verificar(raiz) {
  const violacoes = [];

  for (const alvo of ALVOS) {
    for (const caminho of arquivos(`${raiz}/${alvo}`, [".ts", ".tsx"])) {
      if (caminho.endsWith(".test.ts") || caminho.endsWith(".test.tsx")) continue;

      linhasDeCodigo(caminho).forEach((semComentario, i) => {
        for (const [padrao, motivo] of PROIBIDO) {
          if (padrao.test(semComentario)) {
            violacoes.push(violacao(raiz, caminho, i, semComentario, motivo));
            break;
          }
        }
      });
    }
  }

  for (const alvo of ALVOS_COMPONENTE) {
    for (const caminho of arquivos(`${raiz}/${alvo}`, [".ts", ".tsx"])) {
      if (caminho.endsWith(".test.ts") || caminho.endsWith(".test.tsx")) continue;

      linhasDeCodigo(caminho).forEach((semComentario, i) => {
        if (palavraDeDominio(semComentario)) {
          violacoes.push(
            violacao(
              raiz,
              caminho,
              i,
              semComentario,
              "string de domínio em componente — resolva por chave de vocabulário do pack",
            ),
          );
        }
      });
    }
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("dominio", verificar);
