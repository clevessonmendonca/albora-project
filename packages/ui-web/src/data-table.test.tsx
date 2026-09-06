import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "./data-table";

type Row = { id: string; name: string };

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Nome", render: (r) => r.name, sortable: true },
];

describe("DataTable", () => {
  it("aria-sort alterna ascending, descending e none", () => {
    render(<DataTable columns={columns} rows={[{ id: "1", name: "Ana" }]} rowKey={(r) => r.id} />);
    const th = screen.getByRole("columnheader", { name: "Nome" });
    expect(th).toHaveAttribute("aria-sort", "none");

    fireEvent.click(screen.getByRole("button", { name: "Nome" }));
    expect(th).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByRole("button", { name: "Nome" }));
    expect(th).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(screen.getByRole("button", { name: "Nome" }));
    expect(th).toHaveAttribute("aria-sort", "none");
  });

  it("estado vazio renderiza a mensagem dada", () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} emptyMessage="Nenhum registro" />);
    expect(screen.getByText("Nenhum registro")).toBeInTheDocument();
  });

  it("paginação não passa dos limites", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: `Item ${i}` }));
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} pageSize={20} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("cabeçalho ordenável é focável e responde a Enter/Espaço", () => {
    render(<DataTable columns={columns} rows={[{ id: "1", name: "Ana" }]} rowKey={(r) => r.id} />);
    const botao = screen.getByRole("button", { name: "Nome" });
    botao.focus();
    expect(botao).toHaveFocus();
    fireEvent.click(botao);
    expect(screen.getByRole("columnheader", { name: "Nome" })).toHaveAttribute("aria-sort", "ascending");
  });

  it("estado de carregamento usa o Skeleton (sem animate-pulse)", () => {
    const { container } = render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} loading />);
    expect(container.innerHTML).not.toMatch(/animate-pulse/);
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it("os dois estados vazios renderizam mensagens diferentes", () => {
    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        emptyMessage="Nenhum evento ainda."
        emptyFilteredMessage="Nenhum ticket com estes filtros"
      />,
    );
    expect(screen.getByText("Nenhum evento ainda.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum ticket com estes filtros")).not.toBeInTheDocument();

    rerender(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        emptyMessage="Nenhum evento ainda."
        emptyFilteredMessage="Nenhum ticket com estes filtros"
        activeFilters={[{ key: "status", label: "Status: ativo" }]}
      />,
    );
    expect(screen.getByText("Nenhum ticket com estes filtros")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum evento ainda.")).not.toBeInTheDocument();
  });

  it("a contagem exibida reflete o conjunto filtrado, não o total da página", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: `Item ${i}` }));
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} pageSize={20} />);
    expect(screen.getByText("25 itens")).toBeInTheDocument();
    expect(screen.queryByText("20 itens")).not.toBeInTheDocument();
  });

  it("busca usa o placeholder específico passado, nunca um genérico", () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Ana" }]}
        rowKey={(r) => r.id}
        searchPlaceholder="conta, e-mail, id do evento"
        onSearchChange={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText("conta, e-mail, id do evento")).toBeInTheDocument();
  });

  it("remover uma ficha de filtro ativo chama onRemoveFilter com a chave certa", () => {
    const onRemoveFilter = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Ana" }]}
        rowKey={(r) => r.id}
        activeFilters={[{ key: "status", label: "Status: ativo" }]}
        onRemoveFilter={onRemoveFilter}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remover filtro Status: ativo" }));
    expect(onRemoveFilter).toHaveBeenCalledWith("status");
  });

  it("exportar é opcional via prop e só aparece com ela; o callback é do chamador", () => {
    const onExport = vi.fn();
    const { rerender } = render(
      <DataTable columns={columns} rows={[{ id: "1", name: "Ana" }]} rowKey={(r) => r.id} />,
    );
    expect(screen.queryByRole("button", { name: "Exportar" })).not.toBeInTheDocument();

    rerender(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Ana" }]}
        rowKey={(r) => r.id}
        exportable
        onExport={onExport}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("troca de tamanho de página avisa quem chama (persistência é responsabilidade dele, não do ui-web)", () => {
    const onPageSizeChange = vi.fn();
    const rows = Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: `Item ${i}` }));
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Itens por página"), { target: { value: "50" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
    expect(screen.getByLabelText("Itens por página")).toHaveValue("50");
  });
});
