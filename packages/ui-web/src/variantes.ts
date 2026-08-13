/**
 * O CVA da casa — variantes shadcn-style, sem dependência.
 *
 * `cn` junta classes descartando falsy; `variantes` recebe uma base e tabelas
 * de variante e devolve uma função que, dada a seleção, monta a className. A
 * ordem é base → variantes → `className` do consumidor, então o override vem
 * por último. Não há `tailwind-merge`: mantenha o override em utilitários que
 * não conflitam com os da base, ou troque a variante em vez de sobrescrever.
 */

export type ValorDeClasse = string | false | null | undefined;

export function cn(...partes: ValorDeClasse[]): string {
  return partes.filter(Boolean).join(" ");
}

type Tabelas = Record<string, Record<string, string>>;

// `| undefined` explícito porque `exactOptionalPropertyTypes` está ligado: um
// componente que faz `variante={props.variante}` passa `undefined` de fato, e
// sem isto o `?:` sozinho recusa esse `undefined`.
type Selecao<V extends Tabelas> = { [K in keyof V]?: keyof V[K] | undefined };

type Config<V extends Tabelas> = {
  base?: string;
  variantes?: V;
  padrao?: Selecao<V>;
};

type Props<V extends Tabelas> = Selecao<V> & { className?: string | undefined };

export function variantes<V extends Tabelas>(config: Config<V>) {
  const { base, variantes: tabelas, padrao } = config;

  return (props: Props<V> = {}): string => {
    const partes: ValorDeClasse[] = [base];

    if (tabelas) {
      for (const chave of Object.keys(tabelas) as (keyof V)[]) {
        const escolha = (props[chave] ?? padrao?.[chave]) as keyof V[keyof V] | undefined;
        if (escolha != null) {
          const opcoes = tabelas[chave] as Record<string, string>;
          partes.push(opcoes[escolha as string]);
        }
      }
    }

    partes.push(props.className);
    return cn(...partes);
  };
}
