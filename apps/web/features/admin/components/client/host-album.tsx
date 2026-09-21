"use client";

import { Badge, ConfirmDialog } from "@albora/ui-web";
import { useCallback, useEffect, useState } from "react";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
import { RefreshButton } from "./refresh-control";
import { HostExport } from "@/features/admin/components/client/host-export";
import { HostDriveExport } from "@/features/admin/components/client/host-drive-export";

/**
 * ≥44px de alvo de toque — override local do Sm compartilhado (`adminClasses.dangerButtonSm`),
 * sem editar admin-shell.tsx (mesmo padrão de review-queue.tsx/comment-moderation.tsx).
 * `min-h-11` garante a altura mínima independente de qual padding vertical vence a cascata.
 */
const ALVO_TOQUE = "min-h-11 px-5";

function EstrelaIcon({ cheia = false }: { cheia?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill={cheia ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z" />
    </svg>
  );
}

type Item = {
  id: string;
  sessaoId: string;
  missaoId: string | null;
  lugarId: string | null;
  reacoes: number;
  destacada: boolean;
  criadaEm: string;
  thumb: string;
};

type Props = {
  eventoId: string;
  canExport?: boolean;
  /** `destaques` mostra só o que o casal destacou e esconde as caixas de export. */
  aba?: "todas" | "destaques";
};

/**
 * O que o anfitrião acabou de ocultar, para o "Desfazer" ter o que desfazer.
 *
 * Guarda o id do vizinho de cima, e não um índice: entre ocultar e desfazer a
 * lista pode ter sido recarregada (o botão de atualizar continua vivo), e um
 * índice numérico devolveria a foto em lugar errado. `null` = era a primeira.
 */
type Desfazer = { item: Item; depoisDe: string | null };

function legendaDaFoto(criadaEm: string, reacoes: number): string {
  const quando = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(criadaEm));
  if (reacoes <= 0) return quando;
  return `${quando} · ${reacoes} ${reacoes === 1 ? "curtida" : "curtidas"}`;
}

