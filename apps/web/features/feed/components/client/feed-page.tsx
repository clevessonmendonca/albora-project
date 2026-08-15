"use client";

import { isVideoMime } from "@albora/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { groupByHour, type HourGroup } from "@/features/feed/lib/group-by-hour";
import { useFeed, type ItemVisivel } from "@/features/feed/hooks/use-feed";
import { GuestTabBar } from "@/features/guest/components/client/guest-tab-bar";
import {
  GateNotice,
  GuestHeader,
  GuestShell,
  EmptyState,
  GuestMain,
  SecondaryButton,
  cn,
} from "@albora/ui-web";
import { Badge } from "@albora/ui-web";
import { Post, PostLoading } from "./post";
import { MirrorGrid, MirrorGridLoading } from "./mirror-grid";
import { viewerKeys, Viewer } from "./viewer";
import { HourStrip, HourStripLoading } from "./hour-strip";

/**
 * O feed do convidado: a tira de horas no topo e as fotos em coluna única
 * embaixo, numa tela só.
 *
 * Ele existe para uma coisa só: o convidado ver o que os outros mandaram e,
 * por isso, mandar mais (ADR 0009). Três decisões de tela saem direto daí, e
 * nenhuma é estética:
 *
 * - **A próxima página só vem a pedido.** Rolagem infinita é o desenho que
 *   prende, e prender é o oposto do que esta tela serve. Aqui ela termina, e
 *   quem quiser mais toca.
 * - **A barra da câmera é fixa.** Em coluna única cada foto ocupa quase a tela
 *   inteira, e o fim da lista fica longe: uma ação primária que só aparece lá
 *   embaixo não existe. Ela não sai da tela em nenhum estado — nem no vazio,
 *   nem no erro, nem com o visualizador aberto, que carrega a sua.
 * - **A tela filled devolve para o feed.** A hora acaba, e o que sobra é a
 *   câmera.
 *
 * Nada de contagem: antes do gate ela nem chega do servidor, e depois dele
 * quem a mostra é outra tarefa.
 */

export type FilterMission = { id: string; title: string };

export type FeedCopy = {
  /** Como esta festa chama a lista de missões. Vem resolvido do pack. */
  missionTitle: string;
};

/** Identidade estável: `[]` novo a cada render reabriria o efeito à toa. */
const SEM_CHAVES: string[] = [];
const SEM_ITENS: ItemVisivel[] = [];

type Aberto = { inicio: number; itemId: string };

