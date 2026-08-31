export const ruimSet = `SET app.event_id = '00000000-0000-0000-0000-000000000000'`;
export const ruimSetConfig = `SELECT set_config('app.event_id', $1, false)`;
export const ruimLock = `SELECT pg_advisory_lock(42)`;
// Nao deve reprovar: UPDATE tem SET e nao tem nada a ver com GUC.
export const okUpdate = `UPDATE uploads SET caption = 'oi' WHERE id = $1`;
export const okLocal = `SET LOCAL app.event_id = '00000000-0000-0000-0000-000000000000'`;
export const okXact = `SELECT pg_advisory_xact_lock(42)`;
