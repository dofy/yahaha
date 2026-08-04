import * as React from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark' | 'auto'

const ORDER: Theme[] = ['light', 'dark', 'auto']
const ICON = { light: Sun, dark: Moon, auto: Monitor } as const
const LABEL = { light: 'Light', dark: 'Dark', auto: 'System' } as const

function systemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'auto' && systemDark())
  document.documentElement.classList.toggle('dark', dark)
}

export default function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>('auto')

  React.useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    setTheme(stored && ORDER.includes(stored) ? stored : 'auto')
  }, [])

  // Follow OS changes while in auto mode.
  React.useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('auto')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
    if (next === 'auto') localStorage.removeItem('theme')
    else localStorage.setItem('theme', next)
    apply(next)
    setTheme(next)
  }

  const Icon = ICON[theme]

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}`}
      title={`Theme: ${LABEL[theme]} (click to change)`}
    >
      <Icon />
    </Button>
  )
}
