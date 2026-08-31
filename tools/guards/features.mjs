import { arquivos, cli, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de fronteiras — `features/` não importa de `app/`.
 *
 * O App Router é a camada de roteamento; features é domínio reutilizável.
 * Import cruzado acopla feature a URL e quebra a regra de que trocar rota
 * não exige mexer em feature. O ESLint já bloqueia; este guard garante que
 * a rede de segurança sobrevive a um refactor que apague a regra do lint.
 */

const ALVO = "apps/web/features";

const IMPORTA_APP = /from\s+["']@\/app(?:\/|["'])/;

export function verificar(raiz) {
  const violacoes = [];

  for (const caminho of arquivos(`${raiz}/${ALVO}`, [".ts", ".tsx"])) {
    linhasDeCodigo(caminho).forEach((semComentario, i) => {
      if (IMPORTA_APP.test(semComentario)) {
        violacoes.push(
          violacao(
            raiz,
            caminho,
            i,
            semComentario,
            "feature importando de @/app — mova UI compartilhada para @albora/ui-web ou features/",
          ),
        );
      }
    });
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("features", verificar);
