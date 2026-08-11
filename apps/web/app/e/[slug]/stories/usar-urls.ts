"use client";

import { useEffect, useRef, useState } from "react";
import { expirou, urlsDeMidia, type UrlDeMidia } from "@/lib/midia";

/**
 * As URLs assinadas das chaves que estão (ou estão prestes a entrar) na tela.
 *
 * Em lote e por janela: quem chama pede a miniatura da vizinhança e o arquivo
 * cheio das duas ou três próximas fotos, nunca do grupo inteiro. Uma hora de
 * festa tem dezenas de fotos, e assinar todas para mostrar uma é gastar a
 * primeira tela — que é justamente o que a prova de 3G lento mede.
 */

/** Um POST por vez, e nunca uma lista que estoure o corpo da requisição. */
const TAMANHO_DO_LOTE = 40;

export type Midias = {
  urls: Map<string, UrlDeMidia>;
  /** Alguma chave não voltou. A tela mostra moldura, nunca imagem quebrada. */
  falhou: boolean;
};

export function usarUrls(chaves: readonly string[]): Midias {
  const [urls, setUrls] = useState<Map<string, UrlDeMidia>>(() => new Map());
  const [falhou, setFalhou] = useState(false);

  const tentadas = useRef<Set<string>>(new Set());
  const emVoo = useRef(false);
  const montado = useRef(true);

  // Lista estável: a identidade do array muda a cada render e reabriria o
  // efeito sem que nada tenha sido pedido de novo.
  const pedido = chaves.join(" ");

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (emVoo.current) return;

    const agora = Date.now();
    const faltando: string[] = [];

    for (const chave of pedido ? pedido.split(" ") : []) {
      if (!chave) continue;

      const url = urls.get(chave);
      if (url && !expirou(url, agora)) continue;
      // Vencida volta para a fila: a assinatura tem vida curta e a pessoa pode
      // ter deixado a tela aberta na mesa a noite inteira.
      if (url) tentadas.current.delete(chave);

      if (tentadas.current.has(chave)) continue;
      if (!faltando.includes(chave)) faltando.push(chave);
    }

    if (faltando.length === 0) return;

    const lote = faltando.slice(0, TAMANHO_DO_LOTE);
    // Marcadas antes da resposta: chave que falha e volta para a fila é uma
    // requisição por render, para sempre, contra uma rota que já está caída.
    for (const chave of lote) tentadas.current.add(chave);

    emVoo.current = true;

    void (async () => {
      try {
        const recebidas = await urlsDeMidia(lote);
        if (!montado.current || recebidas.size === 0) return;

        setUrls((antes) => {
          const proximo = new Map(antes);
          for (const [chave, url] of recebidas) proximo.set(chave, url);
          return proximo;
        });
        setFalhou(false);
      } catch {
        if (montado.current) setFalhou(true);
      } finally {
        emVoo.current = false;
      }
    })();
  }, [pedido, urls]);

  return { urls, falhou };
}
