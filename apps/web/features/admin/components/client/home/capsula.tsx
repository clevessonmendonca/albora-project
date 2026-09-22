"use client";

import { useState } from "react";
import { Switch } from "@albora/ui-web";

/**
 * A exceção ao apagamento do dia 365 — e a única. Opt-in, desligável num
 * toque, sem tentativa de retenção quando desliga.
 *
 * Alcança só a mídia que o próprio casal enviou. A foto é de quem a tirou, e
 * o convidado consentiu com um prazo anunciado: o casal ligar um toggle não
 * estende consentimento de terceiro. A tela diz isso em voz alta, porque um
 * opt-in que esconde o que guarda não é consentimento informado.
 */
export function CapsulaDeMemoria({
  eventoId,
  inicial,
}: {
  eventoId: string;
  inicial: boolean;
}) {
  const [ligada, setLigada] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(false);

  const alternar = async (valor: boolean) => {
    setSalvando(true);
    setErro(false);
    setLigada(valor);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/album`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "capsula", ligada: valor }),
      });
      if (!r.ok) throw new Error("falhou");
    } catch {
      setLigada(!valor);
      setErro(true);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="rounded-superficie border border-linha bg-superficie p-[clamp(1.25rem,3vw,1.75rem)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="tipo-subtitle m-0 text-ink">Lembrança de cada ano</h2>
          <p className="tipo-body m-0 mt-2 max-w-[48ch] text-ink-2">
            Na data da festa, todo ano, mandamos uma lembrancinha. Para isso guardamos até 20 dos
            seus destaques além do prazo normal.
          </p>
          <p className="tipo-caption m-0 mt-2 max-w-[48ch] text-ink-3">
            Só fotos que vocês mesmos enviaram. As dos convidados são apagadas no prazo de sempre —
            a foto é de quem tirou, e esse consentimento não é de vocês para dar.
          </p>
        </div>
        <Switch
          checked={ligada}
          onChange={(v) => void alternar(v)}
          disabled={salvando}
          label="Guardar meus destaques para a lembrança anual"
        />
      </div>
      {erro && (
        <p role="alert" className="tipo-caption m-0 mt-3 text-critico">
          Não salvou agora. Tente de novo.
        </p>
      )}
    </section>
  );
}
