import {
  MODELOS_DE_TELAO,
  PERFIS,
  TETO_DO_CACHE,
  ehMimeVideo,
  modeloCorta,
  modelosDoRodizio,
  podarCache,
  proximaDoTelao,
  type ItemDoTelao,
  type ModeloDeTelao,
} from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FOLGA_DE_RENOVACAO_MS,
  POLL_MIDIA_MS,
  ROTACAO_MS,
  type Cena,
  type FaseWall,
  type ItemApi,
} from "./types";

export function useWallDisplay(
  fase: FaseWall,
  onNaoAutorizado: () => void,
) {
  const itensRef = useRef<Map<string, ItemApi>>(new Map());
  const dimsRef = useRef<Map<string, { largura: number; altura: number }>>(new Map());
  const exibicoesRef = useRef<Map<string, number>>(new Map());
  const modelosRef = useRef<readonly ModeloDeTelao[]>(MODELOS_DE_TELAO);
  const indiceModeloRef = useRef(0);

  const [cena, setCena] = useState<Cena | null>(null);
  const [carregou, setCarregou] = useState(false);
  const [panico, setPanico] = useState(false);
  const [alternandoPanico, setAlternandoPanico] = useState(false);

  const medir = useCallback((item: ItemApi) => {
    if (dimsRef.current.has(item.id)) return;

    if (ehMimeVideo(item.mime)) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          dimsRef.current.set(item.id, { largura: video.videoWidth, altura: video.videoHeight });
        }
      };
      video.src = item.full;
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        dimsRef.current.set(item.id, { largura: img.naturalWidth, altura: img.naturalHeight });
      }
    };
    img.src = item.thumb;
  }, []);

  const puxar = useCallback(async () => {
    let resposta: Response;
    try {
      resposta = await fetch("/api/wall", { credentials: "same-origin", cache: "no-store" });
    } catch {
      return;
    }
    if (resposta.status === 401) {
      onNaoAutorizado();
      return;
    }
    if (!resposta.ok) return;

    const corpo = (await resposta.json()) as {
      itens: Omit<ItemApi, "expiraEm">[];
      expiraEm: number;
      panico?: boolean;
      telaoModelos?: unknown;
    };
    const agora = Date.now();
    setPanico(corpo.panico === true);
    modelosRef.current = modelosDoRodizio(corpo.telaoModelos);

    for (const bruto of corpo.itens) {
      const existente = itensRef.current.get(bruto.id);
      if (existente && existente.expiraEm - agora > FOLGA_DE_RENOVACAO_MS) {
        existente.reacoes = bruto.reacoes;
        continue;
      }
      const item: ItemApi = { ...bruto, expiraEm: corpo.expiraEm };
      itensRef.current.set(bruto.id, item);
      medir(item);
    }

    const podadas = podarCache(
      [...itensRef.current.values()].map((i) => ({
        id: i.id,
        criadaEm: new Date(i.criadaEm),
        exibicoes: 0,
        reacoes: i.reacoes,
        largura: 0,
        altura: 0,
      })),
      TETO_DO_CACHE,
    );
    const vivos = new Set(podadas.map((p) => p.id));
    for (const id of itensRef.current.keys()) {
      if (!vivos.has(id)) {
        itensRef.current.delete(id);
        dimsRef.current.delete(id);
        exibicoesRef.current.delete(id);
      }
    }

    setCarregou(true);
  }, [medir, onNaoAutorizado]);

  const paraItemDoTelao = useCallback((): ItemDoTelao[] => {
    const itens: ItemDoTelao[] = [];
    for (const [id, api] of itensRef.current) {
      const dim = dimsRef.current.get(id);
      if (!dim) continue;
      itens.push({
        id,
        criadaEm: new Date(api.criadaEm),
        exibicoes: exibicoesRef.current.get(id) ?? 0,
        reacoes: api.reacoes,
        largura: dim.largura,
        altura: dim.altura,
      });
    }
    return itens;
  }, []);

  const selecionar = useCallback((modelo: ModeloDeTelao, itens: ItemDoTelao[]): string[] => {
    const perfil = PERFIS[modelo];
    if (perfil.fotos === 1) {
      const escolhido = proximaDoTelao(itens, { agora: new Date(), modelo });
      return escolhido ? [escolhido.id] : [];
    }
    const elegiveis = itens
      .filter((i) => !modeloCorta(modelo, i))
      .sort((a, b) => a.exibicoes - b.exibicoes || b.criadaEm.getTime() - a.criadaEm.getTime());
    if (elegiveis.length < perfil.fotos) return [];
    return elegiveis.slice(0, perfil.fotos).map((i) => i.id);
  }, []);

  const girar = useCallback(() => {
    if (panico) return;
    const itens = paraItemDoTelao();
    if (itens.length === 0) return;

    const rotacao = modelosRef.current;
    for (let passo = 0; passo < rotacao.length; passo++) {
      const modelo = rotacao[(indiceModeloRef.current + passo) % rotacao.length]!;
      const ids = selecionar(modelo, itens);
      if (ids.length > 0) {
        indiceModeloRef.current = (indiceModeloRef.current + passo + 1) % rotacao.length;
        for (const id of ids) {
          exibicoesRef.current.set(id, (exibicoesRef.current.get(id) ?? 0) + 1);
        }
        setCena({ modelo, ids });
        return;
      }
    }
  }, [paraItemDoTelao, selecionar, panico]);

  const alternarPanico = useCallback(async () => {
    setAlternandoPanico(true);
    try {
      const r = await fetch("/api/wall/panic", {
        method: "PATCH",
        credentials: "same-origin",
      });
      if (!r.ok) return;
      const corpo = (await r.json()) as { panico: boolean };
      setPanico(corpo.panico);
      if (!corpo.panico) void puxar();
    } catch {
      /* próximo poll corrige */
    } finally {
      setAlternandoPanico(false);
    }
  }, [puxar]);

  useEffect(() => {
    if (fase !== "exibindo") return;
    void puxar();
    const pApoll = window.setInterval(() => void puxar(), POLL_MIDIA_MS);
    const pRot = window.setInterval(girar, ROTACAO_MS);
    return () => {
      window.clearInterval(pApoll);
      window.clearInterval(pRot);
    };
  }, [fase, puxar, girar]);

  const itemDe = useCallback((id: string) => itensRef.current.get(id), []);

  return {
    cena,
    carregou,
    panico,
    alternandoPanico,
    alternarPanico,
    itemDe,
  };
}
