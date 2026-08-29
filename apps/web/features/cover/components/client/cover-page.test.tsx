import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AlbumServido } from "@/lib/album";
import { CoverPage } from "./cover-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../hooks/use-stats-polling", () => ({
  useStatsPolling: (_slug: string, fotos: number) => fotos,
}));

vi.mock("../../hooks/use-photo-flash", () => ({
  usePhotoFlash: () => false,
}));

vi.mock("@/features/guest/components/client/host-message-card", () => ({
  HostMessageCard: () => null,
}));

vi.mock("../ui", () => ({
  InviteButton: () => <button type="button">Convidar amigos</button>,
  MusicIcon: () => null,
  CoverShortcut: ({ href, label }: { href: string; label: string }) => (
    <a href={href}>{label}</a>
  ),
  CoverHero: () => null,
  CoverEventInfo: ({ eventName }: { eventName: string }) => <p>{eventName}</p>,
  MomentsSection: () => null,
}));

const ALBUM: AlbumServido = {
  capitulos: [],
  totalDePaginas: 0,
  contadores: { fotos: 0, convidados: 0, missoes: 2 },
  interacao: "espelho",
  expiraEm: Date.now() + 900_000,
};

function renderCapa(over: Partial<React.ComponentProps<typeof CoverPage>> = {}) {
  return render(
    <CoverPage
      slug="festa-demo"
      eventName="A festa"
      startsAt="2026-08-29T20:00:00.000Z"
      album={ALBUM}
      moments={[]}
      interactionOpen={false}
      musicLabel={null}
      hostMessageLabel="Um recado"
      {...over}
    />,
  );
}

describe("CoverPage", () => {
  it("oferece skip link para o conteúdo e atalho de feed sem unificar com o início", () => {
    renderCapa();

    expect(screen.getByRole("link", { name: "Ir para o conteúdo" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("link", { name: /Feed/ })).toHaveAttribute(
      "href",
      "/e/festa-demo/feed",
    );
  });

  it("usa o título do pack no atalho do confessionário", () => {
    renderCapa({ confessionalTitle: "O recado em vídeo" });

    const atalho = screen.getByRole("link", { name: "O recado em vídeo" });
    expect(atalho).toHaveAttribute("href", "/e/festa-demo/confessional");
    expect(screen.queryByRole("link", { name: "Confessionário" })).not.toBeInTheDocument();
  });

  it("omite o atalho quando o pack não tem confessionário", () => {
    renderCapa({ confessionalTitle: null });

    expect(screen.queryByRole("link", { name: "Confessionário" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ligar telão" })).toBeInTheDocument();
  });
});
