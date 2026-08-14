import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import { cn } from "@albora/ui-web";
import type { CSSProperties } from "react";
import { hourLabel } from "@/features/feed/lib/group-by-hour";
import { Moldura } from "./pecas";

/**
 * As vitrines: papelaria, álbum aberto e a linha do tempo da noite.
 *
 * Nenhuma delas usa foto, e isso é decisão, não falta. Todas as três são
 * desenhadas com os mesmos tokens do evento — trocar a identidade redesenha
 * as três de uma vez, que é a prova do ADR 0003 que a página vende. Uma
 * captura de tela de peça pronta não provaria nada disso: ficaria congelada
 * numa identidade só.
 */

function Olho({ canto, miolo }: { canto: CSSProperties; miolo: string }) {
  return (
    <span
      className="absolute grid w-[30%] place-items-center bg-ink"
      style={{ height: "30%", ...canto }}
    >
      <span className="grid h-[60%] w-[60%] place-items-center bg-bg">
        <span className="bg-ink" style={{ width: miolo, height: miolo }} />
      </span>
    </span>
  );
}

/**
 * `celula` é a aresta de um módulo em porcentagem do quadro.
 *
 * Um QR de 40px com módulo de 13% vira cinza: os olhos somem e a peça lê como
 * caixa vazia. Peça pequena recebe módulo grande, que é o que uma gráfica
 * faria de qualquer jeito.
 */
function Qr({ tamanho, celula = "13.5%" }: { tamanho: string; celula?: string }) {
  return (
    <span
      className="block rounded-[calc(var(--raio)/2)] border border-ink-borda bg-bg p-[7%]"
      style={{ width: tamanho, height: tamanho }}
    >
      <span
        className="relative block h-full w-full bg-bg"
        style={{
          backgroundImage: "repeating-conic-gradient(var(--ink) 0 25%, var(--bg) 0 50%)",
          backgroundSize: `${celula} ${celula}`,
        }}
      >
        <Olho canto={{ top: 0, left: 0 }} miolo="55%" />
        <Olho canto={{ top: 0, right: 0 }} miolo="55%" />
        <Olho canto={{ bottom: 0, left: 0 }} miolo="55%" />
      </span>
    </span>
  );
}

/**
 * A polaroid: moldura montada, esperando a foto.
 *
 * O quadro da foto entra no chão **escuro** porque foto de festa é foto de
 * noite. É o mesmo resolvedor do app do convidado às 23h, não uma paleta
 * invertida à mão, e é o que faz a cópia impressa e a tela combinarem.
 *
 * A margem de baixo é mais grossa que as outras três. Essa desproporção é a
 * polaroid; com margem igual vira moldura de quadro.
 */
export function Polaroid({
  legenda,
  giro,
  src,
  variante = 0,
  largura = "min(13.5rem, 44vw)",
}: {
  legenda: string;
  giro: string;
  src?: string;
  variante?: number;
  largura?: string;
}) {
  const noite = resolveTokens({ marca: ALBORA_BRAND, pack: { fundo: "escuro" } });

  return (
    <figure
      className="polaroide m-0 shrink-0 bg-superficie-alta px-[0.6875rem] pt-[0.6875rem] shadow-alta"
      style={{ width: largura, transform: `rotate(${giro})` }}
    >
      <div
        className="relative aspect-square"
        style={toVariables(noite) as CSSProperties}
      >
        <Moldura rotulo="" raio="0rem" atmosfera variante={variante} {...(src ? { src } : {})} />
      </div>
      <figcaption className="px-0.5 pb-[1.125rem] pt-[0.9375rem] text-center text-[0.625rem] uppercase tracking-rotulo text-ink-3">
        {legenda}
      </figcaption>
    </figure>
  );
}

/**
 * Um quadro de foto no chão da noite, para quem chama estar no chão claro.
 *
 * Foto de festa é foto de madrugada. Um slot claro sobre papel claro some, e
 * um capítulo do álbum que some não anuncia capítulo nenhum.
 */
