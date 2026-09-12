import {
  BookmarkIcon,
  CommentIcon,
  GridIcon,
  SettingsIcon,
  ShareIcon,
  StackIcon,
  SunIcon,
  UsersIcon,
} from "@albora/ui-web";
import Link from "next/link";
import type { ComponentType } from "react";

type IconProps = { size?: number };

type HubItem = {
  label: string;
  hint: string;
  icon: ComponentType<IconProps>;
  href?: string;
};

type HubGroup = {
  title: string;
  items: HubItem[];
};

function groupsFor(base: string): HubGroup[] {
  return [
    {
      title: "Experiência",
      items: [
        { label: "Aparência", hint: "Cor, fonte e capa", icon: SunIcon, href: `${base}/identity` },
        { label: "Recado", hint: "Mensagem de boas-vindas", icon: CommentIcon, href: `${base}/guestbook` },
        { label: "Missões", hint: "Desafios de foto", icon: StackIcon, href: `${base}/missions` },
      ],
    },
    {
      title: "Na festa",
      items: [
        { label: "QR e compartilhamento", hint: "Placa, cards e link", icon: ShareIcon, href: `${base}/qrcode` },
        { label: "Telão", hint: "Como as fotos aparecem no salão", icon: GridIcon, href: `${base}/identity` },
        { label: "Equipe", hint: "Quem ajuda a organizar", icon: UsersIcon, href: `${base}/team` },
      ],
    },
    {
      title: "Segurança e controle",
      items: [
        { label: "Privacidade", hint: "Consentimento e retenção", icon: BookmarkIcon, href: `${base}/consent` },
        { label: "Configurações", hint: "Ajustes do evento", icon: SettingsIcon, href: `${base}/pre-event` },
      ],
    },
  ];
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="m9.5 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HubCard({ label, hint, icon: Icon, href }: HubItem) {
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-token bg-superficie-alta text-ink-2">
        <Icon size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="tipo-label truncate text-ink">{label}</span>
        <span className="tipo-caption truncate text-ink-3">{hint}</span>
      </span>
      <span className="shrink-0 text-ink-3">
        <ChevronIcon />
      </span>
    </>
  );

  const className =
    "flex items-center gap-3 rounded-superficie border border-linha bg-superficie px-4 py-3.5 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]";

  if (!href) {
    return (
      <div className={`${className} cursor-default opacity-60`} aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <Link href={href} className={`${className} hover:bg-superficie-alta`}>
      {body}
    </Link>
  );
}

export function EventHub({ eventId }: { eventId: string }) {
  const base = `/admin/e/${eventId}`;
  const groups = groupsFor(base);

  return (
    <div className="flex flex-col gap-8">
      <p className="tipo-body m-0 -mt-2 text-ink-2">Tudo do seu evento num lugar.</p>
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="tipo-label m-0 mb-3 text-ink-3">{group.title}</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {group.items.map((item) => (
              <HubCard key={item.label} {...item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
