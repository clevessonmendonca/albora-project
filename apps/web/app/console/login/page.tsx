import { LoginForm } from "@/features/console/components/client/login-form";

export const dynamic = "force-dynamic";

export default async function ConsoleLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  return <LoginForm magic={m ?? null} />;
}
