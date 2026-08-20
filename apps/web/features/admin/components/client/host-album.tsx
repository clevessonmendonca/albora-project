"use client";

import { PrintedCopyCard } from "@albora/ui-web";
import { useCallback, useEffect, useState } from "react";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
import { HostExport } from "@/features/admin/components/client/host-export";
import { HostDriveExport } from "@/features/admin/components/client/host-drive-export";

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
};

function legendaDaFoto(criadaEm: string, reacoes: number): string {
  const quando = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(criadaEm));
  if (reacoes <= 0) return quando;
  return `${quando} · ${reacoes} ${reacoes === 1 ? "curtida" : "curtidas"}`;
}

export function HostAlbum({ eventoId, canExport = true }: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [ocultando, setOcultando] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/album`);
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as { itens: Item[] };
      setItens(corpo.itens);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [eventoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const ocultar = async (midiaId: string) => {
    setOcultando(midiaId);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/album`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ midiaId }),
      });
      if (!r.ok) throw new Error("falhou");
      setItens((antes) => antes.filter((i) => i.id !== midiaId));
      setSelecionado(null);
    } catch {
      setErro(true);
    } finally {
      setOcultando(null);
    }
  };

  if (carregando) {
    return (
      <AdminSection>
        <p className="m-0 text-ink-2">Carregando álbum…</p>
      </AdminSection>
    );
  }

  if (erro && itens.length === 0) {
    return (
      <AdminSection>
        <p className="m-0 text-critico">Não foi possível carregar o álbum. Tente de novo.</p>
      </AdminSection>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {canExport ? <HostExport eventoId={eventoId} /> : null}
      {canExport ? <HostDriveExport eventoId={eventoId} /> : null}
      <AdminSection>
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="m-0 leading-relaxed text-ink-2">
            Curadoria leve: ocultar tira a foto do feed, do álbum e do telão.
          </p>
          <span className="shrink-0 rounded-pilula bg-superficie-alta px-3 py-1.5 font-titulo text-[0.8125rem]">
            {itens.length} {itens.length === 1 ? "foto" : "fotos"}
          </span>
        </div>

        {itens.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-ink-2">
              Ainda não há fotos publicadas. Elas aparecem aqui assim que entram.
            </p>
            <p className="m-0 text-sm text-ink-3">
              Baixe as peças com o QR e coloque nas mesas — ou compartilhe o link do convidado diretamente.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-start gap-y-4 [&>*]:-mx-3">
            {itens.map((item, indice) => {
              const ativo = selecionado === item.id;
              return (
                <PrintedCopyCard
                  key={item.id}
                  index={indice}
                  imageUrl={item.thumb}
                  caption={legendaDaFoto(item.criadaEm, item.reacoes)}
                  alt=""
                  selected={ativo}
                  onClick={() => setSelecionado(ativo ? null : item.id)}
                />
              );
            })}
          </div>
        )}
      </AdminSection>

      {selecionado && (
        <AdminSection>
          <p className="mb-4 mt-0 text-[0.9375rem] text-ink-2">
            Ocultar esta foto? Ela some do evento para todos os convidados.
          </p>
          <button
            type="button"
            disabled={ocultando !== null}
            onClick={() => void ocultar(selecionado)}
            className={`${adminClasses.dangerButtonSm} w-auto px-5 py-3 ${
              ocultando ? "cursor-wait opacity-60" : ""
            }`}
          >
            {ocultando ? "Ocultando…" : "Ocultar foto"}
          </button>
        </AdminSection>
      )}
    </div>
  );
}
