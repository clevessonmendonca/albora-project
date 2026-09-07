# Sentry Configuration for Albora Critical Routes

This directory contains Sentry alert configuration for monitoring critical API routes in Albora.

## Overview

Sentry is configured to track errors and performance issues in critical user-facing routes:

- **Media Upload Presign** (`/api/uploads/presign`) — initializes media upload to R2 storage
- **Wall Display** (`/api/wall/*`) — displays photos on telão screen during event
- **Billing** (`/api/billing/*`) — handles payment processing
- **Operations** (`/api/ops/*`) — background jobs for data retention and maintenance

## Files

### `alert-rules.json`

Declares the alert rules that should be configured in Sentry. These rules are:

1. **Media presign rate limit** — Triggers if > 5 errors in 60 seconds
   - Indicates issues with R2 signing, validation, or quota checks
   - Severity: Warning (recoverable)

2. **Wall display errors** — Triggers on any error
   - Guests see blank screen if this fails
   - Severity: Critical (production impact immediate)

3. **Billing errors** — Triggers on any error
   - Payment processing or webhook failures
   - Severity: High (revenue/trust impact)

4. **Operations errors** — Triggers on any error
   - Retention job failures could cause data loss
   - Severity: High (data integrity impact)

### `apply-alerts.sh`

Shell script to apply alert rules via `sentry-cli` when `SENTRY_AUTH_TOKEN` becomes available.

**Usage:**
```bash
export SENTRY_AUTH_TOKEN="sntrys_..."
./apply-alerts.sh <org-slug> <project-slug>
```

## Improvements Made to Sentry Integration

### 1. Enhanced Server Configuration (`sentry.server.config.ts`)

- Added `beforeSend` hook to tag all events with their route
- Critical routes get tagged with `critical_route: true`
- Route path is always included in `tags.route` for filtering in Sentry UI

### 2. Explicit Error Capture in API Handlers

The `unexpectedError()` function (used in all API route error handling) now:
- Logs to console as before
- **Explicitly captures to Sentry** via `captureException()`
- Includes context tag for debugging

This ensures errors caught in try-catch blocks don't disappear:
```typescript
catch (e) {
  return unexpectedError("presign.assinar", e);  // Now captured to Sentry!
}
```

### 3. Request Error Instrumentation (`instrumentation.ts`)

- `onRequestError()` now tags critical routes
- Sets both `critical_route` and `route` tags for filtering

## Manual Configuration Steps (Until Credentials Available)

1. Go to [Sentry Project Settings](https://sentry.io/settings/)
2. Navigate to **Alerts** → **Create Alert Rule**
3. For each rule in `alert-rules.json`:
   - Set condition based on event type and route filter
   - Configure Slack channel: `#ops-alerts`
   - Set PagerDuty severity according to rule definition

### Filter by Route

In Sentry alerts, use these filters:

```
tags.route:"/api/uploads/presign"   (for presign rule)
tags.route:"/api/wall/*"            (for wall rule)
tags.route:"/api/billing/*"         (for billing rule)
tags.route:"/api/ops/*"             (for ops rule)
```

## Testing the Configuration

### 1. Verify Tag Application

Once Sentry is running:
```bash
# Trigger an error in a critical route
curl -X POST https://app.albora.app/api/uploads/presign \
  -H "Content-Type: application/json" \
  -d '{"uploadId":"test","mime":"image/jpeg","bytes":1000}'

# Error should appear in Sentry with:
# - tags.route = "/api/uploads/presign"
# - tags.critical_route = "true"
# - context = "presign.assinar" (from the handler)
```

### 2. Verify Alert Trigger

Test rate limit alert for presign:
```bash
# Trigger 6 errors within 60 seconds to exceed threshold
for i in {1..6}; do
  curl -X POST https://app.albora.app/api/uploads/presign \
    -H "Content-Type: application/json" \
    -d '{"uploadId":"test-'$i'","mime":"invalid/type","bytes":999999999}' &
done
wait

# Should trigger alert in #ops-alerts Slack channel
```

## Environment Variables

Required for full Sentry functionality:

```bash
# Sentry SDK initialization
SENTRY_DSN="https://<key>@<instance>.ingest.sentry.io/<project>"

# For explicitly applying alert rules
SENTRY_AUTH_TOKEN="sntrys_<token>"  # Not yet available
SENTRY_URL="https://sentry.io"      # Optional, defaults shown
```

## Monitoring and Alerting

### Where to Check Alerts

- **Slack:** `#ops-alerts` channel receives all notifications
- **PagerDuty:** Critical alerts trigger incidents (if configured)
- **Sentry UI:** [Alerts Dashboard](https://sentry.io/organizations/albora/alerts/)

### Alert Response Checklist

When an alert fires:

1. **Presign Rate Limit** (Warning)
   - [ ] Check R2 credentials and rate limits
   - [ ] Check database quota queries
   - [ ] Review recent deployments (validation rules changed?)

2. **Wall Display** (Critical)
   - [ ] Check database connectivity
   - [ ] Check object storage (R2) connectivity
   - [ ] Verify Sentry can see the error stacktrace
   - [ ] Note: Guests are seeing blank screen now

3. **Billing** (High)
   - [ ] Check payment provider integration
   - [ ] Check webhook configuration
   - [ ] Verify rate limiting isn't too aggressive

4. **Operations** (High)
   - [ ] Check background job logs
   - [ ] Check database query performance
   - [ ] Verify retention job schedule

## Known Limitations

1. **No credentials yet** — Alert rules must be configured manually in Sentry UI
2. **Route filtering** — Depends on Sentry integration properly tagging events
3. **Rate limit rule** — Needs manual threshold tuning based on actual production traffic
4. **Async error capture** — `unexpectedError()` is now async; ensure all call sites handle it

## Next Steps

1. **Get `SENTRY_AUTH_TOKEN`** from team ops
2. **Run `apply-alerts.sh`** to create alerts programmatically
3. **Test alerts** in staging by triggering errors
4. **Monitor production** during first event with alerts enabled
5. **Tune thresholds** based on actual traffic patterns

## References

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Alert Rules API](https://docs.sentry.io/api/projects/alert-rules/)
- [Project CLAUDE.md — error handling requirements](../CLAUDE.md)
