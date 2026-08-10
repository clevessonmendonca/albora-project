import { arquivos, cli, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de isolamento — a regra que, se quebrar em produção, quebra
 * irreversivelmente.
 *
 * O teste contra banco real entra na task 003. O que já é verificável hoje,
 * estaticamente, são as duas formas que vazam evento entre clientes:
 *
 * `SET` em vez de `SET LOCAL` — o pooling em modo transação devolve a conexão
 * a cada COMMIT, e o setting de sessão sobra para o próximo cliente, que é
 * outro evento. O mesmo vale para `pg_advisory_lock`, que é de sessão: o lock
 * atravessa o checkout e trava o próximo.
 *
 * Roda desde o primeiro commit porque a alternativa é descobrir na primeira
 * festa com dois eventos no mesmo dia.
 */

const ALVOS = ["packages/", "apps/"];

const PADROES = [
  [
    // Exige GUC com namespace (`app.event_id`). Sem isso o padrão pegava o
    // `SET` de um `UPDATE ... SET coluna = ...`, que não tem nada a ver — e
    // falso positivo em guard é o que ensina o time a afrouxar a regra.
    /\bSET\s+(?!LOCAL\b)[a-z_]+\.[a-z_]+\s*(?:=|TO)\s/i,
    "SET de sessão — use SET LOCAL; o pooling devolve a conexão a cada COMMIT e o setting vaza para o próximo evento",
  ],
  [
    // A forma que mais aparece em código de aplicação, e a que passava
    // despercebida: o terceiro argumento é `is_local`. Com `false`, é `SET`.
    /\bset_config\s*\([^)]*,\s*false\s*\)/i,
    "set_config com is_local=false é SET de sessão — o terceiro argumento tem de ser true",
  ],
  [
    /\bpg_advisory_lock\b/,
    "lock de sessão — use pg_advisory_xact_lock; o de sessão sobrevive ao checkout do pool",
  ],
  [
    /\bpg_advisory_unlock\b/,
    "unlock de sessão — o lock transacional não precisa disso, e precisar dele é sinal de que o lock está errado",
  ],
];

export function verificar(raiz) {
  const violacoes = [];

  for (const alvo of ALVOS) {
    for (const caminho of arquivos(`${raiz}/${alvo}`, [".ts", ".tsx", ".sql", ".mjs"])) {
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

if (import.meta.url === `file://${process.argv[1]}`) cli("isolamento", verificar);
