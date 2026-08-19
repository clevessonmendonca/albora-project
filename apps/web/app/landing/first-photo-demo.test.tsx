import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirstPhotoDemo } from "./first-photo-demo";

/**
 * `URL.createObjectURL`/`revokeObjectURL` não existem no jsdom por padrão.
 * A demo nunca envia a foto a lugar nenhum — só precisa da API do browser
 * para desenhar a pré-visualização local.
 */
beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock-preview"),
    revokeObjectURL: vi.fn(),
  });
});

function digitarNome(nome: string) {
  fireEvent.click(screen.getByRole("button", { name: "Simular leitura do QR" }));
  fireEvent.change(screen.getByLabelText("Seu primeiro nome"), { target: { value: nome } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar na festa" }));
}

describe("FirstPhotoDemo", () => {
  it("começa no passo do QR, sem nenhum campo de identificação visível", () => {
    render(<FirstPhotoDemo />);

    expect(screen.getByRole("button", { name: "Simular leitura do QR" })).toBeTruthy();
    expect(screen.queryByLabelText("Seu primeiro nome")).toBeNull();
  });

  it("QR → nome → foto → álbum, na ordem, um passo por toque", () => {
    render(<FirstPhotoDemo />);

    fireEvent.click(screen.getByRole("button", { name: "Simular leitura do QR" }));
    expect(screen.getByLabelText("Seu primeiro nome")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Seu primeiro nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar na festa" }));
    expect(screen.getByText("Oi, Ana. Sua primeira foto:")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Prefiro só simular" }));
    expect(screen.getByText(/Prontinho, Ana\./)).toBeTruthy();
  });

  it("não avança para o passo do nome com o campo vazio", () => {
    render(<FirstPhotoDemo />);

    fireEvent.click(screen.getByRole("button", { name: "Simular leitura do QR" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar na festa" }));

    expect(screen.getByLabelText("Seu primeiro nome")).toBeTruthy();
    expect(screen.queryByText(/Sua primeira foto:/)).toBeNull();
  });

  it("aceita uma foto real do arquivo local e chega ao álbum com a pré-visualização", () => {
    render(<FirstPhotoDemo />);
    digitarNome("Rafa");

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["conteudo"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/Prontinho, Rafa\./)).toBeTruthy();
    const img = screen.getByAltText("Sua foto entraria aqui") as HTMLImageElement;
    expect(img.src).toContain("blob:mock-preview");
  });

  it("volta ao passo anterior sem perder o nome já digitado", () => {
    render(<FirstPhotoDemo />);

    fireEvent.click(screen.getByRole("button", { name: "Simular leitura do QR" }));
    fireEvent.change(screen.getByLabelText("Seu primeiro nome"), { target: { value: "Bia" } });
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao QR" }));

    expect(screen.getByRole("button", { name: "Simular leitura do QR" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Simular leitura do QR" }));
    expect(screen.getByLabelText("Seu primeiro nome")).toHaveValue("Bia");
  });

  it("refazer a demonstração volta tudo ao passo do QR", () => {
    render(<FirstPhotoDemo />);
    digitarNome("Lu");
    fireEvent.click(screen.getByRole("button", { name: "Prefiro só simular" }));

    fireEvent.click(screen.getByRole("button", { name: "Refazer a demonstração" }));

    expect(screen.getByRole("button", { name: "Simular leitura do QR" })).toBeTruthy();
    expect(screen.queryByText(/Prontinho/)).toBeNull();
  });

  it("dispara o produto landing_demo só ao chegar no álbum, nunca antes", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({} as Response);
    render(<FirstPhotoDemo packHint="pack-teste" />);
    expect(fetchSpy).not.toHaveBeenCalled();

    digitarNome("Ana");
    expect(fetchSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Prefiro só simular" }));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ name: "landing_demo", packHint: "pack-teste" });

    fetchSpy.mockRestore();
  });

  it("nunca sugere e-mail, senha, cadastro ou instalar aplicativo para participar", () => {
    render(<FirstPhotoDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Simular leitura do QR" }));

    const texto = within(document.body).getByText(
      "Só isso. Nada de e-mail, nada de senha — este nome e este aparelho já são a sua sessão.",
    );
    expect(texto).toBeTruthy();

    const proibido = /(digite|informe|crie|cadastre)[^.]*(senha|e-mail|conta)|baixe (o|um) aplicativo|instale (o|um) app(?!licativo aparece)/i;
    expect(document.body.textContent).not.toMatch(proibido);
  });
});
