import { interacaoAberta } from "@albora/core";
import { resolvePackText, type Pack } from "@albora/packs";

type EventoGate = {
  interacaoAbreEm: Date | null;
  fuso: string;
};

export type InteractionBannerLabels = {
  aberta: string;
  fechada: string;
  fechadaAgendada: string;
};

export function interactionBannerLabels(pack: Pack | undefined): InteractionBannerLabels {
  if (!pack) {
    return {
      aberta: "Feed liberado — veja o que rolou",
      fechada: "Interação em breve",
      fechadaAgendada: "Interação abre às {hora}",
    };
  }
  return {
    aberta: resolvePackText(pack, "interacao.aberta"),
    fechada: resolvePackText(pack, "interacao.fechada"),
    fechadaAgendada: resolvePackText(pack, "interacao.fechada.agendada"),
  };
}

function formatHora(iso: string, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: fuso,
  }).format(new Date(iso));
}

export function resolveInteractionBanner(
  evento: EventoGate,
  labels: InteractionBannerLabels,
  now = new Date(),
): { open: boolean; label: string; opensAtIso: string | null } {
  const open = interacaoAberta(evento, now);
  const opensAtIso = evento.interacaoAbreEm?.toISOString() ?? null;

  if (open) {
    return { open: true, label: labels.aberta, opensAtIso };
  }

  if (evento.interacaoAbreEm && evento.interacaoAbreEm.getTime() > now.getTime()) {
    const hora = formatHora(opensAtIso!, evento.fuso);
    return {
      open: false,
      label: labels.fechadaAgendada.replace("{hora}", hora),
      opensAtIso,
    };
  }

  return { open: false, label: labels.fechada, opensAtIso };
}
