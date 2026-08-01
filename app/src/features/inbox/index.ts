/**
 * Public barrel for the inbox slice. Other features import from `@/features/inbox` and never
 * from a path inside it; ESLint enforces that.
 */
export {
  fetchConversations,
  fetchInboxes,
  fetchTags,
  fetchUsers,
  fetchViews,
  patchConversation,
  deleteConversation,
  restoreConversation,
  type ConversationListParams,
  type ConversationPage,
  type ConversationPatch,
} from './api/conversations'
export { useInboxes, inboxesQueryKey } from './hooks/use-inboxes'
export { useSidebar } from './hooks/use-sidebar'
export { FolderSidebar } from './components/FolderSidebar'
