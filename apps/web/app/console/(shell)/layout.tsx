import React, { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveActor } from "@/lib/console/actor";
import { ConsoleShell } from "@/features/console/components/server/console-shell";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  return <ConsoleShell actor={actor}>{children}</ConsoleShell>;
}
