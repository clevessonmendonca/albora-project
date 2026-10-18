import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventNotice } from "./event-notice";

vi.mock("./rescue-scanner", () => ({ RescueScanner: () => null }));
vi.mock("./event-countdown", () => ({ EventCountdown: () => null }));
vi.mock("./albora-logo", () => ({ AlboraLogo: () => null }));

describe("EventNotice", () => {
  it("oferece o caminho para publicar quando recebe a ação do anfitrião", () => {
    render(
      <EventNotice
        title="Evento ainda não disponível"
        body="Os anfitriões estão preparando tudo."
        acao={{ href: "/admin/e/abc#controle-publicar", rotulo: "Foi você quem criou? Publique no painel" }}
      />,
    );
    expect(screen.getByRole("link", { name: /Publique no painel/ })).toHaveAttribute(
      "href",
      "/admin/e/abc#controle-publicar",
    );
  });

  it("sem ação não mostra link nenhum", () => {
    render(<EventNotice title="Essa festa já foi" body="x" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
