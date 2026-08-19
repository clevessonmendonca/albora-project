import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoCard } from "./photo-card";

function FakeLink({ href, ...props }: ComponentProps<"a">) {
  return <a href={href} data-fake-link="" {...props} />;
}

describe("PhotoCard", () => {
  it("mostra curtidas e comentários como número no documento", () => {
    render(
      <PhotoCard
        autor="Marina"
        quando="há 2 min"
        curtidas={12}
        curtido={false}
        comentarios={3}
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("chama onCurtir ao clicar no coração", () => {
    const onCurtir = vi.fn();
    render(
      <PhotoCard
        autor="Marina"
        quando="há 2 min"
        curtidas={12}
        curtido={false}
        comentarios={3}
        onCurtir={onCurtir}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Curtir" }));

    expect(onCurtir).toHaveBeenCalledTimes(1);
  });

  it("reflete curtido=true no aria-pressed do botão de curtir", () => {
    render(
      <PhotoCard
        autor="Marina"
        quando="há 2 min"
        curtidas={12}
        curtido={true}
        comentarios={3}
      />,
    );

    expect(screen.getByRole("button", { name: "Curtir" })).toHaveAttribute("aria-pressed", "true");
  });

  it("sem autorHref, o nome do autor não é um link", () => {
    render(
      <PhotoCard
        autor="Marina"
        quando="há 2 min"
        curtidas={12}
        curtido={false}
        comentarios={3}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Marina")).toBeInTheDocument();
  });

  it("com autorHref, o nome e o avatar viram um link para o perfil", () => {
    render(
      <PhotoCard
        autor="Marina"
        autorHref="/e/festa/g/sessao-123"
        quando="há 2 min"
        curtidas={12}
        curtido={false}
        comentarios={3}
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/e/festa/g/sessao-123");
    expect(link).toHaveTextContent("Marina");
  });

  it("com linkComponent, o link do autor usa o componente injetado em vez de <a> puro", () => {
    render(
      <PhotoCard
        autor="Marina"
        autorHref="/e/festa/g/sessao-123"
        linkComponent={FakeLink}
        quando="há 2 min"
        curtidas={12}
        curtido={false}
        comentarios={3}
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-fake-link", "");
    expect(link).toHaveAttribute("href", "/e/festa/g/sessao-123");
  });
});
