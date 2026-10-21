import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { SectionHeading } from '@/components/app-shell'
import { RepositoryConnections } from '@/components/repository-connections'
import { parseGithubCallback } from '@/libs/repositories/callback'

export function RepositoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const outcome = parseGithubCallback(searchParams)
    if (!outcome) return
    if (outcome.kind === 'connected') toast.success('GitHub connected', { id: 'github-callback', description: 'Your repositories are importing now.' })
    else toast.error('Could not connect GitHub', { id: 'github-callback', description: outcome.message })
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete('github'); next.delete('reason'); return next }, { replace: true })
  }, [searchParams, setSearchParams])

  return <>
    <SectionHeading eyebrow="WORKSPACE" title="Repositories" description="Repositories from your connected GitHub organization. Open one to see its review queue. Connecting GitHub is optional." />
    <RepositoryConnections />
  </>
}
