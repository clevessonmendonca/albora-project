"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { announce } from "@albora/ui-web";

const ROUTE_NAMES: Record<string, string> = {
  "": "Início",
  "/feed": "Feed",
  "/missions": "Missões",
  "/album": "Álbum",
  "/my-photos": "Minhas fotos",
  "/photo": "Mandar foto",
  "/music": "Música",
};

function routeLabel(pathname: string): string {
  const slug = pathname.replace(/^\/e\/[^/]+/, "");
  return ROUTE_NAMES[slug] ?? "Página";
}

export function RouteAnnouncer() {
  const pathname = usePathname();
  const prev = useRef(pathname);

  useEffect(() => {
    if (pathname === prev.current) return;
    prev.current = pathname;
    announce(routeLabel(pathname));
  }, [pathname]);

  return null;
}
