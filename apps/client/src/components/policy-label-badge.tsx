import { Badge } from '@/components/ui/badge'

const palettes = ['sage', 'blue', 'violet', 'amber', 'rose', 'teal'] as const

export function PolicyLabelBadge({ label, className }: { label: string; className?: string }) {
  const palette = palettes[hashLabel(label) % palettes.length]
  return <Badge variant="outline" className={`policy-label-badge label-tone-${palette}${className ? ` ${className}` : ''}`}>{label}</Badge>
}

function hashLabel(value: string) {
  return [...value.toLocaleLowerCase()].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0)
}
