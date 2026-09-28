"use client";

import Link from "next/link";
import { CameraIcon, GridIcon, ShareIcon } from "@albora/ui-web";
import { AdminCard } from "@/features/admin/components/server/admin-shell";

/**
 * Os blocos que vieram do protótipo do painel do casal: a faixa de números, os
 * atalhos e o cartão que explica o dia da festa.
 *
 * Os números saem de `loadHomeState` — fotos, pessoas e destacadas são dados
 * reais do evento. O protótipo mostra "04 fotos · Exemplos", com dado de
 * demonstração; aqui, quando não há foto, o bloco não aparece, porque um
 * painel que exibe número falso ensina o anfitrião a não confiar no número.
 */

export function NumerosDoEvento({
  fotos,
  pessoas,
  destacadas,
  base,
}: {
  fotos: number;
  pessoas: number;
  destacadas: number;
  base: string;
}) {
  if (fotos === 0 && pessoas === 0) return null;

  const numeros = [
    { valor: fotos, rotulo: fotos === 1 ? "foto no álbum" : "fotos no álbum", href: `${base}/album` },
    { valor: pessoas, rotulo: pessoas === 1 ? "convidado" : "convidados", href: `${base}/guests` },
    {
      valor: destacadas,
      rotulo: destacadas === 1 ? "destacada" : "destacadas",
      href: `${base}/album?aba=destaques`,
    },
  ];

  return (
    <section aria-label="Números do evento">
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
        {numeros.map((n) => (
          <li key={n.rotulo}>
            <Link
              href={n.href}
              className="flex min-h-12 flex-col gap-1 rounded-superficie border border-linha px-4 py-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
            >
              <span className="font-titulo text-[clamp(1.5rem,4vw,2rem)] font-[var(--peso-display)] leading-none tabular-nums text-ink">
                {n.valor}
              </span>
              <span className="tipo-caption text-ink-3">{n.rotulo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ATALHOS = [
  { id: "qr", rotulo: "Meu QR", dica: "Compartilhar", suffix: "/qrcode", Icone: ShareIcon },
  { id: "album", rotulo: "Álbum", dica: "Ver fotos", suffix: "/album", Icone: CameraIcon },
  { id: "telao", rotulo: "Telão", dica: "Configurar", suffix: "/identity", Icone: GridIcon },
] as const;

export function AcessoRapido({ base }: { base: string }) {
  return (
    <AdminCard>
      <h2 className="tipo-subtitle m-0 text-ink">Acesso rápido</h2>
      <p className="tipo-caption mt-1 mb-4 text-ink-3">O que vocês mais vão usar.</p>
      <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-3">
        {ATALHOS.map(({ id, rotulo, dica, suffix, Icone }) => (
          <li key={id}>
            <Link
              href={`${base}${suffix}`}
              className="flex min-h-12 items-center gap-3 rounded-token border border-linha px-4 py-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
            >
              <span className="shrink-0 text-ink-2">
                <Icone size={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="tipo-label leading-none text-ink">{rotulo}</span>
                <span className="tipo-caption truncate text-ink-3">{dica}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}

export function NoDiaDaFesta({ base }: { base: string }) {
  return (
    <AdminCard>
      <h2 className="tipo-subtitle m-0 text-ink">No dia da festa</h2>
      <p className="tipo-body mt-2 mb-0 max-w-[48ch] text-ink-2">
        As fotos chegam aqui e no telão conforme os convidados enviam. Vocês decidem se elas
        aparecem na hora ou passam por uma fila de revisão — e podem pausar o telão a qualquer
        momento.
      </p>
      <Link
        href={`${base}/identity`}
        className="mt-5 inline-flex min-h-12 items-center rounded-pilula border border-linha px-5 tipo-label text-ink-2 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink"
      >
        Preparar o telão
      </Link>
    </AdminCard>
  );
}
