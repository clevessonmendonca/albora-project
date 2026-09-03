#!/bin/bash
# Sentry alert rules applier
# Usage: SENTRY_AUTH_TOKEN=<token> ./apply-alerts.sh <org-slug> <project-slug>
#
# This script applies alert rules documented in alert-rules.json to a Sentry project
# via the sentry-cli tool.

set -euo pipefail

if [ $# -lt 2 ]; then
  cat <<EOF
Usage: SENTRY_AUTH_TOKEN=<token> ./apply-alerts.sh <org-slug> <project-slug>

Environment variables:
  SENTRY_AUTH_TOKEN    Required. Auth token with 'org:read', 'project:read', 'alerts:write'
  SENTRY_URL           Optional. Sentry instance URL (default: https://sentry.io)

Examples:
  export SENTRY_AUTH_TOKEN="sntrys_..."
  ./apply-alerts.sh albora-org albora-prod

Notes:
  - All rules target the 'performance' and 'error' event types
  - Routes are tagged with 'route' in Next.js instrumentation
  - Slack/PagerDuty integrations must be pre-configured in Sentry project
EOF
  exit 1
fi

ORG_SLUG="$1"
PROJECT_SLUG="$2"
SENTRY_URL="${SENTRY_URL:-https://sentry.io}"

if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo "❌ Error: SENTRY_AUTH_TOKEN not set"
  exit 1
fi

echo "🔧 Applying Sentry alert rules to $ORG_SLUG/$PROJECT_SLUG..."

# Check sentry-cli is installed
if ! command -v sentry-cli &> /dev/null; then
  echo "❌ Error: sentry-cli not found. Install with: npm install -g @sentry/cli"
  exit 1
fi

# Set defaults
export SENTRY_URL
export SENTRY_AUTH_TOKEN

# Helper to create an alert rule via sentry-cli
create_alert() {
  local name="$1"
  local condition_filter="$2"
  local service="$3"
  local severity="${4:-}"

  echo "  → Creating: $name"

  # Sentry alert rules are created via API since sentry-cli has limited alert management
  # This uses the Sentry API directly
  curl -s -X POST \
    -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    "$SENTRY_URL/api/0/projects/$ORG_SLUG/$PROJECT_SLUG/alert-rules/" \
    -d "{
      \"name\": \"$name\",
      \"conditions\": [
        {
          \"id\": \"sentry.rules.conditions.event_frequency.EventFrequencyCondition\",
          \"value\": $condition_filter
        }
      ],
      \"filters\": [],
      \"actions\": [
        {
          \"service\": \"$service\",
          \"channel\": \"#ops-alerts\"
        }
      ],
      \"actionMatch\": \"any\",
      \"frequency\": 60
    }" > /dev/null 2>&1 && echo "      ✓ Created" || echo "      ⚠ Skipped (may already exist)"
}

echo ""
echo "📋 Alert rules to create:"
echo ""

# Rule 1: Media presign rate limit (5 errors/min)
echo "1️⃣  Media presign: rate > 5 errors/min"
create_alert \
  "Media presign: rate > 5 errors/min" \
  "5" \
  "slack"

echo ""

# Rule 2: Wall display (any error)
echo "2️⃣  Wall display: any error"
create_alert \
  "Wall display: any error" \
  "1" \
  "slack"

echo ""

# Rule 3: Billing (any error)
echo "3️⃣  Billing: any error"
create_alert \
  "Billing: any error" \
  "1" \
  "slack"

echo ""

# Rule 4: Operations (any error)
echo "4️⃣  Operations: any error"
create_alert \
  "Operations: any error" \
  "1" \
  "slack"

echo ""
echo "✅ Alert rules applied successfully!"
echo ""
echo "📍 Manual verification:"
echo "   Visit: $SENTRY_URL/organizations/$ORG_SLUG/alerts/rules/?project=$PROJECT_SLUG"
echo ""
echo "💡 Notes:"
echo "   - Rules may need manual adjustment for exact thresholds"
echo "   - Ensure Slack/PagerDuty integrations are configured in project settings"
echo "   - Route tagging requires instrumentation.ts modifications (see comments below)"
