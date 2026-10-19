import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  const Icon = isDark ? Sun : Moon

  return <button
    type="button"
    className="profile-menu-item profile-theme-toggle"
    aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    onClick={() => setTheme(isDark ? 'light' : 'dark')}
  >
    <Icon aria-hidden="true" />
    <span>{isDark ? 'Light appearance' : 'Dark appearance'}</span>
    <span className={`theme-state${isDark ? ' is-dark' : ''}`} aria-hidden="true"><i /></span>
  </button>
}
