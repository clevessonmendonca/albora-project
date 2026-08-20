import { existsSync } from "node:fs";
import { join } from "node:path";
import { cli, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de nomenclatura PT/EN — ADR 0014.
 *
 * Os barrels de packages/* são a vitrine pública do monorepo. Alias PT reverso
 * (`drain as drenar`) e seções "compatibilidade legado" confundem qual nome é
 * canônico e nunca saem sozinhos — só crescem. Este guard impede que voltem
 * depois da limpeza do B2 e bloqueia seções novas no mesmo molde.
 *
 * Não cobre rotas PT de API (reexport de URL legada) — api-routes cuida disso.
 */

const BARREIS = [
  "packages/core/src/index.ts",
  "packages/db/src/index.ts",
  "packages/tokens/src/index.ts",
  "packages/packs/src/index.ts",
];

/** Seções e comentários de alias PT legado — proibidos desde o ADR 0014. */
const SECAO_PT_LEGADO = [
  /\/\*\*\s*PT\s+type aliases/i,
  /\/\*\*\s*PT\s+piece types/i,
  /\/\*\*\s*PT\s+piece helpers/i,
  /\/\*\*\s*PT\s+resolver/i,
  /\/\*\*\s*PT\s+output formatters/i,
  /compatibilidade com código legado/i,
  /PT alias — prefer/i,
];

/**
 * Aliases PT reversos que saíram dos barrels — reintroduzir quebra o guard.
 * EN→PT no barrel; o canônico da implementação fica no outro lado do `as`.
 */
const ALIAS_PT_PROIBIDO =
  /\bas\s+(eh[A-Z][a-zA-Z0-9]*|drenar|enviarItem|padroesDoEvento|deveDesistir|esperaAntesDeRetentar|MAX_TENTATIVAS|Fila|ItemFila|CorpoItem|DetalhesItem|Alvo|Aparelho|Plano|alvoFull|alvoParaLadoMaior|alvoQueCabe|alvoThumb|LADO_THUMB|planejarProcessamento|QUALIDADE|TETO_PIXELS|tetoParaAparelho|Resultado|ResumoDrenagem|Transporte|Fundo|FundoEntrada|Cores|Fontes|Movimento|EntradaResolucao|Escala|EscalaSemantica|CamadaTokens|FormatoDePeca|LayoutDePeca|MedidasDaPeca|TintaDoQr|SANGRIA_MM|avisoDeCor|caixaDeCorte|medidasDaPeca|problemasDaPeca|CONTRASTE_DE_QR|QR_MINIMO_MM|tintaDoQr|AREA_SEGURA_MM|normalizarFundo|resolverEscala|resolverTokens|paraCss|paraVariaveis)\b/;

export function verificar(raiz) {
  const violacoes = [];

  for (const relativo of BARREIS) {
    const caminho = join(raiz, relativo);
    if (!existsSync(caminho)) continue;
    const codigo = linhasDeCodigo(caminho);

    for (let i = 0; i < codigo.length; i++) {
      const linha = codigo[i];
      if (!linha.trim()) continue;

      for (const padrao of SECAO_PT_LEGADO) {
        if (padrao.test(linha)) {
          violacoes.push(
            violacao(
              raiz,
              caminho,
              i,
              linha,
              "seção/comentário de alias PT legado proibido (ADR 0014) — use alias EN no barrel ou importe o símbolo canônico",
            ),
          );
          break;
        }
      }

      if (ALIAS_PT_PROIBIDO.test(linha)) {
        violacoes.push(
          violacao(
            raiz,
            caminho,
            i,
            linha,
            "alias PT reverso proibido no barrel (ADR 0014) — exporte EN como alias do canônico, não o contrário",
          ),
        );
      }
    }
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("nomenclatura", verificar);
