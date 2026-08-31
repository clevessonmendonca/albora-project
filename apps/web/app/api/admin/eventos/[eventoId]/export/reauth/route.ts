import { withLegacyEventId } from "@/lib/api/adapt-event-id";
import * as canonical from "../../../../events/[eventId]/export/reauth/route";

export const dynamic = "force-dynamic";
export const POST = withLegacyEventId(canonical.POST);
