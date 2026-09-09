import React from "react";

/**
 * Ícones do console, fora de `@albora/ui-web` de propósito: a rota do
 * convidado tem orçamento de bundle e não tem nada a ver com "servidor" ou
 * "auditoria". Mesma gramática do conjunto compartilhado — 24×24,
 * `currentColor`, traço 1.5, `aria-hidden` (o rótulo vem sempre do texto ao
 * lado, nunca do desenho).
 */
type IconProps = { size?: number };

function Svg({ size = 18, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

export function VisaoGeralIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3.5l9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.75 20v-5.5h4.5V20" />
    </Svg>
  );
}

export function ContasIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6" />
      <path d="M17.5 14.9c2.1.6 3.5 2.3 3.5 4.6" />
    </Svg>
  );
}

export function EventosIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.75h17M8.25 3.5v3M15.75 3.5v3" />
    </Svg>
  );
}

export function AssinaturasIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.75" y="5.5" width="18.5" height="13" rx="2.5" />
      <path d="M2.75 10h18.5M6.5 14.75h3.5" />
    </Svg>
  );
}

export function SuporteIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m6 6 3.6 3.6M18 6l-3.6 3.6M6 18l3.6-3.6M18 18l-3.6-3.6" />
    </Svg>
  );
}

export function LgpdIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.25 4.75 6.2v5.3c0 4.4 3 7.6 7.25 9.25 4.25-1.65 7.25-4.85 7.25-9.25V6.2Z" />
      <path d="m9 12.2 2.1 2.1 4-4.2" />
    </Svg>
  );
}

export function RetencaoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </Svg>
  );
}

export function AuditoriaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h9" />
    </Svg>
  );
}

export function SegurancaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4.5" y="10.25" width="15" height="10.25" rx="2.5" />
      <path d="M8.25 10.25V7.5a3.75 3.75 0 0 1 7.5 0v2.75" />
    </Svg>
  );
}

export function EquipeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="7.5" r="3.25" />
      <path d="M6 20.5c0-3.3 2.7-5.75 6-5.75s6 2.45 6 5.75" />
    </Svg>
  );
}

export function SistemaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="4.5" width="17" height="6" rx="2" />
      <rect x="3.5" y="13.5" width="17" height="6" rx="2" />
      <path d="M7.25 7.5h.01M7.25 16.5h.01" />
    </Svg>
  );
}

export function BuscaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.75" />
      <path d="m16 16 4.25 4.25" />
    </Svg>
  );
}

export function ChevronIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </Svg>
  );
}

export function RecolherIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9.75 4.5v15" />
    </Svg>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.25M12 7.9h.01" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function AlertaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4.25 2.75 20h18.5Z" />
      <path d="M12 10v4.25M12 17.4h.01" />
    </Svg>
  );
}

export function SairIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 4.5H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25H14.5" />
      <path d="M16.5 15.5 20 12l-3.5-3.5M20 12H9.5" />
    </Svg>
  );
}
