import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { Article, Category, Tag } from '@/types'

interface ArticleSidebarProps {
  article: Article
  categories: Category[]
  tags: Tag[]
  /** Everything else in this collection, for the related picker. */
  siblings: Article[]
  onChange: (patch: Partial<Article>) => void
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b px-4 py-4" style={{ borderColor: 'var(--border)' }}>
      <h2 className="mb-2.5 text-[14px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** The dashed control every panel uses to add one more of something. */
function AddButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[26px] items-center gap-1 rounded-[6px] border border-dashed px-2 text-[13px]"
      style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
    >
      <Plus className="size-3" aria-hidden="true" />
      {label}
    </button>
  )
}

function Chip({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex h-[26px] items-center gap-1 rounded-[6px] pr-1 pl-2 text-[13px]"
      style={{
        background:
          color === undefined ? 'var(--muted)' : `color-mix(in srgb, ${color} 16%, transparent)`,
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="flex size-4 items-center justify-center rounded-sm hover:bg-[color:var(--hover)]"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <X className="size-3" />
      </button>
    </span>
  )
}

/**
 * Everything about the article that is not the article.
 *
 * It lives in a rail rather than under the body because these are decisions you revisit while
 * writing, not after: what this belongs to, what it is about, what it should be found by. Below
 * the fold they get filled in once and never looked at again, which is how a knowledge base ends
 * up with two hundred uncategorised drafts.
 */
export function ArticleSidebar({
  article,
  categories,
  tags,
  siblings,
  onChange,
}: ArticleSidebarProps) {
  const [keyword, setKeyword] = useState('')

  const category = categories.find((item) => item.id === article.categoryId)
  const chosenTags = tags.filter((tag) => article.tagIds.includes(tag.id))
  const availableTags = tags.filter((tag) => !article.tagIds.includes(tag.id))
  const related = siblings.filter((item) => article.relatedIds.includes(item.id))
  const availableRelated = siblings.filter(
    (item) => item.id !== article.id && !article.relatedIds.includes(item.id),
  )

  const addKeyword = () => {
    const trimmed = keyword.trim().toLowerCase()
    if (trimmed === '' || article.keywords.includes(trimmed)) {
      setKeyword('')
      return
    }
    onChange({ keywords: [...article.keywords, trimmed] })
    setKeyword('')
  }

  return (
    <div>
      <Panel title="Category">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Category: ${category?.name ?? 'none'}`}
              className="flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-[14px]"
              style={{ borderColor: 'var(--border)' }}
            >
              {category?.name ?? (
                <span style={{ color: 'var(--muted-foreground)' }}>Uncategorised</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px]">
            <DropdownMenuItem
              onSelect={() => {
                onChange({ categoryId: null })
              }}
            >
              {article.categoryId === null ? <Check className="size-3.5" /> : null}
              Uncategorised
            </DropdownMenuItem>
            {categories.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => {
                  onChange({ categoryId: item.id })
                }}
              >
                {item.id === article.categoryId ? <Check className="size-3.5" /> : null}
                {item.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Panel>

      <Panel title="Tags">
        <div className="flex flex-wrap items-center gap-1.5">
          {chosenTags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              color={tag.color}
              onRemove={() => {
                onChange({ tagIds: article.tagIds.filter((id) => id !== tag.id) })
              }}
            />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span>
                <AddButton label={chosenTags.length === 0 ? 'Add a tag' : 'Add'} />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[260px] w-[200px] overflow-y-auto">
              {availableTags.length === 0 ? (
                <p className="px-2 py-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  Every tag is already on this article.
                </p>
              ) : (
                availableTags.map((tag) => (
                  <DropdownMenuItem
                    key={tag.id}
                    onSelect={() => {
                      onChange({ tagIds: [...article.tagIds, tag.id] })
                    }}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: tag.color }}
                      aria-hidden="true"
                    />
                    {tag.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Panel>

      <Panel title="Keywords">
        {/* Free text, not the tag set. Keywords are what somebody types into search, which is
            rarely the word the team files things under. */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {article.keywords.map((word) => (
            <Chip
              key={word}
              label={word}
              onRemove={() => {
                onChange({ keywords: article.keywords.filter((item) => item !== word) })
              }}
            />
          ))}
        </div>
        <Input
          value={keyword}
          placeholder="Add a keyword"
          aria-label="Add a keyword"
          onChange={(event) => {
            setKeyword(event.target.value)
          }}
          onBlur={addKeyword}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              addKeyword()
            }
          }}
        />
      </Panel>

      <Panel title="Related articles">
        {related.length === 0 ? (
          <p className="mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Nothing linked yet.
          </p>
        ) : (
          <ul className="mb-2 flex flex-col gap-1">
            {related.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <button
                  type="button"
                  aria-label={`Unlink ${item.title}`}
                  onClick={() => {
                    onChange({ relatedIds: article.relatedIds.filter((id) => id !== item.id) })
                  }}
                  className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-[color:var(--hover)]"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span>
              <AddButton label="Link an article" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[280px] w-[260px] overflow-y-auto">
            {availableRelated.length === 0 ? (
              <p className="px-2 py-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                Nothing else in this collection yet.
              </p>
            ) : (
              availableRelated.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => {
                    onChange({ relatedIds: [...article.relatedIds, item.id] })
                  }}
                >
                  {item.title}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </Panel>
    </div>
  )
}
