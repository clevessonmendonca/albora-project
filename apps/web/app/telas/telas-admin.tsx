import {
  MODELOS_DE_TELAO,
  PERFIS,
  padroesDoEvento,
  problemasDaEscolha,
  type ModeloDeTelao,
} from "@albora/core";
import { texto, type Pack } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import {
  Botao,
  Cartao,
  cn,
  Etiqueta,
  IconeGrade,
  IconeMais,
  IconePessoa,
  IconePilha,
  Interruptor,
  Moldura,
} from "@albora/ui-web";
import type { CSSProperties, ReactNode } from "react";
import { BarraDeStatus } from "./pecas-de-tela";

/**
 * O anfitrião no app — mobile-first.
 *
 * Quem opera a festa no dia é o casal ou a cerimonialista, de pé no salão, com
 * o celular na mão — não num notebook. Por isso o admin também é app: controlar
 * o gate, segurar uma foto, ver a participação, tudo com o polegar.
 *
 * Chão claro (lido em pé, com luz), ao contrário do convidado. As decisões e os
 * números saem de `@albora/core` (`padroesDoEvento`), nunca redigitados aqui —
 * senão a tela conta uma política e o servidor aplica outra.
 */

function ChaoAdmin({ children, pack }: { children: ReactNode; pack: Pack }) {
  const tokens = resolverTokens({ marca: MARCA_ALBORA, pack: { ...pack.tokens, fundo: "claro" } });

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden bg-bg font-corpo text-ink"
      style={paraVariaveis(tokens) as CSSProperties}
    >
      {children}
    </div>
  );
}

function IconeSinal({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.5 21V4.2m0 1.1c4.2-2 8.3 2 14 0v8.8c-5.7 2-9.8-2-14 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

type SecaoAdmin = "aovivo" | "parede" | "moderacao" | "convidados" | "mais";

/**
 * A barra do admin no app. Sem câmera no meio — o anfitrião não fotografa daqui;
 * ele controla. As seções pesadas (identidade, livro, retenção) moram em "Mais",
 * porque o que se mexe no salão é gate, parede, fila e participação.
 */
function NavAdmin({ ativa }: { ativa: SecaoAdmin }) {
  const abas = [
    { id: "aovivo", rotulo: "Ao vivo", icone: <IconePilha /> },
    { id: "parede", rotulo: "Parede", icone: <IconeGrade /> },
    { id: "moderacao", rotulo: "Fila", icone: <IconeSinal /> },
    { id: "convidados", rotulo: "Convidados", icone: <IconePessoa /> },
    { id: "mais", rotulo: "Mais", icone: <IconeMais tamanho={22} /> },
  ] as const;

  return (
    <nav className="flex items-center justify-around border-t border-linha bg-bg px-2 pt-2.5 pb-[1.625rem]">
      {abas.map((a) => (
        <span
          key={a.id}
          className={`flex flex-col items-center gap-1 text-[0.5625rem] uppercase tracking-rotulo ${
            a.id === ativa ? "text-acento" : "text-ink-3"
          }`}
        >
          {a.icone}
          {a.rotulo}
        </span>
      ))}
    </nav>
  );
}

/**
 * Ao vivo, no bolso.
 *
 * A primeira dobra é o gate, porque é a decisão que o anfitrião mais volta pra
 * mexer. O interruptor de menores é o único lugar do produto onde menor aparece
 * — e não pergunta idade. Os três efeitos derivam de `padroesDoEvento`.
 */
export function TelaAdminPainel({ pack, haMenores = false }: { pack: Pack; haMenores?: boolean }) {
  const padroes = padroesDoEvento({ haMenores });

  const stats = [
    { n: "847", o: "fotos enviadas" },
    { n: "112", o: "convidados" },
    { n: "4", o: "missões abertas" },
    {
      n: "0",
      o:
        padroes.denunciasParaSegurar === 1
          ? "denúncias · 1 segura"
          : `denúncias · ${padroes.denunciasParaSegurar} seguram`,
    },
  ];

  return (
    <ChaoAdmin pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <div>
          <p className="font-titulo text-[1.375rem] leading-tight tracking-titulo">
            {texto(pack, "landing.exemplo.nome")}
          </p>
          <p className="text-[0.75rem] text-ink-3">A festa está acontecendo</p>
        </div>
        <Etiqueta tom="acento">
          <span className="pulso size-1 rounded-full bg-current" />
          ao vivo
        </Etiqueta>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div key={s.o} className="rounded-token bg-superficie p-4 shadow-suave">
              <p className="font-titulo text-[1.75rem] font-light leading-none tabular-nums text-acento-texto">
                {s.n}
              </p>
              <p className="mt-1.5 text-[0.75rem] text-ink-2">{s.o}</p>
            </div>
          ))}
        </div>

        <Cartao destacado className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-titulo text-base">Reações e comentários</p>
              <p className="mt-0.5 text-[0.78125rem] text-ink-2">
                {padroes.gateComecaFechado
                  ? "Começam fechados. Você abre quando quiser."
                  : "Abrem às 22h30. Você escolhe a hora."}
              </p>
            </div>
            <Interruptor ligado={!padroes.gateComecaFechado} rotulo="Gate de interação" />
          </div>
        </Cartao>

        <Cartao className="mt-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-titulo text-base">Há menores na festa</p>
              <p className="mt-0.5 text-[0.78125rem] text-ink-2">
                Sobe o piso pra todo mundo. Não perguntamos a idade de ninguém.
              </p>
            </div>
            <Interruptor ligado={haMenores} rotulo="Há menores na festa" />
          </div>
        </Cartao>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          Chegando agora
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="relative aspect-[3/4] overflow-hidden rounded-token">
              <Moldura atmosfera variante={i * 6} />
            </span>
          ))}
        </div>
      </div>

      <NavAdmin ativa="aovivo" />
    </ChaoAdmin>
  );
}

