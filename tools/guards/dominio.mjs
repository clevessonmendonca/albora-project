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

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("dominio", verificar);
