import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { FileText, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { createArticle } from '../api/articles'
import { useArticles, useCategories, useCollections } from '../hooks/use-docs'
import { SuggestArticles } from './SuggestArticles'

const ALL = 'all'

/** One collection: its categories on the left, its articles in the middle. */
export function CollectionPage() {
  const collectionId = useParams()['collectionId'] ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [categoryId, setCategoryId] = useState<string>(ALL)
  const [suggesting, setSuggesting] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 200).toLowerCase()

  const collections = useCollections()
  const categories = useCategories()
  const articles = useArticles()

  const collection = collections.data?.find((item) => item.id === collectionId)
  const inCollection = useMemo(
    () => (articles.data ?? []).filter((article) => article.collectionId === collectionId),
    [articles.data, collectionId],
  )

  const visible = inCollection
    .filter((article) => categoryId === ALL || article.categoryId === categoryId)
    .filter(
      (article) =>
        debounced === '' ||
        article.title.toLowerCase().includes(debounced) ||
        article.keywords.some((keyword) => keyword.includes(debounced)),
    )

  const create = useMutation({
    mutationFn: () => createArticle('Untitled article', collectionId),
    onSuccess: (article) => {
      void queryClient.invalidateQueries({ queryKey: ['articles'] })
      void navigate(`/docs/${collectionId}/article/${article.id}`)
    },
  })

  const rail = [
    { id: ALL, name: 'All articles', count: inCollection.length },
    ...(categories.data ?? [])
      .filter((category) => category.collectionId === collectionId)
      .map((category) => ({
        id: category.id,
        name: category.name,
        count: inCollection.filter((article) => article.categoryId === category.id).length,
      })),
  ]

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 pt-6 pb-10">
      <PageHeader
        title={collection?.name ?? 'Collection'}
        description={collection?.domain}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSuggesting(true)
              }}
              style={{ color: 'var(--ai)', borderColor: 'var(--ai)' }}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Suggest articles
            </Button>
            <Button
              size="sm"
              disabled={create.isPending}
              onClick={() => {
                create.mutate()
              }}
            >
              New article
            </Button>
          </>
        }
      />

      {suggesting ? (
        <SuggestArticles
          collectionId={collectionId}
          onDismiss={() => {
            setSuggesting(false)
          }}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <nav aria-label="Categories" className="h-fit">
          {rail.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCategoryId(item.id)
              }}
              aria-current={categoryId === item.id ? 'true' : undefined}
              className={cn(
                'flex h-10 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px]',
                categoryId === item.id ? 'font-medium' : 'hover:bg-[color:var(--hover)]',
              )}
              style={
                categoryId === item.id
                  ? { background: 'var(--brand-soft)', color: 'var(--brand)' }
                  : undefined
              }
            >
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span
                className="shrink-0 font-mono text-[12px]"
                style={categoryId === item.id ? undefined : { color: 'var(--muted-foreground)' }}
              >
                {item.count}
              </span>
            </button>
          ))}
        </nav>

        <section>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            placeholder="Search articles"
            aria-label="Search articles"
            className="mb-3"
          />

          {articles.isPending ? (
            <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Loading
            </p>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={search === '' ? 'Nothing here yet' : 'No articles match'}
              description={
                search === ''
                  ? 'Write the answer once, then insert it into replies from the composer.'
                  : 'Try a different word, or search across every category.'
              }
            />
          ) : (
            <div
              className="overflow-hidden rounded-lg border"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              {visible.map((article) => (
                <Link
                  key={article.id}
                  to={`/docs/${collectionId}/article/${article.id}`}
                  className="flex items-center gap-3 border-b px-3 py-2.5 text-[13px] last:border-b-0 hover:bg-[color:var(--hover)]"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{article.title}</span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[12px] font-medium"
                    style={{
                      background:
                        article.status === 'published' ? 'var(--success-soft)' : 'var(--muted)',
                      color:
                        article.status === 'published'
                          ? 'var(--success)'
                          : 'var(--muted-foreground)',
                    }}
                  >
                    {article.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                  <span
                    className="w-[90px] shrink-0 text-right font-mono"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {format(new Date(article.updatedAt), 'd MMM')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
