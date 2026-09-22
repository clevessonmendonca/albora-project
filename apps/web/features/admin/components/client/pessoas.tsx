"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@albora/ui-web";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
import {
  descobertasDaFesta,
  ordenarPessoas,
  type Pessoa,
} from "@/features/admin/lib/descobertas";

type Foto = { id: string; thumb: string; criadaEm: string };

function hora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso))
    .replace(":", "h");
}

function contagem(fotos: number): string {
  if (fotos === 0) return "sem fotos ainda";
  return `${fotos} ${fotos === 1 ? "foto" : "fotos"}`;
}

/** Iniciais no lugar de avatar: não há foto de perfil e não vai haver. */
function Inicial({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden
      className="tipo-label flex size-10 shrink-0 items-center justify-center rounded-full bg-superficie-alta text-ink-2"
    >
      {nome.slice(0, 1).toLocaleUpperCase("pt-BR")}
    </span>
  );
}

function PerfilDaPessoa({
  eventoId,
  pessoa,
  medalha,
  onVoltar,
}: {
  eventoId: string;
  pessoa: Pessoa;
  medalha: string | null;
  onVoltar: () => void;
}) {
  const [fotos, setFotos] = useState<Foto[] | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const r = await fetch(`/api/admin/events/${eventoId}/album?sessaoId=${pessoa.id}`);
        if (!r.ok) throw new Error("falhou");
        const corpo = (await r.json()) as { itens: Foto[] };
        if (vivo) setFotos(corpo.itens);
      } catch {
        if (vivo) setFotos([]);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [eventoId, pessoa.id]);

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onVoltar} className={adminClasses.secondaryButton}>
        ← Pessoas
      </button>

      <AdminSection>
        <div className="flex items-center gap-3">
          <Inicial nome={pessoa.nome} />
          <div className="min-w-0">
            <h2 className="tipo-subtitle m-0 text-ink">{pessoa.nome}</h2>
            <p className="tipo-caption m-0 mt-1 text-ink-3">
              {contagem(pessoa.fotos)} · entrou às {hora(pessoa.entrouEm)}
            </p>
          </div>
          {medalha && <Badge tone="accent">{medalha}</Badge>}
        </div>

        {fotos === null ? (
          <ul aria-hidden className="m-0 mt-5 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
            {[0, 1, 2].map((i) => (
              <li key={i} className="aspect-square animate-pulse rounded-media bg-superficie-alta" />
            ))}
          </ul>
        ) : fotos.length === 0 ? (
          <p className="tipo-body m-0 mt-5 text-ink-2">
            Entrou no álbum, mas ainda não fotografou.
          </p>
        ) : (
          <ul className="m-0 mt-5 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
            {fotos.map((f) => (
              <li key={f.id} className="aspect-square overflow-hidden rounded-media bg-superficie-alta">
                <img
                  src={f.thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover object-top"
                />
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}

export function Pessoas({
  eventoId,
  pessoas,
  pessoaInicial = null,
}: {
  eventoId: string;
  pessoas: Pessoa[];
  pessoaInicial?: string | null;
}) {
  const [busca, setBusca] = useState("");
  const [maisFotos, setMaisFotos] = useState(true);
  const [aberta, setAberta] = useState<string | null>(pessoaInicial);

  const descobertas = useMemo(() => descobertasDaFesta(pessoas), [pessoas]);
  const lista = useMemo(
    () => ordenarPessoas(pessoas, busca, maisFotos),
    [pessoas, busca, maisFotos],
  );

  const medalhaDe = (id: string) => descobertas.find((d) => d.pessoa.id === id)?.rotulo ?? null;

  const pessoaAberta = aberta ? (pessoas.find((p) => p.id === aberta) ?? null) : null;
  if (pessoaAberta) {
    return (
      <PerfilDaPessoa
        eventoId={eventoId}
        pessoa={pessoaAberta}
        medalha={medalhaDe(pessoaAberta.id)}
        onVoltar={() => setAberta(null)}
      />
    );
  }

  if (pessoas.length === 0) {
    return (
      <AdminSection>
        <p className="tipo-body m-0 text-ink-2">Ninguém entrou ainda.</p>
        <p className="tipo-caption m-0 mt-1.5 max-w-[46ch] text-ink-3">
          As pessoas aparecem aqui quando escaneiam o QR da mesa — antes mesmo da primeira foto.
        </p>
      </AdminSection>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {descobertas.length > 0 && (
        <AdminSection>
          <h2 className="tipo-label m-0 mb-3 text-ink-3">Descobertas da festa</h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {descobertas.map((d) => (
              <li key={d.chave}>
                <button
                  type="button"
                  onClick={() => setAberta(d.pessoa.id)}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-token border border-linha bg-superficie px-3.5 text-left transition-colors hover:border-acento"
                >
                  <Inicial nome={d.pessoa.nome} />
                  <span className="min-w-0">
                    <span className="tipo-caption block text-ink-3">{d.rotulo}</span>
                    <span className="tipo-body block text-ink">{d.pessoa.nome}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </AdminSection>
      )}

      <AdminSection>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Buscar pessoa</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pessoa"
              className="tipo-body min-h-11 w-full rounded-token border border-linha bg-superficie px-3.5 text-ink placeholder:text-ink-3"
            />
          </label>
          <button
            type="button"
            onClick={() => setMaisFotos((v) => !v)}
            aria-label={`Ordenar por ${maisFotos ? "menos" : "mais"} fotos`}
            className={`${adminClasses.secondaryButton} min-h-11`}
          >
            {maisFotos ? "Mais fotos" : "Menos fotos"}
          </button>
        </div>

        {lista.length === 0 ? (
          <p className="tipo-body m-0 text-ink-2">Ninguém com esse nome.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {lista.map((p) => {
              const medalha = medalhaDe(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setAberta(p.id)}
                    className="flex w-full min-h-11 cursor-pointer items-center gap-3 border-0 border-b border-linha bg-transparent px-0 py-3 text-left"
                  >
                    <Inicial nome={p.nome} />
                    <span className="min-w-0 flex-1">
                      <span className="tipo-body block truncate text-ink">{p.nome}</span>
                      <span className="tipo-caption block text-ink-3">
                        {contagem(p.fotos)} · entrou às {hora(p.entrouEm)}
                      </span>
                    </span>
                    {medalha && <Badge tone="accent">{medalha}</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