export function HostAlbum({ eventoId, canExport = true, aba = "todas" }: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [ocultando, setOcultando] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [desfazer, setDesfazer] = useState<Desfazer | null>(null);
  const [confirmarRemocao, setConfirmarRemocao] = useState<Item | null>(null);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/album?aba=${aba}`);
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as { itens: Item[] };
      setItens(corpo.itens);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [eventoId, aba]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Carimba a visita para a Home saber o que é "novo" na próxima vez. Falha
  // aqui não interessa ao casal: é marca de leitura, não conteúdo.
  useEffect(() => {
    if (aba !== "todas") return;
    void fetch(`/api/admin/events/${eventoId}/album`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ acao: "visto" }),
    }).catch(() => undefined);
  }, [eventoId, aba]);

  const acaoNaFoto = useCallback(
    async (midiaId: string, acao: string) => {
      const r = await fetch(`/api/admin/events/${eventoId}/album`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ midiaId, acao }),
      });
      if (!r.ok) throw new Error("falhou");
    },
    [eventoId],
  );

  // Ocultar some da grade na hora e fica guardado no índice original: o
  // "Desfazer" recoloca a foto onde ela estava, não no fim.
  const ocultar = async (item: Item) => {
    setOcultando(item.id);
    setErroAcao(null);
    const indice = itens.findIndex((i) => i.id === item.id);
    const depoisDe = indice > 0 ? (itens[indice - 1]?.id ?? null) : null;
    try {
      await acaoNaFoto(item.id, "ocultar");
      setItens((antes) => antes.filter((i) => i.id !== item.id));
      setSelecionado(null);
      setDesfazer({ item, depoisDe });
    } catch {
      setErroAcao("Não foi possível ocultar a foto. Tente de novo.");
    } finally {
      setOcultando(null);
    }
  };

  const reexibir = async (guardado: Desfazer) => {
    setOcultando(guardado.item.id);
    setErroAcao(null);
    try {
      await acaoNaFoto(guardado.item.id, "reexibir");
      setItens((antes) => {
        if (antes.some((i) => i.id === guardado.item.id)) return antes;
        const copia = [...antes];
        const vizinho = guardado.depoisDe
          ? copia.findIndex((i) => i.id === guardado.depoisDe)
          : -1;
        // Vizinho sumiu da lista recarregada: devolve ao fim em vez de chutar
        // uma posição que não existe mais.
        const onde = guardado.depoisDe === null ? 0 : vizinho >= 0 ? vizinho + 1 : copia.length;
        copia.splice(onde, 0, guardado.item);
        return copia;
      });
      setDesfazer(null);
    } catch {
      setErroAcao("Não foi possível trazer a foto de volta. Tente de novo.");
    } finally {
      setOcultando(null);
    }
  };

  const remover = async (item: Item) => {
    setOcultando(item.id);
    setErroAcao(null);
    try {
      await acaoNaFoto(item.id, "remover");
      setItens((antes) => antes.filter((i) => i.id !== item.id));
      setSelecionado(null);
      setConfirmarRemocao(null);
      // Remover não volta: nada de "Desfazer" prometendo o que não existe.
      setDesfazer(null);
    } catch {
      setErroAcao("Não foi possível remover a foto. Tente de novo.");
    } finally {
      setOcultando(null);
    }
  };

  const alternarDestaque = async (item: Item) => {
    setOcultando(item.id);
    setErroAcao(null);
    const virando = !item.destacada;
    try {
      await acaoNaFoto(item.id, virando ? "destacar" : "desdestacar");
      setItens((antes) =>
        aba === "destaques" && !virando
          ? antes.filter((i) => i.id !== item.id)
          : antes.map((i) => (i.id === item.id ? { ...i, destacada: virando } : i)),
      );
      if (aba === "destaques" && !virando) setSelecionado(null);
    } catch {
      setErroAcao("Não foi possível mudar o destaque. Tente de novo.");
    } finally {
      setOcultando(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex flex-col gap-5">
        <AdminSection>
          <div className="animate-pulse">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="h-3.5 w-52 rounded-full bg-superficie-alta" />
              <div className="h-8 w-20 rounded-pilula bg-superficie-alta" />
            </div>
            <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i} aria-hidden className="aspect-square rounded-media bg-superficie-alta" />
              ))}
            </ul>
          </div>
        </AdminSection>
      </div>
    );
  }

  if (erro && itens.length === 0) {
    return (
      <AdminSection>
        <div className="flex items-center justify-between gap-4">
          <p role="alert" className="tipo-body m-0 text-critico">
            Não foi possível carregar o álbum. Tente de novo.
          </p>
          <RefreshButton
            loading={atualizando}
            onClick={() => {
              setAtualizando(true);
              void carregar().finally(() => setAtualizando(false));
            }}
          />
        </div>
      </AdminSection>
    );
  }

  const selecionadoItem = selecionado ? (itens.find((i) => i.id === selecionado) ?? null) : null;

  return (
    <div className="flex flex-col gap-5">
      {canExport && aba === "todas" ? (
        <AdminSection>
          <h2 className="tipo-subtitle m-0 mb-2 text-ink">O livro</h2>
          <p className="tipo-caption m-0 mb-1 text-ink-2">
            PDF A4 com sangria (216 × 303 mm) e diagramação por slots do álbum curado — perfil sRGB prepress.
          </p>
          <p className="tipo-caption m-0 mb-4 text-ink-3">
            A tela mostra RGB e a gráfica imprime CMYK: a cor do acento pode sair um pouco mais apagada no papel. Peça uma prova impressa antes da tiragem.
          </p>
          <a
            href={`/api/admin/events/${eventoId}/book/pdf`}
            className={`${adminClasses.secondaryButton} inline-flex no-underline`}
          >
            Baixar PDF do livro
          </a>
        </AdminSection>
      ) : null}

      {canExport && aba === "todas" ? <HostExport eventoId={eventoId} /> : null}
      {canExport && aba === "todas" ? <HostDriveExport eventoId={eventoId} /> : null}
      {desfazer && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-token border border-linha bg-superficie-alta px-4 py-3"
        >
          <p className="tipo-body m-0 text-ink">Foto oculta. Ninguém mais vê.</p>
          <button
            type="button"
            disabled={ocultando !== null}
            onClick={() => void reexibir(desfazer)}
            className={`${adminClasses.secondaryButton} ${ALVO_TOQUE}`}
          >
            Desfazer
          </button>
        </div>
      )}

      <AdminSection>
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="tipo-body m-0 text-ink-2">
            {aba === "destaques"
              ? "As fotos que vocês escolheram. O telão e o álbum impresso dão preferência a elas."
              : "Ocultar tira a foto do álbum e dá para desfazer. Remover não tem volta."}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone="neutral">
              {itens.length} {itens.length === 1 ? "foto" : "fotos"}
            </Badge>
            <RefreshButton
              loading={atualizando}
              onClick={() => {
                setAtualizando(true);
                void carregar().finally(() => setAtualizando(false));
              }}
            />
          </div>
        </div>

        {itens.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="tipo-body m-0 text-ink-2">
              {aba === "destaques"
                ? "Nenhuma foto destacada ainda."
                : "Ainda não há fotos publicadas. Elas aparecem aqui assim que entram."}
            </p>
            <p className="tipo-caption m-0 text-ink-3">
              {aba === "destaques"
                ? "Abra uma foto em Todas e toque na estrela. As destacadas entram primeiro no telão e no álbum impresso."
                : "Baixe as peças com o QR e coloque nas mesas — ou compartilhe o link do convidado diretamente."}
            </p>
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
            {itens.map((item, indice) => {
              const ativo = selecionado === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionado(ativo ? null : item.id)}
                    aria-pressed={ativo}
                    aria-label={`Foto ${indice + 1} de ${itens.length}, ${legendaDaFoto(item.criadaEm, item.reacoes)}${item.destacada ? ", destacada" : ""}`}
                    className={`relative block aspect-square w-full cursor-pointer overflow-hidden rounded-media border-0 bg-superficie-alta p-0 transition-transform duration-instantaneo ease-mola active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                      ativo ? "ring-2 ring-acento ring-offset-2 ring-offset-superficie" : ""
                    }`}
                  >
                    <img
                      src={item.thumb}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover object-top"
                    />
                    {item.destacada && (
                      <span
                        aria-hidden
                        className="absolute right-1.5 top-1.5 rounded-pilula bg-superficie/90 px-1.5 py-0.5 text-acento-texto"
                      >
                        <EstrelaIcon cheia />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>

      {selecionadoItem && (
        <AdminSection>
          <div className="flex items-start gap-3">
            <div className="aspect-square w-16 shrink-0 overflow-hidden rounded-media bg-superficie-alta">
              <img
                src={selecionadoItem.thumb}
                alt=""
                className="size-full object-cover object-top"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="tipo-body m-0 text-ink">
                {selecionadoItem.destacada ? "Foto destacada" : "Foto do evento"}
              </p>
              <p className="tipo-caption m-0 mt-1 text-ink-3">
                {legendaDaFoto(selecionadoItem.criadaEm, selecionadoItem.reacoes)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={ocultando !== null}
              onClick={() => void alternarDestaque(selecionadoItem)}
              aria-pressed={selecionadoItem.destacada}
              className={`${adminClasses.secondaryButton} ${ALVO_TOQUE} inline-flex items-center gap-2`}
            >
              <EstrelaIcon cheia={selecionadoItem.destacada} />
              {selecionadoItem.destacada ? "Tirar destaque" : "Destacar"}
            </button>
            <button
              type="button"
              disabled={ocultando !== null}
              onClick={() => void ocultar(selecionadoItem)}
              className={`${adminClasses.secondaryButton} ${ALVO_TOQUE} ${
                ocultando ? "cursor-wait opacity-60" : ""
              }`}
            >
              {ocultando ? "Ocultando…" : "Ocultar"}
            </button>
            <button
              type="button"
              disabled={ocultando !== null}
              onClick={() => setConfirmarRemocao(selecionadoItem)}
              className={`${adminClasses.dangerButtonSm} ${ALVO_TOQUE}`}
            >
              Remover
            </button>
            {/* "Ver pessoa" do protótipo: leva à aba Pessoas já no perfil de quem
                fotografou, para a decisão sobre a foto ter contexto de quem é. */}
            <a
              href={`/admin/e/${eventoId}/guests?pessoa=${selecionadoItem.sessaoId}`}
              className={`${adminClasses.secondaryButton} ${ALVO_TOQUE} inline-flex no-underline`}
            >
              Ver pessoa
            </a>
            <button
              type="button"
              disabled={ocultando !== null}
              onClick={() => setSelecionado(null)}
              className={adminClasses.secondaryButton}
            >
              Fechar
            </button>
          </div>
          {erroAcao && (
            <p role="alert" className="tipo-caption m-0 mt-3 text-critico">
              {erroAcao}
            </p>
          )}
        </AdminSection>
      )}

      <ConfirmDialog
        open={confirmarRemocao !== null}
        onClose={() => setConfirmarRemocao(null)}
        onConfirm={() => {
          if (confirmarRemocao) void remover(confirmarRemocao);
        }}
        title="Remover esta foto de vez?"
        description="Ocultar tira do álbum e dá para desfazer. Remover não: a foto sai do evento e não volta pelo painel. Quem enviou não recebe aviso."
        confirmLabel="Remover de vez"
        tone="danger"
        pending={ocultando !== null}
      />

    </div>
  );
}
