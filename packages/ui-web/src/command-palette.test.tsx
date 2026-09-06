import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./command-palette";

const RESULTADOS = [
  { kind: "account", id: "conta-1", label: "j••••@gmail.com", href: "/console/accounts/conta-1" },
  { kind: "event", id: "evento-1", label: "Evento X", href: "/console/events/evento-1" },
];

describe("CommandPalette", () => {
  it("mostra os resultados com o rótulo do tipo", () => {
    render(
      <CommandPalette open onClose={() => {}} query="ex" onQueryChange={() => {}} results={RESULTADOS} onSelect={() => {}} />,
    );
    expect(screen.getByText("j••••@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Evento X")).toBeInTheDocument();
    expect(screen.getByText("Conta")).toBeInTheDocument();
    expect(screen.getByText("Evento")).toBeInTheDocument();
  });

  it("clicar num resultado chama onSelect com o resultado inteiro", async () => {
    const onSelect = vi.fn();
    render(
      <CommandPalette open onClose={() => {}} query="ex" onQueryChange={() => {}} results={RESULTADOS} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByText("Evento X"));
    expect(onSelect).toHaveBeenCalledWith(RESULTADOS[1]);
  });

  it("sem resultado e query com 2+ caracteres mostra a mensagem de vazio que ensina, nunca uma lista em branco muda", () => {
    render(<CommandPalette open onClose={() => {}} query="zz" onQueryChange={() => {}} results={[]} onSelect={() => {}} />);
    expect(screen.getByText(/Nenhum resultado para/)).toBeInTheDocument();
  });

  it("digitar no campo chama onQueryChange", async () => {
    const onQueryChange = vi.fn();
    render(
      <CommandPalette open onClose={() => {}} query="" onQueryChange={onQueryChange} results={[]} onSelect={() => {}} />,
    );
    await userEvent.type(screen.getByLabelText("Buscar conta, evento ou ticket"), "a");
    expect(onQueryChange).toHaveBeenCalledWith("a");
  });

  it("setas navegam entre resultados e Enter escolhe o destacado", async () => {
    const onSelect = vi.fn();
    render(
      <CommandPalette open onClose={() => {}} query="ex" onQueryChange={() => {}} results={RESULTADOS} onSelect={onSelect} />,
    );
    const campo = screen.getByLabelText("Buscar conta, evento ou ticket");

    // destaque inicial é o primeiro resultado
    expect(campo).toHaveAttribute("aria-activedescendant", "command-palette-option-account-conta-1");

    await userEvent.type(campo, "{ArrowDown}");
    expect(campo).toHaveAttribute("aria-activedescendant", "command-palette-option-event-evento-1");

    await userEvent.type(campo, "{Enter}");
    expect(onSelect).toHaveBeenCalledWith(RESULTADOS[1]);
  });

  it("seta pra cima não passa do primeiro resultado", async () => {
    render(
      <CommandPalette open onClose={() => {}} query="ex" onQueryChange={() => {}} results={RESULTADOS} onSelect={() => {}} />,
    );
    const campo = screen.getByLabelText("Buscar conta, evento ou ticket");
    await userEvent.type(campo, "{ArrowUp}");
    expect(campo).toHaveAttribute("aria-activedescendant", "command-palette-option-account-conta-1");
  });

  it("nada usa backdrop-blur (glassmorphism é anti-padrão bloqueante)", () => {
    render(
      <CommandPalette open onClose={() => {}} query="ex" onQueryChange={() => {}} results={RESULTADOS} onSelect={() => {}} />,
    );
    expect(document.body.innerHTML).not.toMatch(/backdrop-blur|backdrop-filter/);
  });
});
