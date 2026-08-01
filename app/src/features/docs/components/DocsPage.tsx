import { Link } from 'react-router-dom'
import { BookOpen, Globe, Lock } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { useArticles, useCollections } from '../hooks/use-docs'

/** The collection index. Small enough to be a plain grid; the work happens one level down. */
export function DocsPage() {
  const collections = useCollections()
  const articles = useArticles()

  const drafts = (articles.data ?? []).filter((article) => article.status === 'draft').length

  return (
    <div className="mx-auto w-full max-w-[960px] px-6 pt-6 pb-10">
      <PageHeader
        title="Docs"
        description={
          drafts === 0
            ? 'Your knowledge base collections.'
            : `${String(drafts)} article${drafts === 1 ? '' : 's'} still in draft.`
        }
      />

      {collections.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : (collections.data ?? []).length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No collections yet"
          description="A collection is one public site. Most workspaces need exactly one."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(collections.data ?? []).map((collection) => (
            <Link
              key={collection.id}
              to={`/docs/${collection.id}`}
              className="rounded-lg border p-4 transition-colors hover:bg-[color:var(--hover)]"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="size-4" style={{ color: 'var(--brand)' }} aria-hidden="true" />
                <span className="text-[16px] font-semibold tracking-[-0.01em]">
                  {collection.name}
                </span>
                {collection.private ? (
                  <Lock
                    className="size-3.5"
                    style={{ color: 'var(--muted-foreground)' }}
                    aria-label="Private collection"
                  />
                ) : (
                  <Globe
                    className="size-3.5"
                    style={{ color: 'var(--muted-foreground)' }}
                    aria-label="Public collection"
                  />
                )}
              </div>
              <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                {collection.domain}
              </p>
              <p className="mt-3 font-mono text-[13px]">
                {collection.articleCount}{' '}
                <span className="font-sans" style={{ color: 'var(--muted-foreground)' }}>
                  article{collection.articleCount === 1 ? '' : 's'}
                </span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
