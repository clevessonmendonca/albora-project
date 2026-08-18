import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommentSheet, type Comentario } from "./comment-sheet";

const comentarios: Comentario[] = [
  { id: "1", autor: "Marina", texto: "Que imagem linda!", quando: "20:14" },
  { id: "2", autor: "Diego", texto: "Melhor momento da noite.", quando: "20:20" },
];

describe("CommentSheet", () => {
  it("renderiza a lista de comentários recebida", () => {
    render(
      <CommentSheet aberto comentarios={comentarios} onEnviar={() => {}} onFechar={() => {}} />,
    );

    expect(screen.getByText("Marina")).toBeInTheDocument();
    expect(screen.getByText("Que imagem linda!")).toBeInTheDocument();
    expect(screen.getByText("Diego")).toBeInTheDocument();
    expect(screen.getByText("Melhor momento da noite.")).toBeInTheDocument();
  });

  it("mostra erro inline e não chama onEnviar quando o campo está vazio", () => {
    const onEnviar = vi.fn();

    render(<CommentSheet aberto comentarios={[]} onEnviar={onEnviar} onFechar={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(screen.getByText("Escreve algo primeiro.")).toBeInTheDocument();
    expect(onEnviar).not.toHaveBeenCalled();
  });

  it("mostra erro inline quando o campo só tem espaços", () => {
    const onEnviar = vi.fn();

    render(<CommentSheet aberto comentarios={[]} onEnviar={onEnviar} onFechar={() => {}} />);

    const campo = screen.getByPlaceholderText("Escreva um comentário…");
    fireEvent.change(campo, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(screen.getByText("Escreve algo primeiro.")).toBeInTheDocument();
    expect(onEnviar).not.toHaveBeenCalled();
  });

  it("chama onEnviar com o texto digitado e limpa o campo", () => {
    const onEnviar = vi.fn();

    render(<CommentSheet aberto comentarios={[]} onEnviar={onEnviar} onFechar={() => {}} />);

    const campo = screen.getByPlaceholderText("Escreva um comentário…");
    fireEvent.change(campo, { target: { value: "Parabéns!" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onEnviar).toHaveBeenCalledWith("Parabéns!");
    expect(campo).toHaveValue("");
  });

  it("limpa o erro assim que o usuário edita o campo", () => {
    const onEnviar = vi.fn();

    render(<CommentSheet aberto comentarios={[]} onEnviar={onEnviar} onFechar={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByText("Escreve algo primeiro.")).toBeInTheDocument();

    const campo = screen.getByPlaceholderText("Escreva um comentário…");
    fireEvent.change(campo, { target: { value: "a" } });

    expect(screen.queryByText("Escreve algo primeiro.")).not.toBeInTheDocument();
  });
});
