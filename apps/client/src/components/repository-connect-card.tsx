import { GitBranch, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type RepositoryConnectCardProps = {
  isAdmin: boolean
  isConnecting: boolean
  onConnect: () => void
}

export function RepositoryConnectCard({ isAdmin, isConnecting, onConnect }: RepositoryConnectCardProps) {
  return <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground"><GitBranch aria-hidden="true" className="size-5" /></span>
        <div><CardTitle>Connect GitHub</CardTitle><CardDescription>Bring pull requests into a review queue next to your policies.</CardDescription></div>
      </div>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">This is optional. Your policy workspace works fully without GitHub. When connected, PolicyDesk reads repository metadata and pull requests from the repositories you pick on GitHub. It never changes your code.</p>
      {isAdmin
        ? <div><Button className="primary-action" disabled={isConnecting} onClick={onConnect}>{isConnecting ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <GitBranch data-icon="inline-start" />}{isConnecting ? 'Connecting…' : 'Connect GitHub'}</Button></div>
        : <p className="text-sm font-medium">Ask a workspace admin to connect GitHub.</p>}
    </CardContent>
  </Card>
}
