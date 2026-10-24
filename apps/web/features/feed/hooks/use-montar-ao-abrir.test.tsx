import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMontarAoAbrir } from "./use-montar-ao-abrir";

describe("useMontarAoAbrir", () => {
  it("não monta enquanto nunca foi aberta", () => {
    const { result } = renderHook(() => useMontarAoAbrir(false));
    expect(result.current).toBe(false);
  });

  it("monta ao abrir e continua montada depois de fechar", () => {
    const { result, rerender } = renderHook(({ a }) => useMontarAoAbrir(a), {
      initialProps: { a: false },
    });
    rerender({ a: true });
    expect(result.current).toBe(true);
    rerender({ a: false });
    expect(result.current).toBe(true);
  });
});
