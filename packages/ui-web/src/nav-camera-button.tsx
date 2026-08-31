import type { ElementType } from "react";
import { CameraIcon } from "./icons";
import { cn } from "./variants";

export type NavCameraButtonProps = {
  /** Sem `href` o botão é decorativo (catálogo estático, sem navegação). */
  href?: string;
  linkComponent?: ElementType;
  /** `-mt-5` em TabBar/GuestTabBar; `-mt-6` em FloatingNav (que flutua com borda no perímetro). */
  lift?: string;
};

export function NavCameraButton({ href, linkComponent, lift = "-mt-5" }: NavCameraButtonProps) {
  const className = cn(
    "col-start-3 grid size-[3.375rem] place-items-center justify-self-center rounded-full bg-acento text-sobre-acento shadow-acento",
    lift,
  );

  if (!href) {
    return (
      <span className={className}>
        <CameraIcon />
      </span>
    );
  }

  const L = linkComponent ?? "a";

  return (
    <L href={href} aria-label="Mandar foto ou vídeo" className={cn(className, "no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90")}>
      <CameraIcon />
    </L>
  );
}
