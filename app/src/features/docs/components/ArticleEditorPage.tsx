import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Link2,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Type,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { fetchTags } from '@/features/inbox'
import { fetchArticles, fetchCategories } from '../api/collections'
import { useArticleEditor } from '../hooks/use-article-editor'
import { ArticleSidebar } from './ArticleSidebar'

/** The counters the SEO fields target. Over is a warning, not a block. */
const TITLE_TAG_TARGET = 55
const META_TARGET = 155

type Tab = 'edit' | 'seo'

function Counter({ value, target }: { value: number; target: number }) {
  const over = value > target
  return (
    <span
      className="font-mono text-[12px]"
      style={{ color: over ? 'var(--warning-strong)' : 'var(--muted-foreground)' }}
    >
      {value}/{target}
    </span>
  )
}

/**
 * The article editor.
 *
 * The incumbent's block editor is the single most cited complaint in the research, so the page
 * gives the writing surface everything and pushes the rest to the edges: one quiet column down
 * the middle, the chrome in a thin bar above it, and everything about the article in a rail that
 * folds away when it is in the way.
 */
export function ArticleEditorPage() {
  const params = useParams()
  const articleId = params['articleId'] ?? ''
  const collectionId = params['collectionId'] ?? ''
  const { article, isLoading, saveState, update, flush } = useArticleEditor(articleId)

  const [tab, setTab] = useState<Tab>('edit')
  const [preview, setPreview] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => fetchCategories(signal),
  })
  const tags = useQuery({ queryKey: ['tags'], queryFn: ({ signal }) => fetchTags(signal) })
  const articles = useQuery({
    queryKey: ['articles'],
    queryFn: ({ signal }) => fetchArticles(signal),
  })

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Write the answer…' })],
    content: article?.bodyHtml ?? '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[420px] text-[16px] leading-[1.75]',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Article body',
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (instance.isDestroyed) return
      update({ bodyHtml: instance.getHTML() })
    },
  })

  // Preview is the same editor with its hands tied, so there is one render path for the body
  // rather than a second one that could drift from what the writer actually sees.
  useEffect(() => {
    if (editor === null || editor.isDestroyed) return
    editor.setEditable(!preview)
  }, [editor, preview])

  // Seed the editor once the article arrives, without clobbering in-progress typing.
  useEffect(() => {
    if (editor === null || editor.isDestroyed || article === undefined) return
    if (editor.isEmpty && article.bodyHtml !== '') {
      editor.commands.setContent(article.bodyHtml, { emitUpdate: false })
    }
  }, [editor, article])

  if (isLoading || article === undefined) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-6 pt-6">
        <p className="text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      </div>
    )
  }

  const published = article.status === 'published'
  const siblings = (articles.data ?? []).filter(
    (item) => item.collectionId === article.collectionId,
  )

  return (
    <div className="flex h-full flex-col">
      {/* One thin bar. Everything that acts on the article as a whole, nothing that acts on the
          text, which belongs to the editor itself. */}
      <header
        className="flex flex-none items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <Button asChild variant="ghost" size="icon" aria-label="Back to the collection">
          <Link to={`/docs/${collectionId}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <nav className="mx-auto flex items-center gap-1" aria-label="Article views">
          {(
            [
              { id: 'edit', label: 'Edit' },
              { id: 'seo', label: 'Search listing' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => {
                setTab(item.id)
              }}
              className={cn(
                'relative h-9 px-3 text-[15px]',
                tab === item.id ? 'font-semibold' : 'font-normal',
              )}
              style={{ color: tab === item.id ? 'var(--brand)' : 'var(--muted-foreground)' }}
            >
              {item.label}
              {tab === item.id ? (
                <span
                  className="absolute inset-x-2 -bottom-[11px] h-[2px] rounded-full"
                  style={{ background: 'var(--brand)' }}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          ))}
        </nav>

        <span
          className="flex items-center gap-1.5 text-[13px]"
          style={{ color: 'var(--muted-foreground)' }}
          aria-live="polite"
        >
          {saveState === 'saving' ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Saving
            </>
          ) : saveState === 'unsaved' ? (
            'Unsaved changes'
          ) : saveState === 'saved' ? (
            <>
              <Check className="size-3.5" style={{ color: 'var(--success-strong)' }} />
              Saved
            </>
          ) : null}
        </span>

        {/* A real preview, not a link away.
            There is no public docs site to send anybody to, so this used to open the collection
            list, which is neither this article nor a preview of it. Read only is the honest
            version: the same content, none of the affordances. */}
        <Button
          variant="outline"
          aria-pressed={preview}
          onClick={() => {
            setPreview((on) => !on)
          }}
        >
          {preview ? 'Keep editing' : 'Preview'}
        </Button>

        {/* Split, because publishing and unpublishing are the same control at different times
            and hiding one of them behind the other is how people publish by accident. */}
        <div className="flex">
          <Button
            className="rounded-r-none"
            onClick={() => {
              flush()
            }}
          >
            Update
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-8 rounded-l-none border-l" aria-label="Publishing options">
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem
                onSelect={() => {
                  update({ status: published ? 'draft' : 'published' })
                  flush()
                }}
              >
                {published ? 'Move back to draft' : 'Publish this article'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 overflow-y-auto">
          {/* The rail toggle rides the content, not the bar, so it stays next to the thing it
              opens whichever tab is showing. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen((open) => !open)
                }}
                aria-expanded={sidebarOpen}
                aria-label={sidebarOpen ? 'Hide the article details' : 'Show the article details'}
                className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-md border"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--card)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {sidebarOpen ? (
                  <PanelRightClose className="size-4" />
                ) : (
                  <PanelRightOpen className="size-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {sidebarOpen ? 'Hide details' : 'Show details'}
            </TooltipContent>
          </Tooltip>

          {tab === 'edit' ? (
            <div className="mx-auto w-full max-w-[720px] px-6 pt-12 pb-24">
              <p
                className="mb-3 flex items-center gap-1.5 font-mono text-[13px]"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
                {article.slug}
              </p>

              <input
                value={article.title}
                onChange={(event) => {
                  update({ title: event.target.value })
                }}
                aria-label="Article title"
                placeholder="Untitled"
                className="mb-6 w-full bg-transparent text-[34px] leading-[1.2] font-semibold tracking-[-0.02em] outline-none"
              />

              <EditorContent editor={editor} data-rich-text-editor />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[720px] px-6 pt-12 pb-24">
              <h2 className="mb-1 text-[22px] font-semibold tracking-[-0.01em]">Search listing</h2>
              <p className="mb-6 text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
                What this looks like in a result. Over the count is a warning, not a limit.
              </p>

              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <Label htmlFor="title-tag" className="text-[14px] font-medium">
                    Title tag
                  </Label>
                  <Counter value={article.seo.titleTag.length} target={TITLE_TAG_TARGET} />
                </div>
                <Input
                  id="title-tag"
                  value={article.seo.titleTag}
                  onChange={(event) => {
                    update({ seo: { ...article.seo, titleTag: event.target.value } })
                  }}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label htmlFor="meta-description" className="text-[14px] font-medium">
                    Meta description
                  </Label>
                  <Counter value={article.seo.metaDescription.length} target={META_TARGET} />
                </div>
                <Input
                  id="meta-description"
                  value={article.seo.metaDescription}
                  onChange={(event) => {
                    update({ seo: { ...article.seo, metaDescription: event.target.value } })
                  }}
                />
              </div>
            </div>
          )}

          {/* Floats over the text rather than sitting above it, so the writing surface starts at
              the top of the page and the tools come to the cursor. */}
          {tab === 'edit' && !preview ? (
            <div
              className="pointer-events-none sticky bottom-6 flex justify-center"
              aria-hidden={false}
            >
              <div
                className="pointer-events-auto flex items-center gap-1 rounded-full border p-1 shadow-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    editor?.chain().focus().toggleBulletList().run()
                  }}
                  className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium"
                  style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
                >
                  <Plus className="size-4" />
                  Insert
                </button>
                <button
                  type="button"
                  aria-label="Formatting"
                  onClick={() => {
                    editor?.chain().focus().toggleBold().run()
                  }}
                  className="flex size-8 items-center justify-center rounded-full text-[14px] font-medium"
                  style={{ background: 'var(--muted)' }}
                >
                  <Type className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {sidebarOpen ? (
          <aside
            aria-label="Article details"
            className="w-[300px] flex-none overflow-y-auto border-l"
            style={{ borderColor: 'var(--border)', background: 'var(--app)' }}
          >
            <ArticleSidebar
              article={article}
              categories={categories.data ?? []}
              tags={tags.data ?? []}
              siblings={siblings}
              onChange={update}
            />
          </aside>
        ) : null}
      </div>
    </div>
  )
}
