import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { IdeiaNaTela, PostNaTela } from "@/features/admin/lib/descobrir-tela";

const { carregarFeed, carregarConversa, carregarIdeias } = vi.hoisted(() => ({
  carregarFeed: vi.fn(),
  carregarConversa: vi.fn(),
  carregarIdeias: vi.fn(),
}));

vi.mock("@/features/admin/data/carregar-descobrir", () => ({
  carregarFeed,
  carregarConversa,
  carregarIdeias,
  PAGINA: 20,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));

const { Comunidade, Conversa, Inspiracao } = await import("./descobrir");

const EVENTO = "0d3f0e3a-7a4e-4b0f-8d14-2a1f5c9b6e77";

function post(over: Partial<PostNaTela> = {}): PostNaTela {
  return {
    id: "8b1c0a5e-1f2d-4c3b-9a7e-2f5d6c7b8a90",
    topico: "duvida",
    titulo: "Quantas missões vocês deixaram?",
    corpo: "Estamos entre três e seis.",
    criadoEm: new Date().toISOString(),
    respostas: 0,
    meu: false,
    ...over,
  };
}

function ideia(over: Partial<IdeiaNaTela> = {}): IdeiaNaTela {
  return {
    id: "1e9b6b1c-4f23-4d58-9c0a-33bb1f2e7a41",
    tema: "fotos",
    titulo: "Deixe o QR onde a fila já para",
    corpo: "Quem espera tem as mãos livres.",
    salva: false,
    ...over,
  };
}

describe("feed da comunidade", () => {
  it("lista as conversas e liga cada uma à sua thread", async () => {
    carregarFeed.mockResolvedValue({ posts: [post({ respostas: 2 })], temMais: false });

    render(await Comunidade({ eventId: EVENTO }));

    expect(screen.getByRole("link", { name: "Quantas missões vocês deixaram?" })).toHaveAttribute(
      "href",
      `/admin/e/${EVENTO}/comunidade/8b1c0a5e-1f2d-4c3b-9a7e-2f5d6c7b8a90`,
    );
    expect(screen.getByText("2 respostas")).toBeInTheDocument();
  });

  it("🔴 nenhum identificador de conta alheia chega ao HTML", async () => {
    // O feed é compartilhado: quem lê não é quem escreveu. O `accountId` do
    // autor nunca entra no view model, e este teste falha se alguém o
    // reintroduzir por conveniência.
    carregarFeed.mockResolvedValue({ posts: [post({ meu: false })], temMais: false });

    const { container } = render(await Comunidade({ eventId: EVENTO }));

    const uuids = new Set(
      container.innerHTML.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
      ) ?? [],
    );
    expect([...uuids].sort()).toEqual([EVENTO, post().id].sort());
    expect(screen.getByText(/Quem organiza/)).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it("filtro de assunto vira busca na URL, não estado no cliente", async () => {
    carregarFeed.mockResolvedValue({ posts: [], temMais: false });

    render(await Comunidade({ eventId: EVENTO, filtro: "ideia" }));

    expect(carregarFeed).toHaveBeenCalledWith(
      expect.objectContaining({ topico: "ideia", antesDe: undefined }),
    );
    expect(screen.getByRole("link", { name: "Ideias" })).toHaveAttribute("aria-current", "true");
  });

  it("assunto inventado na URL cai no feed inteiro, sem filtro e sem erro", async () => {
    carregarFeed.mockResolvedValue({ posts: [], temMais: false });

    render(await Comunidade({ eventId: EVENTO, filtro: "relatorio-secreto" }));

    expect(carregarFeed).toHaveBeenCalledWith(expect.objectContaining({ topico: undefined }));
  });

  it("a próxima página é um link com o cursor da última conversa", async () => {
    const ultimo = post({ criadoEm: "2026-09-20T12:00:00.000Z" });
    carregarFeed.mockResolvedValue({ posts: [ultimo], temMais: true });

    render(await Comunidade({ eventId: EVENTO, filtro: "duvida" }));

    const link = screen.getByRole("link", { name: "Conversas mais antigas" });
    expect(link.getAttribute("href")).toBe(
      `/admin/e/${EVENTO}/comunidade?filtro=duvida&antes=${encodeURIComponent(
        `${ultimo.criadoEm}_${ultimo.id}`,
      )}`,
    );
  });

  it("feed vazio com filtro diz outra coisa do que feed vazio sem filtro", async () => {
    carregarFeed.mockResolvedValue({ posts: [], temMais: false });

    const semFiltro = render(await Comunidade({ eventId: EVENTO }));
    expect(screen.getByText("A conversa começa com alguém")).toBeInTheDocument();
    semFiltro.unmount();

    render(await Comunidade({ eventId: EVENTO, filtro: "indicacao" }));
    expect(screen.getByText("Nada por aqui ainda neste assunto")).toBeInTheDocument();
  });
});

describe("thread", () => {
  it("🔴 apagar só aparece no que é seu", async () => {
    carregarConversa.mockResolvedValue({
      post: post({ meu: false }),
      respostas: [
        { id: "a1", corpo: "Deixei quatro.", criadoEm: new Date().toISOString(), meu: true },
        { id: "b2", corpo: "Seis aqui.", criadoEm: new Date().toISOString(), meu: false },
      ],
    });

    render(await Conversa({ eventId: EVENTO, postId: post().id }));

    expect(screen.queryByRole("button", { name: "Apagar conversa" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Apagar resposta" })).toHaveLength(1);
  });

  it("a conversa própria pode ser apagada, e avisa que leva as respostas", async () => {
    carregarConversa.mockResolvedValue({ post: post({ meu: true }), respostas: [] });

    render(await Conversa({ eventId: EVENTO, postId: post().id }));

    expect(screen.getByRole("button", { name: "Apagar conversa" })).toBeInTheDocument();
    expect(screen.getByText("0 respostas")).toBeInTheDocument();
  });
});

describe("inspiração", () => {
  it("mostra a ideia e o estado de salva que veio do banco", async () => {
    carregarIdeias.mockResolvedValue([ideia({ salva: true })]);

    render(await Inspiracao({ eventId: EVENTO }));

    expect(screen.getByRole("button", { name: "Salva" })).toHaveAttribute("aria-pressed", "true");
  });

  it("tema inventado na URL não filtra nada", async () => {
    carregarIdeias.mockResolvedValue([]);

    render(await Inspiracao({ eventId: EVENTO, filtro: "casamento" }));

    expect(carregarIdeias).toHaveBeenCalledWith(undefined);
    expect(screen.getByText("Nada publicado neste tema ainda")).toBeInTheDocument();
  });
});
