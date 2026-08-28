/**
 * @deprecated Importar de `@/lib/infrastructure/background` na nova estrutura.
 * Este arquivo mantém retrocompatibilidade temporária.
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
} from "./infrastructure/background/interaction-queue";
