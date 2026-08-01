import { Link, useParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useArticleEditor } from '../hooks/use-article-editor'

/** The counters the SEO fields target. Over is a warning, not a block. */
const TITLE_TAG_TARGET = 55
const META_TARGET = 155

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
 * The incumbent's block editor is the single most cited complaint in the research, so the
 * writing surface gets priority over chrome: a wide, quiet Tiptap area with the metadata pushed
 * below it rather than a toolbar wrapped around it.
 */
export function ArticleEditorPage() {
  const params = useParams()
  const articleId = params['articleId'] ?? ''
  const collectionId = params['collectionId'] ?? ''
  const { article, isLoading, saveState, update, flush } = useArticleEditor(articleId)

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Write the answer…' })],
    content: article?.bodyHtml ?? '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[320px] text-[15px] leading-[1.7]',
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
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pt-6 pb-12">
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/docs/${collectionId}`}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>

        <span
          className="ml-auto flex items-center gap-1.5 text-[13px]"
          style={{ color: 'var(--muted-foreground) ' }}
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

        <span
          className="rounded px-2 py-0.5 text-[12px] font-medium"
          style={{
            background: article.status === 'published' ? 'var(--success-soft)' : 'var(--muted)',
            color: article.status === 'published' ? 'var(--success)' : 'var(--muted-foreground)',
          }}
        >
          {article.status === 'published' ? 'Published' : 'Draft'}
        </span>

        <Button
          size="sm"
          onClick={() => {
            update({ status: article.status === 'published' ? 'draft' : 'published' })
            flush()
          }}
        >
          {article.status === 'published' ? 'Unpublish' : 'Publish'}
        </Button>
      </div>

      <input
        value={article.title}
        onChange={(event) => {
          update({ title: event.target.value })
        }}
        aria-label="Article title"
        className="mb-1 w-full bg-transparent text-[24px] font-semibold tracking-[-0.015em] outline-none"
      />
      <p className="mb-5 font-mono text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        /{article.slug}
      </p>

      <div
        className="rounded-lg border p-4"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <EditorContent editor={editor} data-rich-text-editor />
      </div>

      <section className="mt-6">
        <h2 className="eyebrow mb-3">Search engine listing</h2>

        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="title-tag" className="text-[13px]">
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
            <Label htmlFor="meta-description" className="text-[13px]">
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
      </section>
    </div>
  )
}
