"use client";

import { Badge, Button, buttonClasses, Skeleton } from "@albora/ui-web";
import { Star } from "lucide-react";
import { useCallback, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
import { RefreshButton } from "./refresh-control";
import { HostExport } from "@/features/admin/components/client/host-export";
import { HostDriveExport } from "@/features/admin/components/client/host-drive-export";
import { useAdminResource } from "@/features/admin/hooks/use-admin-resource";

type Item = {
  id: string;
  missaoId: string | null;
  lugarId: string | null;
  reacoes: number;
  criadaEm: string;
  thumb: string;
};

type Props = {
  eventoId: string;
  canExport?: boolean;
  filtro?: "todas" | "destaques";
};

function legendaDaFoto(criadaEm: string, reacoes: number): string {
  const quando = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(criadaEm));
  if (reacoes <= 0) return quando;
  return `${quando} · ${reacoes} ${reacoes === 1 ? "curtida" : "curtidas"}`;
}

export function HostAlbum({ eventoId, canExport = true, filtro = "todas" }: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [atualizando, setAtualizando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [ocultando, setOcultando] = useState<string | null>(null);
  const [destaques, setDestaques] = useState<string[]>([]);
  const [destacando, setDestacando] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const aoCarregar = useCallback((corpo: { itens: Item[]; destaques?: string[] }) => {
    setItens(corpo.itens);
    setDestaques(corpo.destaques ?? []);
  }, []);

  const {
    carregando,
    erro,
    recarregar: carregar,
  } = useAdminResource<{ itens: Item[]; destaques?: string[] }>(
    `/api/admin/events/${eventoId}/album`,
    { aoCarregar },
  );

  const estaDestacada = (midiaId: string) => destaques.includes(midiaId);

  const visiveis = filtro === "destaques" ? itens.filter((i) => estaDestacada(i.id)) : itens;

  const alternarDestaque = async (midiaId: string) => {
    const destacar = !estaDestacada(midiaId);
    setDestacando(midiaId);
    setErroAcao(null);
    setDestaques((antes) =>
      destacar ? [midiaId, ...antes] : antes.filter((id) => id !== midiaId),
    );

    try {
      const r = await fetch(`/api/admin/events/${eventoId}/album`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ midiaId, acao: destacar ? "destacar" : "remover-destaque" }),
      });
      if (!r.ok) throw new Error("falhou");
    } catch {
      setDestaques((antes) =>
        destacar ? antes.filter((id) => id !== midiaId) : [midiaId, ...antes],
      );
      setErroAcao("Não foi possível mudar o destaque agora. Tente de novo.");
    } finally {
      setDestacando(null);
    }
  };

  const ocultar = async (midiaId: string) => {
    setOcultando(midiaId);
    setErroAcao(null);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/album`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ midiaId, acao: "ocultar" }),
      });
      if (!r.ok) throw new Error("falhou");
      setItens((antes) => antes.filter((i) => i.id !== midiaId));
      setDestaques((antes) => antes.filter((id) => id !== midiaId));
      setSelecionado(null);
    } catch {
      setErroAcao("Não foi possível ocultar a foto. Tente de novo.");
    } finally {
      setOcultando(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex flex-col gap-5">
        <AdminSection>
          <div className="mb-4 flex items-center justify-between gap-4">
            <Skeleton variant="text" className="h-3.5 w-52" />
            <Skeleton variant="text" className="h-8 w-20" />
          </div>
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i}>
                <Skeleton className="aspect-square" />
              </li>
            ))}
          </ul>
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
      {canExport ? (
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
            className={buttonClasses({ variant: "secondary", className: "inline-flex no-underline" })}
          >
            Baixar PDF do livro
          </a>
        </AdminSection>
      ) : null}

      {canExport ? <HostExport eventoId={eventoId} /> : null}
      {canExport ? <HostDriveExport eventoId={eventoId} /> : null}
      <AdminSection>
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="tipo-body m-0 text-ink-2">
            Curadoria leve: ocultar tira a foto do feed, do álbum e do telão.
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

        {visiveis.length === 0 ? (
          <div className="flex flex-col gap-3">
            {filtro === "destaques" ? (
              <>
                <p className="tipo-body m-0 text-ink-2">Nada destacado ainda.</p>
                <p className="tipo-caption m-0 text-ink-3">
                  Destacar marca as fotos que vocês mais gostaram. Abra a aba Todas, toque numa
                  foto e escolha Destacar.
                </p>
              </>
            ) : (
              <>
                <p className="tipo-body m-0 text-ink-2">
                  Ainda não há fotos publicadas. Elas aparecem aqui assim que entram.
                </p>
                <p className="tipo-caption m-0 text-ink-3">
                  Baixe as peças com o QR e coloque nas mesas — ou compartilhe o link do convidado
                  diretamente.
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
            {visiveis.map((item, indice) => {
              const ativo = selecionado === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionado(ativo ? null : item.id)}
                    aria-pressed={ativo}
                    aria-label={`Foto ${indice + 1} de ${visiveis.length}, ${legendaDaFoto(item.criadaEm, item.reacoes)}${
                      estaDestacada(item.id) ? ", destacada" : ""
                    }`}
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
                    {estaDestacada(item.id) && (
                      <span
                        aria-hidden
                        className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-acento text-sobre-acento"
                      >
                        <Star size={13} />
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
                {estaDestacada(selecionadoItem.id) ? "Foto destacada" : "O que fazer com esta foto?"}
              </p>
              <p className="tipo-caption m-0 mt-1 text-ink-3">
                {legendaDaFoto(selecionadoItem.criadaEm, selecionadoItem.reacoes)} · destacar marca as
                melhores; ocultar some do evento para todos os convidados.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant={estaDestacada(selecionadoItem.id) ? "secondary" : "primary"}
              size="sm"
              disabled={destacando !== null || ocultando !== null}
              onClick={() => void alternarDestaque(selecionadoItem.id)}
            >
              {estaDestacada(selecionadoItem.id) ? "Tirar destaque" : "Destacar"}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={ocultando !== null}
              onClick={() => void ocultar(selecionadoItem.id)}
              className={`${ocultando ? "cursor-wait opacity-60" : ""}`}
            >
              {ocultando ? "Ocultando…" : "Ocultar foto"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={ocultando !== null}
              onClick={() => setSelecionado(null)}
            >
              Cancelar
            </Button>
          </div>
          {erroAcao && (
            <p role="alert" className="tipo-caption m-0 mt-3 text-critico">
              {erroAcao}
            </p>
          )}
        </AdminSection>
      )}
    </div>
  );
}