export function FeedPage({
  slug,
  eventTitle,
  missions,
  copy,
  cameraPath,
}: {
  slug: string;
  eventTitle: string;
  missions: FilterMission[];
  copy: FeedCopy;
  cameraPath: string;
}) {
  const [missionId, setMissaoId] = useState<string | null>(null);
  const { estado, carregarMais, recomecar, pedirChaves, atualizarReacoes } = useFeed(missionId);

  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [preparando, setPreparando] = useState<number | null>(null);
  const [vistos, setVistos] = useState<ReadonlySet<number>>(() => new Set());
  const movimentoReduzido = usarMovimentoReduzido();

  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && estado.itens.length === 0 && estado.falha === null;

  /**
   * Uma hora só está fechada quando não há mais página **e** nada falhou. Falha
   * que ainda promete "vem mais" faria quem espera a hora fechar esperar para
   * sempre.
   */
  const temMais = !estado.fim && estado.falha === null;
  const grupos = useMemo(
    () => groupByHour(estado.itens, { temMais }),
    [estado.itens, temMais],
  );

  const grupoAberto = aberto
    ? grupos.find((g) => g.inicio.getTime() === aberto.inicio)
    : undefined;

  const itensAbertos = grupoAberto?.itens ?? SEM_ITENS;
  const achado = grupoAberto ? itensAbertos.findIndex((i) => i.id === aberto?.itemId) : -1;
  const indice = achado >= 0 ? achado : 0;

  const janela = useMemo(
    () => (grupoAberto ? viewerKeys(itensAbertos, indice) : SEM_CHAVES),
    [grupoAberto, itensAbertos, indice],
  );

  useEffect(() => {
    pedirChaves(janela);
  }, [pedirChaves, janela]);

  const irPara = useCallback(
    (i: number) => {
      const alvo = itensAbertos[i];
      if (!alvo) return;
      setAberto((atual) => (atual ? { inicio: atual.inicio, itemId: alvo.id } : atual));
    },
    [itensAbertos],
  );

  const sair = useCallback(() => setAberto(null), []);

  /**
   * Uma hora incompleta é fechada **antes** de abrir.
   *
   * O feed vem do mais novo para o mais velho, então a hora mais antiga da lista
   * é a única que ainda pode receber foto. Começar a tocar no meio dela faria a
   * fila reordenar embaixo do dedo enquanto a próxima página chega.
   */
  useEffect(() => {
    if (preparando === null) return;

    const grupo = grupos.find((g) => g.inicio.getTime() === preparando);
    if (!grupo) {
      setPreparando(null);
      return;
    }

    if (!grupo.completo) {
      if (!estado.carregando) carregarMais();
      return;
    }

    const primeiro = grupo.itens[0];
    setPreparando(null);
    if (primeiro) setAberto({ inicio: preparando, itemId: primeiro.id });
  }, [preparando, grupos, estado.carregando, carregarMais]);

  // A foto pode sair do feed pelo botão de pânico enquanto alguém a olha. Some
  // do grupo, o grupo some da lista, e a tela volta para onde há saída.
  useEffect(() => {
    if (aberto && !grupoAberto) setAberto(null);
  }, [aberto, grupoAberto]);

  // Sem isto o dedo atravessa a tela filled e rola o feed atrás dela — e a pessoa
  // fecha a hora num lugar da lista que não é o que ela deixou.
  useEffect(() => {
    if (!grupoAberto) return;

    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [grupoAberto]);

  function abrir(grupo: HourGroup<ItemVisivel>) {
    const inicio = grupo.inicio.getTime();
    const primeiro = grupo.itens[0];

    setVistos((antes) => (antes.has(inicio) ? antes : new Set(antes).add(inicio)));

    if (grupo.completo && primeiro) setAberto({ inicio, itemId: primeiro.id });
    else setPreparando(inicio);
  }

  const espelho = estado.interacao === "espelho";
  const completo = !espelho;
  const contagem = estado.itens.length > 0 ? `${estado.itens.length} fotos` : undefined;

  return (
    <>
      <GuestShell>
        <style>{`
          @keyframes feed-amanhecer {
            from { opacity: 0; filter: brightness(0.4) saturate(0.6); }
            to   { opacity: 1; filter: none; }
          }
          @keyframes feed-respirar {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.55; }
          }
          .feed-amanhece { animation: feed-amanhecer var(--tempo-lento) var(--curva) both; }
          .feed-esperando { animation: feed-respirar 1900ms var(--curva) infinite; }
          @media (prefers-reduced-motion: reduce) {
            .feed-amanhece, .feed-esperando { animation: none !important; }
          }
        `}</style>

        <GuestMain>
          <GuestHeader
            title={eventTitle}
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={contagem ? <Badge>{contagem}</Badge> : undefined}
          />

          {espelho && estado.jaCarregou && (
            <GateNotice>
              As reações e os comentários abrem no horário que o anfitrião escolheu. Até lá,
              continue enviando: tudo já está indo para o álbum.
            </GateNotice>
          )}

          {primeiraCarga && completo && <HourStripLoading />}
          {primeiraCarga && espelho && <MirrorGridLoading />}

          {completo && grupos.length > 0 && (
            <HourStrip
              grupos={grupos}
              urls={estado.urls}
              vistos={vistos}
              preparando={preparando}
              rotulo="Horas da festa"
              onAbrir={abrir}
            />
          )}

          {completo && missions.length > 0 && (
            <Filtro
              rotulo={copy.missionTitle}
              missions={missions}
              escolhida={missionId}
              onEscolher={setMissaoId}
            />
          )}

          {estado.midiaIndisponivel && (
            <p className="mb-4 text-[0.85rem] text-ink-3">
              As fotos ainda não abriram. Elas aparecem sozinhas.
            </p>
          )}

          {primeiraCarga && completo && (
            <Coluna>
              {[0, 1].map((i) => (
                <PostLoading key={i} />
              ))}
            </Coluna>
          )}

          {vazio && (
            <EmptyState
              title={completo && missionId !== null ? "Ninguém mandou essa ainda." : "Ainda não tem foto."}
              lede={completo && missionId !== null ? "A sua pode ser a primeira." : "Seja o primeiro."}
              cameraPath={cameraPath}
            />
          )}

          {espelho && estado.itens.length > 0 && (
            <MirrorGrid itens={estado.itens} urls={estado.urls} />
          )}

          {completo && estado.itens.length > 0 && (
            <Coluna comDivisor>
              {estado.itens.map((item) => {
                const isVideo = isVideoMime(item.mime);
                const chaveMidia = isVideo ? item.chaveFull : item.chaveThumb;
                return (
                <Post
                  key={item.id}
                  uploadId={item.id}
                  interacao={estado.interacao}
                  {...(item.reacoes !== undefined ? { reacoes: item.reacoes } : {})}
                  {...(item.minhaReacao !== undefined ? { minhaReacao: item.minhaReacao } : {})}
                  {...(item.sessaoAutor ? { sessaoAutor: item.sessaoAutor } : {})}
                  {...(item.minha !== undefined ? { minha: item.minha } : {})}
                  onReacoes={(resultado) => atualizarReacoes(item.id, resultado)}
                  onBloqueado={recomecar}
                  url={estado.urls.get(chaveMidia)?.url ?? null}
                  autor={item.autor}
                  legenda={item.legenda}
                  lugar={item.lugar}
                  isVideo={isVideo}
                />
              );
              })}
            </Coluna>
          )}

          <Rodape
            estado={estado}
            temItens={estado.itens.length > 0}
            onVerMais={carregarMais}
            onRecomecar={recomecar}
          />
        </GuestMain>
      </GuestShell>

      <GuestTabBar slug={slug} active="feed" />

      {completo && grupoAberto && (
        <Viewer
          itens={itensAbertos}
          indice={indice}
          hora={grupoAberto.hora}
          urls={estado.urls}
          interacao={estado.interacao}
          cameraPath={cameraPath}
          movimentoReduzido={movimentoReduzido}
          onIr={irPara}
          onSair={sair}
          onReacoes={atualizarReacoes}
          onBloqueado={recomecar}
        />
      )}
    </>
  );
}

/** Uma foto por vez, em destaque — coluna única como `FeedScreen`. */
function Coluna({
  children,
  comDivisor,
}: {
  children: React.ReactNode;
  comDivisor?: boolean;
}) {
  return (
    <div className={cn("grid", comDivisor && "border-t border-linha")}>
      {children}
    </div>
  );
}

function Filtro({
  rotulo,
  missions,
  escolhida,
  onEscolher,
}: {
  rotulo: string;
  missions: FilterMission[];
  escolhida: string | null;
  onEscolher: (id: string | null) => void;
}) {
  return (
    <div
      role="group"
      // O nome que esta festa dá às missões fica na etiqueta acessível: com a
      // tira de horas logo acima, mais uma linha de rótulo visível empurraria a
      // primeira foto para fora da tela.
      aria-label={rotulo}
      className="mx-[calc(var(--espaco)*-5)] mb-[calc(var(--espaco)*5)] mt-[calc(var(--espaco)*3)] flex gap-[calc(var(--espaco)*6)] overflow-x-auto border-b border-linha px-[calc(var(--espaco)*5)] [scrollbar-width:none]"
    >
      <FilterTab active={escolhida === null} onClick={() => onEscolher(null)}>
        Tudo
      </FilterTab>

      {missions.map((m) => (
        <FilterTab
          key={m.id}
          active={escolhida === m.id}
          onClick={() => onEscolher(escolhida === m.id ? null : m.id)}
        >
          {m.title}
        </FilterTab>
      ))}
    </div>
  );
}

/** Sublinhado, nunca pílula preenchida: é vocabulário de menu impresso. */
function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "max-w-56 min-h-12 flex-none cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-none bg-transparent p-0 font-titulo text-[0.68rem] font-normal uppercase tracking-[0.2em]",
        "[transition:color_var(--tempo-rapido)_var(--curva)]",
        active
          ? "border-b border-b-acento text-ink"
          : "border-b border-b-transparent text-ink-3",
      )}
    >
      {children}
    </button>
  );
}

