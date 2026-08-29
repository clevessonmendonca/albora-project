export type PreEventChecklistItem = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  external?: boolean;
};

export type PreEventChecklistSection = {
  id: string;
  title: string;
  items: PreEventChecklistItem[];
};

export type PreEventChecklistState = Record<string, boolean>;

const STORAGE_PREFIX = "albora-pre-event";

export function preEventStorageKey(accountId: string, eventId: string): string {
  return `${STORAGE_PREFIX}:${accountId}:${eventId}`;
}

export function readPreEventChecklist(storageKey: string): PreEventChecklistState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: PreEventChecklistState = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function writePreEventChecklist(storageKey: string, state: PreEventChecklistState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // quota ou modo privado — checklist degrada sem bloquear o admin
  }
}

export function buildPreEventSections(
  eventId: string,
  origin: string,
): PreEventChecklistSection[] {
  const base = `/admin/e/${eventId}`;

  return [
    {
      id: "antes",
      title: "7 dias antes",
      items: [
        {
          id: "pecas",
          label: "Peças impressas (placa A4 + cards por mesa)",
          hint: "Baixe o PDF e confira o preview",
          href: `${base}/qrcode`,
        },
        {
          id: "prova-qr",
          label: "Prova QR — 3 celulares, luz baixa, 15–45 cm",
          hint: "Bloqueante antes do casamento",
          href: `${base}/qrcode`,
        },
        {
          id: "plano",
          label: "Plano pago se telão, ZIP ou vídeo",
          href: base,
        },
        {
          id: "expected-guests",
          label: "Convidados esperados preenchidos",
          href: `${base}/guests`,
        },
        {
          id: "missoes",
          label: "Missões escolhidas (8–12)",
          href: `${base}/missions`,
        },
        {
          id: "identidade",
          label: "Identidade (cores e fonte) aplicada",
          href: `${base}/identity`,
        },
        {
          id: "gate",
          label: "Gate de interação configurado",
          hint: "Padrão: após a cerimônia",
          href: `${base}#controle-interacao`,
        },
        {
          id: "menores",
          label: "“Há menores” ligado, se aplicável",
          href: `${base}#controle-menores`,
        },
        {
          id: "telao",
          label: "Telão pareado e testado por 10 min",
          href: `${origin}/wall-display`,
          external: true,
        },
        {
          id: "mc",
          label: "MC ou cerimonialista com roteiro",
          href: `${base}/pre-event#roteiro-mc`,
        },
        {
          id: "https",
          label: "HTTPS em produção testado no celular real",
          hint: "Captura + fila offline",
          href: base,
        },
      ],
    },
    {
      id: "dia-d",
      title: "Dia D",
      items: [
        {
          id: "placas",
          label: "Placas nas mesas (centro ou tent card, não só entrada)",
        },
        {
          id: "cards",
          label: "Cards de missão visíveis",
          href: `${base}/qrcode`,
        },
        {
          id: "telao-ligado",
          label: "Telão ligado, fullscreen, rede estável",
          href: `${origin}/wall-display`,
          external: true,
        },
        {
          id: "moderacao",
          label: "Moderação: fila de revisão vazia ou equipe designada",
          href: `${base}/moderation`,
        },
        {
          id: "anuncio-mc",
          label: "MC leu o roteiro (≤45 s)",
          href: `${base}/pre-event#roteiro-mc`,
        },
        {
          id: "primeiro-scan",
          label: "Primeiro QR scan observado",
          href: `${base}/guests`,
        },
        {
          id: "painel-hora",
          label: "Painel de participação conferido 1×/hora",
          href: `${base}/guests`,
        },
        {
          id: "foto-telao",
          label: "Se foto inadequada no telão: pânico ou ocultar em <5 s",
          href: base,
        },
        {
          id: "liberar-gate",
          label: "Após a cerimônia: liberar gate se ainda fechado",
          href: `${base}#controle-interacao`,
        },
        {
          id: "offline",
          label: "Avisar convidados: fotos continuam subindo offline",
        },
      ],
    },
  ];
}

export const MC_SCRIPTS = [
  {
    id: "padrao",
    title: "Versão A — padrão (~40 s)",
    text: "Galera, uma coisa rápida: tem QR Code na mesa. Não precisa baixar nada — é igual PIX. Aponta a câmera, tira uma foto da festa e manda. As fotos aparecem lá no telão. Tem missões nos cards — quem participar ajuda a contar a história da festa. Vamos encher esse álbum juntos?",
  },
  {
    id: "missao",
    title: "Versão B — missão única (~20 s)",
    text: "Missão número um: foto com quem veio com você na mesa. QR na mesa, trinta segundos. Valendo.",
  },
  {
    id: "reforco",
    title: "Versão C — reforço meia-noite (~15 s)",
    text: "Quem ainda não mandou foto — QR na mesa, trinta segundos, sem app. A gente quer ver a pista agora.",
  },
] as const;
