import { arquivos, cli, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de sessão — o token do convidado é a única credencial daquele plano.
 *
 * Ele não tem login, então o token assinado é tudo que existe entre a foto da
 * avó de alguém e quem não deveria vê-la. Token em querystring vaza por
 * referrer, por histórico e por log de proxy; token em log vaza para quem tem
 * acesso ao log.
 */

const ALVOS = ["packages/", "apps/"];

const PADROES = [
  [/[?&](?:token|sessao|session|sid)=/i, "token em querystring — vaza por referrer, histórico e log de proxy"],
  [/searchParams\.set\(\s*["'](?:token|sessao|session|sid)["']/i, "token em querystring — use cookie HttpOnly"],
  [
    /console\.(log|info|warn|error|debug)\([^)]*\b(token|sessao|session|cookie|secret|senha|password)\b/i,
    "credencial em log",
  ],
  [
    /console\.(log|info|warn|error|debug)\([^)]*\b(cpf|telefone|email|e-mail)\b/i,
    "PII crua em log — mascare (CLAUDE.md)",
  ],
];

export function verificar(raiz) {
  const violacoes = [];

  for (const alvo of ALVOS) {
    for (const caminho of arquivos(`${raiz}/${alvo}`, [".ts", ".tsx", ".mjs", ".js"])) {
      linhasDeCodigo(caminho).forEach((semComentario, i) => {
        for (const [padrao, motivo] of PADROES) {
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

if (import.meta.url === `file://${process.argv[1]}`) cli("sessao", verificar);
