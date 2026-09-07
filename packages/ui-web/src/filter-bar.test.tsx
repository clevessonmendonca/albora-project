import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./filter-bar";

describe("FilterBar", () => {
  it("emite remoção de ficha", async () => {
    const onRemoveFilter = vi.fn();
    render(
      <FilterBar
        searchValue=""
        searchPlaceholder="conta, e-mail, id do evento"
        onSearchChange={() => {}}
        activeFilters={[{ key: "status", label: "Status: ativo" }]}
        onRemoveFilter={onRemoveFilter}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remover filtro Status: ativo" }));
    expect(onRemoveFilter).toHaveBeenCalledWith("status");
  });

  it("digitar na busca emite onSearchChange", async () => {
    const onSearchChange = vi.fn();
    render(<FilterBar searchValue="" searchPlaceholder="conta" onSearchChange={onSearchChange} />);
    await userEvent.type(screen.getByPlaceholderText("conta"), "a");
    expect(onSearchChange).toHaveBeenCalledWith("a");
  });

  it("sem fichas ativas não renderiza a linha de fichas", () => {
    render(<FilterBar searchValue="" searchPlaceholder="conta" onSearchChange={() => {}} />);
    expect(screen.queryByTestId("filter-bar-chips")).not.toBeInTheDocument();
  });

  it("alvo de toque do 'x' de remover ficha é ≥44px (size-4 + before:-inset-3.5)", () => {
    render(
      <FilterBar
        searchValue=""
        searchPlaceholder="conta"
        onSearchChange={() => {}}
        activeFilters={[{ key: "status", label: "Status: ativo" }]}
        onRemoveFilter={() => {}}
      />,
    );
    const botaoRemover = screen.getByRole("button", { name: "Remover filtro Status: ativo" });
    // size-4 = 1rem (16px) de alvo visual + before:-inset-3.5 (14px por lado)
    // = 44px de alvo clicável real, mesmo com o "x" visualmente pequeno.
    expect(botaoRemover.className).toMatch(/size-4\b/);
    expect(botaoRemover.className).toMatch(/before:-inset-3\.5\b/);
  });

  it("campo de busca tem alvo de toque ≥44px", () => {
    render(<FilterBar searchValue="" searchPlaceholder="conta" onSearchChange={() => {}} />);
    expect(screen.getByPlaceholderText("conta").className).toMatch(/min-h-11\b/);
  });
});