export function SlotDeNoite({
  variante,
  proporcao,
  raio: curvatura = "0rem",
}: {
  variante: number;
  proporcao: string;
  raio?: string;
}) {
  const noite = resolveTokens({ marca: ALBORA_BRAND, pack: { fundo: "escuro" } });

  return (
    <div
      className="relative"
      style={{
        ...(toVariables(noite) as CSSProperties),
        aspectRatio: proporcao,
      }}
    >
      <Moldura rotulo="" raio={curvatura} atmosfera variante={variante} />
    </div>
  );
}

/** O leque de cópias sobre a mesa, sobrepostas como quem espalhou. */
export function LequeDePolaroides({
  copias,
}: {
  copias: readonly { legenda: string; giro: string; src?: string }[];
}) {
  return (
    <div className="leque">
      {copias.map((c, i) => (
        <Polaroid key={c.legenda} variante={i} {...c} />
      ))}
    </div>
  );
}

function Papel({
  children,
  proporcao,
  className,
}: {
  children: React.ReactNode;
  proporcao: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-token bg-bg p-[var(--espaco)] font-corpo text-ink shadow-suave",
        className,
      )}
      style={{ aspectRatio: proporcao }}
    >
      {children}
    </div>
  );
}

/**
 * O que vai impresso na mesa: a placa, o cartão, a carta e o selo.
 *
 * Fica **dentro** do escopo de variáveis de quem chama, de propósito. É a
 * cascata que troca a identidade das quatro peças, sem uma prop atravessando
 * quatro componentes para dizer a mesma coisa que o CSS já sabe.
 */
export function Papelaria({ exemplo }: { exemplo: string }) {
  return (
    <div className="grid auto-rows-start grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-[clamp(0.875rem,2vw,1.5rem)]">
      <figure className="m-0">
        <Papel proporcao="5 / 7" className="items-center gap-3 text-center">
          <span className="font-titulo text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
            {exemplo}
          </span>
          <span className="grid min-h-0 w-full flex-1 place-items-center">
            <Qr tamanho="min(7rem, 62%)" />
          </span>
          <span className="font-titulo text-[clamp(0.9375rem,1.5vw,1.1875rem)] leading-[1.15] tracking-titulo">
            Aponte a câmera
          </span>
          <span className="text-[0.6875rem] leading-[1.4] text-ink-2">
            As fotos desta noite ficam todas no mesmo lugar
          </span>
        </Papel>
        <Legenda>A placa da mesa</Legenda>
      </figure>

      <figure className="m-0">
        <Papel proporcao="5 / 7" className="gap-[0.6875rem]">
          <span className="font-titulo text-[0.625rem] uppercase tracking-rotulo text-acento-texto">
            Para quem estava lá
          </span>
          <span className="font-titulo text-[clamp(0.9375rem,1.6vw,1.25rem)] leading-[1.18] tracking-titulo">
            Você vai ver coisas hoje que mais ninguém vai ver.
          </span>
          <span className="flex-1 text-[0.6875rem] leading-normal text-ink-2">
            Fotografe do seu jeito. Tudo cai no mesmo álbum, e no fim da noite ele é de todo mundo
            que estava aqui.
          </span>
          <span className="flex items-center gap-2 border-t border-linha pt-2.5">
            <Qr tamanho="2.5rem" celula="25%" />
            <span className="text-[0.625rem] leading-[1.3] text-ink-3">{exemplo}</span>
          </span>
        </Papel>
        <Legenda>A carta do convite</Legenda>
      </figure>

      <figure className="m-0">
        <Papel proporcao="5 / 7" className="justify-between bg-acento text-sobre-acento">
          <span className="font-titulo text-[clamp(1.0625rem,1.9vw,1.5rem)] leading-[1.1] tracking-titulo">
            A noite inteira,
            <br />
            vista por dentro.
          </span>
          <span className="flex items-center gap-[0.6875rem]">
            <Qr tamanho="2.75rem" celula="25%" />
            <span className="font-titulo text-[0.75rem] italic leading-[1.25]">
              aponte
              <br />a câmera
            </span>
          </span>
        </Papel>
        <Legenda>O selo do envelope</Legenda>
      </figure>

      <figure className="m-0">
        <Papel proporcao="5 / 7" className="gap-0 p-0">
          <span className="relative min-h-0 flex-1">
            <Moldura rotulo="" raio="var(--raio)" />
          </span>
          <span className="flex flex-col gap-[0.1875rem] px-[var(--espaco)] pb-[var(--espaco)] pt-3">
            <span className="font-titulo text-[clamp(0.875rem,1.4vw,1.0625rem)] tracking-titulo">
              {exemplo}
            </span>
            <span className="text-[0.625rem] text-ink-3">O livro impresso, mesma capa</span>
          </span>
        </Papel>
        <Legenda>A capa do livro</Legenda>
      </figure>
    </div>
  );
}

