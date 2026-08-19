"use client";

import { useEffect, useRef } from "react";

/**
 * O sentinela de rolagem infinita: uma div invisível no fim da lista que,
 * ao entrar na viewport, dispara `carregarMais`.
 *
 * `rootMargin` positivo antecipa o disparo antes do fim exato da lista — a
 * próxima página chega enquanto ainda há quadro abaixo, não depois que o
 * convidado já bateu no chão da tela.
 *
 * Reobserva a cada mudança em `marcador` (a contagem de itens já é o valor
 * certo em `HomePage`/`FeedPage`): o navegador só invoca o callback outra
 * vez quando a interseção *muda*, e uma página cujo conteúdo ainda cabe
 * dentro da viewport nunca cruza esse limiar de novo por conta própria — o
 * sentinela ficaria visível, intersectando, e a lista pararia de crescer
 * mesmo havendo mais página. Reconectar o observer faz o navegador
 * reavaliar o estado atual assim que os itens novos entram no DOM.
 *
 * Decisão de confiabilidade: sem botão de reserva no caminho feliz.
 * `IntersectionObserver` tem suporte universal nos navegadores móveis que
 * o convidado já precisa ter com JS ligado para esta tela funcionar (ela é
 * toda `"use client"`, busca via `fetch` — o botão antigo também não
 * funcionava sem JS). Falha de rede e sessão expirada continuam com botão
 * manual explícito (`Rodape`) — é aí que a queda graciosa mora, não aqui.
 */
export function useInfiniteScroll(
  carregarMais: () => void,
  ativo: boolean,
  marcador: unknown,
) {
  const alvo = useRef<HTMLDivElement>(null);
  const carregarMaisRef = useRef(carregarMais);
  carregarMaisRef.current = carregarMais;

  useEffect(() => {
    const elemento = alvo.current;
    if (!elemento || !ativo) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) carregarMaisRef.current();
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(elemento);
    return () => observer.disconnect();
  }, [ativo, marcador]);

  return alvo;
}