/**
 * A fila de moderação, no app.
 *
 * Nada sai do ar sozinho: a denúncia segura, não apaga, e quem decide é o
 * anfitrião. O classificador só sinaliza, e sempre fora do caminho crítico do
 * upload.
 */
export function TelaAdminModeracao({ pack }: { pack: Pack }) {
  const fila = [
    { motivo: "Sinalizada por um convidado", meta: "23h41 · Pista", variante: 3 },
    { motivo: "Marcada pelo classificador", meta: "23h38 · Mesa", variante: 9 },
  ];

  return (
    <ChaoAdmin pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Moderação</p>
        <Etiqueta>{fila.length} na fila</Etiqueta>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-3 text-[0.8125rem] text-ink-2">
          Nada sai do ar sozinho — você decide. A denúncia segura a foto, não apaga.
        </p>

        <div className="flex flex-col gap-2.5">
          {fila.map((f) => (
            <div key={f.motivo} className="flex gap-3 rounded-token bg-superficie p-2.5 shadow-suave">
              <span className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-token">
                <Moldura atmosfera variante={f.variante} />
              </span>
              <div className="flex flex-1 flex-col">
                <p className="text-[0.8125rem]">{f.motivo}</p>
                <p className="mt-0.5 text-[0.6875rem] text-ink-3">{f.meta}</p>
                <div className="mt-auto flex gap-2 pt-2">
                  <span className="flex-1">
                    <Botao tamanho="sm" variante="secundario" largura="cheia">
                      Manter
                    </Botao>
                  </span>
                  <span className="flex-1">
                    <Botao tamanho="sm" largura="cheia">
                      Ocultar
                    </Botao>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <NavAdmin ativa="moderacao" />
    </ChaoAdmin>
  );
}

const NOMES_DOS_MODELOS: Readonly<Record<ModeloDeTelao, string>> = {
  polaroide: "Polaroide",
  mural: "Mural",
  colagem: "Colagem",
  ambiente: "Ambiente",
  cheio: "Cheio",
  carrossel: "Carrossel",
  dump: "Dump",
  tbt: "TBT",
};

function perfilEmPalavras(modelo: ModeloDeTelao): string {
  const perfil = PERFIS[modelo];
  const quantas = perfil.fotos === 1 ? "1 foto" : `${perfil.fotos} fotos`;
  return `${quantas} · ${perfil.aceitaEmPe ? "em pé" : "só deitada"}`;
}

function Marcador({ marcado }: { marcado: boolean }) {
  return (
    <span
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[0.375rem] border text-[0.6875rem]",
        marcado ? "border-acento bg-acento text-sobre-acento" : "border-linha text-transparent",
      )}
    >
      ✓
    </span>
  );
}

/**
 * Os modelos da parede, no app.
 *
 * O anfitrião marca quais entram no rodízio. Quem decide se a escolha vale é
 * `problemasDaEscolha`, no núcleo — a tela mostra o veredito, não uma cópia da
 * regra. Só `cheio` marcado é recusado: sobrariam só deitadas, e três de cada
 * quatro fotos de festa são verticais.
 */
export function TelaAdminParede({
  pack,
  escolhidos,
}: {
  pack: Pack;
  escolhidos: readonly ModeloDeTelao[];
}) {
  const problemas = problemasDaEscolha(escolhidos);
  const recusada = problemas.length > 0;

  return (
    <ChaoAdmin pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">A parede</p>
        <Etiqueta tom={recusada ? "contorno" : "acento"}>
          {escolhidos.length} de {MODELOS_DE_TELAO.length}
        </Etiqueta>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-3 text-[0.8125rem] text-ink-2">
          A parede alterna entre os modelos marcados a noite inteira. Marque quantos quiser.
        </p>

        {recusada && (
          <div className="mb-3 rounded-token border-l-[3px] border-critico bg-[color-mix(in_srgb,var(--critico)_10%,var(--superficie))] p-3">
            <p className="font-titulo text-[0.9375rem] text-critico">Esta escolha não pode ser salva</p>
            {problemas.map((p) => (
              <p key={p} className="mt-1 text-[0.75rem] text-ink-2">
                {p}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {MODELOS_DE_TELAO.map((modelo) => {
            const marcado = escolhidos.includes(modelo);
            const culpado = recusada && !PERFIS[modelo].aceitaEmPe && marcado;

            return (
              <div
                key={modelo}
                className={cn(
                  "rounded-token border p-3",
                  marcado ? "border-acento bg-acento-superficie-suave" : "border-linha bg-superficie",
                  culpado && "border-critico",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-titulo text-[0.9375rem]">{NOMES_DOS_MODELOS[modelo]}</span>
                  <Marcador marcado={marcado} />
                </div>
                <p
                  className={cn(
                    "mt-1 text-[0.6875rem]",
                    PERFIS[modelo].aceitaEmPe ? "text-ink-3" : "text-critico",
                  )}
                >
                  {perfilEmPalavras(modelo)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3.5">
          <Botao largura="cheia" variante={recusada ? "secundario" : "primario"}>
            Salvar
          </Botao>
          <p className="mt-2 text-center text-[0.75rem] text-ink-2">
            {recusada
              ? "Marque ao menos um modelo que aceite foto em pé."
              : "Vale já na próxima foto que subir."}
          </p>
        </div>
      </div>

      <NavAdmin ativa="parede" />
    </ChaoAdmin>
  );
}

/**
 * Convidados, o funil — no app.
 *
 * Participação sobre `expected_guests` é o número que decide a H1, então é a
 * primeira coisa. Tudo agregado: quantos escanearam, entraram, enviaram. Sem
 * lista nominal e sem "enviar mensagem" — o convidado não recebe e-mail nem
 * SMS, e a Albora não é ferramenta de disparo.
 */
export function TelaAdminConvidados({ pack }: { pack: Pack }) {
  const esperados = 150;
  const fotografaram = 112;
  const pct = Math.round((fotografaram / esperados) * 100);

  const funil = [
    { r: "Escanearam o QR", n: 138 },
    { r: "Entraram na festa", n: 126 },
    { r: "Enviaram ao menos 1 foto", n: fotografaram },
  ];

  return (
    <ChaoAdmin pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Convidados</p>
        <Etiqueta tom="acento">{pct}% de participação</Etiqueta>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <div className="rounded-token bg-superficie p-4 shadow-suave">
          <p className="font-titulo text-[2.5rem] font-light leading-none tabular-nums text-acento-texto">
            {pct}%
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-ink-2">
            {fotografaram} de {esperados} convidados fotografaram
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-pilula bg-linha">
            <div className="h-full rounded-pilula bg-acento" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">O funil</p>
        <div className="flex flex-col gap-2">
          {funil.map((f) => (
            <div
              key={f.r}
              className="flex items-center justify-between gap-3 rounded-token bg-superficie px-4 py-3"
            >
              <span className="text-[0.8125rem] text-ink-2">{f.r}</span>
              <span className="font-titulo text-base tabular-nums">{f.n}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[0.75rem] text-ink-3">
          Números agregados. A Albora não manda mensagem pra convidado — ele não recebe e-mail nem
          SMS, e ninguém aparece por nome aqui.
        </p>
      </div>

      <NavAdmin ativa="convidados" />
    </ChaoAdmin>
  );
}

/**
 * A identidade do casal, no app.
 *
 * A cor e a fonte que o casal escolhe mandam em tudo — app, telão e o PDF da
 * placa — porque um só resolvedor alimenta todos. Por isso a prévia usa o
 * `resolverTokens` de verdade: o que se vê aqui é o que sai impresso.
 */
export function TelaAdminIdentidade({ pack }: { pack: Pack }) {
  return (
    <ChaoAdmin pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Identidade</p>
        <Etiqueta tom="acento">prévia ao vivo</Etiqueta>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-3 text-[0.8125rem] text-ink-2">
          A cor e a fonte do casal mandam em tudo — app, telão e o PDF da placa. Um resolvedor, e
          todos renderizam igual.
        </p>

        <div className="relative aspect-[16/10] overflow-hidden rounded-superficie shadow-suave">
          <Moldura atmosfera variante={1} />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to top, color-mix(in srgb, var(--bg) 90%, transparent), transparent 60%)",
            }}
          />
          <div className="absolute inset-x-4 bottom-4">
            <p className="font-titulo text-[1.375rem] leading-tight tracking-titulo">
              {texto(pack, "landing.exemplo.nome")}
            </p>
            <span className="mt-2 inline-flex items-center rounded-pilula bg-acento px-3 py-1.5 text-[0.75rem] font-medium text-sobre-acento">
              Enviar foto
            </span>
          </div>
        </div>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          A cor do casal
        </p>
        <div className="flex items-center gap-2.5">
          {[
            "bg-[color-mix(in_srgb,var(--acento)_58%,var(--bg))]",
            "bg-acento",
            "bg-[color-mix(in_srgb,var(--acento)_65%,var(--ink))]",
          ].map((c, i) => (
            <span
              key={c}
              className={cn(
                "size-9 rounded-full",
                c,
                i === 1 && "ring-2 ring-ink ring-offset-2 ring-offset-bg",
              )}
            />
          ))}
          <span className="ml-1 text-[0.75rem] text-ink-3">a família da cor escolhida</span>
        </div>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          A fonte
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-token bg-superficie p-3">
            <p className="text-[0.625rem] uppercase tracking-rotulo text-ink-3">Título</p>
            <p className="mt-1 font-titulo text-[1.25rem]">{texto(pack, "landing.exemplo.nome")}</p>
          </div>
          <div className="rounded-token bg-superficie p-3">
            <p className="text-[0.625rem] uppercase tracking-rotulo text-ink-3">Corpo</p>
            <p className="mt-1 text-[0.9375rem]">A festa está acontecendo</p>
          </div>
        </div>

        <div className="mt-4">
          <Botao largura="cheia">Editar identidade</Botao>
        </div>
      </div>

      <NavAdmin ativa="mais" />
    </ChaoAdmin>
  );
}

/**
 * O livro, no app.
 *
 * Diagramação por slots, nunca posição livre — não é editor de canvas. O casal
 * escolhe a foto, o slot cuida do enquadramento, e nada corta na vertical
 * porque cada slot declara a própria proporção. Um slot vazio é desenhado como
 * vazio (tracejado), não como um buraco.
 */
export function TelaAdminLivro({ pack }: { pack: Pack }) {
  return (
    <ChaoAdmin pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">O livro</p>
        <Etiqueta>18 páginas</Etiqueta>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-3 text-[0.8125rem] text-ink-2">
          Diagramação por slots, nunca posição livre: você escolhe a foto, o slot cuida do
          enquadramento. Nada corta na vertical.
        </p>

        <p className="mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          Capítulo · A chegada
        </p>
        <div className="rounded-token bg-superficie p-3 shadow-suave">
          <div className="grid grid-cols-2 gap-2">
            <span className="relative row-span-2 aspect-[3/4] overflow-hidden rounded-token">
              <Moldura atmosfera variante={2} />
            </span>
            <span className="relative aspect-[4/3] overflow-hidden rounded-token">
              <Moldura atmosfera variante={7} />
            </span>
            <span className="grid aspect-[4/3] place-items-center rounded-token border border-dashed border-linha text-ink-3">
              <IconeMais tamanho={20} />
            </span>
          </div>
        </div>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
          Capítulo · A festa
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="grid aspect-[3/4] place-items-center rounded-token border border-dashed border-linha text-ink-3"
            >
              <IconeMais tamanho={18} />
            </span>
          ))}
        </div>

        <div className="mt-4">
          <Botao largura="cheia">Escolher fotos</Botao>
        </div>
      </div>

      <NavAdmin ativa="mais" />
    </ChaoAdmin>
  );
}

/**
 * Retenção e conta, no app.
 *
 * A retenção é cumprida por job, não por promessa: export pro drive do casal no
 * dia 330, delete no 365. Excluir exclui de verdade e rápido — sem dark pattern
 * de "tem certeza que quer perder tudo". Memórias automáticas são opt-in e
 * desligam num toque.
 */
export function TelaAdminRetencao({ pack }: { pack: Pack }) {
  return (
    <ChaoAdmin pack={pack}>
      <BarraDeStatus />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Retenção</p>
        <Etiqueta>conta</Etiqueta>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <div className="rounded-token bg-superficie p-4 shadow-suave">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-1.5">
              <span className="size-2.5 rounded-full bg-acento" />
              <span className="my-1 w-px flex-1 bg-linha" />
              <span className="size-2.5 rounded-full bg-critico" />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <div>
                <p className="font-titulo text-[0.9375rem]">Dia 330 · vai pro seu drive</p>
                <p className="mt-0.5 text-[0.75rem] text-ink-2">
                  Exportamos tudo pra nuvem do casal, antes de qualquer coisa sumir.
                </p>
              </div>
              <div>
                <p className="font-titulo text-[0.9375rem] text-critico">Dia 365 · apagamos tudo</p>
                <p className="mt-0.5 text-[0.75rem] text-ink-2">
                  Cumprido por job, não por promessa. Depois disso, não existe mais aqui.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Botao largura="cheia" variante="secundario">
            Exportar agora
          </Botao>
        </div>

        <Cartao className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-titulo text-base">Memórias automáticas</p>
              <p className="mt-0.5 text-[0.78125rem] text-ink-2">
                Opt-in. Desliga num toque, sem fricção e sem tentativa de retenção.
              </p>
            </div>
            <Interruptor ligado={false} rotulo="Memórias automáticas" />
          </div>
        </Cartao>

        <div className="mt-4 rounded-token border border-[color-mix(in_srgb,var(--critico)_35%,transparent)] p-4">
          <p className="font-titulo text-base text-critico">Excluir este evento</p>
          <p className="mt-0.5 text-[0.78125rem] text-ink-2">
            Exclui de verdade e rápido — as fotos, o feed, tudo. Sem “tem certeza que quer
            perder…”.
          </p>
          <span className="mt-3 inline-flex items-center rounded-pilula bg-critico px-5 py-2.5 text-sm font-medium text-sobre-acento">
            Excluir evento
          </span>
        </div>
      </div>

      <NavAdmin ativa="mais" />
    </ChaoAdmin>
  );
}

/**
 * O login do anfitrião — magic link.
 *
 * O anfitrião tem login (o convidado nunca). Sem senha: um link no e-mail e
 * pronto. É a única superfície do admin sem a barra — antes de entrar não há
 * pra onde navegar.
 */
export function TelaAdminLogin({ pack }: { pack: Pack }) {
  return (
    <ChaoAdmin pack={pack}>
      <BarraDeStatus />

      <div className="flex flex-1 flex-col justify-center gap-6 px-7 pb-16">
        <div>
          <p className="text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
            Albora · anfitrião
          </p>
          <p className="mt-3 font-titulo text-[1.875rem] font-light leading-tight tracking-titulo">
            Entre pra ver sua festa
          </p>
          <p className="mt-2 text-[0.9375rem] text-ink-2">
            Sem senha. A gente manda um link no seu e-mail.
          </p>
        </div>

        <div className="rounded-token border-b-2 border-acento bg-superficie px-4 py-3.5 text-[0.9375rem] text-ink-3">
          voce@email.com
        </div>

        <Botao largura="cheia">Enviar o link</Botao>

        <p className="text-center text-[0.75rem] text-ink-3">
          Chega em segundos. Se cair no spam, o link é o mesmo.
        </p>
      </div>
    </ChaoAdmin>
  );
}
