import * as React from 'react'
import { flushSync } from 'react-dom'
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
const THEME_COLOR = { light: '#fffdfc', dark: '#1b1a18' } as const

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
  const [animating, setAnimating] = React.useState(false)
  const currentTheme = React.useRef<Theme>('auto')
  const transition = React.useRef<ViewTransition | null>(null)

  React.useEffect(() => {
    const sync = () => {
      let stored: string | null = null
      try {
        stored = localStorage.getItem('theme')
      } catch {
        /* Use the system theme. */
      }
      const next: Theme =
        stored === 'light' || stored === 'dark' ? stored : 'auto'
      transition.current?.skipTransition()
      currentTheme.current = next
      setTheme(next)
      apply(next)
    }
    sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme' || e.key === null) sync()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      transition.current?.skipTransition()
    }
  }, [])

  // Follow OS changes while in auto mode.
  React.useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (currentTheme.current !== 'auto') return
      transition.current?.skipTransition()
      apply('auto')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const cycle = () => {
    // Keep keyboard repeats from overlapping snapshot animations.
    if (transition.current) return
    const next = ORDER[(ORDER.indexOf(currentTheme.current) + 1) % ORDER.length]
    currentTheme.current = next
    const commit = () => {
      // A storage event may supersede this change before the snapshot is ready.
      if (currentTheme.current !== next) return
      apply(next)
      setTheme(next)
      try {
        if (next === 'auto') localStorage.removeItem('theme')
        else localStorage.setItem('theme', next)
      } catch {
        /* Theme changes still work when storage is disabled. */
      }
    }
    const root = document.documentElement
    const dark = next === 'dark' || (next === 'auto' && systemDark())
    if (
      dark === root.classList.contains('dark') ||
      typeof document.startViewTransition !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      commit()
      return
    }

    root.dataset.themeTransition = dark ? 'dark' : 'light'
    try {
      const active = document.startViewTransition(() => flushSync(commit))
      transition.current = active
      setAnimating(true)
      const finish = () => {
        if (transition.current !== active) return
        transition.current = null
        delete root.dataset.themeTransition
        setAnimating(false)
      }
      // Hidden tabs can skip the animation; the theme update still completes.
      void active.ready.catch(() => {})
      void active.finished.then(finish, finish)
    } catch {
      delete root.dataset.themeTransition
      commit()
    }
  }

  const Icon = ICON[theme]

  return (
    <Button
      variant='ghost'
      size='icon'
      onClick={cycle}
      aria-disabled={animating}
      aria-label={`Theme: ${LABEL[theme]}`}
      title={`Theme: ${LABEL[theme]} (click to change)`}
    >
      <Icon />
    </Button>
  )
}
