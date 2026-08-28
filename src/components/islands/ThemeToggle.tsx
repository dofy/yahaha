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

// Must match the values in globals.css: --color-paper light / dark.
const THEME_COLOR = { light: '#fcfaf1', dark: '#191f2b' } as const

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'auto' && systemDark())
  document.documentElement.classList.toggle('dark', dark)
  // The media-scoped <meta name="theme-color"> tags in Base.astro key off the
  // OS preference and so cannot see a manual override; this unconditional one
  // can, and wins where runtime mutation is supported.
  document
    .querySelector('meta[data-theme-color]')
    ?.setAttribute('content', THEME_COLOR[dark ? 'dark' : 'light'])
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
