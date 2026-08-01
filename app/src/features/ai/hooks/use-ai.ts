import { useQuery } from '@tanstack/react-query'
import { fetchAiAgent, fetchAiInboxStats, fetchAiSettings } from '../api/ai'

export function useAiSettings() {
  return useQuery({
    queryKey: ['ai', 'settings'],
    queryFn: ({ signal }) => fetchAiSettings(signal),
    staleTime: 60_000,
  })
}

export function useAiAgent() {
  return useQuery({
    queryKey: ['ai', 'agent'],
    queryFn: ({ signal }) => fetchAiAgent(signal),
    staleTime: 60_000,
  })
}

export function useAiInboxStats() {
  return useQuery({
    queryKey: ['ai', 'inbox-stats'],
    queryFn: ({ signal }) => fetchAiInboxStats(signal),
    staleTime: 60_000,
  })
}