function Legenda({ children }: { children: React.ReactNode }) {
  return (
    <figcaption className="mt-3 text-center text-[0.6875rem] uppercase tracking-rotulo text-ink-2">
      {children}
    </figcaption>
  );
}

/**
 * O livro aberto, diagramado por slots.
 *
 * Slots e não posicionamento livre porque é isso que o produto é: o
 * `CLAUDE.md` recusa editor de canvas, e uma landing que mostrasse foto
 * arrastada em qualquer lugar prometeria a ferramenta errada.
 */
export function AlbumAberto() {
  return (
    <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-superficie bg-ink-superficie p-0.5 shadow-alta">
      <div className="grid aspect-[3/4] grid-cols-2 grid-rows-[1.35fr_1fr_auto] gap-2 bg-bg p-[clamp(0.75rem,1.8vw,1.375rem)]">
        <div className="col-span-2">
          <SlotDeNoite variante={2} proporcao="16 / 11" raio="calc(var(--raio) / 1.5)" />
        </div>
        <SlotDeNoite variante={5} proporcao="1" raio="calc(var(--raio) / 1.5)" />
        <SlotDeNoite variante={8} proporcao="1" raio="calc(var(--raio) / 1.5)" />
        <p className="col-span-2 m-0 font-titulo text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          {hourLabel(23)} · a mesa
        </p>
      </div>

      <div className="grid aspect-[3/4] grid-rows-[1fr_auto] gap-2 bg-bg p-[clamp(0.75rem,1.8vw,1.375rem)]">
        <SlotDeNoite variante={11} proporcao="3 / 4" raio="calc(var(--raio) / 1.5)" />
        <p className="m-0 font-titulo text-[clamp(0.8125rem,1.5vw,1.0625rem)] font-light leading-[1.3] tracking-titulo text-ink-2">
          Ninguém pediu esta foto. Ela apareceu.
        </p>
      </div>
    </div>
  );
}

/**
 * A noite se ordenando sozinha.
 *
 * As faixas saem de `hourLabel`, a mesma função que ordena o álbum de
 * verdade. Se um dia o formato da hora mudar lá, muda aqui junto.
 */
const NOITE = [
  { hora: 19, titulo: "A chegada", fotos: 34, tiras: 3 },
  { hora: 21, titulo: "A mesa", fotos: 118, tiras: 6 },
  { hora: 23, titulo: "A pista", fotos: 306, tiras: 11 },
  { hora: 2, titulo: "O fim", fotos: 89, tiras: 5 },
] as const;

export function LinhaDoTempo() {
  return (
    <div className="flex flex-col">
      {NOITE.map((faixa, i) => (
        <div
          key={faixa.hora}
          className={cn(
            "grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-[clamp(0.875rem,2.5vw,2rem)] py-[clamp(0.875rem,2vw,1.375rem)]",
            i > 0 && "border-t border-linha",
          )}
        >
          <div>
            <p className="m-0 font-titulo text-[clamp(1.125rem,2.2vw,1.625rem)] font-light tabular-nums leading-none tracking-titulo text-acento-texto">
              {hourLabel(faixa.hora)}
            </p>
            <p className="mt-[0.3125rem] text-xs text-ink-3">{faixa.titulo}</p>
          </div>

          <div className="flex min-w-0 items-center gap-[0.875rem]">
            <div className="faixa-fotos flex min-w-0 gap-[0.3125rem]">
              {Array.from({ length: faixa.tiras }, (_, n) => (
                <div
                  key={n}
                  className="h-[clamp(2.75rem,5.5vw,4.25rem)] shrink-0 shadow-suave"
                >
                  <SlotDeNoite variante={faixa.hora + n} proporcao="3 / 4" />
                </div>
              ))}
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-ink-3">
              {faixa.fotos} fotos
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
