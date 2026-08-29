import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFeedViewer } from "./use-feed-viewer";
import type { HourGroup } from "../lib/group-by-hour";
import type { ItemVisivel } from "./use-feed";

describe("useFeedViewer", () => {
  const criarGrupo = (inicio: Date, completo: boolean, itens: ItemVisivel[]): HourGroup<ItemVisivel> => ({
    inicio,
    hora: 12,
    itens,
    completo,
  });

  const criarItem = (id: string): ItemVisivel => ({
    id,
    chaveThumb: `thumb-${id}`,
    chaveFull: `full-${id}`,
    mime: "image/jpeg",
    autor: "Teste",
    legenda: null,
    lugar: null,
    criadaEm: new Date().toISOString(),
  });

  it("inicia sem grupo aberto", () => {
    const { result } = renderHook(() => useFeedViewer([]));

    expect(result.current.grupoAberto).toBeNull();
    expect(result.current.indiceAtual).toBe(0);
    expect(result.current.vistos.size).toBe(0);
  });

  it("abre grupo completo imediatamente", () => {
    const item1 = criarItem("1");
    const item2 = criarItem("2");
    const grupo = criarGrupo(new Date(), true, [item1, item2]);

    const { result } = renderHook(() => useFeedViewer([grupo]));

    act(() => {
      result.current.abrir(grupo);
    });

    expect(result.current.grupoAberto).toBe(grupo);
    expect(result.current.indiceAtual).toBe(0);
    expect(result.current.vistos.has(grupo.inicio.getTime())).toBe(true);
  });

  it("marca grupo como visto ao abrir", () => {
    const grupo = criarGrupo(new Date(), true, [criarItem("1")]);

    const { result } = renderHook(() => useFeedViewer([grupo]));

    act(() => {
      result.current.abrir(grupo);
    });

    expect(result.current.vistos.has(grupo.inicio.getTime())).toBe(true);
  });

  it("navega entre itens do grupo", () => {
    const item1 = criarItem("1");
    const item2 = criarItem("2");
    const item3 = criarItem("3");
    const grupo = criarGrupo(new Date(), true, [item1, item2, item3]);

    const { result } = renderHook(() => useFeedViewer([grupo]));

    act(() => {
      result.current.abrir(grupo);
    });

    expect(result.current.indiceAtual).toBe(0);

    act(() => {
      result.current.navegarPara(1);
    });

    expect(result.current.indiceAtual).toBe(1);

    act(() => {
      result.current.navegarPara(2);
    });

    expect(result.current.indiceAtual).toBe(2);
  });

  it("fecha viewer", () => {
    const grupo = criarGrupo(new Date(), true, [criarItem("1")]);

    const { result } = renderHook(() => useFeedViewer([grupo]));

    act(() => {
      result.current.abrir(grupo);
    });

    expect(result.current.grupoAberto).not.toBeNull();

    act(() => {
      result.current.fechar();
    });

    expect(result.current.grupoAberto).toBeNull();
  });

  it("não abre grupo incompleto imediatamente", () => {
    const grupo = criarGrupo(new Date(), false, [criarItem("1")]);

    const { result } = renderHook(() => useFeedViewer([grupo]));

    act(() => {
      result.current.abrir(grupo);
    });

    expect(result.current.grupoAberto).toBeNull();
    expect(result.current.preparando).toBe(grupo.inicio.getTime());
  });

  it("não adiciona grupo já visto novamente no set", () => {
    const grupo = criarGrupo(new Date(), true, [criarItem("1")]);

    const { result } = renderHook(() => useFeedViewer([grupo]));

    act(() => {
      result.current.abrir(grupo);
    });

    const primeirosVistos = result.current.vistos;

    act(() => {
      result.current.fechar();
    });

    act(() => {
      result.current.abrir(grupo);
    });

    expect(result.current.vistos).toBe(primeirosVistos);
  });
});
