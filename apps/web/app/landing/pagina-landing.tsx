import "./landing.css";
import { MARCA_ALBORA, MODELOS_DE_IDENTIDADE, paraVariaveis, resolverTokens } from "@albora/tokens";
import { texto, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";
import type { CSSProperties } from "react";
import { DemoRolagem, Missoes, Revelar, TelaoComIdentidade } from "./interativos";
import { AlbumAberto, LequeDePolaroides, LinhaDoTempo, SlotDeNoite } from "./vitrines";
import { Marca } from "./marca";
import { MarcaAnimada } from "./marca-animada";
import {
  Moldura,
  Realce,
  Rotulo,
  Titulo,
  pilulaClasses,
  pilulaClaraClasses,
  radiusStyle,
} from "./pecas";

/**
 * A landing (task 013), portada da v4 dos designers.
 *
 * Duas coisas mudam em relação ao arquivo original, e as duas são regra do
 * `CLAUDE.md`, não gosto:
 *
 * 1. **Nenhum hex.** A v4 escreve `#FFF6E9` e `#B4571F` direto; aqui cada um
 *    sai de token, e por isso a landing muda de cara junto com a identidade
 *    do evento em vez de ficar presa ao âmbar da Albora.
 * 2. **Nenhuma palavra de domínio.** Todo texto que diz "casamento" vem do
 *    pack, o que é o que faz `/15-anos` existir sem uma segunda página.
 *
 * A copy também diverge da v4 em três pontos, todos reportados: o original
 * promete "nenhum aplicativo" (contra o ADR 0008) e uma fila de aprovação de
 * moderação que o produto deliberadamente não tem.
 */

const LARGURA = "max-w-[78rem]";
const PADDING_LATERAL = "px-[clamp(1.125rem,4vw,2.75rem)]";
const PADDING_SECAO = `py-[clamp(2.5rem,6vw,5.5rem)] ${PADDING_LATERAL}`;

const PASSOS = [
  {
    titulo: "Ele aponta a câmera, e pronto",
    desc: "A placa já está na mesa. Aponta, toca no link e cai direto na tela de fotografar. Nada para baixar, nada para preencher.",
  },
  {
    titulo: "Escolhe as fotos e manda",
    desc: "No próprio celular ele marca as que já tirou e envia. Leva segundos, e funciona igual para quem tem 15 anos e para quem tem 80.",
  },
  {
    titulo: "O álbum já está lá",
    desc: "As fotos entram enquanto a festa acontece. No fim ele é seu, em resolução original, sem ninguém precisar mandar nada no dia seguinte.",
  },
] as const;

const NUMEROS = [
  { n: "4", o: "toques do QR até a primeira foto" },
  { n: "0", o: "downloads até a primeira foto" },
  { n: "48h", o: "de envio aberto depois da festa" },
  { n: "∞", o: "convidados e fotos, em todos os planos" },
] as const;

const COPIAS = [
  { legenda: "Bia · 21h", giro: "-6deg" },
  { legenda: "Tio João · 23h", giro: "3deg" },
  { legenda: "Marcos · meia-noite", giro: "-2deg" },
  { legenda: "Rafa · 02h", giro: "5deg" },
  { legenda: "Lu · amanhecer", giro: "-4deg" },
] as const;

const SUPERFICIES = [
  {
    rotulo: "Feed ao vivo",
    legenda: "A foto que alguém tirou há um minuto, do outro lado do salão.",
  },
  {
    rotulo: "Missões",
    legenda: "Um convite por vez, para quem nunca sabe o que fotografar.",
  },
  {
    rotulo: "Galeria de cada um",
    legenda: "Cada convidado vai embora com as próprias fotos no celular.",
  },
  {
    rotulo: "O álbum inteiro",
    legenda: "Tudo junto, em resolução original, no dia seguinte de manhã.",
  },
] as const;

const FATOS = [
  "Convidados e fotos sem limite, em todos os planos",
  "QR na mesa: nenhum download e nenhum cadastro até a primeira foto",
  "Fila offline: a foto sobe sozinha quando o sinal voltar",
  "Localização e dados do aparelho apagados no celular, antes de subir",
  "Feed, stories e reações liberados na hora que você escolher",
  "Telão em quatro modelos, e foto em pé nunca é cortada",
  "Envio aberto por 48 horas depois da festa",
  "Exportação para a sua nuvem no dia 330, e apagamos tudo no 365",
] as const;

const PERGUNTAS = [
  {
    q: "Meus convidados vão baixar um aplicativo?",
    a: "Não para a primeira foto. Escaneiam o QR e já fotografam pelo navegador. O aplicativo é convidado depois do primeiro envio, para quem quiser feed, stories e a própria galeria.",
  },
  {
    q: "Quanto tempo leva para montar?",
    a: "Cerca de três minutos: nome do evento, data e a identidade visual. O QR e as placas saem prontos para impressão no fim.",
  },
  {
    q: "E se a internet do salão for ruim?",
    a: "As fotos entram numa fila dentro do celular e sobem sozinhas quando o sinal voltar. Vale mesmo se a pessoa fechar a tela ou for embora no meio do envio.",
  },
  {
    q: "Quem consegue ver as fotos do meu evento?",
    a: "Só quem escaneia o seu QR. A sessão do convidado vale para um evento e não passa para nenhum outro. Nada disso aparece em busca ou em página pública.",
  },
  {
    q: "E se alguém mandar uma foto inadequada?",
    a: "Por padrão tudo aparece, porque no dia da festa ninguém vai ficar aprovando foto numa fila. O que protege roda sozinho: um filtro checa cada foto antes de ela subir, qualquer convidado pode denunciar, e você tira do ar em um toque.",
  },
  {
    q: "As fotos ficam com vocês?",
    a: "São suas. No plano pago, a exportação para a sua nuvem roda sozinha no dia 330, e no dia 365 apagamos o que estiver conosco.",
  },
] as const;

function Secao({
  children,
  id,
  className,
  revelar,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  revelar?: boolean;
}) {
  return (
    <section
      {...(id ? { id } : {})}
      className={cn("mx-auto", LARGURA, className ?? PADDING_SECAO)}
    >
      {revelar ? <Revelar>{children}</Revelar> : children}
    </section>
  );
}

export type AoVivo = { fotos: number; eventos: number };

export function PaginaLanding({ pack, aoVivo }: { pack: Pack; aoVivo?: AoVivo }) {
  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    pack: { ...pack.tokens, fundo: "claro" },
  });

  const t = (chave: string) => texto(pack, chave);

  const missoes = [...pack.missoes]
    .sort((a, b) => a.ordem - b.ordem)
    .map((m) => ({ id: m.id, titulo: t(m.chaveTitulo) }));

  const exemplo = t("landing.exemplo.nome");
  const lugares = pack.lugares.map((l) => t(l.chaveTitulo));

  const momentosDaFesta = (pack.momentos ?? []).map((m) => ({
    id: m.id,
    titulo: t(m.chaveTitulo),
    desc: t(m.chaveDesc),
  }));

  return (
    <div
      className="min-h-screen overflow-x-clip bg-bg font-corpo leading-normal text-ink"
      style={paraVariaveis(tokens) as CSSProperties}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-6 border-b border-linha bg-bg py-3.5",
          PADDING_LATERAL,
        )}
      >
        <span className="entra">
          <MarcaAnimada />
        </span>

        <nav className="nav-topo gap-[1.625rem] text-ink-2">
          <a href="#experiencia" className="elo text-inherit no-underline">
            A experiência
          </a>
          <a href="#momentos" className="elo text-inherit no-underline">
            As fotos
          </a>
          <a href="#album" className="elo text-inherit no-underline">
            O álbum
          </a>
          <a href="#identidade" className="elo text-inherit no-underline">
            Identidade
          </a>
          <a href="#livro" className="elo text-inherit no-underline">
            Livro
          </a>
          <a href="#planos" className="elo text-inherit no-underline">
            Planos
          </a>
        </nav>

        <a href="#planos" className={cn(pilulaClasses, "px-[1.375rem] py-[0.6875rem] text-sm")}>
          {t("landing.cta")}
        </a>
      </header>

      <Secao className={`pb-0 pt-[clamp(1.875rem,4vw,3.25rem)] ${PADDING_LATERAL}`}>
        <div className="relative overflow-hidden rounded-superficie bg-gradient-chao-quente">
          <div className="relative grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] items-center gap-[clamp(1.75rem,4vw,3.75rem)] p-[clamp(2.25rem,6vw,5.25rem)_clamp(1.5rem,4.5vw,4.5rem)]">
            <div>
              <span className="entra inline-flex items-center gap-2.5 rounded-pilula bg-superficie-alta py-[0.4375rem] pl-3 pr-4 text-[0.8125rem] text-ink-2">
                <span className="pulso size-1.5 rounded-full bg-acento" />
                {aoVivo
                  ? `${aoVivo.fotos.toLocaleString("pt-BR")} fotos enviadas · ${aoVivo.eventos} ${aoVivo.eventos === 1 ? "festa rolando" : "festas rolando"}`
                  : t("landing.rotulo")}
              </span>

              <h1 className="heroi-titulo entra-2 m-0 mt-6 font-titulo text-[clamp(2.5rem,5.6vw,4.625rem)] font-light leading-[1.02] tracking-titulo text-balance">
                {t("landing.titulo")} <Realce>{t("landing.titulo.destaque")}</Realce>
              </h1>

              <p className="entra-3 m-0 mt-[1.625rem] max-w-[30rem] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
                {t("landing.lede")}
              </p>

              <div className="mt-[2.125rem] flex flex-wrap gap-3">
                <a href="#planos" className={pilulaClasses}>
                  {t("landing.cta")}
                </a>
                <a href="#momentos" className={pilulaClaraClasses}>
                  Ver as fotos
                </a>
              </div>

              <p className="m-0 mt-[1.375rem] text-ink-3">
                Montar é grátis · não pedimos cartão · você decide antes de imprimir o QR
              </p>
              <p className="m-0 mt-3 text-[0.84375rem]">
                <a href="/scan" className="text-ink-3 underline">
                  Já tem o QR da festa? Escanear ou colar o link
                </a>
              </p>
            </div>

            <div className="relative flex justify-center">
              <div className="relative aspect-[9/19] w-[min(18.75rem,80vw)] rounded-superficie bg-gradient-device p-[0.5625rem] shadow-alta">
                <div
                  className="relative h-full w-full overflow-hidden"
                  style={radiusStyle("calc(var(--raio-superficie) - 0.5625rem)")}
                >
                  <Moldura rotulo="A festa, por quem estava nela" raio="calc(var(--raio-superficie) - 0.5625rem)" />
                </div>

                <span className="absolute -right-5 -top-7 grid size-[8.75rem] rotate-[5deg] place-items-center rounded-full bg-acento p-4 text-center font-titulo text-[0.9375rem] italic leading-[1.3] text-sobre-acento">
                  Fácil e rápido
                </span>
              </div>
            </div>
          </div>
        </div>
      </Secao>

      <Secao id="demo" className={`pb-0 pt-[clamp(1.875rem,4vw,3.25rem)] ${PADDING_LATERAL}`}>
        <DemoRolagem exemplo={exemplo} missao={missoes[0]?.titulo ?? t("missao.livre")} />
      </Secao>

      <Secao id="experiencia" revelar>
        <div className="rounded-superficie bg-acento-superficie-suave p-[clamp(1.75rem,4vw,3.75rem)]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(17.5rem,1fr))] items-center gap-[clamp(1.5rem,4vw,3.5rem)]">
            <div className="max-w-[26.25rem]">
              <Rotulo>A experiência do convidado</Rotulo>
              <Titulo tamanho="clamp(1.75rem, 3.6vw, 2.75rem)" className="mb-4">
                Três passos até a primeira foto.
              </Titulo>

              <p className="m-0 mb-[1.375rem] max-w-[34ch] leading-normal text-ink-2">
                Uma leitura de QR e a foto já está no álbum. Sem cadastro, sem senha e sem baixar
                nada até a primeira.
              </p>

              {PASSOS.map((p, i) => (
                <div
                  key={p.titulo}
                  className="flex items-start gap-[1.125rem] border-t border-linha py-5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie-alta font-titulo text-acento-texto">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block">{p.titulo}</span>
                    <span className="mt-[0.3125rem] block text-[0.84375rem] leading-normal text-ink-2">
                      {p.desc}
                    </span>
                  </span>
                </div>
              ))}

              <a href="#demo" className="elo mt-5 inline-block text-acento-texto">
                Ver a experiência acontecendo
              </a>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(9.375rem,1fr))] gap-[0.875rem]">
              {NUMEROS.map((x) => (
                <div key={x.o} className="cartao rounded-superficie bg-superficie-alta p-6">
                  <p className="m-0 font-titulo text-[clamp(1.875rem,3.4vw,2.625rem)] font-light tabular-nums leading-none tracking-titulo text-acento-texto">
                    {x.n}
                  </p>
                  <p className="m-0 mt-3 leading-normal text-ink-2">{x.o}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Secao>

      <Secao id="momentos" revelar>
        <Rotulo>Durante e depois da festa</Rotulo>
        <Titulo tamanho="clamp(1.875rem, 4.4vw, 3.5rem)">
          {t("landing.momentos.titulo")} <Realce>{t("landing.momentos.destaque")}</Realce>
        </Titulo>
        <p className="m-0 mt-6 max-w-[46ch] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
          {t("landing.momentos.lede")}
        </p>

        <div className="mt-[clamp(2.5rem,6vw,4.25rem)]">
          <LequeDePolaroides copias={COPIAS} />
        </div>

        <div className="mt-[clamp(2.25rem,5vw,3.75rem)] grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-x-[clamp(1.25rem,3vw,2.75rem)]">
          {SUPERFICIES.map((s) => (
            <div key={s.rotulo} className="border-t border-linha py-5">
              <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
                {s.rotulo}
              </p>
              <p className="m-0 mt-2 text-sm leading-normal text-ink-2">{s.legenda}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao revelar>
        <Missoes
          missoes={missoes}
          titulo={t("landing.missoes.titulo")}
          destaque={t("landing.missoes.destaque")}
          lede={t("landing.missoes.lede")}
        />
      </Secao>

      <Secao id="album" revelar>
        <Rotulo>O álbum, durante a festa</Rotulo>
        <Titulo tamanho="clamp(1.875rem, 4.4vw, 3.5rem)">
          Todos os momentos, cada um <Realce>no seu capítulo.</Realce>
        </Titulo>
        <p className="m-0 mt-6 mb-[clamp(2rem,4vw,3.25rem)] max-w-[46ch] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
          Cada foto chega sabendo a hora e o lugar em que foi tirada. É por isso que o álbum já
          nasce dividido nos momentos da festa, sem ninguém separar nada depois.
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(16.5rem,1fr))] gap-[clamp(0.875rem,2vw,1.5rem)]">
          {momentosDaFesta.map((m, i) => (
            <figure key={m.id} className="cartao m-0 overflow-hidden rounded-superficie">
              <SlotDeNoite variante={i} proporcao="4 / 5" />
              <figcaption className="bg-superficie-alta px-[1.125rem] pb-5 pt-[1.0625rem]">
                <span className="block font-titulo text-[1.0625rem] leading-[1.2] tracking-titulo">
                  {m.titulo}
                </span>
                <span className="mt-[0.4375rem] block text-[0.8125rem] leading-[1.45] text-ink-2">
                  {m.desc}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="m-0 mt-[clamp(2.5rem,5vw,4rem)] mb-[clamp(0.5rem,1.5vw,1rem)] text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
          E dentro de cada capítulo, na ordem da noite
        </p>

        <LinhaDoTempo />
      </Secao>

      <Secao id="identidade" revelar>
        <div className="mb-[clamp(1.5rem,3vw,2.375rem)] flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[41.25rem]">
            <Rotulo>A identidade do seu evento</Rotulo>
            <Titulo tamanho="clamp(1.875rem, 4.4vw, 3.5rem)">
              Uma decisão de cor, e ela <Realce>aparece em tudo.</Realce>
            </Titulo>
          </div>
          <p className="m-0 max-w-[20rem] leading-normal text-ink-2">{t("landing.telao.lede")}</p>
        </div>

        <TelaoComIdentidade exemplo={exemplo} />

        <p className="m-0 mt-[1.375rem] max-w-[44rem] text-ink-3">
          {t("landing.telao.titulo")} E se não tiver, nada se perde: a festa inteira acompanha
          pelo próprio celular, que é onde a maior parte das fotos é vista de qualquer jeito.
        </p>
      </Secao>

      <Secao id="livro" revelar>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(18.75rem,1fr))] items-center gap-[clamp(1.75rem,4vw,4.5rem)]">
          <AlbumAberto />
          <div>
            <Rotulo>Depois da festa</Rotulo>
            <Titulo tamanho="clamp(1.75rem, 4vw, 3.125rem)">O outro álbum da sua festa.</Titulo>
            <p className="m-0 mt-6 max-w-[28.75rem] text-[1.0625rem] leading-normal text-ink-2">
              Bastidores, ângulos que ninguém cobriu, a pista às 2h. Você encaixa cada foto no seu
              espaço e o arquivo sai pronto para a gráfica, no mesmo desenho da placa e do telão,
              sem precisar de designer.
            </p>

            <p className="m-0 mb-3 mt-[1.375rem] text-ink-2">
              E já chega separado por onde cada foto foi tirada:
            </p>
            <div className="flex flex-wrap gap-2">
              {lugares.map((lugar) => (
                <span
                  key={lugar}
                  className="rounded-pilula bg-superficie-alta px-[0.9375rem] py-[0.4375rem] text-[0.84375rem] text-ink-2"
                >
                  {lugar}
                </span>
              ))}
            </div>

            <p className="m-0 mt-[1.375rem] text-ink-3">Montar é grátis. O arquivo é seu.</p>
          </div>
        </div>
      </Secao>

      <Secao revelar>
        <div className="rounded-superficie bg-acento-superficie-suave p-[clamp(1.75rem,4vw,3.75rem)]">
          <Rotulo>O que está incluído</Rotulo>
          <Titulo tamanho="clamp(1.75rem, 3.6vw, 2.75rem)" className="max-w-[24ch]">
            Antes de falar de preço, o que você leva.
          </Titulo>

          <ul className="m-0 mt-[clamp(1.5rem,3vw,2.375rem)] grid list-none grid-cols-[repeat(auto-fit,minmax(19rem,1fr))] gap-x-[clamp(1.5rem,4vw,3.5rem)] gap-y-1 p-0">
            {FATOS.map((fato) => (
              <li
                key={fato}
                className="flex items-baseline gap-[0.875rem] border-b border-linha py-[0.9375rem] leading-normal text-ink-2"
              >
                <span className="shrink-0 text-acento-texto" aria-hidden="true">
                  ✓
                </span>
                {fato}
              </li>
            ))}
          </ul>
        </div>
      </Secao>

      <Secao id="planos" revelar>
        <Titulo
          tamanho="clamp(1.75rem, 4.2vw, 3.25rem)"
          className="mb-[clamp(1.625rem,3.5vw,2.875rem)] max-w-[41.25rem]"
        >
          {t("landing.planos.titulo")}
        </Titulo>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(16.5rem,1fr))] gap-4">
          {[
            {
              nome: "Grátis",
              preco: "R$ 0",
              periodo: "para sempre",
              itens: [
                "Convidados e fotos sem limite",
                "Missões e galeria",
                "Resolução reduzida",
                "Álbum por 30 dias",
              ],
              cta: "Criar álbum grátis",
              destaque: false,
            },
            {
              nome: `${t("landing.plano.completo")} · o mais escolhido`,
              preco: "R$ 199",
              periodo: "pagamento único",
              itens: [
                "Resolução original e vídeo",
                `Telão ao vivo nos ${MODELOS_DE_IDENTIDADE.length} modelos`,
                "Download em ZIP",
                "Identidade do evento aplicada",
                "12 meses, com exportação para a sua nuvem",
              ],
              cta: t("landing.cta"),
              destaque: true,
            },
            {
              nome: "Fornecedor",
              preco: "Sob consulta",
              periodo: "white-label",
              itens: [
                "Eventos sem limite, com a sua marca",
                "Um painel para a sua carteira",
                "Zero operação no dia da festa",
              ],
              cta: "Falar com a gente",
              destaque: false,
            },
          ].map((plano) => (
            <div
              key={plano.nome}
              className={cn(
                "cartao flex flex-col gap-5 rounded-superficie p-8",
                plano.destaque ? "bg-gradient-chao-quente" : "bg-superficie-alta",
              )}
            >
              <div>
                <p
                  className={cn(
                    "m-0 mb-3 text-[0.84375rem] font-semibold",
                    plano.destaque ? "text-acento-texto" : "text-ink-2",
                  )}
                >
                  {plano.nome}
                </p>
                <p className="m-0 font-titulo text-[2.5rem] font-light tabular-nums tracking-titulo">
                  {plano.preco}
                  <span className="mt-1.5 block font-corpo text-[0.84375rem] text-ink-2">
                    {plano.periodo}
                  </span>
                </p>
              </div>

              <ul className="m-0 flex flex-1 list-none flex-col gap-2.5 p-0 text-ink-2">
                {plano.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <a
                href="#"
                className={cn(
                  plano.destaque ? pilulaClasses : pilulaClaraClasses,
                  !plano.destaque && "bg-acento-superficie-suave",
                  "py-3.5 text-[0.90625rem]",
                )}
              >
                {plano.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="m-0 mt-5 text-ink-3">
          Nada é cobrado depois da festa. A decisão acontece antes de imprimir o QR.
        </p>
      </Secao>

      <Secao className={`pb-[clamp(3.5rem,8vw,6.875rem)] pt-0 ${PADDING_LATERAL}`}>
        <div className="max-w-[58.75rem]">
          {PERGUNTAS.map((p, i) => (
            <div
              key={p.q}
              className={cn(
                "pergunta grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-[clamp(1.125rem,4vw,3.25rem)] border-t border-linha py-[1.625rem]",
                i === PERGUNTAS.length - 1 && "border-b",
              )}
            >
              <h3 className="m-0 font-titulo text-[clamp(1.125rem,2vw,1.4375rem)] font-normal leading-[1.25]">
                {p.q}
              </h3>
              <p className="m-0 leading-[1.65] text-ink-2">{p.a}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao className={`pb-[clamp(2.5rem,6vw,5rem)] pt-0 ${PADDING_LATERAL}`}>
        <div className="relative overflow-hidden rounded-superficie bg-gradient-chao-quente p-[clamp(2.75rem,7vw,6.875rem)_clamp(1.5rem,4vw,3.75rem)] text-center">
          <div className="relative mx-auto max-w-[53.75rem]">
            <Titulo tamanho="clamp(1.75rem, 4.6vw, 3.625rem)" className="m-0 leading-[1.04]">
              {t("landing.fechamento")} <Realce>{t("landing.fechamento.destaque")}</Realce>
            </Titulo>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a href="#planos" className={pilulaClasses}>
                {t("landing.cta")}
              </a>
              <a href="#planos" className={pilulaClaraClasses}>
                Sou cerimonialista
              </a>
            </div>
          </div>
        </div>
      </Secao>

      <footer
        className={cn(
          "mx-auto flex flex-wrap items-center justify-between gap-[1.125rem] pb-11 text-ink-2",
          LARGURA,
          PADDING_LATERAL,
        )}
      >
        <span className="flex items-center gap-2.5">
          <Marca id="marca-rodape" tamanho={22} />
          <span className="font-titulo">Albora · o álbum coletivo da sua festa</span>
        </span>
        <span className="text-ink-3">Feito no Brasil</span>
      </footer>

      <div className="cta-fixo fixed bottom-3 left-3 right-3 z-[70] gap-3 rounded-pilula bg-ink p-2.5 pl-5">
        <span className="flex-1 text-[0.84375rem] leading-[1.3] text-bg">
          Montar é grátis. Leva 3 minutos.
        </span>
        <a
          href="#planos"
          className={cn(pilulaClasses, "bg-bg px-[1.375rem] py-3 text-ink")}
        >
          Criar álbum
        </a>
      </div>
    </div>
  );
}
