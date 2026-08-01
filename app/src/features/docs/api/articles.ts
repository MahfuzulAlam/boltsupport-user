import { z } from 'zod'
import { articleSchema } from '@/types'
import { apiRequest } from '@/lib/api-client'

export function fetchArticle(id: string, signal?: AbortSignal) {
  return apiRequest(`/articles/${id}`, articleSchema, { ...(signal ? { signal } : {}) })
}

export interface ArticlePatch {
  title?: string
  bodyHtml?: string
  status?: 'draft' | 'published'
  keywords?: string[]
  seo?: { titleTag: string; metaDescription: string }
}

export function patchArticle(id: string, patch: ArticlePatch) {
  return apiRequest(`/articles/${id}`, articleSchema, { method: 'PATCH', body: patch })
}

export function createArticle(title: string, collectionId: string) {
  return apiRequest('/articles', articleSchema, {
    method: 'POST',
    body: { title, collectionId },
  })
}

const suggestionSchema = z.array(z.object({ subject: z.string(), askedCount: z.number() }))

/** Repeated questions from resolved conversations, offered as draft articles. */
export function fetchArticleSuggestions(signal?: AbortSignal) {
  return apiRequest('/ai/article-suggestions', suggestionSchema, { ...(signal ? { signal } : {}) })
}
