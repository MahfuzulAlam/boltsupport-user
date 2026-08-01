import { ChevronDown, RotateCw, ShieldAlert, Sparkles, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { languageName, TRANSLATION_LANGUAGES } from '@/lib/language'
import type { Translation } from '../api/messages'
import { EmailIframeRenderer } from './EmailIframeRenderer'

interface TranslatedBodyProps {
  translation: Translation
  authorName: string
  retrying: boolean
  onRetranslate: (targetLanguage: string) => void
  onDismiss: () => void
}

/** Below this the translation is a hint, not a reading. Matches the AI confidence gate elsewhere. */
const LOW_CONFIDENCE = 0.6

/**
 * A machine translation of one message, in the violet AI treatment.
 *
 * It replaces the body in the reading position rather than sitting beside it, because an agent
 * reading a language they do not speak has no use for two columns. What keeps it honest is the
 * band above it: the translation is always labelled, the original is always one click away, and
 * the whole block carries `data-ai-generated` so no reply path can pick it up as customer text.
 *
 * Low confidence changes the copy rather than hiding the output. A translation the model is unsure
 * of is still more useful than an unreadable body, as long as the agent is told to verify it before
 * acting on it.
 */
export function TranslatedBody({
  translation,
  authorName,
  retrying,
  onRetranslate,
  onDismiss,
}: TranslatedBodyProps) {
  const low = translation.confidence < LOW_CONFIDENCE
  const accent = low ? 'var(--warning-strong)' : 'var(--ai)'

  return (
    <div data-ai-generated="true" data-internal="true">
      <div
        className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-2.5 py-1.5 text-[13px]"
        style={{
          background: low ? 'var(--warning-soft)' : 'var(--ai-soft)',
          color: 'var(--foreground)',
        }}
      >
        {low ? (
          <ShieldAlert className="size-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
        ) : (
          <Sparkles className="size-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
        )}

        <span>
          Translated by AI from {languageName(translation.sourceLanguage)} to{' '}
          {languageName(translation.targetLanguage)}.
          {low ? ' Low confidence, so check it before you act on it.' : ''}
        </span>

        <span className="font-mono text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
          {Math.round(translation.confidence * 100)}%
        </span>

        <div className="ml-auto flex items-center gap-1">
          {/* The language picker lives here rather than in the menu that started this, because
              this is the point at which an agent knows they want a different one. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Translate into another language"
                className="flex h-6 items-center gap-1 rounded px-1.5 font-medium"
                style={{ color: accent }}
              >
                Language
                <ChevronDown className="size-3" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              {TRANSLATION_LANGUAGES.map((code) => (
                <DropdownMenuItem
                  key={code}
                  onSelect={() => {
                    onRetranslate(code)
                  }}
                >
                  {languageName(code)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => {
              onRetranslate(translation.targetLanguage)
            }}
            disabled={retrying}
            className="flex h-6 items-center gap-1 rounded px-1.5 font-medium disabled:opacity-60"
            style={{ color: accent }}
          >
            <RotateCw className="size-3" aria-hidden="true" />
            {retrying ? 'Translating' : 'Regenerate'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Discard the translation and show the original"
            className="flex size-6 items-center justify-center rounded hover:bg-[color:var(--hover)]"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {translation.injectionDetected ? (
        <p className="mb-2 text-[13px]" style={{ color: 'var(--warning-strong)' }}>
          This message tried to give the AI instructions. They were ignored and only the text was
          translated.
        </p>
      ) : null}

      {/* Same sandboxed path as the original. The translation is derived from untrusted content,
          so it is treated as untrusted content. */}
      <EmailIframeRenderer bodyHtml={translation.bodyHtml} authorName={authorName} />
    </div>
  )
}
