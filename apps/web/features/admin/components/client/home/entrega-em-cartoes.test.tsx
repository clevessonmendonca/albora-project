import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../host-export", () => ({ HostExportCartao: () => <div>Baixar tudo</div> }));
vi.mock("../host-drive-export", () => ({ HostDriveExport: () => <div>Google Drive</div> }));

import { EntregaEmCartoes } from "./entrega-em-cartoes";

describe("EntregaEmCartoes", () => {
  it("junta ZIP, Drive e livro e aponta o livro para a rota do PDF", () => {
    render(<EntregaEmCartoes eventoId="e1" />);
    expect(screen.getByText("Guardar suas fotos")).toBeTruthy();
    expect(screen.getByText("Baixar tudo")).toBeTruthy();
    expect(screen.getByText("Google Drive")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Baixar PDF do livro" }).getAttribute("href")).toBe(
      "/api/admin/events/e1/book/pdf",
    );
  });
});
