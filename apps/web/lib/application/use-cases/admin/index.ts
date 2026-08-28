/**
 * Admin Use Cases
 * 
 * Casos de uso do administrador: eventos, export, insights, vendors, etc.
 */

export {
  listAdminVendors,
  type ListAdminVendorsInput,
  type ListAdminVendorsOutput,
  type VendorInfo,
} from "./list-admin-vendors";

export {
  getEventInsights,
  type GetEventInsightsInput,
  type GetEventInsightsOutput,
  type ChallengeStat,
  type HourStat,
} from "./get-event-insights";

export {
  getEventMusic,
  type GetEventMusicInput,
  type GetEventMusicOutput,
} from "./get-event-music";

export {
  setEventMusic,
  type SetEventMusicInput,
  type SetEventMusicResult,
} from "./set-event-music";

export {
  listChallengesUseCase,
  type ListChallengesInput,
  type ListChallengesOutput,
  type ChallengeItem,
} from "./list-challenges";

export {
  updatePackMissions,
  updateCustomMissions,
  type PackMissionsInput,
  type CustomMissionsInput,
  type CustomMissionInput,
  type UpdateChallengesOutput,
} from "./update-challenges";

export {
  getGuestMetrics,
  type GuestMetricsInput,
  type GuestMetricsOutput,
  type SessionSummary,
  type RecentPhoto,
} from "./get-guest-metrics";

export {
  updateSessionName,
  type UpdateSessionNameInput,
  type UpdateSessionNameResult,
} from "./update-session-name";

export {
  issueMagicLink,
  type IssueMagicLinkInput,
  type IssueMagicLinkOutput,
} from "./issue-magic-link";

export {
  revokeHostSession,
  type RevokeHostSessionInput,
} from "./revoke-host-session";

export {
  consumeMagicLink,
  type ConsumeMagicLinkInput,
  type ConsumeMagicLinkResult,
} from "./consume-magic-link";
