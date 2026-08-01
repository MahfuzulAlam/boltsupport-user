import { useQuery } from '@tanstack/react-query'
import { fetchTags, fetchUsers, useInboxes } from '@/features/inbox'
import { useSavedReplies } from '@/features/docs'
import type { RuleVocabulary } from '../components/describe-rule'

/**
 * The names every rule editor needs: tags, teammates, inboxes, saved replies.
 *
 * Bundled into one hook because every one of the four surfaces that uses the builder needs the
 * same four lists, and each of them is small, cached, and shared across the app.
 */
export function useRuleVocabulary() {
  const tags = useQuery({ queryKey: ['tags'], queryFn: ({ signal }) => fetchTags(signal) })
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })
  const inboxes = useInboxes()
  const savedReplies = useSavedReplies()

  const vocabulary: RuleVocabulary = {
    tags: tags.data ?? [],
    users: users.data ?? [],
    inboxes: (inboxes.data ?? []).map((inbox) => ({ id: inbox.id, name: inbox.name })),
  }

  return { ...vocabulary, savedReplies: savedReplies.data ?? [], vocabulary }
}
