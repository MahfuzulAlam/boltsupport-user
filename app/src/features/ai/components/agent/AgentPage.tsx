import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { fetchAiAgent } from '@/features/ai/api/ai'
import { AgentConsole } from './AgentConsole'
import { AgentLanding } from './AgentLanding'

/**
 * `/ai/agent` is two screens.
 *
 * With no agent configured it sells the idea; with one it manages it. Routing on the data rather
 * than on separate URLs means a bookmark keeps working after setup.
 */
export function AgentPage() {
  const agent = useQuery({
    queryKey: ['ai-agent'],
    queryFn: ({ signal }) => fetchAiAgent(signal),
    retry: false,
  })

  if (agent.isPending) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 pt-6">
        <PageHeader title="AI Agent" />
      </div>
    )
  }

  if (agent.isError || agent.data === undefined) return <AgentLanding />

  return <AgentConsole agent={agent.data} />
}
