import { z } from 'zod'
import { articleSchema, categorySchema, collectionSchema, savedReplySchema } from '@/types'
import { apiRequest } from '@/lib/api-client'

export function fetchCollections(signal?: AbortSignal) {
  return apiRequest('/collections', z.array(collectionSchema), { ...(signal ? { signal } : {}) })
}

export function fetchCategories(signal?: AbortSignal) {
  return apiRequest('/categories', z.array(categorySchema), { ...(signal ? { signal } : {}) })
}

export function fetchArticles(signal?: AbortSignal) {
  return apiRequest('/articles', z.array(articleSchema), { ...(signal ? { signal } : {}) })
}

export function fetchSavedReplies(signal?: AbortSignal) {
  return apiRequest('/saved-replies', z.array(savedReplySchema), { ...(signal ? { signal } : {}) })
}
