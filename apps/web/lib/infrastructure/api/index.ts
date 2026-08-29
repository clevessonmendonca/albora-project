/**
 * Infrastructure: API
 * 
 * Camada de API: middleware, handlers e validators.
 * Refatoração conforme Fase 7 do roadmap.
 */

// Middleware
export * from "./middleware/guest-auth";
export * from "./middleware/host-auth";
export * from "./middleware/rate-limit";
export * from "./middleware/parse-json";
export * from "./middleware/response";
export * from "./middleware/validation";
export * from "./middleware/guest-event";
export * from "./middleware/host-event";
export * from "./middleware/host-event-role";
export * from "./middleware/adapt-event-id";

// Config guards
export * from "./config-guard";
export * from "./drive-config-guard";
export * from "./constants";

