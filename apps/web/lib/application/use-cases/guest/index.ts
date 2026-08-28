/**
 * Guest Use Cases
 * 
 * Casos de uso do convidado: missões, comentários, reações, uploads.
 */

export {
  listGuestMissions,
  type ListGuestMissionsInput,
  type ListGuestMissionsOutput,
  type GuestMission,
} from "./list-guest-missions";

export {
  publishCommentUseCase,
  type PublishCommentInput,
  type PublishCommentResult,
} from "./publish-comment";

export {
  listComments,
  type ListCommentsInput,
  type ListCommentsOutput,
  type CommentAuthor,
} from "./list-comments";

export {
  deleteComment,
  type DeleteCommentInput,
  type DeleteCommentResult,
} from "./delete-comment";

export {
  addReaction,
  type AddReactionInput,
  type AddReactionResult,
  type ReactionType,
} from "./add-reaction";

export {
  removeReaction,
  type RemoveReactionInput,
  type RemoveReactionResult,
} from "./remove-reaction";

export {
  listReactions,
  type ListReactionsInput,
  type ListReactionsOutput,
  type ReactionReactor,
} from "./list-reactions";

export {
  listFeedUseCase,
  type ListFeedInput,
  type ListFeedOutput,
  type FeedInteractionMode,
} from "./list-feed";

export {
  confirmUpload,
  type ConfirmUploadInput,
  type ConfirmUploadResult,
} from "./confirm-upload";

export {
  getGuestEvent,
  type GetGuestEventInput,
  type GuestEventOutput,
} from "./get-guest-event";

export {
  getGuestbook,
  type GetGuestbookInput,
  type GetGuestbookOutput,
} from "./get-guestbook";

export {
  markGuestbookReadUseCase,
  type MarkGuestbookReadInput,
  type MarkGuestbookReadOutput,
} from "./mark-guestbook-read";

export {
  getGuestMusic,
  type GetGuestMusicInput,
  type GetGuestMusicOutput,
} from "./get-guest-music";

export {
  suggestMusic,
  type SuggestMusicInput,
  type SuggestMusicResult,
} from "./suggest-music";
