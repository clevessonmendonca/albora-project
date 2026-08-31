import { withLegacyEventId } from "@/lib/api/adapt-event-id";
import * as canonical from "../../../events/[eventId]/export/route";

export const dynamic = "force-dynamic";
export const GET = withLegacyEventId(canonical.GET);
export const POST = withLegacyEventId(canonical.POST);
