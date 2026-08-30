import { withLegacyEventId } from "@/lib/api/adapt-event-id";
import * as canonical from "../../../events/[eventId]/pieces/route";

export const dynamic = "force-dynamic";
export const GET = withLegacyEventId(canonical.GET);
