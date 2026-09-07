export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export async function onRequestError(
  ...args: [
    error: unknown,
    request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
    context: { routerKind: string; routePath: string; routeType: string },
  ]
) {
  if (process.env.SENTRY_DSN) {
    const { captureRequestError, withScope, setTag } = await import("@sentry/nextjs");

    // Tag with critical route paths for alerting
    const [, request] = args;
    const path = request.path || "";

    const criticalPaths = [
      "/api/uploads/presign",
      "/api/wall/",
      "/api/billing/",
      "/api/ops/",
    ];
    const isCritical = criticalPaths.some((p) => path.includes(p));

    // Capture with route context
    if (isCritical) {
      withScope(() => {
        setTag("critical_route", "true");
        setTag("route", path);
        captureRequestError(...args);
      });
    } else {
      captureRequestError(...args);
    }
  }
}
