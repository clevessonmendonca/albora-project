import { withLegacyEventId } from "@/lib/api/adapt-event-id";
import * as canonical from "../../../events/[eventId]/config/route";

export const dynamic = canonical.dynamic;
export const GET = withLegacyEventId(canonical.GET);
export const PATCH = withLegacyEventId(canonical.PATCH);
