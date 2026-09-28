import React from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Harness de conferência visual — **não afirma nada**, por isso fica atrás de
 * `PREVIEW=1` e fora do CI.
 *
 * Renderiza os componentes reais do painel com dados de exemplo e escreve
 * fragmentos HTML. `tools/preview/montar-painel.mjs` compila o Tailwind de
 * verdade por cima deles e monta as páginas. Existe porque as telas do painel
 * pedem `getPool()` no request: ver qualquer uma delas exigiria banco e
 * `next dev`, e numa máquina em swap o dev server não responde.
 */

const SAIDA = process.env.PREVIEW_OUT ?? join(process.cwd(), ".preview-painel");

let rota = "/admin/e/evento-demo";
vi.mock("next/navigation", () => ({
  usePathname: () => rota,
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...resto }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement("a", { href: String(href), ...resto }, children),
}));
vi.mock(
  "@/features/admin/components/client/moderation-count-context",
  () => ({
    useModerationCount: () => ({ count: 3 }),
    ModerationCountProvider: ({ children }: { children: React.ReactNode }) => children,
  }),
);
vi.mock("@/features/admin/components/client/tema-do-painel-toggle", () => ({
  TemaDoPainelToggle: () => React.createElement("span", null, ""),
}));
vi.mock("@/features/admin/components/client/ajuda-do-painel", () => ({
  AjudaDoPainel: () => React.createElement("span", null, ""),
}));
vi.mock("@/features/admin/components/client/sign-out-button", () => ({
  SignOutButton: () => React.createElement("span", null, "Sair"),
}));

const EVENTO = {
  id: "evento-demo",
  nome: "Clevesson & Miriã",
  data: "12 de dezembro de 2027",
  monograma: "C&M",
};
const PERFIL = { nome: "clevesson@exemplo.com", plano: "Plano Completo" };

function escrever(nome: string, markup: string) {
  mkdirSync(SAIDA, { recursive: true });
  writeFileSync(join(SAIDA, `${nome}.html`), markup, "utf8");
}

