import { withLegacyEventId } from "@/lib/api/adapt-event-id";
import * as canonical from "../../../events/[eventId]/comments/route";

export const dynamic = "force-dynamic";
export const GET = withLegacyEventId(canonical.GET);
export const DELETE = withLegacyEventId(canonical.DELETE);
