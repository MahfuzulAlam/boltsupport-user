import { useQuery } from '@tanstack/react-query'
import {
  fetchArticles,
  fetchCategories,
  fetchCollections,
  fetchSavedReplies,
} from '../api/collections'

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: ({ signal }) => fetchCollections(signal),
    staleTime: 60_000,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 60_000,
  })
}

export function useArticles() {
  return useQuery({
    queryKey: ['articles'],
    queryFn: ({ signal }) => fetchArticles(signal),
    staleTime: 60_000,
  })
}

export function useSavedReplies() {
  return useQuery({
    queryKey: ['saved-replies'],
    queryFn: ({ signal }) => fetchSavedReplies(signal),
    staleTime: 60_000,
  })
}