describe("harness do painel", () => {
  /**
   * Roda sempre: um arquivo de teste sem teste coletado reprova a suíte, e a
   * casca estourar na renderização é regressão de verdade — typecheck não pega.
   */
  it("a casca renderiza nos dois escopos sem estourar", async () => {
    const { CascaDoPainel } = await import("./components/client/casca-do-painel");

    for (const evento of [EVENTO, null]) {
      const markup = renderToStaticMarkup(
        <CascaDoPainel evento={evento} perfil={PERFIL} hoje="hoje" raiz="Meu evento">
          <p>conteúdo</p>
        </CascaDoPainel>,
      );

      expect(markup).toContain("Comunidade");
      expect(markup).toContain("Meus eventos");
    }
  });

  it.runIf(process.env.PREVIEW === "1")("escreve os fragmentos das telas", async () => {
    const { adminVars } = await import("./lib/chrome-do-painel");
    mkdirSync(SAIDA, { recursive: true });
    writeFileSync(
      join(SAIDA, "vars.json"),
      JSON.stringify({ claro: adminVars("light"), escuro: adminVars("dark") }, null, 2),
      "utf8",
    );

    const { CascaDoPainel } = await import("./components/client/casca-do-painel");
    const kit = await import("./components/server/kit-do-painel");
    const { InspiracaoSalvar } = await import("./components/client/inspiracao-salvar");

    const {
      IntroDaPagina,
      FaixaDeDestaque,
      Cartao,
      CabecalhoDeCartao,
      Estatistica,
      Estatisticas,
      Etiqueta,
      NotaVazia,
      VazioIlustrado,
      Aviso,
      GradeDePaineis,
      ColunaDeApoio,
      Progresso,
      botaoDoPainel,
      acaoTextual,
    } = kit;

    const casca = (conteudo: React.ReactNode, evento: typeof EVENTO | null = EVENTO) =>
      renderToStaticMarkup(
        <CascaDoPainel evento={evento} perfil={PERFIL} hoje="sábado, 12 de dezembro de 2027" raiz={evento ? "Meu evento" : "Meu espaço"}>
          {conteudo}
        </CascaDoPainel>,
      );

    // ── Visão geral ──────────────────────────────────────────────
    rota = "/admin/e/evento-demo";
    escrever(
      "01-visao-geral",
      casca(
        <>
          <IntroDaPagina
            eyebrow="Seu evento"
            titulo="Cada encontro merece ser lembrado."
            subtitulo="Preparem o evento e guardem cada olhar desse dia."
            acao={<a className={botaoDoPainel({ variant: "primary" })}>Compartilhar convite</a>}
          />
          <div className="mb-6 rounded-[17px] bg-gradient-chao-quente p-[clamp(1.5rem,4vw,3rem)]">
            <Etiqueta tom="atencao">Celebração</Etiqueta>
            <h2 className="m-0 mt-4 font-[family-name:var(--fonte-titulo)] text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] tracking-[var(--tracking-titulo)] text-ink">
              Clevesson &amp; Miriã
            </h2>
            <p className="m-0 mt-2 text-sm text-ink-2">12 de dezembro de 2027</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a className={botaoDoPainel({ variant: "gold" })}>Personalizar evento →</a>
              <a className={botaoDoPainel({ variant: "outline" })}>Ver página do evento</a>
            </div>
            <div className="mt-8 grid max-w-md grid-cols-4 gap-3 rounded-xl border border-linha bg-superficie p-4 text-center">
              {[["439", "dias"], ["14", "horas"], ["10", "min"], ["13", "seg"]].map(([v, l]) => (
                <div key={l}>
                  <b className="block font-[family-name:var(--fonte-titulo)] text-[1.75rem] leading-none text-ink">{v}</b>
                  <small className="text-[11px] uppercase tracking-[0.15em] text-ink-2">{l}</small>
                </div>
              ))}
            </div>
          </div>
          <Estatisticas>
            <Estatistica icone={<span>◍</span>} valor="04" legenda="fotos no álbum" selo="Exemplos" />
            <Estatistica icone={<span>◍</span>} valor="03" legenda="convidados" />
            <Estatistica icone={<span>◍</span>} valor="03" legenda="fotos em destaque" />
          </Estatisticas>
          <GradeDePaineis>
            <Cartao>
              <CabecalhoDeCartao titulo="Deixe tudo pronto" subtitulo="Cinco passos antes da festa." acao={<a className={acaoTextual}>Ver guia →</a>} />
              <Progresso feitos={2} total={5} />
              <NotaVazia>O álbum deste evento está pronto para receber as primeiras memórias.</NotaVazia>
            </Cartao>
            <ColunaDeApoio>
              <Cartao>
                <CabecalhoDeCartao titulo="Acesso rápido" />
                <div className="flex flex-wrap gap-2">
                  <a className={botaoDoPainel({ variant: "light" })}>Meu QR</a>
                  <a className={botaoDoPainel({ variant: "light" })}>Álbum</a>
                  <a className={botaoDoPainel({ variant: "light" })}>Telão</a>
                </div>
              </Cartao>
            </ColunaDeApoio>
          </GradeDePaineis>
        </>,
      ),
    );

    // ── Álbum ────────────────────────────────────────────────────
    rota = "/admin/e/evento-demo/album";
    escrever(
      "02-album",
      casca(
        <>
          <IntroDaPagina eyebrow="Memórias" titulo="Álbum" subtitulo="As fotos enviadas pelos convidados ficam aqui." acao={<a className={botaoDoPainel({ variant: "primary" })}>Como receber fotos</a>} />
          <FaixaDeDestaque eyebrow="Álbum de memórias" titulo="Tudo que os convidados viram." descricao="Cada foto entra aqui assim que chega, e você decide o que vai para a parede." />
          <div className="mb-5 flex flex-wrap gap-2">
            {[["Todas · 4", true], ["Aprovadas · 3", false], ["Para revisar · 1", false]].map(([r, a]) => (
              <span key={String(r)} className={["inline-flex min-h-11 items-center rounded-pilula border px-4 text-[13px] font-bold", a ? "border-ink bg-ink text-bg" : "border-linha bg-superficie text-ink-2"].join(" ")}>{r}</span>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {["O buquê", "A pista", "Os detalhes", "Nós dois"].map((t) => (
              <Cartao key={t} className="p-0">
                <div className="aspect-[4/5] rounded-t-[17px] bg-gradient-chao-quente" />
                <div className="p-4">
                  <strong className="block text-sm text-ink">{t}</strong>
                  <small className="text-[12px] text-ink-2">22:14 · 8 curtidas</small>
                </div>
              </Cartao>
            ))}
          </div>
          <Aviso titulo="Cada evento tem seu próprio álbum" descricao="Nada do que entra aqui aparece em outro evento." acao={<a className={botaoDoPainel({ variant: "light" })}>Compartilhar convite</a>} />
        </>,
      ),
    );

    // ── Comunidade (escopo da conta) ─────────────────────────────
    rota = "/admin/comunidade";
    escrever(
      "03-comunidade",
      casca(
        <>
          <IntroDaPagina eyebrow="Entre anfitriões" titulo="Comunidade" subtitulo="Quem já passou por isso conta como fez." acao={<a className={botaoDoPainel({ variant: "primary" })}>Fazer uma pergunta</a>} />
          <FaixaDeDestaque eyebrow="Uma boa ideia merece ser compartilhada" titulo="Ninguém organiza um evento sozinho." descricao="As conversas ficam entre anfitriões — nada do que está aqui aparece para os convidados do seu evento." />
          <GradeDePaineis>
            <Cartao>
              <div className="mb-5 flex flex-wrap gap-2">
                {[["Todos", true], ["Dúvida", false], ["Ideia", false], ["Experiência", false], ["Indicação", false]].map(([r, a]) => (
                  <span key={String(r)} className={["inline-flex min-h-11 items-center rounded-pilula border px-4 text-[13px]", a ? "border-transparent bg-ink text-bg" : "border-linha bg-superficie text-ink-2"].join(" ")}>{r}</span>
                ))}
              </div>
              <div className="rounded-xl border border-linha p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Etiqueta tom="positivo">Dúvida</Etiqueta>
                  <small className="text-[12px] text-ink-2">28 de set. · sua</small>
                </div>
                <strong className="block font-[family-name:var(--fonte-titulo)] text-[1.0625rem] text-ink">Quantas missões vocês deixaram ativas?</strong>
                <p className="m-0 mt-1 text-[13px] text-ink-2">Estou na dúvida entre três e seis. Alguém já testou os dois?</p>
                <small className="mt-2 block text-[12px] text-acento-texto">1 resposta</small>
              </div>
            </Cartao>
            <ColunaDeApoio>
              <Cartao>
                <CabecalhoDeCartao titulo="Inspire-se" subtitulo="Ideias prontas para adaptar." />
                <a className={botaoDoPainel({ variant: "gold", width: "full" })}>Explorar ideias →</a>
              </Cartao>
            </ColunaDeApoio>
          </GradeDePaineis>
        </>,
        null,
      ),
    );

    // ── Inspiração (escopo da conta) ─────────────────────────────
    rota = "/admin/inspiracao";
    escrever(
      "04-inspiracao",
      casca(
        <>
          <IntroDaPagina eyebrow="Descubra possibilidades" titulo="Inspiração" subtitulo="O melhor da festa é viver. As lembranças ficam." />
          <FaixaDeDestaque eyebrow="Explore por tema" titulo="Ideias que já funcionaram em outras festas." descricao="Formas de pedir foto sem cobrar, onde colocar o QR e o que combinar antes de projetar." />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["Fotos", "Os detalhes que contam a história", "O bolo, o buquê e o sapato no canto do quarto somem em meia hora e quase nunca entram na foto oficial.", false],
              ["Decoração", "O QR integrado à decoração", "Placa na mesa de entrada, no bar e perto do banheiro — onde a pessoa está parada com a mão livre.", true],
              ["Experiência", "Convide, sem cobrar", "Missão é convite, não tarefa. Poucas funcionam melhor que uma lista que parece dever de casa.", false],
            ].map(([tema, titulo, corpo, salva]) => (
              <Cartao key={String(titulo)} className="flex flex-col gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-acento-texto">{tema}</span>
                <h2 className="m-0 font-[family-name:var(--fonte-titulo)] text-[1.125rem] text-ink">{titulo}</h2>
                <p className="m-0 flex-1 text-[13px] leading-relaxed text-ink-2">{corpo}</p>
                <div><InspiracaoSalvar ideiaId="x" titulo={String(titulo)} salva={Boolean(salva)} /></div>
              </Cartao>
            ))}
          </div>
          <Aviso titulo="Comece pelo convite" descricao="Mostrar onde enviar a foto é o que mais aumenta a participação." acao={<a className={botaoDoPainel({ variant: "light" })}>Meus eventos →</a>} />
        </>,
        null,
      ),
    );

    // ── Hero sobre capa, no pior caso: foto branca ───────────────
    rota = "/admin/e/evento-demo";
    const { adminVars: vars } = await import("./lib/chrome-do-painel");
    const branco =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='white'/%3E%3C/svg%3E";
    escrever(
      "06-hero-capa",
      casca(
        <>
          <IntroDaPagina eyebrow="Seu evento" titulo="Hero sobre a capa" subtitulo="Fundo branco de propósito: é o pior caso para o scrim." />
          <section
            style={vars("dark")}
            className="relative mb-6 overflow-hidden rounded-[17px] bg-bg text-ink shadow-alta"
          >
            <img src={branco} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-hero-capa" />
            <div className="relative grid gap-8 p-[clamp(1.5rem,4vw,3rem)] lg:grid-cols-2 lg:items-center">
              <div className="min-w-0">
                <span className="inline-flex rounded-pilula bg-superficie-alta px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-acento-texto">
                  ✦ Celebração
                </span>
                <div className="my-4 h-px w-16 bg-linha" aria-hidden />
                <h2 id="hero-nome" className="m-0 font-[family-name:var(--fonte-titulo)] text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] tracking-[var(--tracking-titulo)] text-ink">
                  Clevesson &amp; Miriã
                </h2>
                <p id="hero-data" className="m-0 mt-3 text-sm text-ink-2">12 de dezembro de 2027</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <a className={botaoDoPainel({ variant: "gold" })}>Personalizar evento →</a>
                  <a className={botaoDoPainel({ variant: "outline" })}>Ver página do evento</a>
                </div>
              </div>
              <div className="rounded-[17px] border border-linha bg-superficie-alta p-6">
                <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-2">Contagem regressiva</div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[["439", "dias"], ["14", "horas"], ["10", "min"], ["13", "seg"]].map(([v, l]) => (
                    <div key={l}>
                      <b className="block font-[family-name:var(--fonte-titulo)] text-[1.75rem] leading-none text-ink">{v}</b>
                      <small className="text-[11px] uppercase tracking-[0.15em] text-ink-2">{l}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>,
      ),
    );

    // ── Vazios ───────────────────────────────────────────────────
    rota = "/admin/e/evento-demo/telao";
    escrever(
      "05-vazios",
      casca(
        <>
          <IntroDaPagina eyebrow="Ao vivo" titulo="Telão" subtitulo="A tela do salão mostrando as fotos conforme elas chegam." acao={<a className={botaoDoPainel({ variant: "primary" })}>Visualizar telão</a>} />
          <GradeDePaineis>
            <Cartao>
              <CabecalhoDeCartao titulo="Prévia" subtitulo="É isto que aparece na tela do salão." />
              <div className="grid aspect-video place-items-center rounded-xl bg-gradient-chao-quente text-center">
                <p className="m-0 font-[family-name:var(--fonte-titulo)] text-[clamp(1.5rem,4vw,2.5rem)] text-ink">Clevesson &amp; Miriã</p>
              </div>
            </Cartao>
            <ColunaDeApoio>
              <Cartao>
                <CabecalhoDeCartao titulo="Estados vazios" />
                <VazioIlustrado icone={<span className="text-[28px]">◌</span>} titulo="Nenhuma conversa ainda" descricao="A primeira pergunta pode ser a sua — é assim que o resto aparece." />
              </Cartao>
            </ColunaDeApoio>
          </GradeDePaineis>
        </>,
      ),
    );
  });
});
