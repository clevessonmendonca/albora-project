/**
 * Infrastructure: Background Processing
 * 
 * Filas offline e processamento em background.
 */

export {
  enqueueReaction,
  listPendingReactions,
  removePendingReaction,
  drainPendingReactions,
  enqueueComment,
  listPendingComments,
  removePendingComment,
  drainPendingComments,
  drainPendingInteractions,
  type ReactionAction,
  type CommentAction,
} from "./interaction-queue";

export {
  RateLimitStore,
  type RateLimitConfig,
} from "./rate-limit-store";
