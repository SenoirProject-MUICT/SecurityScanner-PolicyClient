import type { KeyboardEvent } from 'react'
import { ArrowRight, FileText, ShieldCheck, Tags } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { WorkspaceOption } from '@/libs/workspaces'

type WorkspaceCardProps = {
  workspace: WorkspaceOption
  variant?: number
  onSelect?: (workspaceId: string) => void
  className?: string
}

export function WorkspaceCard({ workspace, variant = 0, onSelect, className = '' }: WorkspaceCardProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onSelect || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onSelect(workspace.id)
  }

  return <Card className={`workspace-manager-card${onSelect ? ' is-selectable' : ''}${className ? ` ${className}` : ''}`} data-selectable={onSelect ? 'true' : undefined} key={workspace.id} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} onClick={onSelect ? () => onSelect(workspace.id) : undefined} onKeyDown={onSelect ? handleKeyDown : undefined}>
    <div className="workspace-manager-cover" data-variant={variant} aria-hidden="true">
      <div className="workspace-cover-preview">
        <div className="workspace-cover-sidebar"><span /><span className="is-selected" /><span /><span /></div>
        <div className="workspace-cover-content">
          <div className="workspace-cover-heading"><i /><i /></div>
          <div className="workspace-cover-policy"><span className="workspace-cover-policy-icon"><ShieldCheck /></span><span className="workspace-cover-lines"><i /><i /></span><span className="workspace-cover-status" /></div>
          <div className="workspace-cover-policy"><span className="workspace-cover-policy-icon"><FileText /></span><span className="workspace-cover-lines"><i /><i /></span><span className="workspace-cover-status is-muted" /></div>
          <div className="workspace-cover-labels"><Tags /><i /><i /></div>
        </div>
      </div>
    </div>
    <CardHeader className="workspace-manager-card-header">
      <div className="workspace-manager-card-title"><CardTitle>{workspace.name}</CardTitle><CardDescription>{workspace.role === 'admin' ? 'You’re an admin' : 'You’re a member'}</CardDescription></div>
      <div className="workspace-manager-badges"><Badge variant="outline" className={workspace.role === 'admin' ? 'workspace-role-admin' : 'workspace-role-member'}>{workspace.role === 'admin' ? 'Admin' : 'Member'}</Badge>{workspace.isDefault && <Badge variant="outline" className="workspace-default-badge">Default</Badge>}{onSelect && <ArrowRight className="workspace-manager-card-arrow" aria-hidden="true" />}</div>
    </CardHeader>
    <CardContent><p>Your team’s policies, labels, and shared resources.</p></CardContent>
  </Card>
}
