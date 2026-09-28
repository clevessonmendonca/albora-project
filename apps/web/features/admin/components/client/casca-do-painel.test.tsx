import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CascaDoPainel } from "./casca-do-painel";

const mockPathname = vi.fn(() => "/admin/e/abc");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./moderation-count-context", () => ({ useModerationCount: () => ({ count: 0 }) }));
vi.mock("./tema-do-painel-toggle", () => ({ TemaDoPainelToggle: () => <span /> }));
vi.mock("./ajuda-do-painel", () => ({ AjudaDoPainel: () => <span /> }));
vi.mock("./sign-out-button", () => ({ SignOutButton: () => <span>Sair</span> }));

const EVENTO = { id: "abc", nome: "Festa", data: "12 de dezembro", monograma: "F" };
const OUTRO = { id: "xyz", nome: "Bodas de prata", data: "3 de maio", monograma: "B" };

function montar() {
  return render(
    <CascaDoPainel
      evento={EVENTO}
      eventos={[EVENTO, OUTRO]}
      perfil={{ nome: "anfitriao@exemplo.com", plano: "Plano Completo" }}
      hoje="segunda-feira, 12 de dezembro"
      raiz="Meu evento"
    >
      <p>conteúdo</p>
    </CascaDoPainel>,
  );
}

describe("a gaveta do painel", () => {
  beforeEach(() => mockPathname.mockReturnValue("/admin/e/abc"));

  it("o hambúrguer anuncia o estado, e não só muda de desenho", async () => {
    montar();
    const botao = screen.getByRole("button", { name: "Abrir menu" });
    expect(botao).toHaveAttribute("aria-expanded", "false");

    await userEvent.setup().click(botao);

    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("ao abrir, o foco entra na gaveta — senão o Tab segue no conteúdo escondido", async () => {
    montar();

    await userEvent.setup().click(screen.getByRole("button", { name: "Abrir menu" }));

    const gaveta = document.getElementById("sidebar-do-painel");
    expect(gaveta?.contains(document.activeElement)).toBe(true);
  });

  it("Escape fecha e devolve o foco para quem abriu", async () => {
    const usuario = userEvent.setup();
    montar();
    const botao = screen.getByRole("button", { name: "Abrir menu" });

    await usuario.click(botao);
    await usuario.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Abrir menu" }));
  });

  it("navegar pela gaveta fecha ela", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole("button", { name: "Abrir menu" }));
    await usuario.click(screen.getByRole("link", { name: /Convidados/ }));

    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("o seletor lista os eventos da conta e marca o aberto", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole("button", { name: /Festa/ }));

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveTextContent("Bodas de prata");
    expect(screen.getByRole("link", { name: /Festa/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /Bodas de prata/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("o seletor leva para criar evento e para a lista inteira", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole("button", { name: /Festa/ }));

    expect(screen.getByRole("link", { name: /Criar evento/ })).toHaveAttribute(
      "href",
      "/admin/new",
    );
    expect(screen.getByRole("link", { name: /Ver todos/ })).toHaveAttribute("href", "/admin");
  });
});
