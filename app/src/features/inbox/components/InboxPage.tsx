import { useCallback, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/EmptyState'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { useMediaQuery, BREAKPOINTS } from '@/hooks/use-media-query'
import { ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { folderSchema, type ConvStatus } from '@/types'
import { fetchTags, fetchUsers, fetchViews } from '../api/conversations'
import { useInboxes } from '../hooks/use-inboxes'
import {
  EMPTY_FILTER,
  useConversationList,
  type ListFilter,
  type ListSort,
} from '../hooks/use-conversation-list'
import { useListSelection } from '../hooks/use-list-selection'
import { useListDensity } from '../hooks/use-list-density'
import { useBulkPatch } from '../hooks/use-conversation-mutations'
import { FolderSidebar } from './FolderSidebar'
import { ListToolbar } from './ListToolbar'
import { ListColumns } from './ListColumns'
import { BulkActionBar } from './BulkActionBar'
import { ConversationList } from './ConversationList'
import { PreviewPane } from './PreviewPane'
import { ListSkeleton } from './ListSkeleton'
import { FOLDER_COPY } from '../folder-copy'

export function InboxPage() {
  const params = useParams()
  const navigate = useNavigate()
  const inboxId = params['inboxId'] ?? ''
  const folderParam = folderSchema.safeParse(params['folder'])

  const [sort, setSort] = useState<ListSort>('waiting')
  const [filter, setFilter] = useState<ListFilter>(EMPTY_FILTER)
  const [splitView, setSplitView] = useState(false)
  const [cursorIndex, setCursorIndex] = useState(0)
  const { density, rowHeight, toggleDensity } = useListDensity()
  const roomForPreview = useMediaQuery(`(min-width: ${String(BREAKPOINTS.nav)}px)`)

  const inboxes = useInboxes()
  const views = useQuery({ queryKey: ['views'], queryFn: ({ signal }) => fetchViews(signal) })
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })
  const tags = useQuery({ queryKey: ['tags'], queryFn: ({ signal }) => fetchTags(signal) })

  const folder = folderParam.success ? folderParam.data : 'unassigned'
  const list = useConversationList({ inboxId, folder, sort, filter })
  const selection = useListSelection(list.conversations.map((c) => c.id))
  const bulkPatch = useBulkPatch()

  const userMap = useMemo(
    () => new Map((users.data ?? []).map((user) => [user.id, user])),
    [users.data],
  )

  const openConversation = useCallback(
    (id: string) => {
      void navigate(`/inbox/${inboxId}/${folder}/${id}`)
    },
    [navigate, inboxId, folder],
  )

  // Status chords act on the selection, or on the row under the cursor when nothing is picked.
  const targetIds = selection.hasSelection
    ? selection.selectedIds
    : [list.conversations[cursorIndex]?.id].filter((id): id is string => id !== undefined)

  const applyStatus = useCallback(
    (status: ConvStatus) => {
      if (targetIds.length === 0) return
      bulkPatch.mutate({
        ids: targetIds,
        patch: { status },
        describe: (count) => `${String(count)} moved to ${status}`,
      })
      selection.clear()
    },
    [targetIds, bulkPatch, selection],
  )

  useHotkeys({
    statusActive: () => {
      applyStatus('active')
    },
    statusPending: () => {
      applyStatus('pending')
    },
    statusClosed: () => {
      applyStatus('closed')
    },
    statusSpam: () => {
      applyStatus('spam')
    },
  })

  // An unknown folder in the URL resolves to the default rather than 404ing (design spec 23).
  if (!folderParam.success) {
    return <Navigate to={`/inbox/${inboxId}/unassigned`} replace />
  }

  const inbox = inboxes.data?.find((candidate) => candidate.id === inboxId)
  if (inboxes.isSuccess && inbox === undefined) {
    return <Navigate to="/" replace />
  }

  const copy = FOLDER_COPY[folder]
  const showPreview = splitView && roomForPreview
  const previewConversation = list.conversations[cursorIndex]

  return (
    <div className="flex h-full">
      {inbox !== undefined ? <FolderSidebar inbox={inbox} views={views.data ?? []} /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <ListToolbar
          title={copy.title}
          total={list.total}
          sort={sort}
          onSortChange={setSort}
          filter={filter}
          onFilterChange={setFilter}
          users={users.data ?? []}
          tags={tags.data ?? []}
          density={density}
          onDensityToggle={toggleDensity}
          splitView={splitView}
          onSplitViewToggle={() => {
            setSplitView((open) => !open)
          }}
        />

        {selection.hasSelection ? (
          <BulkActionBar
            count={selection.count}
            users={users.data ?? []}
            onAssign={(userId) => {
              bulkPatch.mutate({
                ids: selection.selectedIds,
                patch: { assigneeId: userId },
                describe: (count) =>
                  userId === null
                    ? `${String(count)} unassigned`
                    : `${String(count)} assigned to ${userMap.get(userId)?.name ?? 'a teammate'}`,
              })
              selection.clear()
            }}
            onStatus={applyStatus}
            onClear={selection.clear}
          />
        ) : (
          <ListColumns
            allSelected={selection.allSelected}
            onToggleAll={selection.allSelected ? selection.clear : selection.selectAll}
          />
        )}

        {list.isPending ? (
          <ListSkeleton rowHeight={rowHeight} />
        ) : list.isError ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="text-center">
              <p className="text-[15px] font-medium">We could not load this folder</p>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                {list.error instanceof ApiError ? list.error.userMessage : 'Try again in a moment.'}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => {
                  void list.refetch()
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : list.conversations.length === 0 ? (
          <EmptyState
            icon={copy.empty.icon}
            title={copy.empty.title}
            description={copy.empty.description}
          />
        ) : (
          <ConversationList
            conversations={list.conversations}
            rowHeight={rowHeight}
            selected={selection.selected}
            users={userMap}
            cursorIndex={cursorIndex}
            onCursorChange={setCursorIndex}
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            onLoadMore={() => {
              void list.fetchNextPage()
            }}
            onToggleSelect={selection.toggle}
            onSelectAll={selection.selectAll}
            onSelectNone={selection.clear}
            onOpen={(conversation) => {
              openConversation(conversation.id)
            }}
          />
        )}
      </div>

      {showPreview ? (
        <PreviewPane conversation={previewConversation} inboxId={inboxId} folder={folder} />
      ) : null}
    </div>
  )
}
