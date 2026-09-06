import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENV ?? "dev",
    tracesSampleRate: 0.1,
    serverName: process.env.VERCEL_ENV || process.env.APP_ENV || "dev",
    // Critical routes: capture 100% of errors from these paths
    beforeSend(event, _hint) {
      const request = event.request;
      const path = request?.url ? new URL(request.url).pathname : "";

      // Always send errors from critical paths (ignore sample rate)
      const criticalPaths = [
        "/api/uploads/presign",
        "/api/wall/",
        "/api/billing/",
        "/api/ops/",
      ];
      const isCritical = criticalPaths.some((p) => path.includes(p));

      // Add route context for alerting
      if (path) {
        event.tags = { ...event.tags, route: path };
      }

      // Adjust sample rate for critical routes: capture 100% vs 10% for others
      if (isCritical) {
        event.tags = { ...event.tags, critical_route: "true" };
      }

      return event;
    },
  });
}
