import { BrandLogo } from '@/components/brand-logo'
import { BRAND } from '@/constants/brand'

export function WorkspaceLoading() {
  return <main className="workspace-loading" role="status" aria-label={`Loading ${BRAND.name}`}>
    <div className="workspace-loading-content">
      <BrandLogo />
      <div className="workspace-loading-progress">
        <span>Preparing your workspace</span>
        <div className="workspace-loading-track" aria-hidden="true"><span /></div>
      </div>
    </div>
  </main>
}
