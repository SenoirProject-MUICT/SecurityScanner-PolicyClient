import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { Search } from 'lucide-react'

type SearchDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }
type SearchDialogComponent = ComponentType<SearchDialogProps>

export function PolicySearch() {
  const [open, setOpen] = useState(false)
  const [SearchDialog, setSearchDialog] = useState<SearchDialogComponent | null>(null)

  const loadDialog = useCallback(function loadDialog() {
    void import('./policy-search-dialog').then(({ PolicySearchDialog }) => setSearchDialog(() => PolicySearchDialog))
  }, [])

  const showSearch = useCallback(function showSearch() {
    setOpen(true)
    loadDialog()
  }, [loadDialog])

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (open) setOpen(false)
        else showSearch()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [open,showSearch])

  return <>
    <button type="button" className="policy-search-trigger" onClick={showSearch} onPointerEnter={loadDialog} onFocus={loadDialog} aria-label="Search policies">
      <Search aria-hidden="true" /><span>Search policies</span><kbd>⌘ K</kbd>
    </button>
    {SearchDialog && <SearchDialog open={open} onOpenChange={setOpen} />}
  </>
}
