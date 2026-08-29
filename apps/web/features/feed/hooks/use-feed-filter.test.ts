import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFeedFilter, type FilterMission } from "./use-feed-filter";

describe("useFeedFilter", () => {
  const missions: FilterMission[] = [
    { id: "1", title: "Missão 1" },
    { id: "2", title: "Missão 2" },
    { id: "3", title: "Missão 3" },
  ];

  it("inicia sem filtro ativo", () => {
    const { result } = renderHook(() => useFeedFilter(missions));

    expect(result.current.missionId).toBeNull();
    expect(result.current.filtroAtivo).toBeNull();
  });

  it("define filtro por ID", () => {
    const { result } = renderHook(() => useFeedFilter(missions));

    act(() => {
      result.current.setFiltro("2");
    });

    expect(result.current.missionId).toBe("2");
    expect(result.current.filtroAtivo).toEqual({ id: "2", title: "Missão 2" });
  });

  it("limpa filtro", () => {
    const { result } = renderHook(() => useFeedFilter(missions));

    act(() => {
      result.current.setFiltro("1");
    });

    expect(result.current.missionId).toBe("1");

    act(() => {
      result.current.limpar();
    });

    expect(result.current.missionId).toBeNull();
    expect(result.current.filtroAtivo).toBeNull();
  });

  it("alterna filtro (liga/desliga)", () => {
    const { result } = renderHook(() => useFeedFilter(missions));

    act(() => {
      result.current.alternar("1");
    });

    expect(result.current.missionId).toBe("1");

    act(() => {
      result.current.alternar("1");
    });

    expect(result.current.missionId).toBeNull();
  });

  it("alterna entre filtros diferentes", () => {
    const { result } = renderHook(() => useFeedFilter(missions));

    act(() => {
      result.current.alternar("1");
    });

    expect(result.current.missionId).toBe("1");

    act(() => {
      result.current.alternar("2");
    });

    expect(result.current.missionId).toBe("2");
  });

  it("retorna null quando missão não existe", () => {
    const { result } = renderHook(() => useFeedFilter(missions));

    act(() => {
      result.current.setFiltro("99");
    });

    expect(result.current.missionId).toBe("99");
    expect(result.current.filtroAtivo).toBeNull();
  });
});
