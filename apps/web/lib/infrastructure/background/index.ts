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
  consume,
  reset,
  type RateLimitResult,
} from "./rate-limit-store";
