// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConvidadosPage } from "./convidados-page";
vi.mock("./guest-funnel", () => ({ GuestFunnel: () => <div>Funil</div> }));
vi.mock("./pessoas", () => ({ Pessoas: ({ pessoas }: { pessoas: unknown[] }) => <div>{pessoas.length} pessoas carregadas</div> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("abre a lista real e oferece os caminhos de convite e consentimento", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pessoas: [] }) });
  vi.stubGlobal("fetch", fetchMock);
  render(<ConvidadosPage eventoId="evento" pessoaInicial={null} />);
  expect(await screen.findByText("0 pessoas carregadas")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith("/api/admin/events/evento/guests");
  expect(screen.getByRole("tab", { name: "Sua lista" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("link", { name: "Compartilhar convite" }).getAttribute("href")).toBe("/admin/e/evento/qrcode");
  expect(screen.getByRole("link", { name: "Ver consentimentos" }).getAttribute("href")).toBe("/admin/e/evento/consent");
});
