import { withEventId } from "@/lib/api/adapt-event-id";
import * as legacy from "../../../eventos/[eventoId]/convidados/route";

export const dynamic = legacy.dynamic;
export const GET = withEventId(legacy.GET);
