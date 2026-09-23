"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Opcoes<T> = {
  /** Relê sozinho neste intervalo. Omita para ler uma vez só. */
  intervaloMs?: number;
  aoCarregar?: (dado: T) => void;
};

export type RecursoAdmin<T> = {
  dado: T | null;
  carregando: boolean;
  erro: boolean;
  atualizadoEm: Date | null;
  recarregar: () => Promise<void>;
};

export function useAdminResource<T>(url: string, opcoes: Opcoes<T> = {}): RecursoAdmin<T> {
  const { intervaloMs, aoCarregar } = opcoes;
  const [dado, setDado] = useState<T | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  const aoCarregarRef = useRef(aoCarregar);
  aoCarregarRef.current = aoCarregar;

  /** Só a leitura mais nova pode escrever: sem isto, a resposta atrasada de um poll velho sobrescreve a de um poll recente. */
  const geracao = useRef(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recarregar = useCallback(async () => {
    const minha = ++geracao.current;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      const novo = (await r.json()) as T;
      if (!montado.current || minha !== geracao.current) return;
      setDado(novo);
      setErro(false);
      setAtualizadoEm(new Date());
      aoCarregarRef.current?.(novo);
    } catch {
      if (!montado.current || minha !== geracao.current) return;
      setErro(true);
    } finally {
      if (montado.current && minha === geracao.current) setCarregando(false);
    }
  }, [url]);

  useEffect(() => {
    void recarregar();
    if (!intervaloMs) return;
    const id = window.setInterval(() => void recarregar(), intervaloMs);
    return () => window.clearInterval(id);
  }, [recarregar, intervaloMs]);

  return { dado, carregando, erro, atualizadoEm, recarregar };
}
