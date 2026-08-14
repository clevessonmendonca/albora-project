import { withLegacyEventId } from "@/lib/api/adapt-event-id";
import * as canonical from "../../../events/[eventId]/guests/route";

export const dynamic = canonical.dynamic;
export const GET = withLegacyEventId(canonical.GET);