function Rodape({
  estado,
  temItens,
  onVerMais,
  onRecomecar,
}: {
  estado: ReturnType<typeof useFeed>["estado"];
  temItens: boolean;
  onVerMais: () => void;
  onRecomecar: () => void;
}) {
  if (estado.falha === "sessao") {
    return (
      <Recado texto="Sua entrada nessa festa expirou. Escaneie o QR da mesa de novo para continuar." />
    );
  }

  if (estado.falha !== null) {
    return (
      <div className="mt-[calc(var(--espaco)*6)] text-center">
        <p className="mb-3 text-[0.9rem] text-ink-2">
          Não consegui carregar o resto agora.
        </p>
        {/* Recomeçar do topo é toque do convidado, nunca efeito colateral do
            erro: uma lista que se rebobina sozinha perde o lugar de quem rolou. */}
        <SecondaryButton
          onClick={estado.falha === "cursor" || !temItens ? onRecomecar : onVerMais}
        >
          Tentar de novo
        </SecondaryButton>
      </div>
    );
  }

  if (estado.fim || estado.cursor === null) return null;

  return (
    <div className="mt-[calc(var(--espaco)*6)]">
      <SecondaryButton onClick={onVerMais} disabled={estado.carregando}>
        {estado.carregando ? "Carregando…" : "Ver mais"}
      </SecondaryButton>
    </div>
  );
}

function Recado({ texto }: { texto: string }) {
  return (
    <p className="mt-[calc(var(--espaco)*6)] text-center text-[0.9rem] leading-relaxed text-ink-2">
      {texto}
    </p>
  );
}

function usarMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setReduzido(consulta.matches);

    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  return reduzido;
}
