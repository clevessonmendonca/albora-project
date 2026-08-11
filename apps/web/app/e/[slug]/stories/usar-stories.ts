"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * As páginas do feed, acumuladas para os stories.
 *
 * O gate de interação é regra de servidor: antes dele a rota devolve só o que
 * já está no telão, e sem contagem nenhuma. Esta tela não decide isso e não
 * tem como decidir — ela mostra o que veio.
 */

/**
 * O item **como chega pela rede**, e não o `ItemFeed` do `@albora/db`.
 *
 * `criadaEm` lá é `Date`; aqui é a string do JSON. Reaproveitar o tipo do
 * servidor faria o agrupamento por hora acreditar num `Date` que nunca existiu.
 */
export type ItemDoFeed = {
  id: string;
  chaveThumb: string;
  chaveFull: string;
  missaoId: string | null;
  legenda: string | null;
  lugar: string | null;
  autor: string;
  criadaEm: string;
};

type PaginaDoFeed = { itens: ItemDoFeed[]; proximoCursor: string | null };

/**
 * Teto de páginas. Vinte e quatro por página dá quase mil fotos — mais do que
 * qualquer festa produz — e o teto existe para o caso em que o cursor não anda:
 * sem ele, um defeito no servidor vira laço infinito de requisição em duzentos
 * aparelhos ao mesmo tempo, no meio da festa.
 */
export const PAGINAS_MAXIMAS = 40;

export type EstadoDosStories = {
  itens: ItemDoFeed[];
  /** Ainda há página por buscar. Vira `false` também quando a busca falhou. */
  temMais: boolean;
  carregando: boolean;
  falhou: boolean;
  /** Sem efeito quando já há uma busca em voo ou o teto de páginas foi atingido. */
  carregarMais: () => void;
  tentarDeNovo: () => void;
};

export function usarStories(): EstadoDosStories {
  const [itens, setItens] = useState<ItemDoFeed[]>([]);
  const [temMais, setTemMais] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const cursor = useRef<string | null>(null);
  const paginas = useRef(0);
  const emVoo = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const carregarMais = useCallback(() => {
    if (emVoo.current || paginas.current >= PAGINAS_MAXIMAS) return;

    emVoo.current = true;
    setCarregando(true);

    void (async () => {
      try {
        const busca = cursor.current ? `?cursor=${encodeURIComponent(cursor.current)}` : "";
        const resposta = await fetch(`/api/feed${busca}`, { credentials: "same-origin" });
        if (!resposta.ok) throw new Error(String(resposta.status));

        const pagina = (await resposta.json()) as PaginaDoFeed;
        if (!montado.current) return;

        const recebidos = Array.isArray(pagina.itens) ? pagina.itens : [];
        const proximo = typeof pagina.proximoCursor === "string" ? pagina.proximoCursor : null;

        cursor.current = proximo;
        paginas.current += 1;

        setItens((antes) => juntar(antes, recebidos));
        setTemMais(proximo !== null && paginas.current < PAGINAS_MAXIMAS);
        setFalhou(false);
      } catch {
        if (!montado.current) return;
        // Parar de oferecer é o que mantém honesto o "esta hora está completa":
        // sem isso, quem espera a hora fechar espera para sempre, e a tela fica
        // pedindo a mesma página que acabou de falhar.
        setFalhou(true);
        setTemMais(false);
      } finally {
        emVoo.current = false;
        if (montado.current) setCarregando(false);
      }
    })();
  }, []);

  const tentarDeNovo = useCallback(() => {
    setFalhou(false);
    setTemMais(true);
    carregarMais();
  }, [carregarMais]);

  useEffect(() => {
    carregarMais();
  }, [carregarMais]);

  return { itens, temMais, carregando, falhou, carregarMais, tentarDeNovo };
}

/**
 * O cursor não repete item, mas a fila de reconexão e o modo estrito do React
 * podem repetir a página. Chave duplicada em lista de React é remontagem, e
 * remontagem no meio de um story é a foto piscando na cara da pessoa.
 */
function juntar(antes: ItemDoFeed[], novos: ItemDoFeed[]): ItemDoFeed[] {
  if (novos.length === 0) return antes;

  const vistos = new Set(antes.map((i) => i.id));
  const ineditos = novos.filter((i) => i && typeof i.id === "string" && !vistos.has(i.id));

  return ineditos.length === 0 ? antes : [...antes, ...ineditos];
}
