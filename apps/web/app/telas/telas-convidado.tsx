import { texto, type Pack } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import {
  Avatar,
  BarraDeAbas,
  Botao,
  BotaoFlutuante,
  cn,
  Estrela,
  Etiqueta,
  IconeCamera,
  IconeComentario,
  IconeCompartilhar,
  IconeGrade,
  IconeMais,
  IconePessoa,
  IconePilha,
  IconeVoltar,
  Moldura,
} from "@albora/ui-web";
import type { CSSProperties, ReactNode } from "react";
import { BarraDeStatus } from "@albora/ui-web";

/**
 * As telas novas do convidado, compostas dos primitivos donos de
 * `@albora/ui-web` (shadcn-style, Tailwind + tokens) em vez do inline-style do
 * catálogo legado. Mesma regra de sempre: chão escuro por padrão (usadas às 23h
 * num salão sem luz), a estrela no lugar do coração, e o título sai do pack —
 * o componente não sabe que festa é esta.
 */

function Chao({
  children,
  fundo,
  pack,
}: {
  children: ReactNode;
  fundo: "claro" | "escuro";
  pack: Pack;
}) {
  const tokens = resolverTokens({ marca: MARCA_ALBORA, pack: { ...pack.tokens, fundo } });

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden bg-bg font-corpo text-ink"
      style={paraVariaveis(tokens) as CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Missões, a aba.
 *
 * O "explore week" e os cards de destaque da referência viram progresso da
 * noite: o card de cima é a missão de agora e leva direto à câmera, as outras
 * são lista e as feitas levam a estrela cheia. Sem placar entre pessoas — a
 * missão é convite, não competição.
 */
export function TelaMissoes({ pack }: { pack: Pack }) {
  const missoes = pack.missoes.slice(0, 4);
  const daVez = missoes[1] ?? missoes[0];
  const estados = ["feita", "agora", "aberta", "aberta"] as const;

  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">Missões</span>
        <Etiqueta>1 de 4</Etiqueta>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="px-[1.125rem] pb-4">
          <div className="relative aspect-[16/10] overflow-hidden rounded-superficie shadow-suave">
            <Moldura atmosfera variante={2} />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to top, color-mix(in srgb, var(--bg) 92%, transparent), transparent 58%)",
              }}
            />
            <span className="absolute left-3.5 top-3.5">
              <Etiqueta tom="acento">
                <span className="pulso size-1 rounded-full bg-current" />
                missão de agora
              </Etiqueta>
            </span>
            <div className="absolute inset-x-4 bottom-4">
              <p className="font-titulo text-[1.375rem] font-light leading-tight tracking-titulo">
                {texto(pack, daVez?.chaveTitulo ?? "missao.livre")}
              </p>
              <span className="mt-3 inline-block">
                <Botao tamanho="sm">
                  <IconeCamera tamanho={16} />
                  toque pra fotografar
                </Botao>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-[1.125rem]">
          {missoes.map((m, i) => {
            const estado = estados[i] ?? "aberta";
            const feita = estado === "feita";
            const agora = estado === "agora";

            return (
              <div
                key={m.id}
                className={`flex items-center gap-3.5 rounded-token p-2 ${
                  agora
                    ? "bg-acento-superficie-suave"
                    : "bg-superficie"
                }`}
              >
                <span
                  className={`relative size-12 shrink-0 overflow-hidden rounded-token ${
                    estado === "aberta" ? "opacity-50" : ""
                  }`}
                >
                  <Moldura atmosfera={estado !== "aberta"} variante={i * 6 + 3} />
                  {feita && (
                    <span className="absolute inset-0 grid place-items-center bg-bg-overlay text-ink">
                      <Estrela tamanho={20} cheia />
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{texto(pack, m.chaveTitulo)}</span>
                  <span
                    className={`mt-0.5 block text-[0.6875rem] uppercase tracking-rotulo ${
                      agora ? "text-acento-texto" : "text-ink-3"
                    }`}
                  >
                    {feita ? "feita" : agora ? "agora" : "aberta"}
                  </span>
                </span>

                {!feita && (
                  <span className="rotate-180 text-ink-3">
                    <IconeVoltar tamanho={18} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BarraDeAbas ativa="missoes" />
    </Chao>
  );
}

/**
 * Minhas, a aba.
 *
 * A aba "my uploads" da referência, sem o cabeçalho de perfil que ela carrega:
 * o convidado não tem conta, seguidores nem bio. O que ele tem é o que enviou,
 * a cota de vídeo e o direito de remover a própria foto — o que o token de
 * sessão autoriza, nada além.
 */
export function TelaMinhas({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">Minhas</span>
        <Etiqueta>14</Etiqueta>
      </div>

      <div className="px-[1.125rem] pb-3.5">
        <div className="flex items-center gap-3 rounded-token bg-superficie px-4 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie-alta">
            <span className="ml-0.5 size-0 border-y-[0.3125rem] border-l-[0.5rem] border-y-transparent border-l-ink-2" />
          </span>
          <span className="flex-1 text-[0.8125rem]">Seu vídeo grátis</span>
          <Etiqueta>1 usado</Etiqueta>
        </div>
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-3 gap-1.5 overflow-hidden px-[1.125rem]">
        {Array.from({ length: 15 }, (_, i) => (
          <span key={i} className="relative aspect-square overflow-hidden rounded-token">
            <Moldura atmosfera variante={i * 4 + 1} />
            {i === 0 && (
              <span className="absolute right-1 bottom-1 inline-flex items-center gap-1 rounded-pilula bg-bg-vidro-forte px-1.5 py-0.5 text-[0.5625rem] text-ink">
                <span className="size-0 border-y-[0.1875rem] border-l-[0.3125rem] border-y-transparent border-l-current" />
                0:47
              </span>
            )}
          </span>
        ))}
      </div>

      <BarraDeAbas ativa="minhas" />
    </Chao>
  );
}

/**
 * A foto aberta.
 *
 * O detalhe de publicação da referência, com três recusas: coração vira
 * estrela, não há @ que leve a um perfil, e compartilhar só existe na foto de
 * quem a enviou — `autorizarCompartilhamento` nega `nao_e_autor`, então na foto
 * alheia o ícone não é desabilitado, ele não é desenhado. Na própria foto entra
 * o remover, que é o que o token autoriza.
 */
export function TelaFotoAberta({ pack, propria = false }: { pack: Pack; propria?: boolean }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />

      <div className="relative aspect-[4/5] shrink-0">
        <Moldura atmosfera variante={7} />
        <div className="absolute inset-x-[1.125rem] top-3 flex justify-between">
          <BotaoFlutuante>
            <IconeVoltar />
          </BotaoFlutuante>
          <BotaoFlutuante>
            <IconeMais />
          </BotaoFlutuante>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-[1.125rem] py-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar nome="Bia" />
          <span className="flex-1">
            <span className="block text-sm">Bia</span>
            <span className="block text-[0.6875rem] text-ink-3">23h41 · Pista</span>
          </span>
          {propria && (
            <span className="inline-flex items-center gap-1.5 rounded-pilula border border-linha px-3 py-1.5 text-xs text-ink-2">
              ✕ remover
            </span>
          )}
        </div>

        <div className="flex items-center gap-5 py-3.5">
          <span className="flex items-center gap-1.5 text-ink">
            <Estrela tamanho={24} cheia />
            <span className="text-[0.84375rem]">12</span>
          </span>
          <span className="flex items-center gap-1.5">
            <IconeComentario tamanho={22} />
            <span className="text-[0.84375rem]">3</span>
          </span>
          {propria && (
            <span className="ml-auto">
              <IconeCompartilhar tamanho={21} />
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2.5 border-t border-linha pt-3.5">
          {[
            ["Tio João", "essa é a melhor da noite"],
            ["Lele", "que luz linda"],
          ].map(([nome, txt]) => (
            <p key={nome} className="text-[0.84375rem] leading-snug text-ink-2">
              <span className="text-ink">{nome}</span> {txt}
            </p>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2.5 rounded-pilula bg-superficie px-4 py-2.5">
          <span className="flex-1 text-[0.8125rem] text-ink-3">Escreva um comentário…</span>
          <span className="text-[0.78125rem] font-medium text-acento-texto">enviar</span>
        </div>
      </div>
    </Chao>
  );
}

/**
 * A capa do evento.
 *
 * A referência de "álbum do casamento" (Luis & Esther) dá o layout: foto
 * grande, o nome, os atalhos e os capítulos. Três recusas: a foto termina no
 * chão do casal, não num borrão branco; os atalhos não incluem Chat nem
 * Planning (fase 4, e conversa mora na foto); e o capítulo de agora pulsa, no
 * lugar do lápis de editar — editar é tarefa de anfitrião.
 */
export function TelaCapa({
  pack,
  momentos,
  fundo,
}: {
  pack: Pack;
  momentos: string[];
  fundo: "claro" | "escuro";
}) {
  const capitulos = momentos.slice(0, 5);
  const atalhos = [
    { r: "Álbum", v: "847", i: <IconeGrade tamanho={20} /> },
    { r: "Feed", v: "ao vivo", i: <IconePilha tamanho={20} /> },
    { r: "Missões", v: "1 de 4", i: <Estrela tamanho={20} /> },
    { r: "Convidados", v: "112", i: <IconePessoa tamanho={20} /> },
  ];

  return (
    <Chao fundo={fundo} pack={pack}>
      <div className="relative h-[20.5rem] shrink-0">
        <Moldura atmosfera variante={1} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, color-mix(in srgb, var(--bg) 30%, transparent) 0%, transparent 26%, transparent 58%, var(--bg) 100%)",
          }}
        />
        <div className="absolute inset-x-[1.125rem] top-11 flex justify-between">
          <BotaoFlutuante>
            <IconeVoltar />
          </BotaoFlutuante>
          <span className="flex gap-2">
            <BotaoFlutuante>
              <IconeCompartilhar tamanho={19} />
            </BotaoFlutuante>
            <BotaoFlutuante>
              <IconeMais />
            </BotaoFlutuante>
          </span>
        </div>
      </div>

      <div className="relative -mt-13 px-6 text-center">
        <p className="font-titulo text-[1.875rem] font-light leading-tight tracking-titulo">
          {texto(pack, "landing.exemplo.nome")}
        </p>
        <p className="mt-1.5 text-[0.8125rem] text-ink-2">8 de novembro · 112 pessoas fotografando</p>
      </div>

      <div className="grid grid-cols-4 gap-2 px-[1.125rem] pt-5 pb-[1.125rem]">
        {atalhos.map((a) => (
          <span
            key={a.r}
            className="flex flex-col items-center gap-[0.3125rem] rounded-token bg-superficie px-1 py-3 text-ink-2"
          >
            {a.i}
            <span className="text-[0.625rem] uppercase tracking-rotulo">{a.r}</span>
            <span className="text-[0.6875rem] text-ink">{a.v}</span>
          </span>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between px-[1.125rem] pb-3">
          <span className="font-titulo text-base">Os momentos</span>
          <span className="text-[0.6875rem] text-ink-3">arraste</span>
        </div>
        <div className="flex gap-2.5 overflow-hidden px-[1.125rem]">
          {capitulos.map((c, i) => {
            const central = i === 1;
            return (
              <span
                key={c}
                className={`relative aspect-[9/16] shrink-0 overflow-hidden rounded-token ${
                  central ? "w-[9.25rem]" : "w-20 opacity-60"
                }`}
              >
                <Moldura atmosfera variante={i * 6 + 2} />
                <span
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(to top, color-mix(in srgb, var(--bg) 88%, transparent), transparent 52%)",
                  }}
                />
                {central && (
                  <span className="absolute left-2 top-2">
                    <Etiqueta tom="acento">
                      <span className="pulso size-1 rounded-full bg-current" />
                      agora
                    </Etiqueta>
                  </span>
                )}
                <span
                  className={`absolute inset-x-2.5 bottom-2.5 block font-titulo leading-tight tracking-titulo ${
                    central ? "text-[0.9375rem]" : "text-[0.6875rem]"
                  }`}
                >
                  {c}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="px-6 pt-[1.125rem] pb-8">
        <Botao largura="cheia">Enviar foto</Botao>
      </div>
    </Chao>
  );
}

/**
 * O feed, depois do gate.
 *
 * A trilha de cima são os capítulos da noite, não pessoas: o Instagram põe
 * contas ali porque a rede é entre pessoas, e a Albora não é rede nenhuma. A
 * reação é a estrela; compartilhar não aparece na foto alheia (só na própria,
 * na foto aberta).
 */
export function TelaFeed({ pack, momentos }: { pack: Pack; momentos: string[] }) {
  const capitulos = momentos.slice(0, 4);

  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">
          {texto(pack, "landing.exemplo.nome")}
        </span>
        <Etiqueta>847 fotos</Etiqueta>
      </div>

      <div className="flex gap-3.5 overflow-hidden px-[1.125rem] pb-4">
        {capitulos.map((m, i) => (
          <span key={m} className="flex w-15 shrink-0 flex-col items-center gap-1.5">
            <span className={`relative size-14 rounded-full p-0.5 ${i < 2 ? "bg-acento" : "bg-linha"}`}>
              <span className="relative block size-full overflow-hidden rounded-full">
                <Moldura atmosfera variante={i * 5} />
              </span>
            </span>
            <span className="text-center text-[0.5625rem] leading-tight text-ink-2">{m}</span>
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-hidden border-t border-linha">
        <div className="flex items-center gap-2.5 px-[1.125rem] py-3.5">
          <Avatar nome="Bia" />
          <span className="flex-1 text-[0.84375rem]">Bia</span>
          <span className="text-[0.6875rem] text-ink-3">23h · Pista</span>
        </div>

        <div className="relative aspect-[4/5]">
          <Moldura atmosfera variante={7} />
        </div>

        <div className="flex items-center gap-[1.125rem] px-[1.125rem] py-2.5 text-ink">
          <span className="flex items-center gap-1.5">
            <Estrela tamanho={24} cheia />
            <span className="text-[0.84375rem]">12</span>
          </span>
          <span className="flex items-center gap-1.5">
            <IconeComentario tamanho={22} />
            <span className="text-[0.84375rem]">3</span>
          </span>
        </div>

        <p className="px-[1.125rem] text-[0.84375rem] leading-snug text-ink-2">
          <span className="text-ink">Tio João</span> essa é a melhor da noite
        </p>
      </div>

      <BarraDeAbas ativa="feed" />
    </Chao>
  );
}

/**
 * A câmera, com a missão em cima do visor.
 *
 * A missão vive dentro da tela de fotografar, não numa aba: quem está com uma
 * taça na outra mão não navega até um convite. O lugar é lista fechada (as
 * pílulas), nunca GPS — coordenada em foto de festa é exposição de LGPD.
 */
export function TelaCamera({ pack, missao }: { pack: Pack; missao: string }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">
          {texto(pack, "landing.exemplo.nome")}
        </span>
        <Etiqueta>3 na fila</Etiqueta>
      </div>

      <div className="relative mx-3 flex-1 overflow-hidden rounded-superficie">
        <Moldura atmosfera variante={3} />

        <div className="absolute inset-x-3.5 top-3.5">
          <div className="rounded-token bg-acento p-3.5 text-sobre-acento">
            <p className="text-[0.5625rem] uppercase tracking-rotulo opacity-75">Missão 03 de 04</p>
            <p className="mt-1 font-titulo text-[1.0625rem] leading-tight">{missao}</p>
          </div>
        </div>

        <div className="absolute inset-x-3.5 bottom-3.5 flex flex-wrap gap-1.5">
          {pack.lugares.slice(0, 4).map((l, i) => (
            <Etiqueta key={l.id} tom={i === 0 ? "acento" : "neutro"}>
              {texto(pack, l.chaveTitulo)}
            </Etiqueta>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-7 pt-5 pb-9">
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="relative size-[1.875rem] overflow-hidden rounded-[0.5rem]">
              <Moldura atmosfera variante={i * 4} />
            </span>
          ))}
        </span>
        <span className="grid size-[4.5rem] place-items-center justify-self-center rounded-full border-[3px] border-ink">
          <span className="size-[3.625rem] rounded-full bg-acento" />
        </span>
        <span className="justify-self-end text-[0.75rem] text-ink-3">Rolo</span>
      </div>
    </Chao>
  );
}

/**
 * O feed, antes do gate.
 *
 * A mesma aba, sem reação e sem comentário — a interação abre na hora que o
 * anfitrião escolher (ADR 0009). Desabilitar botões contaria que existe algo
 * trancado; não desenhá-los conta a verdade, que é que ainda não é hora.
 */
export function TelaAntesDoGate({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">
          {texto(pack, "landing.exemplo.nome")}
        </span>
        <Etiqueta>847 fotos</Etiqueta>
      </div>

      <div className="px-[1.125rem] pb-4">
        <div className="flex items-start gap-3 rounded-token bg-superficie px-4 py-3.5">
          <span className="pulso mt-1.5 size-[0.4375rem] shrink-0 rounded-full bg-acento" />
          <span className="text-[0.8125rem] leading-snug text-ink-2">
            As reações e os comentários abrem no horário que o anfitrião escolheu. Até lá, continue
            enviando: tudo já está indo pro álbum.
          </span>
        </div>
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-hidden px-[1.125rem]">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="relative aspect-square overflow-hidden rounded-token">
            <Moldura atmosfera variante={i * 3} />
          </span>
        ))}
      </div>

      <BarraDeAbas ativa="feed" />
    </Chao>
  );
}

/** O álbum do evento, em grade filtrada pelos capítulos do pack. */
export function TelaAlbum({ pack, momentos }: { pack: Pack; momentos: string[] }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">O álbum</span>
        <Etiqueta>847</Etiqueta>
      </div>

      <div className="flex gap-1.5 overflow-hidden px-[1.125rem] pb-3.5">
        <Etiqueta tom="acento">Tudo</Etiqueta>
        {momentos.slice(0, 3).map((m) => (
          <Etiqueta key={m}>{m}</Etiqueta>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-3 gap-0.5 overflow-hidden">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} className="relative aspect-square overflow-hidden">
            <Moldura atmosfera variante={i} />
          </span>
        ))}
      </div>

      <BarraDeAbas ativa="album" />
    </Chao>
  );
}
