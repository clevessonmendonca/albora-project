import { withLegacyEventId } from "@/lib/api/adapt-event-id";
import * as canonical from "../../../../../events/[eventId]/guestbook/audio/confirm/route";

export const dynamic = canonical.dynamic;
export const POST = withLegacyEventId(canonical.POST);
