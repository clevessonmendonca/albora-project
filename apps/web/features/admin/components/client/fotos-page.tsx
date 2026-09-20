"use client";

import { useEffect, useState } from "react";
import { Badge } from "@albora/ui-web";
import { Abas } from "./abas";
import { HostAlbum } from "./host-album";
import { ModerationPage } from "./moderation-page";

type Aba = "todas" | "revisar" | "destaques";

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "revisar", rotulo: "Revisar" },
  { chave: "destaques", rotulo: "Destaques" },
];

function ehAba(v: string | null): v is Aba {
  return v === "todas" || v === "revisar" || v === "destaques";
}

/**
 * Fotos é uma tela só. Antes o álbum e a moderação eram páginas separadas, e
 * a decisão "esta foto fica?" obrigava a trocar de tela — que é justamente o
 * momento em que ninguém troca, porque a festa está rolando.
 */
export function FotosPage({
  eventoId,
  canExport,
  abaInicial,
}: {
  eventoId: string;
  canExport: boolean;
  abaInicial: string | null;
}) {
  const [aba, setAba] = useState<Aba>(ehAba(abaInicial) ? abaInicial : "todas");
  const [fila, setFila] = useState(0);
  const [denunciadas, setDenunciadas] = useState(0);

  // Uma leitura no mount só para o badge da aba. A fila em si é do ReviewQueue,
  // que só monta quando a aba abre — e o badge precisa do número antes disso.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const r = await fetch(`/api/admin/events/${eventoId}`);
        if (!r.ok) return;
        const d = (await r.json()) as { filaRevisao?: number; denunciadas?: number };
        if (!vivo) return;
        setFila(d.filaRevisao ?? 0);
        setDenunciadas(d.denunciadas ?? 0);
      } catch {
        // Badge é enfeite: painel não quebra porque a contagem não veio.
      }
    })();
    return () => {
      vivo = false;
    };
  }, [eventoId]);

  return (
    <div className="flex flex-col gap-5">
      <Abas
        rotulo="Fotos"
        ativa={aba}
        onMudar={setAba}
        abas={ABAS.map(({ chave, rotulo }) => ({
          chave,
          rotulo,
          // Vermelho é para denúncia. Fila cheia numa festa grande é normal.
          ...(chave === "revisar" && fila > 0
            ? {
                adorno: (
                  <Badge tone={aba === "revisar" || denunciadas === 0 ? "neutral" : "critico"}>
                    {fila}
                  </Badge>
                ),
              }
            : {}),
        }))}
      />

      {aba === "revisar" ? (
        <ModerationPage eventoId={eventoId} />
      ) : (
        <HostAlbum eventoId={eventoId} canExport={canExport} aba={aba} />
      )}
    </div>
  );
}
